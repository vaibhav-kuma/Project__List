#!/usr/bin/env pwsh
<#
.SYNOPSIS
Deploy DealScout to Azure using Azure CLI and Bicep (no azd required)
#>

$ErrorActionPreference = "Stop"

# Configuration
$SubscriptionId = "44c11518-f168-4950-96d1-657ba8171ca7"
$ResourceGroup = "Hac4er"
$Location = "westus2"

Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  DealScout Azure Deployment" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify Azure CLI
Write-Host "[1/5] Checking Azure CLI..." -ForegroundColor Yellow
try {
    $version = az version -o json | ConvertFrom-Json
    Write-Host "✓ Azure CLI $($version.'azure-cli') ready" -ForegroundColor Green
} catch {
    Write-Host "✗ Azure CLI not found or error occurred" -ForegroundColor Red
    Write-Host "  Install from: https://aka.ms/azure-cli" -ForegroundColor Yellow
    exit 1
}

# Step 2: Login and set subscription
Write-Host "[2/5] Checking Azure login..." -ForegroundColor Yellow
try {
    $account = az account show --query name -o tsv 2>$null
    if (-not $account) {
        Write-Host "  Opening browser for login..." -ForegroundColor Cyan
        az login
    }
    az account set -s $SubscriptionId
    $account = az account show --query "{name: name, id: id}" -o json | ConvertFrom-Json
    Write-Host "✓ Logged in to: $($account.name)" -ForegroundColor Green
} catch {
    Write-Host "✗ Login failed: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Create resource group
Write-Host "[3/5] Ensuring resource group exists..." -ForegroundColor Yellow
$exists = az group exists -n $ResourceGroup -o tsv
if ($exists -eq "false") {
    Write-Host "  Creating resource group '$ResourceGroup'..." -ForegroundColor Cyan
    az group create -n $ResourceGroup -l $Location --output none
    Write-Host "✓ Resource group created" -ForegroundColor Green
} else {
    Write-Host "✓ Resource group already exists" -ForegroundColor Green
}

# Step 4: Validate Bicep template
Write-Host "[4/5] Validating infrastructure template..." -ForegroundColor Yellow
if (Test-Path "infra/main.bicep") {
    try {
        az bicep build --file infra/main.bicep --output-to-stdout > $null 2>&1
        Write-Host "✓ Bicep template is valid" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Bicep build warning (will attempt deployment anyway)" -ForegroundColor Yellow
    }
} else {
    Write-Host "✗ infra/main.bicep not found" -ForegroundColor Red
    exit 1
}

# Step 5: Deploy resources
Write-Host "[5/5] Deploying infrastructure..." -ForegroundColor Yellow
Write-Host "  This may take 15-20 minutes..." -ForegroundColor Cyan
Write-Host ""

try {
    # Create deployment parameters
    $params = @{
        location = $Location
        environment = "production"
        appName = "dealscout-app"
        workerName = "dealscout-worker"
    }
    
    # Deploy
    $deployment = az deployment group create `
        -g $ResourceGroup `
        -f infra/main.bicep `
        -p @params `
        --query "{id: id, state: properties.provisioningState}" -o json 2>$null | ConvertFrom-Json
    
    if ($deployment.state -eq "Succeeded" -or $deployment.state -eq "Creating") {
        Write-Host "✓ Deployment initiated successfully" -ForegroundColor Green
        Write-Host ""
        Write-Host "Deployment Status:" -ForegroundColor Cyan
        Write-Host "  ID: $($deployment.id)" -ForegroundColor White
        Write-Host "  State: $($deployment.state)" -ForegroundColor White
    } else {
        Write-Host "⚠ Deployment state: $($deployment.state)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Deployment status unknown: $_" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Check deployment status with:" -ForegroundColor Cyan
    Write-Host "  az deployment group list -g $ResourceGroup -o table" -ForegroundColor White
}

Write-Host ""
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Monitor deployment progress:" -ForegroundColor White
Write-Host "   az deployment group list -g $ResourceGroup -o table" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Get deployment outputs:" -ForegroundColor White
Write-Host "   az deployment group show -g $ResourceGroup -n main --query properties.outputs -o json" -ForegroundColor Gray
Write-Host ""
Write-Host "3. View resource details:" -ForegroundColor White
Write-Host "   az resource list -g $ResourceGroup -o table" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Stream container logs:" -ForegroundColor White
Write-Host "   az container logs -n dealscout-app -g $ResourceGroup --follow" -ForegroundColor Gray
Write-Host ""
Write-Host "Estimated wait time: 15-20 minutes" -ForegroundColor Yellow
Write-Host ""
