import path from 'path';
import fs from 'fs-extra';
import axios from 'axios';
import { spawn } from 'child_process';
import { Extract } from 'unzipper';
import { VERSION, getBasePath_ } from '../config';
import logger from '../utils/logger';

interface ReleaseInfo {
  tagName: string;
  version: string;
  name: string;
  body: string;
  publishedAt: string;
  htmlUrl: string;
  assets: Array<{
    name: string;
    downloadUrl: string;
    size: number;
  }>;
}

interface UpdateStatus {
  status: 'idle' | 'checking' | 'downloading' | 'extracting' | 'applying' | 'restarting' | 'error';
  progress?: number;
  message?: string;
  error?: string;
}

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
    size: number;
  }>;
}

class UpdateService {
  private status: UpdateStatus = { status: 'idle' };
  private githubRepo = 'nebula-codes/hytale_server_manager';

  getStatus(): UpdateStatus {
    return { ...this.status };
  }

  private setStatus(status: Partial<UpdateStatus>) {
    this.status = { ...this.status, ...status };
    logger.info(`[UpdateService] Status: ${this.status.status} - ${this.status.message || ''}`);
  }

  async getLatestRelease(): Promise<ReleaseInfo | null> {
    try {
      const response = await axios.get<GitHubRelease>(
        `https://api.github.com/repos/${this.githubRepo}/releases/latest`,
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'HytaleServerManager',
          },
        }
      );

      const release = response.data;
      return {
        tagName: release.tag_name,
        version: release.tag_name.replace(/^v/, ''),
        name: release.name,
        body: release.body,
        publishedAt: release.published_at,
        htmlUrl: release.html_url,
        assets: release.assets.map((asset) => ({
          name: asset.name,
          downloadUrl: asset.browser_download_url,
          size: asset.size,
        })),
      };
    } catch (error: any) {
      logger.error('[UpdateService] Failed to fetch latest release:', error.message);
      return null;
    }
  }

  async checkForUpdates(): Promise<{
    updateAvailable: boolean;
    currentVersion: string;
    latestVersion?: string;
    releaseInfo?: ReleaseInfo;
  }> {
    const release = await this.getLatestRelease();

    if (!release) {
      return {
        updateAvailable: false,
        currentVersion: VERSION,
      };
    }

    const updateAvailable = this.compareVersions(release.version, VERSION) > 0;

    return {
      updateAvailable,
      currentVersion: VERSION,
      latestVersion: release.version,
      releaseInfo: release,
    };
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }

  async applyUpdate(): Promise<{ success: boolean; message: string }> {
    const isWindows = process.platform === 'win32';

    try {
      this.setStatus({ status: 'checking', message: 'Checking for updates...' });

      // Get latest release
      const release = await this.getLatestRelease();
      if (!release) {
        throw new Error('Failed to fetch release information');
      }

      // Check if update is needed
      if (this.compareVersions(release.version, VERSION) <= 0) {
        this.setStatus({ status: 'idle', message: 'Already on latest version' });
        return { success: false, message: 'Already running the latest version' };
      }

      // Find the right asset
      const assetName = isWindows ? 'windows' : 'linux';
      const asset = release.assets.find(a => a.name.includes(assetName));
      if (!asset) {
        throw new Error(`No ${assetName} release package found`);
      }

      // Clean up any previous temp directory and create fresh one
      const tempDir = path.join(getBasePath_(), 'data', 'temp-update');
      await fs.remove(tempDir);
      await fs.ensureDir(tempDir);

      const downloadPath = path.join(tempDir, asset.name);
      const extractPath = path.join(tempDir, 'extracted');

      // Download the release
      this.setStatus({ status: 'downloading', message: 'Downloading update...', progress: 0 });

      const response = await axios.get(asset.downloadUrl, {
        responseType: 'stream',
      });

      const totalSize = parseInt(response.headers['content-length'] as string || '0', 10);
      let downloadedSize = 0;

      const writer = fs.createWriteStream(downloadPath);
      const dataStream = response.data as NodeJS.ReadableStream;

      dataStream.on('data', (chunk: Buffer) => {
        downloadedSize += chunk.length;
        if (totalSize > 0) {
          const progress = Math.round((downloadedSize / totalSize) * 100);
          this.setStatus({ status: 'downloading', progress, message: `Downloading... ${progress}%` });
        }
      });

      dataStream.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      this.setStatus({ status: 'extracting', message: 'Extracting update...' });

      // Extract the zip
      await fs.ensureDir(extractPath);
      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(downloadPath)
          .pipe(Extract({ path: extractPath }))
          .on('close', resolve)
          .on('error', reject);
      });

      // Find the extracted folder (might be nested)
      const extractedContents = await fs.readdir(extractPath);
      let sourcePath = extractPath;
      if (extractedContents.length === 1) {
        const possibleDir = path.join(extractPath, extractedContents[0]);
        if ((await fs.stat(possibleDir)).isDirectory()) {
          sourcePath = possibleDir;
        }
      }

      this.setStatus({ status: 'applying', message: 'Preparing update...' });

      // Create the updater script
      const updaterScript = isWindows
        ? this.createWindowsUpdaterScript(sourcePath, getBasePath_(), tempDir)
        : this.createLinuxUpdaterScript(sourcePath, getBasePath_(), tempDir);

      const scriptPath = path.join(tempDir, isWindows ? 'updater.bat' : 'updater.sh');
      await fs.writeFile(scriptPath, updaterScript);

      if (!isWindows) {
        await fs.chmod(scriptPath, 0o755);
      }

      this.setStatus({ status: 'restarting', message: 'Restarting server with new version...' });

      // Spawn the updater script as a detached process
      const child = spawn(
        isWindows ? 'cmd.exe' : '/bin/bash',
        isWindows ? ['/c', scriptPath] : [scriptPath],
        {
          detached: true,
          stdio: 'ignore',
          cwd: tempDir,
          windowsHide: true,
        }
      );

      child.unref();

      // Give the script a moment to start
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Exit the current process
      logger.info('[UpdateService] Update initiated, shutting down for update...');

      // Delay exit slightly to allow response to be sent
      setTimeout(() => {
        process.exit(0);
      }, 500);

      return { success: true, message: 'Update started. Server will restart shortly.' };

    } catch (error: any) {
      logger.error('[UpdateService] Update failed:', error);
      this.setStatus({ status: 'error', error: error.message });
      return { success: false, message: error.message };
    }
  }

  private createWindowsUpdaterScript(sourcePath: string, installPath: string, tempDir: string): string {
    return `@echo off
:: Hytale Server Manager - Auto Updater
:: This script is auto-generated and will be deleted after use

echo ======================================
echo   Hytale Server Manager - Updating
echo ======================================
echo.

:: Wait for the server to fully exit
echo Waiting for server to stop...
timeout /t 5 /nobreak > nul

:: Create backup of current config and database
echo Creating backup...
if exist "${installPath}\\config.json" (
    copy "${installPath}\\config.json" "${tempDir}\\config.json.backup" > nul
)
if exist "${installPath}\\.env" (
    copy "${installPath}\\.env" "${tempDir}\\.env.backup" > nul
)
if exist "${installPath}\\prisma\\data\\hytalepanel.db" (
    copy "${installPath}\\prisma\\data\\hytalepanel.db" "${tempDir}\\hytalepanel.db.backup" > nul
)

:: Remove old files (except data, backups, config)
echo Removing old files...
for %%F in ("${installPath}\\*") do (
    if /I not "%%~nxF"=="data" (
        if /I not "%%~nxF"=="backups" (
            if /I not "%%~nxF"=="config.json" (
                if /I not "%%~nxF"==".env" (
                    del /q "%%F" 2>nul
                )
            )
        )
    )
)

for /D %%D in ("${installPath}\\*") do (
    if /I not "%%~nxD"=="data" (
        if /I not "%%~nxD"=="backups" (
            if /I not "%%~nxD"=="node_modules" (
                rmdir /s /q "%%D" 2>nul
            )
        )
    )
)

:: Copy new files
echo Installing new version...
xcopy "${sourcePath}\\*" "${installPath}\\" /E /H /Y /Q > nul

:: Restore config and database
echo Restoring configuration...
if exist "${tempDir}\\config.json.backup" (
    copy "${tempDir}\\config.json.backup" "${installPath}\\config.json" > nul
)
if exist "${tempDir}\\.env.backup" (
    copy "${tempDir}\\.env.backup" "${installPath}\\.env" > nul
)
if not exist "${installPath}\\prisma\\data" mkdir "${installPath}\\prisma\\data"
if exist "${tempDir}\\hytalepanel.db.backup" (
    copy "${tempDir}\\hytalepanel.db.backup" "${installPath}\\prisma\\data\\hytalepanel.db" > nul
)

:: Run database migrations
echo Running database migrations...
cd /d "${installPath}"
node node_modules\\prisma\\build\\index.js db push --accept-data-loss --schema=prisma\\schema.prisma 2>nul

:: Start the server (cleanup happens on next update since we can't delete running script)
echo.
echo ======================================
echo   Update complete! Starting server...
echo ======================================
echo.

cd /d "${installPath}"
start "" "${installPath}\\start.bat"
`;
  }

  private createLinuxUpdaterScript(sourcePath: string, installPath: string, tempDir: string): string {
    return `#!/bin/bash
# Hytale Server Manager - Auto Updater
# This script is auto-generated and will be deleted after use

echo "======================================"
echo "  Hytale Server Manager - Updating"
echo "======================================"
echo

# Wait for the server to fully exit
echo "Waiting for server to stop..."
sleep 5

# Create backup of current config and database
echo "Creating backup..."
if [ -f "${installPath}/config.json" ]; then
    cp "${installPath}/config.json" "${tempDir}/config.json.backup"
fi
if [ -f "${installPath}/.env" ]; then
    cp "${installPath}/.env" "${tempDir}/.env.backup"
fi
if [ -f "${installPath}/prisma/data/hytalepanel.db" ]; then
    cp "${installPath}/prisma/data/hytalepanel.db" "${tempDir}/hytalepanel.db.backup"
fi

# Remove old files (except data, backups, config)
echo "Removing old files..."
cd "${installPath}"
find . -maxdepth 1 -type f ! -name "config.json" ! -name ".env" -delete 2>/dev/null
find . -maxdepth 1 -type d ! -name "." ! -name "data" ! -name "backups" ! -name "node_modules" -exec rm -rf {} + 2>/dev/null

# Copy new files
echo "Installing new version..."
cp -r "${sourcePath}"/* "${installPath}/"

# Restore config and database
echo "Restoring configuration..."
if [ -f "${tempDir}/config.json.backup" ]; then
    cp "${tempDir}/config.json.backup" "${installPath}/config.json"
fi
if [ -f "${tempDir}/.env.backup" ]; then
    cp "${tempDir}/.env.backup" "${installPath}/.env"
fi
mkdir -p "${installPath}/prisma/data"
if [ -f "${tempDir}/hytalepanel.db.backup" ]; then
    cp "${tempDir}/hytalepanel.db.backup" "${installPath}/prisma/data/hytalepanel.db"
fi

# Run database migrations
echo "Running database migrations..."
cd "${installPath}"
./node_modules/.bin/prisma db push --accept-data-loss --schema=prisma/schema.prisma 2>/dev/null

# Cleanup temp directory
echo "Cleaning up..."
rm -rf "${tempDir}"

# Start the server
echo
echo "======================================"
echo "  Update complete! Starting server..."
echo "======================================"
echo

"${installPath}/start.sh"
`;
  }
}

export const updateService = new UpdateService();
