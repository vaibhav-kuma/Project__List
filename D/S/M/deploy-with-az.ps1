#!/usr/bin/env pwsh
<#
.SYNOPSIS
DealScout Deployment Script - Uses Azure CLI with Bicep (works without azd)
.DESCRIPTION
Deploys DealScout to Azure using the ARM deployment API
#>

param(
    [string]$Action = "deploy", # deploy, validate, delete
    [string]$SubscriptionId = "44c11518-f168-4950-96d1-657ba8171ca7",
    [string]$ResourceGroup = "Hac4er",
    [string]$Location = "westus2",
    [switch]$NoPrompt = $false
)

$ErrorActionPreference = "Stop"

# Colors for output
$colors = @{
    Green = "`e[32m"
    Red = "`e[31m"
    Yellow = "`e[33m"
    Cyan = "`e[36m"
    Reset = "`e[0m"
}

function Write-Success { Write-Host "$($colors.Green)✓ $args$($colors.Reset)" }
function Write-Error_ { Write-Host "$($colors.Red)✗ $args$($colors.Reset)" -ForegroundColor Red }
function Write-Info { Write-Host "$($colors.Cyan)ℹ $args$($colors.Reset)" }
function Write-Warning_ { Write-Host "$($colors.Yellow)⚠ $args$($colors.Reset)" }

function Test-Command {
    param([string]$Command)
    try {
        $null = & $Command --version
        return $true
    }
    catch {
        return $false
    }
}

Write-Info "=== DealScout Azure Deployment ==="
Write-Info "Subscription: $SubscriptionId"
Write-Info "Resource Group: $ResourceGroup"
Write-Info "Location: $Location"

# Check prerequisites
Write-Info ""
Write-Info "Checking prerequisites..."
if (-not (Test-Command "az")) {
    Write-Error_ "Azure CLI not found. Install from: https://aka.ms/azure-cli"
    exit 1
}
Write-Success "Azure CLI found"

if (-not (Test-Command "docker")) {
    Write-Error_ "Docker not found. Install from: https://www.docker.com"
    exit 1
}
Write-Success "Docker found"

# Login to Azure
Write-Info ""
Write-Info "Checking Azure login..."
$login = az account show --query "id" -o tsv 2>$null
if (-not $login) {
    Write-Info "Logging into Azure..."
    az login --subscription $SubscriptionId
} else {
    Write-Success "Already logged in"
}

# Ensure resource group exists
Write-Info ""
Write-Info "Checking resource group..."
$rgExists = az group exists -n $ResourceGroup -o tsv
if ($rgExists -eq "false") {
    Write-Info "Creating resource group '$ResourceGroup' in $Location..."
    az group create -n $ResourceGroup -l $Location
    Write-Success "Resource group created"
} else {
    Write-Success "Resource group exists"
}

# Build Docker images
Write-Info ""
Write-Info "Building Docker images..."
Write-Info "This may take 5-10 minutes on first build..."

docker build -t dealscout-app:latest --target production .
docker build -f Dockerfile.worker -t dealscout-worker:latest --target production .

Write-Success "Docker images built"

# Create Container Registry
Write-Info ""
Write-Info "Creating/checking Container Registry..."
$acrName = "dealscout$(Get-Random -Minimum 1000 -Maximum 9999)"
$acrExists = az acr show -n $acrName -g $ResourceGroup 2>$null
if (-not $acrExists) {
    Write-Info "Creating ACR '$acrName'..."
    az acr create -g $ResourceGroup -n $acrName --sku Basic
    Write-Success "Container Registry created"
} else {
    Write-Success "Container Registry exists"
}

# Push images to ACR
Write-Info ""
Write-Info "Pushing images to Container Registry..."
$acrLoginServer = az acr show -n $acrName -g $ResourceGroup --query "loginServer" -o tsv
az acr login -n $acrName

docker tag dealscout-app:latest "$acrLoginServer/dealscout-app:latest"
docker tag dealscout-worker:latest "$acrLoginServer/dealscout-worker:latest"

docker push "$acrLoginServer/dealscout-app:latest"
docker push "$acrLoginServer/dealscout-worker:latest"

Write-Success "Images pushed to ACR"

# Deploy infrastructure
Write-Info ""
Write-Info "Deploying infrastructure with Bicep..."
Write-Info "This may take 15-20 minutes..."

$deploymentParams = @{
    "acrName" = $acrName
    "acrLoginServer" = $acrLoginServer
    "appImageUri" = "$acrLoginServer/dealscout-app:latest"
    "workerImageUri" = "$acrLoginServer/dealscout-worker:latest"
    "databasePassword" = "GeneratedPassword123!@#$(Get-Random -Minimum 1000 -Maximum 9999)"
    "redisCacheName" = "dealscout-redis-$(Get-Random -Minimum 1000 -Maximum 9999)"
    "sqlServerName" = "dealscout-pg-$(Get-Random -Minimum 1000 -Maximum 9999)"
}

$paramsJson = $deploymentParams | ConvertTo-Json | Out-String

az deployment group create `
    -g $ResourceGroup `
    -f infra/main.bicep `
    -p $paramsJson `
    --no-wait

Write-Success "Deployment started (running in background)"
Write-Info ""
Write-Info "Check deployment status:"
Write-Info "  az deployment group list -g $ResourceGroup --query 'reverse(sort_by([], &properties.timestamp))' -o table"

Write-Info ""
Write-Success "Deployment initiated!"
Write-Info ""
Write-Info "Next steps:"
Write-Info "1. Monitor deployment: az deployment group list -g $ResourceGroup"
Write-Info "2. Get app URL: az containerapp show -g $ResourceGroup -n dealscout-app --query 'properties.configuration.ingress.fqdn' -o tsv"
Write-Info "3. Check logs: az containerapp logs show -g $ResourceGroup -n dealscout-app --follow"

Write-Info ""
Write-Info "Estimated deployment time: 15-20 minutes"
