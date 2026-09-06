@REM DealScout Azure Deployment Helper Script (Windows)
@REM Automates common deployment tasks

@echo off
setlocal enabledelayedexpansion

REM Configuration
set SUBSCRIPTION_ID=44c11518-f168-4950-96d1-657ba8171ca7
set RESOURCE_GROUP=Hac4er
set LOCATION=westus2
set ENV_NAME=dealscout-dev

REM Color codes
set GREEN=[92m
set YELLOW=[93m
set RED=[91m
set RESET=[0m

:menu
cls
echo.
echo DealScout Azure Deployment Helper (Windows)
echo ============================================
echo 1. Check prerequisites
echo 2. Setup Azure CLI
echo 3. Setup AZD environment
echo 4. Deploy application (full: build + push + deploy)
echo 5. Check deployment status
echo 6. View application logs
echo 7. Verify application health
echo 8. Cleanup (delete all resources)
echo 9. Exit
echo.
set /p choice="Select an option (1-9): "

if "%choice%"=="1" goto prerequisites
if "%choice%"=="2" goto setup_az
if "%choice%"=="3" goto setup_azd
if "%choice%"=="4" goto deploy
if "%choice%"=="5" goto status
if "%choice%"=="6" goto logs
if "%choice%"=="7" goto health
if "%choice%"=="8" goto cleanup
if "%choice%"=="9" goto end

goto menu

:prerequisites
echo.
echo Checking Prerequisites...
echo.

where az >nul 2>nul
if errorlevel 1 (
    echo ERROR: Azure CLI not installed
    echo Install from: https://aka.ms/azure-cli
    pause
    goto menu
)
echo OK: Azure CLI installed
az --version | findstr /R "^azure-cli"

where azd >nul 2>nul
if errorlevel 1 (
    echo ERROR: Azure Developer CLI not installed
    echo Install from: https://aka.ms/azd
    pause
    goto menu
)
echo OK: Azure Developer CLI installed
azd version

where docker >nul 2>nul
if errorlevel 1 (
    echo ERROR: Docker not installed
    echo Install from: https://docs.docker.com/get-docker
    pause
    goto menu
)
echo OK: Docker installed
docker --version

where node >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js not installed
    echo Install version 18+
    pause
    goto menu
)
echo OK: Node.js installed
node --version

echo.
echo All prerequisites met!
pause
goto menu

:setup_az
echo.
echo Setting up Azure CLI...
echo Subscription: %SUBSCRIPTION_ID%
echo Resource Group: %RESOURCE_GROUP%
echo Location: %LOCATION%
echo.

az login

echo.
echo Setting subscription...
az account set --subscription %SUBSCRIPTION_ID%

echo.
echo Creating resource group...
az group create --name %RESOURCE_GROUP% --location %LOCATION% 2>nul
if errorlevel 1 (
    echo Resource group already exists
) else (
    echo Resource group created
)

echo.
echo Azure CLI setup complete
pause
goto menu

:setup_azd
echo.
echo Setting up AZD environment...
echo.

azd env new %ENV_NAME% --no-prompt 2>nul
if errorlevel 1 (
    echo Environment already exists
) else (
    echo Environment created
)

echo.
echo Configuring environment variables...
azd env set AZURE_SUBSCRIPTION_ID %SUBSCRIPTION_ID%
azd env set AZURE_RESOURCE_GROUP %RESOURCE_GROUP%
azd env set AZURE_LOCATION %LOCATION%

echo.
echo AZD environment setup complete
pause
goto menu

:deploy
echo.
echo ========================================
echo Deploying Application to Azure
echo ========================================
echo.
echo This will:
echo - Build Docker images
echo - Push images to Container Registry
echo - Deploy all Azure resources (Bicep)
echo - Configure Key Vault secrets
echo - Start Container Apps
echo.
echo This may take 15-20 minutes for first deployment
echo.

set /p confirm="Continue with deployment? (y/n): "
if /i not "%confirm%"=="y" (
    echo Deployment cancelled
    pause
    goto menu
)

echo.
echo Starting deployment...
azd up --no-prompt

echo.
echo Deployment complete! View outputs:
azd env get-values

pause
goto menu

:status
echo.
echo Checking deployment status...
echo.

echo Container Apps:
az containerapp list ^
  --resource-group %RESOURCE_GROUP% ^
  --query "[].{name:name, status:properties.provisioningState}" ^
  -o table

echo.
echo PostgreSQL Servers:
az postgres flexible-server list ^
  --resource-group %RESOURCE_GROUP% ^
  --query "[].{name:name, state:state}" ^
  -o table

echo.
echo Redis Caches:
az redis list ^
  --resource-group %RESOURCE_GROUP% ^
  --query "[].{name:name, state:provisioningState}" ^
  -o table

pause
goto menu

:logs
echo.
echo Viewing application logs...
echo.

set APP_NAME=ca-%ENV_NAME%-app

echo Fetching logs from %APP_NAME%...
az containerapp logs show ^
  --resource-group %RESOURCE_GROUP% ^
  --name %APP_NAME% ^
  --tail 50 ^
  --format table

pause
goto menu

:health
echo.
echo Verifying application health...
echo.

for /f "tokens=*" %%A in ('azd env get-value APP_ENDPOINT 2^>nul') do set APP_URL=%%A

if "!APP_URL!"=="" (
    echo Could not get application endpoint
    echo Run: azd env get-values
    pause
    goto menu
)

echo Testing health endpoint at: !APP_URL!

curl -s -k "!APP_URL!/health" >nul 2>&1
if errorlevel 0 (
    echo OK: Health check passed
) else (
    echo ERROR: Health check failed
    echo Application may still be starting up
)

pause
goto menu

:cleanup
echo.
echo ========================================
echo Cleanup
echo ========================================
echo.
echo This will DELETE all Azure resources in: %RESOURCE_GROUP%
echo.

set /p confirm="Continue? (y/n): "
if /i not "%confirm%"=="y" (
    echo Cleanup cancelled
    pause
    goto menu
)

echo.
echo Deleting resource group: %RESOURCE_GROUP%
az group delete ^
  --name %RESOURCE_GROUP% ^
  --yes ^
  --no-wait

echo Resource group deletion initiated

pause
goto menu

:end
echo.
echo Exiting deployment helper
exit /b 0
