# Hytale Server Manager - Setup Script (PowerShell)
# This script bootstraps env files, secrets, dependencies, and DB migrations.

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Green
}

function Fail {
    param([string]$Message)
    Write-Host "ERROR: $Message" -ForegroundColor Red
    exit 1
}

function Require-Command {
    param([string]$Name, [string]$Hint)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Fail "$Name is required. $Hint"
    }
}

function New-Secret {
    param([int]$Bytes)
    $buffer = New-Object byte[] $Bytes
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($buffer)
    $rng.Dispose()
    return ([BitConverter]::ToString($buffer)).Replace("-", "").ToLower()
}

function Get-EnvValue {
    param([string]$Content, [string]$Key)
    $match = [regex]::Match($Content, "(?m)^$Key=(.*)$")
    if ($match.Success) {
        return $match.Groups[1].Value
    }
    return $null
}

function Set-EnvValue {
    param([ref]$Content, [string]$Key, [string]$Value)
    $pattern = "(?m)^$Key=.*$"
    if ([regex]::IsMatch($Content.Value, $pattern)) {
        $Content.Value = [regex]::Replace($Content.Value, $pattern, "$Key=$Value")
    } else {
        $Content.Value = ($Content.Value.TrimEnd() + "`n$Key=$Value")
    }
}

function Ensure-EnvFile {
    param([string]$Source, [string]$Destination)
    if (-not (Test-Path $Destination)) {
        if (-not (Test-Path $Source)) {
            Fail "Missing env template: $Source"
        }
        Copy-Item $Source $Destination
        Write-Success "Created $Destination"
    } else {
        Write-Host "Found $Destination" -ForegroundColor Yellow
    }
}

function Prompt-ForSecret {
    param([string]$Key, [int]$Bytes, [string]$Existing)
    if (-not [string]::IsNullOrWhiteSpace($Existing)) {
        $overwrite = Read-Host "$Key already set. Overwrite? (y/N)"
        if ($overwrite -notmatch '^(y|yes)$') {
            return $Existing
        }
    }
    $inputValue = Read-Host "Enter $Key (leave blank to auto-generate)"
    if ([string]::IsNullOrWhiteSpace($inputValue)) {
        return (New-Secret -Bytes $Bytes)
    }
    return $inputValue
}

try {
    Write-Step "Validating prerequisites..."
    Require-Command node "Install Node.js from https://nodejs.org/"
    Require-Command pnpm "Install pnpm: npm install -g pnpm"

    $rootDir = Resolve-Path (Join-Path $PSScriptRoot "..\..")
    $frontendEnvExample = Join-Path $rootDir "packages\frontend\.env.example"
    $frontendEnv = Join-Path $rootDir "packages\frontend\.env"
    $serverEnvExample = Join-Path $rootDir "packages\server\.env.example"
    $serverEnv = Join-Path $rootDir "packages\server\.env"

    Write-Step "Preparing environment files..."
    Ensure-EnvFile -Source $frontendEnvExample -Destination $frontendEnv
    Ensure-EnvFile -Source $serverEnvExample -Destination $serverEnv

    Write-Step "Configuring server secrets..."
    $envContent = Get-Content $serverEnv -Raw

    $jwtSecret = Prompt-ForSecret -Key "JWT_SECRET" -Bytes 64 -Existing (Get-EnvValue -Content $envContent -Key "JWT_SECRET")
    Set-EnvValue -Content ([ref]$envContent) -Key "JWT_SECRET" -Value $jwtSecret

    $jwtRefresh = Prompt-ForSecret -Key "JWT_REFRESH_SECRET" -Bytes 64 -Existing (Get-EnvValue -Content $envContent -Key "JWT_REFRESH_SECRET")
    Set-EnvValue -Content ([ref]$envContent) -Key "JWT_REFRESH_SECRET" -Value $jwtRefresh

    $encryptionKey = Prompt-ForSecret -Key "SETTINGS_ENCRYPTION_KEY" -Bytes 32 -Existing (Get-EnvValue -Content $envContent -Key "SETTINGS_ENCRYPTION_KEY")
    Set-EnvValue -Content ([ref]$envContent) -Key "SETTINGS_ENCRYPTION_KEY" -Value $encryptionKey

    Set-Content $serverEnv $envContent.Trim()
    Write-Success "Server secrets updated"

    Write-Step "Installing workspace dependencies..."
    Push-Location $rootDir
    pnpm install
    if ($LASTEXITCODE -ne 0) { Fail "pnpm install failed." }
    Pop-Location

    Write-Step "Running database migrations..."
    pnpm -C (Join-Path $rootDir "packages\server") prisma:migrate
    if ($LASTEXITCODE -ne 0) { Fail "Database migration failed." }

    Write-Success "Setup complete."
} catch {
    Fail $_.Exception.Message
}
