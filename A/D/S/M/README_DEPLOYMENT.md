# DealScout Azure Deployment - Complete Infrastructure

This directory contains everything needed to deploy the DealScout application to Azure using Azure Developer CLI and Bicep Infrastructure as Code.

## 📦 What Was Generated

### Infrastructure Files
| File | Purpose | Size |
|------|---------|------|
| `azure.yaml` | Service definitions for AZD | 200 lines |
| `infra/main.bicep` | Complete infrastructure template | 700+ lines |
| `infra/parameters.bicep` | Parameter definitions | 100+ lines |
| `infra/aca.bicep` | Container Apps configuration notes | 300 lines |
| `.azure/config.json` | Azure configuration (subscription, RG, region) | 10 lines |

### Documentation
| File | Purpose |
|------|---------|
| `DEPLOYMENT_GUIDE.md` | Step-by-step deployment instructions |
| `INFRASTRUCTURE_SUMMARY.md` | Complete architecture overview |
| `QUICK_REFERENCE.md` | Common commands and quick reference |
| `README_DEPLOYMENT.md` | This file |

### Helper Scripts
| Script | Purpose |
|--------|---------|
| `deploy.sh` | Interactive deployment helper (Linux/macOS) |
| `deploy.bat` | Interactive deployment helper (Windows) |
| `preflight-check.ps1` | Pre-deployment verification script |

### Configuration Templates
| File | Purpose |
|------|---------|
| `.env.deployment.template` | Environment variables template |
| `infra/override.bicep` | Parameter overrides |
| `infra/parameters.json` | Parameters mapping |

---

## 🚀 Quick Start (5 Minutes)

### 1. Run Pre-Flight Check
```powershell
# Windows
.\preflight-check.ps1

# Linux/macOS
chmod +x preflight-check.ps1
./preflight-check.ps1
```

### 2. Set Required Secrets
```powershell
# Windows PowerShell
$env:DATABASE_PASSWORD = "YourSecurePassword123!@#"
$env:TINYFISH_API_KEY = "your_api_key_here"
$env:JWT_SECRET = "your_jwt_secret_32_chars_here_1234567890"
$env:SESSION_SECRET = "your_session_secret_32_chars_here_1234"

# Linux/macOS Bash
export DATABASE_PASSWORD="YourSecurePassword123!@#"
export TINYFISH_API_KEY="your_api_key_here"
export JWT_SECRET="your_jwt_secret_32_chars_here_1234567890"
export SESSION_SECRET="your_session_secret_32_chars_here_1234"
```

### 3. Deploy to Azure
```bash
# Option A: Interactive menu (recommended for first deployment)
.\deploy.bat          # Windows
./deploy.sh           # Linux/macOS

# Option B: Direct deployment
azd up --no-prompt
```

### 4. Get Application URL
```bash
azd env get-values
# Look for: APP_ENDPOINT or APPLICATION_URL
```

That's it! Your application is now deployed to Azure Container Apps.

---

## 🏗️ Infrastructure Overview

### Services Deployed (11 total)

```
┌─────────────────────────────────────────────────────────┐
│          Azure Container Apps Managed Environment        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Main App Service (ca-dealscout-dev-app)         │  │
│  │  • Port: 3001                                     │  │
│  │  • Replicas: 2-5 (auto-scaled)                    │  │
│  │  • CPU: 0.5, Memory: 1.0Gi                        │  │
│  │  • Public Ingress enabled                         │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Worker Service (ca-dealscout-dev-worker)        │  │
│  │  • Background job processor                       │  │
│  │  • Replicas: 1 (fixed)                            │  │
│  │  • CPU: 0.5, Memory: 0.5Gi                        │  │
│  │  • Internal only (no public access)               │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         │                          │
         │                          │
    VNet Integration           VNet Integration
         │                          │
    ┌────▼────────┐        ┌───────▼────┐
    │ PostgreSQL  │        │   Redis    │
    │ Flexible Srv│        │  Cache     │
    │ (B2s, 32GB) │        │ (C1, 1GB)  │
    └─────────────┘        └────────────┘

┌─────────────────────────────────────────────────────────┐
│                Supporting Services                       │
├─────────────────────────────────────────────────────────┤
│  • Key Vault (secrets management)                       │
│  • Container Registry (image storage)                   │
│  • Managed Identity (authentication)                    │
│  • Application Insights (APM)                           │
│  • Log Analytics (centralized logging)                  │
│  • Virtual Network (networking)                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Deployment Configuration

| Aspect | Configuration |
|--------|----------------|
| **Region** | West US 2 (westus2) |
| **Subscription** | 44c11518-f168-4950-96d1-657ba8171ca7 |
| **Resource Group** | Hac4er |
| **Environment** | dealscout-dev |
| **App Port** | 3001 |
| **App Replicas** | 2 (scales 1-5 on utilization) |
| **Worker Replicas** | 1 (fixed) |
| **Container Memory** | 1.0 Gi (app), 0.5 Gi (worker) |
| **PostgreSQL SKU** | Standard_B2s |
| **Redis Tier** | Standard C1 |
| **Database** | PostgreSQL 15 |

---

## 🔐 Security Features

✅ **Network Security**
- VNet integration for all services
- Private subnet for database
- PostgreSQL firewall rules enforced
- Redis TLS 1.2 minimum

✅ **Secret Management**
- All secrets in Key Vault
- Managed Identity authentication (no credentials)
- Environment-scoped access policies
- Secret rotation ready

✅ **Identity & Access**
- User-Assigned Managed Identity
- RBAC roles automatically configured
- Temporary admin access for registry

---

## 📈 Cost Estimation

| Service | Monthly Cost |
|---------|--------------|
| Container Apps (2 CPU-hrs avg) | $50 |
| PostgreSQL Standard_B2s | $50 |
| Redis Standard C1 | $20 |
| Application Insights | $10 |
| Container Registry Basic | $5 |
| VNet & Other | $15 |
| **Total** | **~$150** |

*See INFRASTRUCTURE_SUMMARY.md for cost breakdown by environment*

---

## 📚 Documentation Guide

### For First-Time Users
1. Start with **QUICK_REFERENCE.md** (5-minute overview)
2. Then **DEPLOYMENT_GUIDE.md** (step-by-step)
3. Finally **INFRASTRUCTURE_SUMMARY.md** (deep dive)

### For Deployment
- **DEPLOYMENT_GUIDE.md** - Complete deployment walkthrough
- **preflight-check.ps1** - Verify prerequisites

### For Operations
- **QUICK_REFERENCE.md** - Common commands
- **INFRASTRUCTURE_SUMMARY.md** - Troubleshooting section

### For Architecture
- **INFRASTRUCTURE_SUMMARY.md** - Full architecture
- **infra/aca.bicep** - Configuration details
- **infra/main.bicep** - Resource definitions

---

## ✅ Pre-Deployment Checklist

- [ ] All tools installed (az, azd, docker, node)
- [ ] Logged into Azure (az login)
- [ ] Secrets generated and set as environment variables
- [ ] Resource group exists (or will be created)
- [ ] Dockerfile in project root
- [ ] package.json with all dependencies
- [ ] Database schema file ready

**Run preflight check:**
```powershell
.\preflight-check.ps1
```

---

## 🚀 Deployment Process

### Step 1: Initialize AZD Environment
```bash
azd env new dealscout-dev
azd env set AZURE_SUBSCRIPTION_ID 44c11518-f168-4950-96d1-657ba8171ca7
azd env set AZURE_RESOURCE_GROUP Hac4er
azd env set AZURE_LOCATION westus2
```

### Step 2: Set Deployment Secrets
```bash
azd env set DATABASE_PASSWORD "your_password"
azd env set TINYFISH_API_KEY "your_key"
azd env set JWT_SECRET "your_jwt_secret"
azd env set SESSION_SECRET "your_session_secret"
```

### Step 3: Deploy
```bash
# Full deployment (recommended first time)
azd up --no-prompt

# Or step by step
azd build              # Build container images
azd push              # Push to Azure Container Registry
azd deploy            # Deploy infrastructure and services
```

### Step 4: Verify Deployment
```bash
# Get application URL
azd env get-values

# Test health endpoint
curl https://ca-dealscout-dev-app.{region}.azurecontainerapps.io/health

# View logs
azd logs --follow
```

---

## 🔄 Post-Deployment Tasks

### 1. Initialize Database Schema
```bash
# Connect to PostgreSQL and run migrations
psql -h <postgres-server>.postgres.database.azure.com \
     -U dealscout \
     -d dealscout < src/db/schema.sql
```

### 2. Verify Services
```bash
# Check Container Apps status
az containerapp list --resource-group Hac4er

# View application logs
az containerapp logs show --name ca-dealscout-dev-app \
  --resource-group Hac4er --tail 100

# Check database connection
curl https://.../api/health
```

### 3. Monitor Performance
```bash
# View Application Insights
az monitor app-insights query --app dealscout-dev \
  --analytics-query "traces | limit 20"

# View metrics
az monitor metrics list --resource {app-id} \
  --metric CpuUsageNanoCores,MemoryUsageMebibytes
```

---

## 🛠️ Common Operations

### Scale Application
```bash
# Increase max replicas to 5
az containerapp update --name ca-dealscout-dev-app \
  --resource-group Hac4er --max-replicas 5

# Change worker replicas to 2
az containerapp update --name ca-dealscout-dev-worker \
  --resource-group Hac4er --min-replicas 2 --max-replicas 2
```

### Update Code
```bash
# After code changes
azd up --no-prompt

# Or just deploy (if images are already pushed)
azd deploy
```

### View Logs
```bash
# Stream logs
az containerapp logs show --name ca-dealscout-dev-app \
  --resource-group Hac4er --follow

# Or use AZD
azd logs --follow
```

### Cleanup
```bash
# Delete all resources
az group delete --name Hac4er --yes

# Delete AZD environment
azd env delete dealscout-dev
```

---

## 🆘 Troubleshooting

### Container App won't start
```bash
# View provisioning state
az containerapp show --name ca-dealscout-dev-app \
  --resource-group Hac4er

# View detailed logs
az containerapp logs show --name ca-dealscout-dev-app \
  --resource-group Hac4er --tail 100
```

### Can't connect to database
```bash
# Verify PostgreSQL is running
az postgres flexible-server show --name postgres-xxxxx \
  --resource-group Hac4er

# Test connection string
psql "postgresql://dealscout:password@postgres-xxxxx.postgres.database.azure.com:5432/dealscout?sslmode=require"
```

### Secrets not loading
```bash
# Check Key Vault secrets
az keyvault secret list --vault-name kv-xxxxx

# Verify managed identity permissions
az role assignment list --assignee {mi-principal-id} \
  --scope /subscriptions/xxx/resourceGroups/Hac4er
```

See **INFRASTRUCTURE_SUMMARY.md** for more troubleshooting tips.

---

## 📞 Getting Help

- **Azure CLI Docs**: https://learn.microsoft.com/cli/azure/
- **Azure Developer CLI**: https://learn.microsoft.com/azure/developer/azure-developer-cli/
- **Container Apps**: https://learn.microsoft.com/azure/container-apps/
- **Bicep**: https://learn.microsoft.com/azure/azure-resource-manager/bicep/

---

## 📋 File Manifest

```
DealScout/
├── .azure/
│   └── config.json                    # AZD configuration
├── infra/
│   ├── main.bicep                     # Main infrastructure (700+ lines)
│   ├── parameters.bicep               # Parameter definitions (100+ lines)
│   ├── override.bicep                 # Parameter overrides
│   ├── aca.bicep                      # Container Apps notes (300+ lines)
│   └── parameters.json                # Parameters mapping
├── README_DEPLOYMENT.md               # This file
├── DEPLOYMENT_GUIDE.md                # Step-by-step guide
├── INFRASTRUCTURE_SUMMARY.md          # Architecture overview
├── QUICK_REFERENCE.md                 # Quick commands
├── azure.yaml                         # Service definitions (200 lines)
├── .env.deployment.template           # Secrets template
├── deploy.sh                          # Linux/macOS helper
├── deploy.bat                         # Windows helper
├── preflight-check.ps1                # Pre-deployment verification
└── [existing application files]
```

---

## 🎯 Next Steps

1. **Review Documentation**
   - [ ] Read QUICK_REFERENCE.md for overview
   - [ ] Read DEPLOYMENT_GUIDE.md for details
   - [ ] Review INFRASTRUCTURE_SUMMARY.md for architecture

2. **Run Pre-Flight Check**
   - [ ] Execute `preflight-check.ps1`
   - [ ] Ensure all prerequisites met

3. **Prepare Secrets**
   - [ ] Generate secure passwords/keys
   - [ ] Set environment variables

4. **Deploy**
   - [ ] Run deployment helper script OR `azd up`
   - [ ] Monitor deployment progress
   - [ ] Verify deployment succeeded

5. **Post-Deployment**
   - [ ] Initialize database schema
   - [ ] Test application endpoints
   - [ ] Monitor logs and metrics

---

**Deployment Infrastructure Version:** 1.0.0  
**Created:** March 19, 2026  
**Target:** Azure Container Apps with PostgreSQL & Redis
