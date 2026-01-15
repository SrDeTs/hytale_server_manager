# Hytale Server Manager - Windows Deployment Script (PowerShell)
# This script handles installation, database setup, and server startup

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Hytale Server Manager - Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Host "[1/6] Node.js detected:" -ForegroundColor Green
    Write-Host "  Node: $nodeVersion"
    Write-Host "  NPM: $npmVersion"
    Write-Host ""
} catch {
    Write-Host "ERROR: Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if pnpm is installed
try {
    $pnpmVersion = pnpm --version
    Write-Host "PNPM: $pnpmVersion" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "ERROR: pnpm is not installed!" -ForegroundColor Red
    Write-Host "Install pnpm: npm install -g pnpm" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Install backend dependencies
Write-Host "[2/6] Installing backend dependencies..." -ForegroundColor Yellow
Set-Location packages\server

# Function to generate a random hex secret
function New-Secret {
    param([int]$Bytes = 64)
    $bytes = New-Object byte[] $Bytes
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    return [BitConverter]::ToString($bytes).Replace("-", "").ToLower()
}

# Create .env file from .env.example if it doesn't exist
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Write-Host "Creating .env file from .env.example..." -ForegroundColor Cyan
        Copy-Item .env.example .env
    } else {
        Write-Host "WARNING: .env.example not found!" -ForegroundColor Yellow
    }
}

# Generate secrets if missing
$envPath = ".env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    $secrets = @(
        @{ Name = "JWT_SECRET"; Bytes = 64 },
        @{ Name = "JWT_REFRESH_SECRET"; Bytes = 64 },
        @{ Name = "SETTINGS_ENCRYPTION_KEY"; Bytes = 32 }
    )
    $modified = $false
    foreach ($secret in $secrets) {
        $pattern = "(?m)^$($secret.Name)=(.*)$"
        $match = [regex]::Match($envContent, $pattern)
        if (-not $match.Success -or [string]::IsNullOrWhiteSpace($match.Groups[1].Value)) {
            $newSecret = New-Secret -Bytes $secret.Bytes
            if ($match.Success) {
                $envContent = $envContent -replace $pattern, "$($secret.Name)=$newSecret"
            } else {
                $envContent += "`n$($secret.Name)=$newSecret"
            }
            Write-Host "Generated $($secret.Name)" -ForegroundColor Green
            $modified = $true
        }
    }
    if ($modified) {
        Set-Content $envPath $envContent.Trim()
    }
    Write-Host ".env file configured" -ForegroundColor Green
}

Write-Host "Installing backend packages..." -ForegroundColor Cyan
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install backend dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "Backend dependencies installed" -ForegroundColor Green
Set-Location ..\..
Write-Host ""

# Install frontend dependencies
Write-Host "[3/6] Installing frontend dependencies..." -ForegroundColor Yellow
Write-Host "Installing frontend packages..." -ForegroundColor Cyan
Set-Location packages\frontend
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install frontend dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "Frontend dependencies installed" -ForegroundColor Green
Set-Location ..\..
Write-Host ""

# Setup database
Write-Host "[4/6] Setting up database..." -ForegroundColor Yellow
Set-Location packages\server
Write-Host "Syncing database schema..." -ForegroundColor Cyan
$prismaBin = "node_modules\.bin\prisma.cmd"
$env:PRISMA_SKIP_POSTINSTALL_GENERATE = "1"
& cmd /c "$prismaBin db push --skip-generate --accept-data-loss" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Database schema synced" -ForegroundColor Green
} else {
    Write-Host "Warning: Database sync returned non-zero exit code" -ForegroundColor Yellow
}
Set-Location ..\..
Write-Host ""

# Build applications
Write-Host "[5/6] Building applications..." -ForegroundColor Yellow
Write-Host "Building backend..." -ForegroundColor Cyan
Set-Location packages\server
pnpm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Backend build failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Set-Location ..\..

Write-Host "Building frontend..." -ForegroundColor Cyan
Set-Location packages\frontend
pnpm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Frontend build failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Set-Location ..\..
Write-Host ""

# Start servers
Write-Host "[6/6] Starting servers..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Hytale Server Manager" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:3001" -ForegroundColor White
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Yellow
Write-Host ""

# Check if this is a first run (no database)
$isFirstRun = -not (Test-Path "packages\server\dev.db")
if ($isFirstRun) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host "  FIRST RUN DETECTED" -ForegroundColor Magenta
    Write-Host "  Admin credentials will appear in the" -ForegroundColor Magenta
    Write-Host "  BACKEND window when the server starts" -ForegroundColor Magenta
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host ""
}

# Start backend in new window
$backendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\packages\server'; pnpm start" -PassThru

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start frontend in new window
$frontendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\packages\frontend'; pnpm run dev" -PassThru

Write-Host ""
Write-Host "Servers are starting..." -ForegroundColor Green
if ($isFirstRun) {
    Write-Host "IMPORTANT: Check the BACKEND window for admin login credentials!" -ForegroundColor Yellow
}
Write-Host "Check the new windows for backend and frontend logs" -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop the servers, close both PowerShell windows" -ForegroundColor Yellow
Write-Host "or press Ctrl+C in each window" -ForegroundColor Yellow
Write-Host ""

# Keep this window open
Write-Host "This window can be closed safely" -ForegroundColor Green
Read-Host "Press Enter to close this window"
