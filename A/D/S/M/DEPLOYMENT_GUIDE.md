# DealScout Azure Deployment Guide

## Quick Start

### Prerequisites
- Azure CLI installed (`az --version`)
- Azure Developer CLI installed (`azd --version`)
- Docker installed (`docker --version`)
- Node.js 18+ installed (`node --version`)

### Step 1: Set Up Deployment Secrets

Create `.env.deployment` from template:
```powershell
# Windows PowerShell
Copy-Item .env.deployment.template .env.deployment
# Edit .env.deployment with your secrets
```

Generate secure secrets:
```bash
# For JWT_SECRET and SESSION_SECRET
openssl rand -base64 32

# Or use Python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Step 2: Configure Azure CLI

```bash
# Login to Azure
az login

# Set your subscription
az account set --subscription 44c11518-f168-4950-96d1-657ba8171ca7

# Create resource group if not exists
az group create \
  --name Hac4er \
  --location westus2
```

### Step 3: Initialize Azure Developer CLI Environment

```bash
# Initialize AZD in the project (if not already done)
azd init --template dealscout

# Configure the environment
azd env new dealscout-dev
azd env set AZURE_SUBSCRIPTION_ID 44c11518-f168-4950-96d1-657ba8171ca7
azd env set AZURE_RESOURCE_GROUP Hac4er
azd env set AZURE_LOCATION westus2
```

### Step 4: Set Deployment Secrets

```powershell
# On Windows PowerShell
$SecureString = ConvertTo-SecureString -String "your_password" -AsPlainText -Force
azd env set DATABASE_PASSWORD "your_secure_password_here_min_12_chars"
azd env set TINYFISH_API_KEY "your_tinyfish_api_key_here"
azd env set JWT_SECRET "your_jwt_secret_here_min_32_chars"
azd env set SESSION_SECRET "your_session_secret_here_min_32_chars"
```

Or on Linux/macOS:
```bash
export DATABASE_PASSWORD="your_secure_password_here_min_12_chars"
export TINYFISH_API_KEY="your_tinyfish_api_key_here"
export JWT_SECRET="your_jwt_secret_here_min_32_chars"
export SESSION_SECRET="your_session_secret_here_min_32_chars"
```

### Step 5: Deploy to Azure

```bash
# Full deployment (build, push, provision, deploy)
azd up

# Or if you've already built images:
azd deploy

# Monitor deployment
azd env list
azd env get-values
```

## Deployment Outputs

After successful deployment, AZD will display:

```
Service Endpoints:
  app: https://ca-dealscout-dev-app.xxxxx.northcentralus.azurecontainerapps.io/

Resource Information:
  Your Api Url: https://ca-dealscout-dev-app.xxxxx.northcentralus.azurecontainerapps.io/
  Container Registry: myregistry.azurecr.io
  Database Server: postgres-xxxxx.postgres.database.azure.com
  Redis Cache: redis-xxxxx.redis.cache.windows.net
```

## Verifying Deployment

### Check Container Apps Status
```bash
# List Container Apps in resource group
az containerapp list \
  --resource-group Hac4er \
  --query "[].{name:name, status:properties.provisioningState}" \
  -o table

# View specific app logs
az containerapp logs show \
  --resource-group Hac4er \
  --name ca-dealscout-dev-app \
  --follow

# View container app environment
az containerapp env list \
  --resource-group Hac4er \
  -o table
```

### Test Application Endpoints
```bash
# Replace with actual app URL from deployment output
APP_URL="https://ca-dealscout-dev-app.xxxxx.northcentralus.azurecontainerapps.io"

# Health check
curl -k -s "${APP_URL}/health" | jq .

# Readiness check
curl -k -s "${APP_URL}/ready" | jq .

# Check metrics endpoint
curl -k -s "${APP_URL}/metrics" | head -20
```

### Monitor Application Logs
```bash
# View Application Insights logs
az monitor app-insights query \
  --app dealscout-dev \
  --resource-group Hac4er \
  --analytics-query "traces | limit 20"

# View Log Analytics workspace logs
az monitor log-analytics query \
  --workspace "log-dealscout-dev" \
  --analytics-query "ContainerAppConsoleLogs_CL | limit 20"
```

## Database Operations

### Connect to PostgreSQL

```bash
# Get connection details
DB_SERVER=$(az postgres flexible-server list \
  --resource-group Hac4er \
  --query "[0].fullyQualifiedDomainName" -o tsv)

DB_PASSWORD="your_password"

# Connect with psql
psql -h $DB_SERVER -U dealscout -d dealscout

# Or connect from container
az containerapp exec \
  --name ca-dealscout-dev-app \
  --resource-group Hac4er \
  --container app \
  -- sh -c 'psql postgresql://dealscout:$DB_PASSWORD@$DB_HOST:5432/dealscout'
```

### Run Database Migrations

```bash
# Method 1: Connect and run SQL file
psql -h $DB_SERVER -U dealscout -d dealscout < src/db/schema.sql

# Method 2: Run within container
az containerapp exec \
  --name ca-dealscout-dev-app \
  --resource-group Hac4er \
  --container app \
  -- sh -c 'npm run migrate'
```

## Redis Operations

### Connect to Redis Cache

```bash
# Get Redis connection details
REDIS_HOST=$(az redis show \
  --resource-group Hac4er \
  --name redis-xxxxx \
  --query "hostName" -o tsv)

REDIS_KEY=$(az redis list-keys \
  --resource-group Hac4er \
  --name redis-xxxxx \
  --query "primaryKey" -o tsv)

# Connect using redis-cli
redis-cli -h $REDIS_HOST -p 6380 -a $REDIS_KEY --tls

# List keys
redis-cli -h $REDIS_HOST -p 6380 -a $REDIS_KEY --tls KEYS '*'

# Monitor operations
redis-cli -h $REDIS_HOST -p 6380 -a $REDIS_KEY --tls MONITOR
```

## Scaling & Performance

### Scale Application Replicas

```bash
# Update app replicas to 5
az containerapp update \
  --resource-group Hac4er \
  --name ca-dealscout-dev-app \
  --min-replicas 2 \
  --max-replicas 5

# Update worker replicas
az containerapp update \
  --resource-group Hac4er \
  --name ca-dealscout-dev-worker \
  --min-replicas 1 \
  --max-replicas 3
```

### Monitor Performance Metrics

```bash
# View CPU and memory metrics for last hour
az monitor metrics list \
  --resource "/subscriptions/44c11518-f168-4950-96d1-657ba8171ca7/resourceGroups/Hac4er/providers/Microsoft.App/containerApps/ca-dealscout-dev-app" \
  --metric "CpuUsageNanoCores,MemoryUsageMebibytes" \
  --interval PT1M \
  --start-time "$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S)Z"
```

## Updating & Redeployment

### Update Source Code and Redeploy

```bash
# After code changes, redeploy
azd deploy

# Or do a complete redeploy with new images
azd up --no-prompt
```

### Update Container Image

```bash
# Build and push new image
az acr build \
  --registry myregistry \
  --image dealscout-app:latest \
  .

# Update container app
az containerapp update \
  --resource-group Hac4er \
  --name ca-dealscout-dev-app \
  --image myregistry.azurecr.io/dealscout-app:latest
```

## Troubleshooting

### Container App Fails to Start

```bash
# Check container app status and events
az containerapp show \
  --resource-group Hac4er \
  --name ca-dealscout-dev-app

# View recent provisioning errors
az containerapp logs show \
  --resource-group Hac4er \
  --name ca-dealscout-dev-app \
  --container app \
  --tail 50

# Check secrets configuration
az containerapp secrets list \
  --resource-group Hac4er \
  --name ca-dealscout-dev-app
```

### Database Connection Issues

```bash
# Verify PostgreSQL server is running
az postgres flexible-server show \
  --resource-group Hac4er \
  --name postgres-xxxxx

# Check SSL enforcement
az postgres flexible-server parameter show \
  --resource-group Hac4er \
  --name postgres-xxxxx \
  --name-starts-with 'require_secure_transport'

# Test connection from container
az containerapp exec \
  --resource-group Hac4er \
  --name ca-dealscout-dev-app \
  --container app \
  -- sh -c 'apt-get update && apt-get install -y postgresql-client && psql -h $DB_HOST -U dealscout -d dealscout -c "SELECT 1"'
```

### Secrets Not Loading

```bash
# Verify Key Vault secrets exist
az keyvault secret list \
  --vault-name kv-xxxxx \
  --query "[].name"

# Check managed identity has access
az role assignment list \
  --assignee <managed-identity-object-id> \
  --resource-group Hac4er

# Grant permissions if needed
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee <managed-identity-object-id> \
  --scope /subscriptions/44c11518-f168-4950-96d1-657ba8171ca7/resourceGroups/Hac4er/providers/Microsoft.KeyVault/vaults/kv-xxxxx
```

## Cleanup

### Delete All Resources

```bash
# Delete entire resource group (all resources)
az group delete \
  --name Hac4er \
  --yes

# Or delete specific resources
az containerapp delete \
  --resource-group Hac4er \
  --name ca-dealscout-dev-app \
  --yes

az postgres flexible-server delete \
  --resource-group Hac4er \
  --name postgres-xxxxx \
  --yes

az redis delete \
  --resource-group Hac4er \
  --name redis-xxxxx \
  --yes
```

## Cost Optimization

### Recommended Configurations by Environment

**Development:**
```
- App Replicas: 1
- Worker Replicas: 1
- Container Memory: 0.5Gi
- Container CPU: 0.25
- PostgreSQL SKU: Standard_B1ms
- Redis: Basic (C0)
```

**Staging:**
```
- App Replicas: 2
- Worker Replicas: 1
- Container Memory: 1.0Gi
- Container CPU: 0.5
- PostgreSQL SKU: Standard_B2s
- Redis: Standard (C1)
```

**Production:**
```
- App Replicas: 3-5
- Worker Replicas: 2-3
- Container Memory: 2.0Gi
- Container CPU: 1.0
- PostgreSQL SKU: Standard_D2s_v3
- Redis: Premium (P1)
```

## Getting Help

### View Deployment Logs
```bash
azd logs --all
```

### Check Infrastructure Creation Status
```bash
az deployment group list \
  --resource-group Hac4er \
  --query "[].{name:name, state:properties.provisioningState}"
```

### Export Bicep Parameters
```bash
az deployment group show \
  --resource-group Hac4er \
  --name main \
  --query "properties.parameters" | jq
```

---

**Deployment Notes:**
- First deployment typically takes 15-20 minutes
- Container images must be available in registry before starting containers
- Secrets must be set in Key Vault before Container Apps can access them
- PostgreSQL database initialization must be run manually after deployment
- Monitor Application Insights and Log Analytics for performance metrics
