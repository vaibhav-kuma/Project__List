# Azure Deployment Infrastructure - Complete Summary

## 📋 Project Overview

**Application:** DealScout - Autonomous E-commerce Intelligence Agent  
**Deployment Target:** Azure Container Apps with PostgreSQL & Redis  
**Infrastructure:** Azure Developer CLI (AZD) + Bicep IaC  
**Region:** West US 2 (westus2)  
**Resource Group:** Hac4er  

---

## 📦 Generated Files Structure

```
DealScout/
├── .azure/
│   ├── config.json                 # AZD configuration (subscription, RG, region)
│   └── plan.md                     # Generated deployment plan (auto-created by azd)
├── infra/
│   ├── main.bicep                  # Main infrastructure template (650+ lines)
│   ├── parameters.bicep            # Parameter definitions and validation
│   ├── override.bicep              # Parameter override file for customization
│   ├── aca.bicep                   # Container Apps configuration guide
│   └── parameters.json             # Parameters mapping file
├── azure.yaml                      # Service definitions for AZD
├── .env.deployment.template        # Environment variables template
├── DEPLOYMENT_GUIDE.md             # Comprehensive deployment guide
├── INFRASTRUCTURE_SUMMARY.md       # This file
├── deploy.sh                       # Linux/macOS deployment helper script
├── deploy.bat                      # Windows deployment helper script
└── [existing application files]
```

---

## 🏗️ Infrastructure Overview

### Azure Services Deployed

#### 1. **Container Apps Managed Environment**
   - Provides serverless container orchestration
   - Auto-scaling, monitoring, and networking
   - VNet integration with databases
   - **Cost:** ~$0.04/hour for environment

#### 2. **Container Apps Instances**
   - **App Service** (Main Application)
     - Port: 3001 (HTTP/HTTPS)
     - Replicas: 2 minimum, up to 5 auto-scaled
     - Resources: 0.5 CPU, 1.0Gi memory
     - Auto-scaling: CPU >75%, Memory >80%
     - Public ingress enabled
   
   - **Worker Service** (Background Jobs)
     - Replicas: 1 (fixed)
     - Resources: 0.5 CPU, 0.5Gi memory
     - Internal only (no public access)
     - Processes Bull queue from Redis

#### 3. **PostgreSQL Flexible Server**
   - **SKU:** Standard_B2s (burstable, 2 vCPU)
   - **Storage:** 32GB SSD
   - **Version:** PostgreSQL 15
   - **Backup:** 7 days retention
   - **Network:** VNet integration (private)
   - **SSL:** Required
   - **Database:** dealscout (auto-created)

#### 4. **Azure Cache for Redis**
   - **Tier:** Standard
   - **Capacity:** 1 (1GB)
   - **Features:** 
     - TLS 1.2 minimum
     - No cluster mode (single node)
     - LRU eviction policy
   - **Port:** 6380 (TLS)

#### 5. **Container Registry (ACR)**
   - **SKU:** Basic
   - **Purpose:** Store app & worker container images
   - **Access:** Admin enabled for AZD
   - **Images:**
     - `dealscout-app:latest`
     - `dealscout-worker:latest`

#### 6. **Key Vault**
   - **Tier:** Standard
   - **Secrets Stored:**
     - `database-url` - PostgreSQL connection string
     - `redis-url` - Redis connection with auth
     - `tinyfish-api-key` - External service credentials
     - `jwt-secret` - Auth token signing
     - `session-secret` - Session management
   - **Access:** Managed identity with get/list permissions

#### 7. **Managed Identity (User-Assigned)**
   - **Purpose:** Authentication for Container Apps
   - **Permissions:**
     - Key Vault Secrets User (read secrets)
     - Container Registry Pull (pull images)
   - **Benefits:** No credential management, workload identity support

#### 8. **Application Insights**
   - **Retention:** 30 days
   - **Metrics Tracked:**
     - Request latency
     - Error rates
     - Dependency performance
     - Custom telemetry
   - **Alerts:** Available for thresholds

#### 9. **Log Analytics Workspace**
   - **Retention:** 30 days
   - **Data Sources:**
     - Container App logs
     - Application Insights
     - Platform diagnostics
   - **Querying:** KQL for custom analytics

#### 10. **Virtual Network & Subnets**
   - **Address Space:** 10.0.0.0/16
   - **Subnets:**
     - Container Apps: 10.0.1.0/24
     - Databases: 10.0.2.0/24
   - **Private DNS Zone:** postgres.database.azure.com

---

## 🔐 Security Architecture

### Network Security
- VNet integration for Container Apps ✓
- Private subnet for PostgreSQL ✓
- PostgreSQL firewall rules (delegated subnet) ✓
- Redis: TLS 1.2 enforced ✓
- Container App ingress: External (app), Internal (worker) ✓

### Secrets Management
- All secrets in Key Vault ✓
- Managed identity authentication (no keys stored) ✓
- Environment-scoped access policies ✓
- Secret rotation ready (manual process)

### Identity & Access
- Managed Identity (User-Assigned) ✓
- RBAC roles configured automatically ✓
- Container Registry admin access (temporary) ✓

---

## 📊 Deployment Parameters

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `databasePassword` | User-provided | PostgreSQL admin password |
| `tinyFishApiKey` | User-provided | External API credentials |
| `jwtSecret` | User-provided | Auth token signing (32+ chars) |
| `sessionSecret` | User-provided | Session security (32+ chars) |
| `location` | westus2 | Azure region |
| `environmentName` | dealscout-dev | Resource naming prefix |
| `containerRegistry` | Optional | ACR URL for images |
| `appServicePort` | 3001 | Main app listen port |
| `containerCpu` | 0.5 | vCPU per container |
| `containerMemory` | 1.0Gi | RAM per container |
| `appReplicas` | 2 | Min replicas (scales to max 5) |
| `workerReplicas` | 1 | Fixed worker replicas |
| `postgresSkuName` | Standard_B2s | Database server size |
| `redisCacheName` | redis-{unique} | Cache instance name |

---

## 🚀 Deployment Steps

### Phase 1: Prerequisites & Setup
```bash
# 1. Install required tools
# - Azure CLI (az)
# - Azure Developer CLI (azd)
# - Docker
# - Node.js 18+

# 2. Authenticate with Azure
az login
az account set --subscription 44c11518-f168-4950-96d1-657ba8171ca7

# 3. Create resource group
az group create --name Hac4er --location westus2
```

### Phase 2: AZD Configuration
```bash
# 1. Initialize AZD
azd env new dealscout-dev

# 2. Set configuration
azd env set AZURE_SUBSCRIPTION_ID 44c11518-f168-4950-96d1-657ba8171ca7
azd env set AZURE_RESOURCE_GROUP Hac4er
azd env set AZURE_LOCATION westus2
```

### Phase 3: Configure Secrets
```bash
# Set required secrets
azd env set DATABASE_PASSWORD "your_secure_password_12_chars_min"
azd env set TINYFISH_API_KEY "your_api_key"
azd env set JWT_SECRET "your_jwt_secret_32_chars_min"
azd env set SESSION_SECRET "your_session_secret_32_chars_min"
```

### Phase 4: Deploy Infrastructure
```bash
# Full deployment (build + push + deploy)
azd up --no-prompt

# Or individual steps:
azd build        # Build container images
azd push         # Push to registry
azd deploy       # Deploy infrastructure & services
```

---

## 📈 Post-Deployment Tasks

### 1. Database Initialization
```bash
# Connect to PostgreSQL and run schema
psql -h postgres-xxxxx.postgres.database.azure.com \
     -U dealscout \
     -d dealscout < src/db/schema.sql

# Or from container
az containerapp exec \
  --name ca-dealscout-dev-app \
  --resource-group Hac4er \
  --container app \
  -- npm run migrate
```

### 2. Verify Health Checks
```bash
# Health endpoint
curl https://ca-dealscout-dev-app.{region}.azurecontainerapps.io/health

# Readiness endpoint
curl https://ca-dealscout-dev-app.{region}.azurecontainerapps.io/ready

# Metrics
curl https://ca-dealscout-dev-app.{region}.azurecontainerapps.io/metrics
```

### 3. Monitor Application
```bash
# View logs
azd logs --follow

# Check Application Insights
az monitor app-insights query \
  --app dealscout-dev \
  --analytics-query "traces | limit 20"

# View metrics
az monitor metrics list \
  --resource {container-app-id} \
  --metric CpuUsageNanoCores,MemoryUsageMebibytes
```

### 4. Configure Custom Domain (Optional)
```bash
# Bind custom domain to container app
az containerapp ingress update \
  --name ca-dealscout-dev-app \
  --resource-group Hac4er \
  --custom-domain my-domain.com
```

---

## 💰 Cost Estimation (Monthly)

| Service | SKU | Monthly Cost |
|---------|-----|--------------|
| Container Apps | 2 CPU-hrs, 2GB RAM avg | ~$50 |
| PostgreSQL | Standard_B2s | ~$50 |
| Redis | Standard C1 | ~$20 |
| Application Insights | Pay-per-GB | ~$10 |
| Container Registry | Basic | ~$5 |
| VNet | Standard | ~$10 |
| Log Analytics | Pay-per-GB | ~$5 |
| **Total** | | **~$150/month** |

*Costs vary by region and actual usage. First 12 months: $200 free credit available.*

---

## 🔄 Environment Configurations

### Development
```yaml
App Replicas: 1
Worker Replicas: 1
Container Memory: 0.5Gi
PostgreSQL SKU: Standard_B1ms
Redis: Basic C0
Estimated Cost: ~$80/month
```

### Staging
```yaml
App Replicas: 2
Worker Replicas: 1
Container Memory: 1.0Gi
PostgreSQL SKU: Standard_B2s
Redis: Standard C1
Estimated Cost: ~$150/month
```

### Production
```yaml
App Replicas: 3-5
Worker Replicas: 2-3
Container Memory: 2.0Gi
PostgreSQL SKU: Standard_D2s_v3
Redis: Premium P1
Estimated Cost: ~$400-500/month
```

---

## 🛠️ Common Operations

### Scale Application
```bash
# Increase app replicas
az containerapp update \
  --name ca-dealscout-dev-app \
  --resource-group Hac4er \
  --max-replicas 5

# Increase worker replicas
az containerapp update \
  --name ca-dealscout-dev-worker \
  --resource-group Hac4er \
  --min-replicas 2 \
  --max-replicas 3
```

### Update Application Code
```bash
# Build and push new image
az acr build --registry myregistry --image dealscout-app:latest .

# Update container app
az containerapp update \
  --name ca-dealscout-dev-app \
  --resource-group Hac4er \
  --image myregistry.azurecr.io/dealscout-app:latest
```

### Update Environment Variables
```bash
# Update secret in Key Vault
az keyvault secret set \
  --vault-name kv-xxxxx \
  --name jwt-secret \
  --value "new_secret_value"

# Container apps automatically pick up updates
```

### Monitor Performance
```bash
# CPU and memory metrics
az monitor metrics list \
  --resource {app-resource-id} \
  --metric CpuUsageNanoCores,MemoryUsageMebibytes \
  --interval PT1M \
  --start-time "$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S)Z"

# HTTP request metrics
az monitor metrics list \
  --resource {app-resource-id} \
  --metric Http2xx,Http4xx,Http5xx
```

---

## ⚡ Helper Scripts

### Windows (deploy.bat)
```bash
# Interactive menu-based deployment
.\deploy.bat

# Options:
# 1. Check prerequisites
# 2. Setup Azure CLI
# 3. Setup AZD environment
# 4. Deploy application
# 5. Check deployment status
# 6. View logs
# 7. Verify health
# 8. Cleanup
```

### Linux/macOS (deploy.sh)
```bash
# Make executable
chmod +x deploy.sh

# Run deployment
./deploy.sh

# Menu options same as Windows batch
```

---

## 🆘 Troubleshooting

### Container App won't start
```bash
# Check provisioning state
az containerapp show --name ca-dealscout-dev-app \
  --resource-group Hac4er

# View container logs
az containerapp logs show --name ca-dealscout-dev-app \
  --resource-group Hac4er --tail 50

# Check secrets configured
az containerapp secrets list --name ca-dealscout-dev-app \
  --resource-group Hac4er
```

### Database connection errors
```bash
# Verify server is running
az postgres flexible-server show --name postgres-xxxxx \
  --resource-group Hac4er

# Test connectivity from container
az containerapp exec --name ca-dealscout-dev-app \
  --resource-group Hac4er --container app \
  -- pg_isready -h $DB_HOST -p 5432
```

### Redis connection issues
```bash
# Check cache status
az redis show --name redis-xxxxx --resource-group Hac4er

# Check TLS configuration
az redis config get --name redis-xxxxx \
  --resource-group Hac4er --key "port"
```

### Secrets not loading
```bash
# Verify Key Vault secrets exist
az keyvault secret list --vault-name kv-xxxxx

# Check managed identity permissions
az role assignment list --assignee {principal-id} \
  --resource-group Hac4er

# Grant necessary permissions if needed
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee {principal-id} \
  --scope {key-vault-id}
```

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `DEPLOYMENT_GUIDE.md` | Comprehensive step-by-step deployment guide |
| `INFRASTRUCTURE_SUMMARY.md` | This file - architecture overview |
| `infra/aca.bicep` | Configuration comments and best practices |
| `infra/main.bicep` | Main infrastructure code (700+ lines) |
| `.env.deployment.template` | Environment variables template |

---

## ✅ Pre-Deployment Checklist

- [ ] **Infrastructure files created**
  - [ ] `azure.yaml` - Service definitions
  - [ ] `infra/main.bicep` - Resources
  - [ ] `infra/parameters.bicep` - Parameters
  - [ ] `.azure/config.json` - AZD config

- [ ] **Secrets prepared**
  - [ ] Database password (12+ chars, special chars)
  - [ ] API key for TinyFish
  - [ ] JWT secret (32+ chars)
  - [ ] Session secret (32+ chars)

- [ ] **Azure prerequisites**
  - [ ] Azure CLI installed (az --version)
  - [ ] Azure Developer CLI installed (azd --version)
  - [ ] Docker installed (docker --version)
  - [ ] Node.js 18+ installed (node --version)
  - [ ] Logged into Azure (az login)

- [ ] **Subscription & permissions**
  - [ ] Subscription ID: 44c11518-f168-4950-96d1-657ba8171ca7
  - [ ] Resource group: Hac4er
  - [ ] Region: westus2
  - [ ] Owner or Contributor role

- [ ] **Code readiness**
  - [ ] Dockerfile exists with multi-stage build
  - [ ] package.json has all dependencies
  - [ ] Database schema file: src/db/schema.sql
  - [ ] Server startup: node src/server.js

---

## 🚀 Next Steps

1. **Review Infrastructure**
   - Review `infra/main.bicep` for resource configuration
   - Verify all parameters in `infra/parameters.bicep`

2. **Prepare Deployment Secrets**
   - Create `.env.deployment` from template
   - Generate secure secrets
   - Test locally if needed

3. **Run Deployment**
   ```bash
   # Option 1: Use helper script
   .\deploy.bat            # Windows
   ./deploy.sh            # Linux/macOS
   
   # Option 2: Direct AZD commands
   azd up --no-prompt
   ```

4. **Verify Deployment**
   - Check Application Insights logs
   - Test health check endpoints
   - Monitor Container Apps metrics

5. **Run Migrations**
   - Connect to PostgreSQL
   - Execute schema.sql
   - Seed initial data if needed

6. **Monitor & Optimize**
   - Review metrics
   - Adjust scaling rules
   - Configure alerts

---

## 📞 Support Resources

- [Azure Container Apps Docs](https://learn.microsoft.com/azure/container-apps/)
- [Azure Developer CLI Docs](https://learn.microsoft.com/azure/developer/azure-developer-cli/)
- [Bicep Language Reference](https://learn.microsoft.com/azure/azure-resource-manager/bicep/)
- [PostgreSQL Flexible Server](https://learn.microsoft.com/azure/postgresql/flexible-server/)
- [Azure Cache for Redis](https://learn.microsoft.com/azure/azure-cache-for-redis/)

---

**Last Updated:** March 19, 2026  
**Infrastructure Version:** 1.0.0  
**AZD Template:** DealScout Full-Stack Application
