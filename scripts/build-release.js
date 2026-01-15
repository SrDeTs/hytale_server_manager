#!/usr/bin/env node
/**
 * Hytale Server Manager - Release Build Script
 *
 * This script builds release packages for Windows and Linux.
 * It will:
 * - Build the frontend
 * - Build the backend
 * - Create release packages (zip for Windows, tar.gz for Linux)
 *
 * Usage: node scripts/build-release.js [OPTIONS]
 *
 * Options:
 *   --version VERSION   Set the release version (e.g., 1.0.0)
 *   --windows-only      Only build Windows package
 *   --linux-only        Only build Linux package
 *   --skip-build        Skip build step, just package existing builds
 *   --output DIR        Output directory for packages (default: ./releases)
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const archiver = require('archiver');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  version: null,
  windowsOnly: false,
  linuxOnly: false,
  skipBuild: false,
  outputDir: './releases',
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--version':
      options.version = args[++i];
      break;
    case '--windows-only':
      options.windowsOnly = true;
      break;
    case '--linux-only':
      options.linuxOnly = true;
      break;
    case '--skip-build':
      options.skipBuild = true;
      break;
    case '--output':
      options.outputDir = args[++i];
      break;
    case '--help':
      console.log(`
Hytale Server Manager - Release Build Script

Usage: node scripts/build-release.js [OPTIONS]

Options:
  --version VERSION   Set the release version (e.g., 1.0.0)
  --windows-only      Only build Windows package
  --linux-only        Only build Linux package
  --skip-build        Skip build step, just package existing builds
  --output DIR        Output directory for packages (default: ./releases)
  --help              Show this help message
`);
      process.exit(0);
  }
}

// Paths
const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.join(rootDir, 'packages', 'frontend');
const serverDir = path.join(rootDir, 'packages', 'server');
const distDir = path.join(frontendDir, 'dist');
const serverDistDir = path.join(serverDir, 'dist');
const outputDir = path.resolve(options.outputDir);
const tempDir = path.join(outputDir, 'temp');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(message) {
  log(`\n▶ ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function exec(command, cwd = rootDir) {
  log(`  $ ${command}`, 'yellow');
  try {
    execSync(command, { cwd, stdio: 'inherit' });
  } catch (error) {
    logError(`Command failed: ${command}`);
    process.exit(1);
  }
}

async function getVersion() {
  if (options.version) {
    return options.version;
  }

  // Read from server package.json
  const packageJson = await fs.readJson(path.join(serverDir, 'package.json'));
  return packageJson.version;
}

async function updateVersion(version) {
  logStep(`Updating version to ${version}`);

  // Update server package.json
  const serverPkg = await fs.readJson(path.join(serverDir, 'package.json'));
  serverPkg.version = version;
  await fs.writeJson(path.join(serverDir, 'package.json'), serverPkg, { spaces: 2 });

  // Update frontend package.json
  const frontendPkg = await fs.readJson(path.join(frontendDir, 'package.json'));
  frontendPkg.version = version;
  await fs.writeJson(path.join(frontendDir, 'package.json'), frontendPkg, { spaces: 2 });

  // Update config.ts VERSION constant
  const configPath = path.join(serverDir, 'src', 'config.ts');
  let configContent = await fs.readFile(configPath, 'utf-8');
  configContent = configContent.replace(
    /export const VERSION = '[^']*'/,
    `export const VERSION = '${version}'`
  );
  await fs.writeFile(configPath, configContent);

  logSuccess(`Version updated to ${version}`);
}

async function buildFrontend() {
  logStep('Building frontend...');
  exec('pnpm -C packages/frontend build', rootDir);
  logSuccess('Frontend built');
}

async function buildBackend() {
  logStep('Building backend...');
  exec('pnpm -C packages/server build', rootDir);
  logSuccess('Backend built');
}

async function createPackageBase(packageDir) {
  logStep('Creating package base...');

  // Create directory structure
  await fs.ensureDir(packageDir);
  await fs.ensureDir(path.join(packageDir, 'public'));
  await fs.ensureDir(path.join(packageDir, 'prisma'));
  await fs.ensureDir(path.join(packageDir, 'data', 'db'));
  await fs.ensureDir(path.join(packageDir, 'data', 'logs'));
  await fs.ensureDir(path.join(packageDir, 'data', 'servers'));
  await fs.ensureDir(path.join(packageDir, 'data', 'backups'));

  // Copy backend dist
  await fs.copy(serverDistDir, path.join(packageDir, 'dist'));

  // Copy frontend dist
  await fs.copy(distDir, path.join(packageDir, 'public'));

  // Copy Prisma files
  await fs.copy(
    path.join(serverDir, 'prisma', 'schema.prisma'),
    path.join(packageDir, 'prisma', 'schema.prisma')
  );

  // Copy .env.example
  await fs.copy(
    path.join(serverDir, '.env.example'),
    path.join(packageDir, '.env.example')
  );

  // Copy package.json (without devDependencies)
  const serverPkg = await fs.readJson(path.join(serverDir, 'package.json'));
  delete serverPkg.devDependencies;
  serverPkg.scripts = {
    start: 'node dist/index.js',
    'prisma:generate': 'prisma generate',
    'prisma:push': 'prisma db push',
  };
  await fs.writeJson(path.join(packageDir, 'package.json'), serverPkg, { spaces: 2 });

  // Install production dependencies
  logStep('Installing production dependencies...');
  exec('npm install --omit=dev', packageDir);
  logSuccess('Dependencies installed');

  // Generate Prisma client
  logStep('Generating Prisma client...');
  exec('npx prisma generate', packageDir);
  logSuccess('Prisma client generated');

  logSuccess('Package base created');
}

async function createWindowsPackage(version) {
  logStep('Creating Windows package...');

  const packageName = `hytale-server-manager-${version}-windows`;
  const packageDir = path.join(tempDir, packageName);

  // Create base package
  await createPackageBase(packageDir);

  // Copy Windows scripts
  await fs.copy(
    path.join(rootDir, 'scripts', 'windows'),
    path.join(packageDir, 'scripts')
  );

  // Create simple batch files in root
  await fs.writeFile(
    path.join(packageDir, 'start.bat'),
    `@echo off
cd /d "%~dp0"
set NODE_ENV=production
set HSM_BASE_PATH=%~dp0
echo Starting Hytale Server Manager...
node dist\\index.js
pause
`
  );

  await fs.writeFile(
    path.join(packageDir, 'install.bat'),
    `@echo off
:: Hytale Server Manager - Windows Installer

cd /d "%~dp0"
echo.
echo ======================================
echo   Hytale Server Manager - Setup
echo ======================================
echo.

:: Check for Node.js
echo Checking for Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js not found. Installing automatically...
    echo.
    echo Downloading Node.js v20...
    PowerShell -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.1/node-v20.18.1-x64.msi' -OutFile '%TEMP%\\node-install.msi'"
    echo Installing Node.js - please approve the admin prompt...
    PowerShell -ExecutionPolicy Bypass -Command "Start-Process msiexec.exe -ArgumentList '/i','%TEMP%\\node-install.msi','/passive','/norestart' -Wait -Verb RunAs"
    del "%TEMP%\\node-install.msi" >nul 2>&1
    echo Node.js installation complete.
    echo.
    echo Please close this window and run install.bat again.
    echo This is required for the new PATH to take effect.
    pause
    exit /b 0
)

echo Node.js found.
node --version

echo Checking environment configuration...
if not exist ".env" (
    echo Creating .env from template...
    copy .env.example .env >nul
)

echo Generating secrets if needed...
node -e "const fs=require('fs');const crypto=require('crypto');let env=fs.readFileSync('.env','utf8');let changed=false;if(/^JWT_SECRET=$/m.test(env)){env=env.replace(/^JWT_SECRET=$/m,'JWT_SECRET='+crypto.randomBytes(64).toString('hex'));changed=true;}if(/^JWT_REFRESH_SECRET=$/m.test(env)){env=env.replace(/^JWT_REFRESH_SECRET=$/m,'JWT_REFRESH_SECRET='+crypto.randomBytes(64).toString('hex'));changed=true;}if(/^SETTINGS_ENCRYPTION_KEY=$/m.test(env)){env=env.replace(/^SETTINGS_ENCRYPTION_KEY=$/m,'SETTINGS_ENCRYPTION_KEY='+crypto.randomBytes(16).toString('hex'));changed=true;}if(changed){fs.writeFileSync('.env',env);console.log('Generated missing secrets in .env');}else{console.log('Secrets already configured.');}"

echo.
echo Creating data directories...
if not exist "data" mkdir data
if not exist "data\\db" mkdir data\\db
if not exist "data\\logs" mkdir data\\logs
if not exist "data\\servers" mkdir data\\servers
if not exist "data\\backups" mkdir data\\backups
echo Data directories ready.

echo.
echo Setting up database...
echo.
echo Checking Prisma schema...
if not exist "prisma\\schema.prisma" (
    echo ERROR: prisma\\schema.prisma not found!
    pause
    exit /b 1
)
echo Found prisma\\schema.prisma

echo.
echo Running Prisma generate...
node node_modules\\prisma\\build\\index.js generate --schema=prisma\\schema.prisma
if errorlevel 1 (
    echo ERROR: Prisma generate failed!
    pause
    exit /b 1
)
echo Prisma client generated.

echo.
echo Running database setup...
node node_modules\\prisma\\build\\index.js db push --accept-data-loss --schema=prisma\\schema.prisma
if errorlevel 1 (
    echo ERROR: Database setup failed!
    pause
    exit /b 1
)

echo.
echo Verifying database was created...
if exist "data\\hytalepanel.db" (
    echo Database file created: data\\hytalepanel.db
) else (
    echo WARNING: Database file not found at data\\hytalepanel.db
    echo Checking alternative locations...
    dir /s /b *.db 2>nul
)
echo Database setup complete.
echo.
echo ======================================
echo   Setup complete!
echo ======================================
echo.
echo Run start.bat to launch the application.
pause
`
  );

  // Create zip
  const zipPath = path.join(outputDir, `${packageName}.zip`);
  await createZip(packageDir, zipPath);

  logSuccess(`Windows package created: ${zipPath}`);
  return zipPath;
}

async function createLinuxPackage(version) {
  logStep('Creating Linux package...');

  const packageName = `hytale-server-manager-${version}-linux`;
  const packageDir = path.join(tempDir, packageName);

  // Create base package
  await createPackageBase(packageDir);

  // Copy Linux scripts
  await fs.copy(
    path.join(rootDir, 'scripts', 'linux'),
    path.join(packageDir, 'scripts')
  );

  // Create simple shell scripts in root
  await fs.writeFile(
    path.join(packageDir, 'start.sh'),
    `#!/bin/bash
cd "$(dirname "$0")"
export NODE_ENV=production
export HSM_BASE_PATH="$(pwd)"
echo "Starting Hytale Server Manager..."
node dist/index.js
`
  );

  await fs.writeFile(
    path.join(packageDir, 'install.sh'),
    `#!/bin/bash
echo "Running installation script..."
sudo bash "$(dirname "$0")/scripts/install.sh" -p "$(dirname "$0")"
`
  );

  // Make scripts executable
  await fs.chmod(path.join(packageDir, 'start.sh'), 0o755);
  await fs.chmod(path.join(packageDir, 'install.sh'), 0o755);

  const scriptsDir = path.join(packageDir, 'scripts');
  const scripts = await fs.readdir(scriptsDir);
  for (const script of scripts) {
    if (script.endsWith('.sh')) {
      await fs.chmod(path.join(scriptsDir, script), 0o755);
    }
  }

  // Create tar.gz
  const tarPath = path.join(outputDir, `${packageName}.tar.gz`);
  await createTarGz(packageDir, tarPath, packageName);

  logSuccess(`Linux package created: ${tarPath}`);
  return tarPath;
}

function createZip(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(sourceDir, path.basename(sourceDir));
    archive.finalize();
  });
}

function createTarGz(sourceDir, outputPath, dirName) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('tar', { gzip: true, gzipOptions: { level: 9 } });

    output.on('close', resolve);
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(sourceDir, dirName);
    archive.finalize();
  });
}

async function cleanup() {
  logStep('Cleaning up...');
  await fs.remove(tempDir);
  logSuccess('Cleanup complete');
}

async function main() {
  console.log(`
${colors.bright}╔════════════════════════════════════════════╗
║   Hytale Server Manager - Release Builder  ║
╚════════════════════════════════════════════╝${colors.reset}
`);

  try {
    // Get version
    const version = await getVersion();
    log(`Building version: ${version}`, 'bright');

    // Update version in source files
    if (options.version) {
      await updateVersion(version);
    }

    // Build
    if (!options.skipBuild) {
      await buildFrontend();
      await buildBackend();
    }

    // Create output directory
    await fs.ensureDir(outputDir);
    await fs.ensureDir(tempDir);

    // Create packages
    const packages = [];

    if (!options.linuxOnly) {
      packages.push(await createWindowsPackage(version));
    }

    if (!options.windowsOnly) {
      packages.push(await createLinuxPackage(version));
    }

    // Cleanup
    await cleanup();

    // Summary
    console.log(`
${colors.green}╔════════════════════════════════════════════╗
║           Build Complete!                   ║
╚════════════════════════════════════════════╝${colors.reset}

Version: ${version}
Output:  ${outputDir}

Packages created:
${packages.map((p) => `  - ${path.basename(p)}`).join('\n')}

To create a GitHub release:
  1. Create a new release at: https://github.com/nebula-codes/hytale_server_manager/releases/new
  2. Tag: v${version}
  3. Upload the package files above
  4. Publish the release
`);
  } catch (error) {
    logError(`Build failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main();
