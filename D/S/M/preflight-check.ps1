#!/usr/bin/env pwsh
# DealScout Azure Deployment Pre-Flight Checklist
# This script verifies all prerequisites before deployment

$ErrorActionPreference = "Stop"

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host $Message -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Yellow
}

function Check-Command {
    param([string]$CommandName, [string]$InstallUrl, [string]$CheckVersion)
    
    try {
        if ($CheckVersion) {
            & $CheckVersion *> $null
            Write-Success "$CommandName is installed"
            return $true
        } else {
            $cmd = Get-Command $CommandName -ErrorAction Stop
            Write-Success "$CommandName is installed: $($cmd.Source)"
            return $true
        }
    }
    catch {
        Write-Error "$CommandName is not installed"
        Write-Info "Install from: $InstallUrl"
        return $false
    }
}

# Main script
Write-Header "DealScout Azure Deployment - Pre-Flight Checklist"

$allGood = $true

# 1. Check tools
Write-Header "1. Checking Required Tools"

if (-not (Check-Command "az" "https://aka.ms/azure-cli" {az --version 2>$null})) { $allGood = $false }
if (-not (Check-Command "azd" "https://aka.ms/azd" {azd version 2>$null})) { $allGood = $false }
if (-not (Check-Command "docker" "https://docs.docker.com/get-docker" {docker --version 2>$null})) { $allGood = $false }
if (-not (Check-Command "node" "https://nodejs.org" {node --version 2>$null})) { $allGood = $false }

# 2. Check files
Write-Header "2. Checking Required Files"

$requiredFiles = @(
    "azure.yaml",
    "infra/main.bicep",
    "infra/parameters.bicep",
    ".azure/config.json",
    "Dockerfile",
    "package.json"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Success "$file exists"
    } else {
        Write-Error "$file not found"
        $allGood = $false
    }
}

# 3. Check Azure authentication
Write-Header "3. Checking Azure Authentication"

try {
    $account = az account show --query "{subscriptionId: id, name: name}" -o json | ConvertFrom-Json
    Write-Success "Logged into Azure: $($account.name)"
    Write-Info "Subscription ID: $($account.subscriptionId)"
} catch {
    Write-Error "Not logged into Azure or subscription issue"
    Write-Info "Run: az login"
    $allGood = $false
}

# 4. Check secrets
Write-Header "4. Checking Required Secrets"

$requiredSecrets = @(
    "DATABASE_PASSWORD",
    "TINYFISH_API_KEY",
    "JWT_SECRET",
    "SESSION_SECRET"
)

$secretsSet = $true
foreach ($secret in $requiredSecrets) {
    $value = [Environment]::GetEnvironmentVariable($secret)
    if ($value) {
        Write-Success "$secret is set"
    } else {
        Write-Info "$secret is not set (will be prompted during deployment)"
        $secretsSet = $false
    }
}

# 5. Check configuration
Write-Header "5. Checking Configuration"

$config = Get-Content ".azure/config.json" | ConvertFrom-Json
Write-Info "Subscription: $($config.env.AZURE_SUBSCRIPTION_ID)"
Write-Info "Resource Group: $($config.env.AZURE_RESOURCE_GROUP)"
Write-Info "Location: $($config.env.AZURE_LOCATION)"
Write-Info "Environment: $($config.env.AZURE_ENV_NAME)"
Write-Success "Configuration loaded"

# 6. Check docker build
Write-Header "6. Checking Docker Build"

try {
    docker build --build-arg BUILD_VERSION=test -t test:latest --target production . 2>&1 | Select-String "error" -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Error "Docker build failed: $_"
        $allGood = $false
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker build validation failed"
        $allGood = $false
    } else {
        Write-Success "Docker build validation passed"
    }
} catch {
    Write-Error "Docker build check failed: $_"
    $allGood = $false
}

# Summary
Write-Header "Pre-Flight Checklist Summary"

if ($allGood) {
    Write-Success "All checks passed! Ready for deployment."
    Write-Info ""
    Write-Info "Next steps:"
    Write-Info "1. Set secrets if not already set:"
    Write-Info '   $env:DATABASE_PASSWORD = "Your password"'
    Write-Info '   $env:TINYFISH_API_KEY = "Your key"'
    Write-Info "2. Run deployment:"
    Write-Info "   azd up --no-prompt"
    Write-Info ""
    Write-Info "Or use interactive helper:"
    Write-Info "   .\deploy.bat"
    exit 0
} else {
    Write-Error "Some checks failed. Please resolve issues above before deploying."
    exit 1
}
