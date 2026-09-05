# DealScout - Manual Azure Deployment Guide

If CLI installation is having issues, use this manual approach with the Azure Portal UI.

## Quick Deploy Option: Use Azure Portal UI

### Step 1: Create Container Registry
1. Go to https://portal.azure.com
2. Click "Create a resource" → Search for "Container Registry"
3. Fill in:
   - Resource Group: `Hac4er`
   - Registry name: `dealscout<random-numbers>` (must be globally unique)
   - Location: `West US 2`
   - SKU: `Basic`
4. Click Review + Create → Create
5. Wait for deployment (2-3 minutes)

### Step 2: Build and Push Docker Images
Once registry is created:
```powershell
# Get ACR login credentials from Portal
# Container Registry → <your-registry> → Access keys
# Copy: Login server, Username, Password

# Login to ACR
docker login <login-server> -u <username> -p <password>

# Build and tag images
docker build -t <login-server>/dealscout-app:latest --target production .
docker build -t <login-server>/dealscout-worker:latest --target production .

# Push to ACR
docker push <login-server>/dealscout-app:latest
docker push <login-server>/dealscout-worker:latest
```

### Step 3: Create PostgreSQL Database
1. Azure Portal → Create a resource → Azure Database for PostgreSQL
2. Fill in:
   - Resource group: `Hac4er`
   - Server name: `dealscout-pg-<random>`
   - Location: `West US 2`
   - Compute + storage: `Burstable, Standard_B2s`
   - Admin username: `dealscout`
   - Admin password: Create a strong password
3. Click Create
4. Wait for deployment (~10 minutes)

### Step 4: Create Azure Cache for Redis
1. Azure Portal → Create a resource → Azure Cache for Redis
2. Fill in:
   - Resource group: `Hac4er`
   - DNS name: `dealscout-redis-<random>`
   - Location: `West US 2`
   - Pricing tier: `Standard (1 GB)`
3. Click Create

### Step 5: Create Key Vault
1. Azure Portal → Create a resource → Key Vault
2. Fill in:
   - Resource group: `Hac4er`
   - Vault name: `dealscout-kv-<random>`
   - Location: `West US 2`
3. Click Create
4. Add secrets:
   - `DATABASE_URL`: `postgresql://dealscout:<password>@<server-name>.postgres.database.azure.com:5432/dealscout`
   - `REDIS_URL`: `redis://<cache-name>.redis.cache.windows.net:6380?ssl=true&password=<access-key>`
   - `JWT_SECRET`: Your 32+ character secret
   - `SESSION_SECRET`: Your 32+ character secret
   - `TINYFISH_API_KEY`: Your API key

### Step 6: Create Container Apps Environment
1. Azure Portal → Create a resource → Container App environment
2. Fill in:
   - Resource group: `Hac4er`
   - Environment name: `dealscout-env`
   - Location: `West US 2`
3. Click Create

### Step 7: Create Container App (Main App)
1. Azure Portal → Container Apps → Create
2. Basic tab:
   - Resource group: `Hac4er`
   - Container app name: `dealscout-app`
   - Environment: Select the one you created
3. Container image:
   - Image source: `Azure Container Registry`
   - Registry: Select yours
   - Image: `dealscout-app:latest`
   - CPU: `0.5`
   - Memory: `1.0 Gi`
4. Ingress:
   - Enable: `Yes`
   - Ingress traffic: `Accepting traffic from anywhere`
   - Target port: `3001`
5. Environment variables:
   - `NODE_ENV`: `production`
   - `PORT`: `3001`
   - `DATABASE_URL`: Reference from Key Vault
   - `REDIS_URL`: Reference from Key Vault
   - `JWT_SECRET`: Reference from Key Vault
6. Click Create

### Step 8: Create Container App (Worker)
Repeat Step 7 but:
- Container app name: `dealscout-worker`
- Override command: `["node", "src/worker.js"]`
- Ingress: Disable (internal only)
- CPU: `0.5`
- Memory: `0.5 Gi`

### Step 9: Initialize Database
1. SSH into the app container via Azure Portal Portal → Container Apps → dealscout-app → Console
2. Run:
   ```bash
   psql $DATABASE_URL < src/db/schema.sql
   ```

## Troubleshooting CLI Installation

If you want to try CLI installation again:

### Clear stuck installer:
```powershell
# As Administrator:
taskkill /F /IM msiexec.exe
taskkill /F /IM wuauclt.exe
rmdir C:\Windows\Installer /s /q
sfc /scannow
```

### Direct MSI Installation (bypass winget):
```powershell
# Azure CLI
$url = "https://aka.ms/installazurecliwindowsx64"
$output = "$env:TEMP\AzureCLI.msi"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri $url -OutFile $output
Start-Process msiexec.exe -ArgumentList "/I $output /quiet /norestart" -Wait
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

### After CLI installation:
```powershell
az version
az login
az deployment group create -g Hac4er -f infra/main.bicep -p infra/parameters.json
```

## Need Help?

- **Azure Documentation**: https://docs.microsoft.com/azure/
- **Container Apps Docs**: https://docs.microsoft.com/azure/container-apps/
- **PostgreSQL Flexible Server**: https://docs.microsoft.com/azure/postgresql/flexible-server/

---

**Estimated Time**: 30-45 minutes of manual setup

**Cost**: ~$150/month for the infrastructure
