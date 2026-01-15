#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Hytale Server Manager - Windows Installation Script

.DESCRIPTION
    This script installs and configures the Hytale Server Manager on Windows.
    It will:
    - Check for Node.js and install if needed
    - Set up the application directory
    - Install dependencies
    - Configure the application as a Windows service (optional)
    - Create firewall rules (optional)

.PARAMETER InstallPath
    The installation directory. Default: C:\HytaleServerManager

.PARAMETER ServiceName
    The Windows service name. Default: HytaleServerManager

.PARAMETER Port
    The port to run the application on. Default: 3001

.PARAMETER NoService
    Skip Windows service installation

.PARAMETER NoFirewall
    Skip firewall rule creation

.EXAMPLE
    .\install.ps1
    .\install.ps1 -InstallPath "D:\HSM" -Port 8080
    .\install.ps1 -NoService
#>

param(
    [string]$InstallPath = "C:\HytaleServerManager",
    [string]$ServiceName = "HytaleServerManager",
    [int]$Port = 3001,
    [switch]$NoService,
    [switch]$NoFirewall
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Status { param($Message) Write-Host "[*] $Message" -ForegroundColor Cyan }
function Write-Success { param($Message) Write-Host "[+] $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "[!] $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "[-] $Message" -ForegroundColor Red }

Write-Host ""
Write-Host "======================================" -ForegroundColor Magenta
Write-Host "  Hytale Server Manager Installer" -ForegroundColor Magenta
Write-Host "======================================" -ForegroundColor Magenta
Write-Host ""

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script must be run as Administrator"
    Write-Host "Right-click PowerShell and select 'Run as Administrator'"
    exit 1
}

# Check for Node.js
Write-Status "Checking for Node.js..."
$nodeVersion = $null
try {
    $nodeVersion = & node --version 2>$null
} catch {}

if ($nodeVersion) {
    Write-Success "Node.js found: $nodeVersion"

    # Check version is 18+
    $versionNum = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($versionNum -lt 18) {
        Write-Warning "Node.js version 18 or higher is required. Current: $nodeVersion"
        Write-Status "Upgrading Node.js to v20..."

        $nodeInstaller = "$env:TEMP\node-installer.msi"
        Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.18.1/node-v20.18.1-x64.msi" -OutFile $nodeInstaller

        Write-Status "Installing Node.js v20..."
        Start-Process msiexec.exe -ArgumentList "/i `"$nodeInstaller`" /qn" -Wait

        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

        # Verify installation
        $newVersion = & node --version 2>$null
        Write-Success "Node.js upgraded to: $newVersion"

        # Cleanup
        Remove-Item $nodeInstaller -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Warning "Node.js not found. Installing automatically..."

    Write-Status "Downloading Node.js v20 installer..."
    $nodeInstaller = "$env:TEMP\node-installer.msi"
    Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.18.1/node-v20.18.1-x64.msi" -OutFile $nodeInstaller

    Write-Status "Installing Node.js v20..."
    Start-Process msiexec.exe -ArgumentList "/i `"$nodeInstaller`" /qn" -Wait

    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

    # Verify installation
    try {
        $installedVersion = & node --version 2>$null
        Write-Success "Node.js installed: $installedVersion"
    } catch {
        Write-Error "Node.js installation failed. Please install manually from https://nodejs.org/"
        exit 1
    }

    # Cleanup
    Remove-Item $nodeInstaller -Force -ErrorAction SilentlyContinue
}

# Create installation directory
Write-Status "Creating installation directory: $InstallPath"
if (-not (Test-Path $InstallPath)) {
    New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
}

# Check if this is an upgrade or fresh install
$isUpgrade = Test-Path "$InstallPath\package.json"
if ($isUpgrade) {
    Write-Status "Existing installation detected - performing upgrade"

    # Backup config
    if (Test-Path "$InstallPath\config.json") {
        Copy-Item "$InstallPath\config.json" "$InstallPath\config.json.backup" -Force
        Write-Success "Backed up config.json"
    }
}

# Copy application files
Write-Status "Copying application files..."
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceDir = Split-Path -Parent (Split-Path -Parent $scriptDir)

# Copy server files
Copy-Item "$sourceDir\packages\server\*" -Destination "$InstallPath" -Recurse -Force -Exclude @("node_modules", ".env")
Copy-Item "$sourceDir\packages\frontend\dist\*" -Destination "$InstallPath\public" -Recurse -Force

Write-Success "Files copied successfully"

# Install dependencies
Write-Status "Installing dependencies..."
Push-Location $InstallPath
try {
    & npm install --omit=dev 2>&1 | Out-Null
    Write-Success "Dependencies installed"
} catch {
    Write-Error "Failed to install dependencies: $_"
    Pop-Location
    exit 1
}
Pop-Location

# Setup .env file
Write-Status "Setting up environment configuration..."
if (-not (Test-Path "$InstallPath\.env")) {
    if (Test-Path "$InstallPath\.env.example") {
        Copy-Item "$InstallPath\.env.example" "$InstallPath\.env"
        Write-Success "Created .env from template"
    }
}

# Generate secrets if needed
if (Test-Path "$InstallPath\.env") {
    Write-Status "Generating secrets if needed..."
    Push-Location $InstallPath
    try {
        $secretScript = @"
const fs = require('fs');
const crypto = require('crypto');
let env = fs.readFileSync('.env', 'utf8');
let changed = false;
if (/^JWT_SECRET=$/m.test(env)) {
  env = env.replace(/^JWT_SECRET=$/m, 'JWT_SECRET=' + crypto.randomBytes(64).toString('hex'));
  changed = true;
}
if (/^JWT_REFRESH_SECRET=$/m.test(env)) {
  env = env.replace(/^JWT_REFRESH_SECRET=$/m, 'JWT_REFRESH_SECRET=' + crypto.randomBytes(64).toString('hex'));
  changed = true;
}
if (/^SETTINGS_ENCRYPTION_KEY=$/m.test(env)) {
  env = env.replace(/^SETTINGS_ENCRYPTION_KEY=$/m, 'SETTINGS_ENCRYPTION_KEY=' + crypto.randomBytes(16).toString('hex'));
  changed = true;
}
if (changed) {
  fs.writeFileSync('.env', env);
  console.log('Generated missing secrets');
} else {
  console.log('Secrets already configured');
}
"@
        & node -e $secretScript
        Write-Success "Environment configured"
    } catch {
        Write-Warning "Secret generation warning: $_"
    }
    Pop-Location
}

# Generate Prisma client and run migrations
Write-Status "Setting up database..."
Push-Location $InstallPath
try {
    & npx prisma generate 2>&1 | Out-Null
    & npx prisma migrate deploy 2>&1 | Out-Null
    Write-Success "Database configured"
} catch {
    Write-Warning "Database setup warning: $_"
}
Pop-Location

# Restore config if upgrade
if ($isUpgrade -and (Test-Path "$InstallPath\config.json.backup")) {
    Copy-Item "$InstallPath\config.json.backup" "$InstallPath\config.json" -Force
    Write-Success "Restored config.json from backup"
}

# Update port in config if specified
if ($Port -ne 3001 -and (Test-Path "$InstallPath\config.json")) {
    $config = Get-Content "$InstallPath\config.json" | ConvertFrom-Json
    $config.port = $Port
    $config | ConvertTo-Json -Depth 10 | Set-Content "$InstallPath\config.json"
    Write-Success "Updated port to $Port"
}

# Create data directories
$dataDirs = @("$InstallPath\data", "$InstallPath\data\db", "$InstallPath\data\logs", "$InstallPath\data\servers", "$InstallPath\data\backups")
foreach ($dir in $dataDirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}
Write-Success "Data directories created"

# Create start/stop scripts
Write-Status "Creating management scripts..."

# start.bat
@"
@echo off
cd /d "$InstallPath"
echo Starting Hytale Server Manager...
node dist\index.js
pause
"@ | Set-Content "$InstallPath\start.bat"

# stop.bat
@"
@echo off
echo Stopping Hytale Server Manager...
taskkill /f /im node.exe /fi "WINDOWTITLE eq Hytale*" 2>nul
echo Stopped.
"@ | Set-Content "$InstallPath\stop.bat"

Write-Success "Management scripts created"

# Install as Windows Service using NSSM
if (-not $NoService) {
    Write-Status "Setting up Windows Service..."

    # Download NSSM if not present
    $nssmPath = "$InstallPath\nssm.exe"
    if (-not (Test-Path $nssmPath)) {
        Write-Status "Downloading NSSM (Non-Sucking Service Manager)..."
        $nssmZip = "$env:TEMP\nssm.zip"
        Invoke-WebRequest -Uri "https://nssm.cc/release/nssm-2.24.zip" -OutFile $nssmZip
        Expand-Archive -Path $nssmZip -DestinationPath "$env:TEMP\nssm" -Force
        Copy-Item "$env:TEMP\nssm\nssm-2.24\win64\nssm.exe" $nssmPath
        Remove-Item $nssmZip -Force
        Remove-Item "$env:TEMP\nssm" -Recurse -Force
    }

    # Remove existing service if present
    $existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($existingService) {
        Write-Status "Removing existing service..."
        & $nssmPath stop $ServiceName 2>$null
        & $nssmPath remove $ServiceName confirm 2>$null
    }

    # Install service
    Write-Status "Installing service: $ServiceName"
    & $nssmPath install $ServiceName (Get-Command node).Source
    & $nssmPath set $ServiceName AppDirectory $InstallPath
    & $nssmPath set $ServiceName AppParameters "dist\index.js"
    & $nssmPath set $ServiceName DisplayName "Hytale Server Manager"
    & $nssmPath set $ServiceName Description "Web-based management panel for Hytale game servers"
    & $nssmPath set $ServiceName Start SERVICE_AUTO_START
    & $nssmPath set $ServiceName AppStdout "$InstallPath\data\logs\service.log"
    & $nssmPath set $ServiceName AppStderr "$InstallPath\data\logs\service-error.log"
    & $nssmPath set $ServiceName AppRotateFiles 1
    & $nssmPath set $ServiceName AppRotateBytes 10485760

    # Set environment
    & $nssmPath set $ServiceName AppEnvironmentExtra "NODE_ENV=production"
    & $nssmPath set $ServiceName AppEnvironmentExtra "+HSM_BASE_PATH=$InstallPath"

    Write-Success "Service installed: $ServiceName"

    # Start service
    Write-Status "Starting service..."
    Start-Service -Name $ServiceName
    Write-Success "Service started"
}

# Configure firewall
if (-not $NoFirewall) {
    Write-Status "Configuring firewall..."

    $ruleName = "Hytale Server Manager"
    $existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

    if ($existingRule) {
        Remove-NetFirewallRule -DisplayName $ruleName
    }

    New-NetFirewallRule -DisplayName $ruleName `
        -Direction Inbound `
        -Protocol TCP `
        -LocalPort $Port `
        -Action Allow `
        -Profile Any `
        -Description "Allow Hytale Server Manager web interface" | Out-Null

    Write-Success "Firewall rule created for port $Port"
}

# Print summary
Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "  Installation Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Installation Path: $InstallPath" -ForegroundColor White
Write-Host "Web Interface:     http://localhost:$Port" -ForegroundColor White
Write-Host ""

if (-not $NoService) {
    Write-Host "Service Commands:" -ForegroundColor Yellow
    Write-Host "  Start:   Start-Service $ServiceName" -ForegroundColor White
    Write-Host "  Stop:    Stop-Service $ServiceName" -ForegroundColor White
    Write-Host "  Restart: Restart-Service $ServiceName" -ForegroundColor White
    Write-Host "  Status:  Get-Service $ServiceName" -ForegroundColor White
} else {
    Write-Host "Manual Start:" -ForegroundColor Yellow
    Write-Host "  Run: $InstallPath\start.bat" -ForegroundColor White
}

Write-Host ""
Write-Host "Configuration: $InstallPath\config.json" -ForegroundColor White
Write-Host "Logs:          $InstallPath\data\logs\" -ForegroundColor White
Write-Host ""
Write-Host "First-time setup: Create an admin user at http://localhost:$Port" -ForegroundColor Cyan
Write-Host ""
