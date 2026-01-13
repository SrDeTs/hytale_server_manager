import { ChildProcess, spawn, execSync, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import pidusage from 'pidusage';
import pidtree from 'pidtree';
import os from 'os';
import { PrismaClient } from '@prisma/client';
import {
  ServerStatus,
  ServerMetrics,
  ServerConfig,
  LogEntry,
  CommandResponse,
  Player,
  Mod,
  ModMetadata,
  InstalledFile,
  Backup,
} from '../types';
import { IServerAdapter } from './IServerAdapter';
import { RconService } from '../services/RconService';
import { LogTailService } from '../services/LogTailService';
import logger from '../utils/logger';

/**
 * Java Server Adapter
 *
 * This adapter runs a Java JAR file (e.g., Hytale server).
 * It manages the process lifecycle and captures stdout/stderr for logs.
 */
export class JavaServerAdapter implements IServerAdapter {
  private serverId: string;
  private config: ServerConfig;
  private status: ServerStatus;
  private process: ChildProcess | null = null;
  private logCallbacks: ((log: LogEntry) => void)[] = [];
  private startTime: Date | null = null;
  private logBuffer: LogEntry[] = [];
  private maxLogBuffer = 1000;

  // Java configuration
  private javaPath: string;
  private jarFile: string;
  private assetsPath: string;
  private javaArgs: string[];
  private serverArgs: string[];
  private workingDirectory: string;
  private maxMemory: string;

  // Process persistence (for manager restarts)
  private prisma: PrismaClient;
  private rconService: RconService;
  private logTailService: LogTailService;
  private rconPort: number;
  private rconPassword: string;
  private logFilePath: string;
  private useRcon: boolean = false; // true after reconnect or when RCON is ready
  private currentPid: number | null = null;
  private processMonitorInterval: NodeJS.Timeout | null = null;

  constructor(
    serverId: string,
    config: ServerConfig,
    prisma: PrismaClient,
    rconService: RconService,
    logTailService: LogTailService,
    adapterConfig?: {
      javaPath?: string;
      jarFile?: string;
      assetsPath?: string;
      minMemory?: string;
      maxMemory?: string;
      javaArgs?: string[];
      serverArgs?: string[];
      rconPort?: number;
      rconPassword?: string;
      logFilePath?: string;
    }
  ) {
    this.serverId = serverId;
    this.config = config;
    this.workingDirectory = config.serverPath;
    this.prisma = prisma;
    this.rconService = rconService;
    this.logTailService = logTailService;

    // Java configuration with defaults
    this.javaPath = adapterConfig?.javaPath || 'java';
    this.jarFile = adapterConfig?.jarFile || 'Server/HytaleServer.jar';
    this.assetsPath = adapterConfig?.assetsPath || '../Assets.zip';
    const minMemory = adapterConfig?.minMemory || '1G';
    this.maxMemory = adapterConfig?.maxMemory || '2G';
    this.javaArgs = adapterConfig?.javaArgs || [
      `-Xms${minMemory}`,
      `-Xmx${this.maxMemory}`,
      '-jar',
    ];
    // Build server args with assets path
    const defaultServerArgs = ['--assets', this.assetsPath];
    this.serverArgs = adapterConfig?.serverArgs || defaultServerArgs;

    // RCON configuration (default port = server port + 10)
    this.rconPort = adapterConfig?.rconPort || (config.port + 10);
    this.rconPassword = adapterConfig?.rconPassword || RconService.generatePassword();
    this.logFilePath = adapterConfig?.logFilePath || LogTailService.findLogFile(this.workingDirectory) || '';

    this.status = {
      serverId,
      status: 'stopped',
      playerCount: 0,
      maxPlayers: config.maxPlayers,
      version: config.version || '1.0.0',
      uptime: 0,
    };

    logger.info(`JavaServerAdapter created for server ${serverId}`);
    logger.info(`Working directory: ${this.workingDirectory}`);
    logger.info(`JAR file: ${this.jarFile}`);
    logger.info(`Assets path: ${this.assetsPath}`);
    logger.info(`Max memory: ${this.maxMemory}`);
    logger.info(`RCON port: ${this.rconPort}`);
  }

  // ============================================
  // Lifecycle Management
  // ============================================

  async start(): Promise<void> {
    if (this.process || this.currentPid) {
      throw new Error('Server is already running');
    }

    // Stop any existing log tailing to release file handles before server start
    // This is important on Windows where file locking is strict
    if (this.logTailService.isTailing(this.serverId)) {
      await this.logTailService.stopTailing(this.serverId);
      // Give Windows time to fully release the file handle
      await this.delay(500);
    }

    const jarPath = path.join(this.workingDirectory, this.jarFile);
    // Get the directory containing the JAR file (for working directory)
    const jarDir = path.dirname(jarPath);
    const jarFileName = path.basename(this.jarFile);

    // Check if JAR file exists
    if (!await fs.pathExists(jarPath)) {
      throw new Error(`JAR file not found: ${jarPath}`);
    }

    // Check if assets file exists (if specified)
    if (this.assetsPath) {
      const assetsFullPath = path.resolve(jarDir, this.assetsPath);
      if (!await fs.pathExists(assetsFullPath)) {
        logger.warn(`[Java] Assets file not found: ${assetsFullPath}`);
      }
    }

    // Log the full command for debugging
    logger.info(`[Java] Starting server ${this.serverId}`);
    logger.info(`[Java] Working directory: ${jarDir}`);
    logger.info(`[Java] Command: ${this.javaPath} ${this.javaArgs.join(' ')} ${jarFileName} ${this.serverArgs.join(' ')}`);

    this.status.status = 'starting';

    try {
      // Enable RCON in server.properties before starting
      await this.enableRconInProperties();

      // Spawn the Java process as DETACHED so it survives manager restart
      // Use the JAR directory as working directory so relative paths work correctly
      logger.info(`[Java] Spawning: ${this.javaPath} ${[...this.javaArgs, jarFileName, ...this.serverArgs].join(' ')}`);
      logger.info(`[Java] Working directory: ${jarDir}`);

      this.process = spawn(
        this.javaPath,
        [...this.javaArgs, jarFileName, ...this.serverArgs],
        {
          cwd: jarDir,
          stdio: ['pipe', 'pipe', 'pipe'],
          // Note: Not using detached mode so stdin/stdout work properly
          // This means the server will stop if the manager stops
          env: {
            ...process.env,
          },
          windowsHide: true,  // Hide console window on Windows
        }
      );

      logger.info(`[Java] Process spawned with PID: ${this.process.pid}`);

      this.startTime = new Date();
      this.currentPid = this.process.pid || null;

      // Persist PID to database immediately
      await this.persistProcessInfo();

      // Handle stdout (initial startup, before switching to log tail)
      this.process.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => {
          // Log to server logger for debugging startup issues
          logger.info(`[Java] stdout: ${line.substring(0, 200)}`);
          const logEntry = this.parseLogLine(line);
          this.emitLog(logEntry);

          // Detect server ready state and transition to RCON + log tailing
          if (line.includes('Done') && line.includes('For help')) {
            this.status.status = 'running';
            logger.info(`[Java] Server ${this.serverId} is now running`);
            this.transitionToRconAndLogTail();
          }
        });
      });

      // Handle stderr
      this.process.stderr?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => {
          // Log to server logger so we can see errors even if console isn't connected
          logger.error(`[Java] stderr: ${line}`);
          this.emitLog({
            timestamp: new Date(),
            level: 'error',
            message: line,
            source: 'server',
          });
        });
      });

      // Handle process exit
      this.process.on('exit', (code, signal) => {
        logger.info(`[Java] Server ${this.serverId} exited with code ${code}, signal ${signal}`);
        this.handleProcessExit(code);
      });

      // Handle errors
      this.process.on('error', (error) => {
        logger.error(`[Java] Server ${this.serverId} process error:`, error);
        this.emitLog({
          timestamp: new Date(),
          level: 'error',
          message: `Process error: ${error.message}`,
          source: 'system',
        });
      });

      // Wait a bit and check if process is still running
      await this.delay(2000);
      if (!this.process || this.process.exitCode !== null) {
        await this.clearProcessInfo();
        throw new Error('Server process terminated unexpectedly');
      }

      // If not already detected as running, mark as running after timeout
      if (this.status.status === 'starting') {
        setTimeout(() => {
          if (this.process && this.status.status === 'starting') {
            this.status.status = 'running';
            this.transitionToRconAndLogTail();
          }
        }, 30000); // 30 second timeout
      }

      logger.info(`[Java] Server ${this.serverId} process started (PID: ${this.process.pid})`);
    } catch (error: any) {
      this.status.status = 'stopped';
      this.process = null;
      this.currentPid = null;
      await this.clearProcessInfo();
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.process && !this.currentPid) {
      logger.warn(`[Java] Server ${this.serverId} is not running`);
      return;
    }

    logger.info(`[Java] Stopping server ${this.serverId}`);
    this.status.status = 'stopping';

    // Stop process monitoring
    this.stopProcessMonitoring();

    // Stop log tailing to release file handles (important on Windows)
    if (this.logTailService.isTailing(this.serverId)) {
      await this.logTailService.stopTailing(this.serverId);
    }

    // Send stop command to server
    await this.sendCommand('stop');

    // Wait for graceful shutdown
    await this.waitForExit(30000);

    if (this.process || this.currentPid) {
      // Force kill if still running
      logger.warn(`[Java] Server ${this.serverId} did not stop gracefully, killing process`);
      await this.kill();
    }

    // Clear process info from database
    await this.clearProcessInfo();
  }

  async restart(): Promise<void> {
    logger.info(`[Java] Restarting server ${this.serverId}`);
    await this.stop();
    await this.delay(2000);
    await this.start();
  }

  async kill(): Promise<void> {
    logger.warn(`[Java] Force killing server ${this.serverId}`);

    // Stop process monitoring
    this.stopProcessMonitoring();

    // Kill via process handle if available
    if (this.process) {
      this.process.kill('SIGKILL');
      this.process = null;
    }

    // Kill via PID if we only have that (after reconnect)
    if (this.currentPid && !this.process) {
      try {
        process.kill(this.currentPid, 'SIGKILL');
      } catch (error) {
        // Process might already be dead
        logger.warn(`[Java] Could not kill PID ${this.currentPid}:`, error);
      }
    }

    // Cleanup
    await this.disconnect();
    this.status.status = 'stopped';
    this.status.playerCount = 0;
    this.startTime = null;
    this.currentPid = null;
    await this.clearProcessInfo();
  }

  // ============================================
  // Status & Monitoring
  // ============================================

  async getStatus(): Promise<ServerStatus> {
    if (this.startTime && this.status.status === 'running') {
      this.status.uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
    }
    return { ...this.status };
  }

  async getMetrics(): Promise<ServerMetrics> {
    const uptime = this.startTime
      ? Math.floor((Date.now() - this.startTime.getTime()) / 1000)
      : 0;

    // Get real process metrics if running
    let cpuUsage = 0;
    let memoryUsage = 0;

    // Parse max memory from config (e.g., "2G" -> 2048, "512M" -> 512)
    let memoryTotal = 2048;
    if (this.maxMemory) {
      const match = this.maxMemory.match(/^(\d+)([MG])$/i);
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2].toUpperCase();
        memoryTotal = unit === 'G' ? value * 1024 : value;
      }
    }

    // Get PID from process handle or currentPid (for reconnected servers)
    const pid = this.process?.pid || this.currentPid;

    if (pid && this.status.status === 'running') {
      // On Windows, use PowerShell directly (wmic is deprecated on Windows 11)
      // On other platforms, try pidtree + pidusage
      if (os.platform() === 'win32') {
        try {
          const metrics = await this.getWindowsProcessMetrics(pid);
          cpuUsage = metrics.cpu;
          memoryUsage = metrics.memory;
        } catch (error) {
          logger.warn(`[Java] Failed to get Windows process stats for ${this.serverId}:`, error);
        }
      } else {
        try {
          const metrics = await this.getProcessMetricsPidusage(pid);
          cpuUsage = metrics.cpu;
          memoryUsage = metrics.memory;
        } catch (error) {
          logger.warn(`[Java] Failed to get process stats for ${this.serverId}:`, error);
        }
      }
    }

    return {
      cpuUsage,
      memoryUsage,
      memoryTotal,
      diskUsage: 0,
      tps: this.status.status === 'running' ? 20 : 0, // TPS would need RCON or log parsing
      uptime,
      timestamp: new Date(),
    };
  }

  /**
   * Get process metrics using pidtree and pidusage (Linux/macOS)
   */
  private async getProcessMetricsPidusage(pid: number): Promise<{ cpu: number; memory: number }> {
    // Get all child processes (Java launcher spawns actual JVM as child)
    const pids = await pidtree(pid, { root: true });

    if (pids.length === 0) {
      logger.debug(`[Java] No processes found in tree for PID ${pid}`);
      return { cpu: 0, memory: 0 };
    }

    logger.debug(`[Java] Found ${pids.length} processes in tree: ${pids.join(', ')}`);

    // Get stats for all processes in the tree
    const stats = await pidusage(pids);

    // Sum up CPU and memory from all processes
    let totalMemoryBytes = 0;
    let totalCpu = 0;
    let processCount = 0;

    for (const p of pids) {
      if (stats[p]) {
        totalMemoryBytes += stats[p].memory || 0;
        totalCpu += stats[p].cpu || 0;
        processCount++;
        logger.debug(`[Java] PID ${p}: CPU=${stats[p].cpu?.toFixed(1)}%, Memory=${Math.round((stats[p].memory || 0) / (1024 * 1024))}MB`);
      } else {
        logger.debug(`[Java] No stats available for PID ${p}`);
      }
    }

    const memoryMB = Math.round(totalMemoryBytes / (1024 * 1024));
    logger.debug(`[Java] Total from ${processCount} processes: CPU=${totalCpu.toFixed(1)}%, Memory=${memoryMB}MB`);

    return {
      cpu: totalCpu,
      memory: memoryMB,
    };
  }

  /**
   * Get process metrics on Windows using PowerShell
   * Finds all descendant processes and sums their memory
   */
  private async getWindowsProcessMetrics(pid: number): Promise<{ cpu: number; memory: number }> {
    return new Promise((resolve, reject) => {
      try {
        // Use PowerShell to get process tree memory
        const script = `$pids = @(${pid}); $allProcs = Get-CimInstance Win32_Process; for ($i = 0; $i -lt $pids.Count; $i++) { $children = $allProcs | Where-Object { $_.ParentProcessId -eq $pids[$i] }; foreach ($c in $children) { if ($pids -notcontains $c.ProcessId) { $pids += $c.ProcessId } } }; $mem = ($allProcs | Where-Object { $pids -contains $_.ProcessId } | Measure-Object -Property WorkingSetSize -Sum).Sum; if ($mem -eq $null) { 0 } else { [math]::Round($mem / 1MB) }`;

        const result = execSync(`powershell -NoProfile -Command "${script}"`, {
          encoding: 'utf8',
          timeout: 10000,
          windowsHide: true,
        });

        const memoryMB = parseInt(result.trim(), 10) || 0;
        logger.debug(`[Java] Windows PowerShell metrics: ${memoryMB}MB for PID ${pid}`);

        resolve({
          cpu: 0, // CPU requires sampling over time
          memory: memoryMB,
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============================================
  // Configuration
  // ============================================

  async getConfig(): Promise<ServerConfig> {
    return { ...this.config };
  }

  async updateConfig(config: Partial<ServerConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    if (config.maxPlayers) {
      this.status.maxPlayers = config.maxPlayers;
    }
  }

  // ============================================
  // Console & Logging
  // ============================================

  async sendCommand(command: string): Promise<CommandResponse> {
    logger.info(`[Java] Sending command to ${this.serverId}: ${command}`);
    logger.info(`[Java] State: useRcon=${this.useRcon}, hasProcess=${!!this.process}, hasStdin=${!!this.process?.stdin}, stdinWritable=${this.process?.stdin?.writable}`);

    // Use RCON if connected (after reconnect or when server is ready)
    if (this.useRcon && this.rconService.isConnected(this.serverId)) {
      try {
        logger.info(`[Java] Sending via RCON`);
        const response = await this.rconService.sendCommand(this.serverId, command);
        return {
          success: true,
          output: response || `Command sent: ${command}`,
          executedAt: new Date(),
        };
      } catch (error: any) {
        logger.error(`[Java] RCON command failed, trying stdin:`, error);
        // Fall through to stdin if RCON fails
      }
    }

    // Fall back to stdin if available
    if (this.process && this.process.stdin && this.process.stdin.writable) {
      try {
        logger.info(`[Java] Sending via stdin`);
        this.process.stdin.write(command + '\n');
        return {
          success: true,
          output: `Command sent: ${command}`,
          executedAt: new Date(),
        };
      } catch (error: any) {
        logger.error(`[Java] stdin write failed:`, error);
        return {
          success: false,
          output: `Failed to send command: ${error.message}`,
          executedAt: new Date(),
        };
      }
    }

    logger.warn(`[Java] Cannot send command - no RCON or stdin available`);
    return {
      success: false,
      output: 'Server is not running or not connected',
      executedAt: new Date(),
    };
  }

  streamLogs(callback: (log: LogEntry) => void): void {
    this.logCallbacks.push(callback);

    // Send buffered logs
    this.logBuffer.forEach(log => callback(log));
  }

  stopLogStream(): void {
    this.logCallbacks = [];
  }

  async getLogs(limit: number = 100, _offset: number = 0): Promise<LogEntry[]> {
    return this.logBuffer.slice(-limit);
  }

  // ============================================
  // Player Management (basic implementation)
  // ============================================

  async getPlayers(): Promise<Player[]> {
    // Would need to parse server output or use RCON for real implementation
    return [];
  }

  async kickPlayer(uuid: string, reason?: string): Promise<void> {
    await this.sendCommand(`kick ${uuid} ${reason || ''}`);
  }

  async banPlayer(uuid: string, reason?: string, _duration?: number): Promise<void> {
    await this.sendCommand(`ban ${uuid} ${reason || ''}`);
  }

  async unbanPlayer(uuid: string): Promise<void> {
    await this.sendCommand(`pardon ${uuid}`);
  }

  async whitelistPlayer(uuid: string): Promise<void> {
    await this.sendCommand(`whitelist add ${uuid}`);
  }

  async unwhitelistPlayer(uuid: string): Promise<void> {
    await this.sendCommand(`whitelist remove ${uuid}`);
  }

  // ============================================
  // Mod Management
  // ============================================

  /**
   * Install a mod or modpack to the mods folder
   * - MODPACK: extract ZIP contents to mods/
   * - MOD/other: save directly as JAR file
   * @returns Array of installed files for database tracking
   */
  async installMod(modFile: Buffer, metadata: ModMetadata): Promise<InstalledFile[]> {
    const modsDir = this.getModsDir();
    // Relative path from workingDirectory for database storage
    const modsRelativePath = path.relative(this.workingDirectory, modsDir).replace(/\\/g, '/');
    logger.info(`[JavaAdapter] Installing mods to: ${modsDir}`);

    // Ensure mods directory exists
    await fs.ensureDir(modsDir);
    logger.info(`[JavaAdapter] ensureDir completed for ${modsDir}`);

    logger.info(`[JavaAdapter] Installing ${metadata.classification} "${metadata.projectTitle}" to ${modsDir}`);
    logger.info(`[JavaAdapter] modFile size: ${modFile.length} bytes`);

    const installedFiles: InstalledFile[] = [];

    // Use classification to determine how to handle the file
    // MODPACKs are ZIP archives that need to be extracted
    // MODs (and other types) are direct JAR files
    const isModpack = metadata.classification?.toUpperCase() === 'MODPACK';

    if (isModpack) {
      // Extract ZIP contents to mods folder
      const AdmZip = (await import('adm-zip')).default;
      const zip = new AdmZip(modFile);
      const zipEntries = zip.getEntries();

      for (const entry of zipEntries) {
        if (entry.isDirectory) continue;

        const fileName = path.basename(entry.entryName);
        const ext = path.extname(fileName).toLowerCase().slice(1);

        // Only extract JAR files and config files
        if (['jar', 'yml', 'json', 'toml'].includes(ext)) {
          const targetPath = path.join(modsDir, fileName);
          const data = entry.getData();
          await fs.writeFile(targetPath, data);

          installedFiles.push({
            fileName,
            filePath: `${modsRelativePath}/${fileName}`,
            fileSize: data.length,
            fileType: ext,
          });

          logger.info(`[JavaAdapter] Extracted: ${fileName} (${data.length} bytes)`);
        }
      }

      logger.info(`[JavaAdapter] Extracted ${installedFiles.length} files from modpack ${metadata.projectTitle}`);
    } else {
      // Single mod - save directly as JAR
      // Use original file name if provided, otherwise create one from project title
      let fileName = metadata.fileName;
      if (!fileName) {
        // Sanitize project title for use as filename
        const sanitizedTitle = metadata.projectTitle
          .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
          .replace(/\s+/g, '-')          // Replace spaces with hyphens
          .substring(0, 100);            // Limit length
        fileName = `${sanitizedTitle}.jar`;
      }
      // Ensure .jar extension
      if (!fileName.toLowerCase().endsWith('.jar')) {
        fileName = `${fileName}.jar`;
      }

      const targetPath = path.join(modsDir, fileName);
      await fs.writeFile(targetPath, modFile);

      installedFiles.push({
        fileName,
        filePath: `${modsRelativePath}/${fileName}`,
        fileSize: modFile.length,
        fileType: 'jar',
      });

      logger.info(`[JavaAdapter] Saved mod file: ${fileName}`);
    }

    return installedFiles;
  }

  /**
   * Delete specific mod files from the server
   * @param filePaths Array of relative file paths to delete
   */
  async deleteModFiles(filePaths: string[]): Promise<void> {
    for (const relativePath of filePaths) {
      const fullPath = path.join(this.workingDirectory, relativePath);

      if (await fs.pathExists(fullPath)) {
        await fs.remove(fullPath);
        logger.info(`[JavaAdapter] Deleted: ${relativePath}`);
      } else {
        logger.warn(`[JavaAdapter] File not found: ${relativePath}`);
      }
    }

    logger.info(`[JavaAdapter] Deleted ${filePaths.length} mod files`);
  }

  /**
   * Uninstall a mod by removing its file from the plugins folder
   * @deprecated Use deleteModFiles for better control over which files to delete
   */
  async uninstallMod(modId: string): Promise<void> {
    // Get mod info from database to find the files
    const mod = await this.prisma.mod.findUnique({
      where: { id: modId },
      include: { files: true },
    });

    if (!mod) {
      throw new Error(`Mod not found: ${modId}`);
    }

    // Delete all associated files
    if (mod.files && mod.files.length > 0) {
      const filePaths = mod.files.map(f => f.filePath);
      await this.deleteModFiles(filePaths);
    } else {
      logger.warn(`[JavaAdapter] No files found for mod ${modId}`);
    }
  }

  /**
   * Enable a mod by renaming it from .jar.disabled to .jar
   */
  async enableMod(modId: string): Promise<void> {
    const mod = await this.prisma.mod.findUnique({
      where: { id: modId },
      include: { files: true },
    });

    if (!mod) {
      throw new Error(`Mod not found: ${modId}`);
    }

    // Enable all jar files for this mod
    for (const file of mod.files) {
      if (file.fileType !== 'jar') continue;

      const fullPath = path.join(this.workingDirectory, file.filePath);
      const disabledPath = `${fullPath}.disabled`;

      if (await fs.pathExists(disabledPath)) {
        await fs.rename(disabledPath, fullPath);
        logger.info(`[JavaAdapter] Enabled: ${file.fileName}`);
      }
    }
  }

  /**
   * Disable a mod by renaming it from .jar to .jar.disabled
   */
  async disableMod(modId: string): Promise<void> {
    const mod = await this.prisma.mod.findUnique({
      where: { id: modId },
      include: { files: true },
    });

    if (!mod) {
      throw new Error(`Mod not found: ${modId}`);
    }

    // Disable all jar files for this mod
    for (const file of mod.files) {
      if (file.fileType !== 'jar') continue;

      const fullPath = path.join(this.workingDirectory, file.filePath);
      const disabledPath = `${fullPath}.disabled`;

      if (await fs.pathExists(fullPath)) {
        await fs.rename(fullPath, disabledPath);
        logger.info(`[JavaAdapter] Disabled: ${file.fileName}`);
      }
    }
  }

  /**
   * Get the mods directory path (relative to JAR location)
   */
  private getModsDir(): string {
    const jarDir = path.dirname(path.join(this.workingDirectory, this.jarFile));
    return path.join(jarDir, 'mods');
  }

  /**
   * List installed mods from the mods folder
   */
  async listInstalledMods(): Promise<Mod[]> {
    const modsDir = this.getModsDir();

    if (!await fs.pathExists(modsDir)) {
      return [];
    }

    // Get mods from database with their files
    const mods = await this.prisma.mod.findMany({
      where: { serverId: this.serverId },
      include: { files: true },
    });

    return mods.map(mod => ({
      id: mod.id,
      serverId: mod.serverId,
      projectId: mod.projectId,
      projectTitle: mod.projectTitle,
      projectIconUrl: mod.projectIconUrl || undefined,
      versionId: mod.versionId,
      versionName: mod.versionName,
      classification: mod.classification,
      archiveSize: mod.archiveSize,
      fileHash: mod.fileHash || undefined,
      enabled: mod.enabled,
      installedAt: mod.installedAt,
      updatedAt: mod.updatedAt,
      files: mod.files.map(f => ({
        id: f.id,
        modId: f.modId,
        fileName: f.fileName,
        filePath: f.filePath,
        fileSize: f.fileSize,
        fileType: f.fileType,
        createdAt: f.createdAt,
      })),
    }));
  }

  // ============================================
  // Backup Management (stub - handled by BackupService)
  // ============================================

  async createBackup(_name: string, _description?: string): Promise<Backup> {
    throw new Error('Use BackupService for backup management');
  }

  async restoreBackup(_backupId: string): Promise<void> {
    throw new Error('Use BackupService for backup management');
  }

  async deleteBackup(_backupId: string): Promise<void> {
    throw new Error('Use BackupService for backup management');
  }

  // ============================================
  // File Management (stub - handled by FileService)
  // ============================================

  async readFile(_relativePath: string): Promise<string> {
    throw new Error('Use FileService for file management');
  }

  async writeFile(_relativePath: string, _content: string): Promise<void> {
    throw new Error('Use FileService for file management');
  }

  async deleteFile(_relativePath: string): Promise<void> {
    throw new Error('Use FileService for file management');
  }

  async listFiles(_relativePath: string): Promise<string[]> {
    throw new Error('Use FileService for file management');
  }

  // ============================================
  // Process Persistence Methods
  // ============================================

  /**
   * Reconnect to an existing server process after manager restart
   */
  async reconnect(pid: number): Promise<boolean> {
    logger.info(`[Java] Attempting to reconnect to server ${this.serverId} (PID: ${pid})`);

    // Verify the process exists and is a Java process
    if (!await this.verifyProcess(pid)) {
      logger.warn(`[Java] Process ${pid} not found or not a Java process`);
      return false;
    }

    this.currentPid = pid;
    this.status.status = 'running';

    // Get startedAt from database
    const server = await this.prisma.server.findUnique({
      where: { id: this.serverId },
    });
    if (server?.startedAt) {
      this.startTime = server.startedAt;
    }

    // Connect via RCON
    try {
      await this.rconService.connect(
        this.serverId,
        '127.0.0.1',
        this.rconPort,
        this.rconPassword
      );
      this.useRcon = true;
      logger.info(`[Java] RCON connected for server ${this.serverId}`);
    } catch (error) {
      logger.warn(`[Java] RCON connection failed for ${this.serverId}:`, error);
      // Continue without RCON - can still tail logs
    }

    // Start log file tailing
    try {
      const logPath = this.logFilePath || LogTailService.findLogFile(this.workingDirectory) || '';
      if (logPath) {
        await this.logTailService.startTailing(this.serverId, logPath, (log) => {
          this.emitLog(log);
        });
        logger.info(`[Java] Log tailing started for server ${this.serverId}`);
      }
    } catch (error) {
      logger.warn(`[Java] Log tailing failed for ${this.serverId}:`, error);
    }

    // Start process monitoring to detect if the process dies
    this.startProcessMonitoring();

    logger.info(`[Java] Successfully reconnected to server ${this.serverId}`);
    return true;
  }

  /**
   * Disconnect from server without killing it
   */
  async disconnect(): Promise<void> {
    logger.info(`[Java] Disconnecting from server ${this.serverId}`);

    // Stop process monitoring
    this.stopProcessMonitoring();

    // Disconnect RCON
    if (this.rconService.isConnected(this.serverId)) {
      await this.rconService.disconnect(this.serverId);
    }
    this.useRcon = false;

    // Stop log tailing
    if (this.logTailService.isTailing(this.serverId)) {
      await this.logTailService.stopTailing(this.serverId);
    }

    // Clear process reference but don't kill
    this.process = null;
    // Keep currentPid for reference until explicitly cleared
  }

  /**
   * Check if connected to a running process
   */
  isConnected(): boolean {
    return !!(this.process || (this.currentPid && this.status.status === 'running'));
  }

  /**
   * Get current process ID
   */
  getPid(): number | null {
    return this.currentPid;
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Start monitoring the process to detect if it dies
   * Used for reconnected servers where we don't have process exit events
   */
  private startProcessMonitoring(): void {
    if (this.processMonitorInterval) {
      return; // Already monitoring
    }

    logger.info(`[Java] Starting process monitoring for server ${this.serverId}`);

    this.processMonitorInterval = setInterval(async () => {
      if (!this.currentPid || this.status.status !== 'running') {
        this.stopProcessMonitoring();
        return;
      }

      // Check if process is still alive
      const isAlive = await this.verifyProcess(this.currentPid);
      if (!isAlive) {
        logger.warn(`[Java] Process ${this.currentPid} for server ${this.serverId} is no longer running`);
        this.stopProcessMonitoring();
        await this.handleProcessExit(1); // Non-zero exit code indicates crash
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Stop monitoring the process
   */
  private stopProcessMonitoring(): void {
    if (this.processMonitorInterval) {
      clearInterval(this.processMonitorInterval);
      this.processMonitorInterval = null;
      logger.info(`[Java] Stopped process monitoring for server ${this.serverId}`);
    }
  }

  /**
   * Verify a process exists and is a Java server
   */
  private async verifyProcess(pid: number): Promise<boolean> {
    try {
      // SECURITY: Validate PID is a positive integer to prevent command injection
      if (!Number.isInteger(pid) || pid <= 0 || pid > 4194304) {
        logger.warn(`Invalid PID value: ${pid}`);
        return false;
      }
      const safePid = Math.floor(pid); // Ensure integer

      // Check if process exists by sending signal 0
      process.kill(safePid, 0);

      // On Windows, verify it's a Java process using PowerShell
      if (os.platform() === 'win32') {
        try {
          // Use spawnSync with array args to prevent command injection
          const result = spawnSync('powershell', [
            '-NoProfile',
            '-Command',
            `(Get-Process -Id ${safePid} -ErrorAction SilentlyContinue).ProcessName`
          ], { encoding: 'utf8', timeout: 5000, windowsHide: true });
          const processName = (result.stdout || '').trim().toLowerCase();
          return processName === 'java' || processName === 'javaw';
        } catch {
          return false;
        }
      } else {
        // On Unix, check /proc/<pid>/comm or use ps with spawnSync
        try {
          const result = spawnSync('ps', ['-p', String(safePid), '-o', 'comm='],
            { encoding: 'utf8', timeout: 5000 });
          return (result.stdout || '').toLowerCase().includes('java');
        } catch {
          return false;
        }
      }
    } catch {
      return false;
    }
  }

  /**
   * Persist process info to database
   */
  private async persistProcessInfo(): Promise<void> {
    await this.prisma.server.update({
      where: { id: this.serverId },
      data: {
        pid: this.currentPid,
        startedAt: this.startTime,
        rconPort: this.rconPort,
        rconPassword: this.rconPassword,
        logFilePath: this.logFilePath || LogTailService.findLogFile(this.workingDirectory),
      },
    });
  }

  /**
   * Clear process info from database
   */
  private async clearProcessInfo(): Promise<void> {
    await this.prisma.server.update({
      where: { id: this.serverId },
      data: {
        pid: null,
        startedAt: null,
      },
    });
  }

  /**
   * Enable RCON in server.properties
   */
  private async enableRconInProperties(): Promise<void> {
    const propsPath = path.join(this.workingDirectory, 'server.properties');

    // Check if server.properties exists
    if (!await fs.pathExists(propsPath)) {
      logger.warn(`[Java] server.properties not found, RCON may not work`);
      return;
    }

    try {
      let content = await fs.readFile(propsPath, 'utf-8');
      const lines = content.split('\n');
      const props: Record<string, string> = {};

      // Parse existing properties
      lines.forEach(line => {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
          props[match[1].trim()] = match[2].trim();
        }
      });

      // Enable RCON
      props['enable-rcon'] = 'true';
      props['rcon.port'] = String(this.rconPort);
      props['rcon.password'] = this.rconPassword;

      // Reconstruct file
      const newLines = lines.filter(line => {
        const match = line.match(/^([^#=]+)=/);
        if (match) {
          const key = match[1].trim();
          return !['enable-rcon', 'rcon.port', 'rcon.password'].includes(key);
        }
        return true;
      });

      // Add RCON settings at the end
      newLines.push(`enable-rcon=true`);
      newLines.push(`rcon.port=${this.rconPort}`);
      newLines.push(`rcon.password=${this.rconPassword}`);

      await fs.writeFile(propsPath, newLines.join('\n'));
      logger.info(`[Java] RCON enabled in server.properties (port: ${this.rconPort})`);
    } catch (error) {
      logger.error(`[Java] Failed to update server.properties:`, error);
    }
  }

  /**
   * Transition from stdout to RCON + log tailing
   */
  private async transitionToRconAndLogTail(): Promise<void> {
    logger.info(`[Java] Transitioning to RCON + log tailing for ${this.serverId}`);

    // Wait a bit for RCON to be ready
    await this.delay(2000);

    // Connect RCON
    try {
      await this.rconService.connect(
        this.serverId,
        '127.0.0.1',
        this.rconPort,
        this.rconPassword
      );
      this.useRcon = true;
      logger.info(`[Java] RCON connected for server ${this.serverId}`);
    } catch (error) {
      logger.warn(`[Java] RCON connection failed, will continue with stdin:`, error);
    }

    // Start log file tailing (will coexist with stdout initially)
    const logPath = this.logFilePath || LogTailService.findLogFile(this.workingDirectory);
    if (logPath) {
      try {
        await this.logTailService.startTailing(this.serverId, logPath, (log) => {
          this.emitLog(log);
        });
        logger.info(`[Java] Log tailing started for ${this.serverId}`);
      } catch (error) {
        logger.warn(`[Java] Log tailing failed:`, error);
      }
    }
  }

  /**
   * Handle process exit
   */
  private async handleProcessExit(code: number | null): Promise<void> {
    // Stop process monitoring
    this.stopProcessMonitoring();

    this.process = null;
    this.currentPid = null;
    this.status.status = code === 0 ? 'stopped' : 'crashed';
    this.status.playerCount = 0;
    this.startTime = null;

    // Cleanup
    await this.disconnect();
    await this.clearProcessInfo();

    // Update status in database
    await this.prisma.server.update({
      where: { id: this.serverId },
      data: { status: this.status.status },
    });

    this.emitLog({
      timestamp: new Date(),
      level: code === 0 ? 'info' : 'error',
      message: `Server ${code === 0 ? 'stopped' : 'crashed'} (exit code: ${code})`,
      source: 'system',
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private parseLogLine(line: string): LogEntry {
    let level: 'info' | 'warn' | 'error' | 'debug' = 'info';

    if (line.includes('/WARN') || line.includes('[WARN]')) {
      level = 'warn';
    } else if (line.includes('/ERROR') || line.includes('[ERROR]') || line.includes('Exception')) {
      level = 'error';
    } else if (line.includes('/DEBUG') || line.includes('[DEBUG]')) {
      level = 'debug';
    }

    return {
      timestamp: new Date(),
      level,
      message: line,
      source: 'server',
    };
  }

  private emitLog(log: LogEntry): void {
    // Add to buffer
    this.logBuffer.push(log);
    if (this.logBuffer.length > this.maxLogBuffer) {
      this.logBuffer.shift();
    }

    // Notify callbacks
    this.logCallbacks.forEach(callback => {
      try {
        callback(log);
      } catch (error) {
        logger.error('Error in log callback:', error);
      }
    });
  }

  private waitForExit(timeout: number): Promise<void> {
    return new Promise((resolve) => {
      if (!this.process) {
        resolve();
        return;
      }

      const timer = setTimeout(() => {
        resolve();
      }, timeout);

      this.process.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
}
