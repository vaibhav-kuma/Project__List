# Azure Deployment - Quick Reference Card

## 🎯 5-Minute Quick Start

```bash
# 1. Set secrets
$env:DATABASE_PASSWORD = "YourSecurePassword123!"
$env:TINYFISH_API_KEY = "your_api_key"
$env:JWT_SECRET = "your_32_char_jwt_secret_here_1234567890"
$env:SESSION_SECRET = "your_32_char_session_secret_here_1234"

# 2. Deploy
azd up --no-prompt

# 3. Get application URL
azd env get-values | grep APP_ENDPOINT
```

---

## 📋 Essential Commands

### Initialization
```bash
az login                                    # Login to Azure
azd env new dealscout-dev                 # Create AZD environment
azd env set KEY VALUE                     # Set environment variable
```

### Deployment
```bash
azd up --no-prompt                        # Full deployment (build + push + deploy)
azd build                                 # Build container images
azd push                                  # Push to Container Registry
azd deploy                                # Deploy BicepGradle to Azure
```

### Monitoring & Logs
```bash
azd logs --follow                         # Stream application logs
azd env get-values                        # Show deployment outputs
az containerapp logs show --name ca-dealscout-dev-app \
  --resource-group Hac4er --tail 50      # View container logs
```

### Status Checks
```bash
az containerapp list --resource-group Hac4er          # List apps
az containerapp show --name ca-dealscout-dev-app \
  --resource-group Hac4er                            # Show app details
az postgres flexible-server list --resource-group Hac4er  # List databases
```

### Scale
```bash
az containerapp update --name ca-dealscout-dev-app \
  --resource-group Hac4er --max-replicas 5           # Scale app
az containerapp update --name ca-dealscout-dev-worker \
  --resource-group Hac4er --min-replicas 2           # Scale worker
```

### Cleanup
```bash
az group delete --name Hac4er --yes                  # Delete all resources
azd env list                                          # List environments
azd env delete dealscout-dev                         # Delete AZD environment
```

---

## 🔐 Secrets Reference

| Secret | Purpose | Example |
|--------|---------|---------|
| DATABASE_PASSWORD | PostgreSQL admin | `SecurePass123!@#` |
| TINYFISH_API_KEY | External API | `sk-xxxxx-xxxxx` |
| JWT_SECRET | Auth tokens | `HY3ab2x8...` (32+ chars) |
| SESSION_SECRET | Sessions | `HY3ab2x8...` (32+ chars) |

**Generate secrets:**
```bash
# Linux/macOS
openssl rand -base64 32

# PowerShell
[Convert]::ToBase64String((New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes(32))

# Windows (without Base64)
certutil -randomfile randomfile.txt 32
```

---

## 🏗️ Resource Summary

| Resource | Qty | Tier | Cost/mo |
|----------|-----|------|---------|
| Container Apps | 2 | - | $50 |
| PostgreSQL | 1 | B2s | $50 |
| Redis | 1 | C1 | $20 |
| Key Vault | 1 | Standard | $1 |
| Container Registry | 1 | Basic | $5 |
| App Insights | 1 | Pay-as-go | $10 |
| **Total** | | | **~$150** |

---

## 📊 Health Check Endpoints

```bash
# Health (liveness)
GET /health

# Ready (readiness)
GET /ready

# Metrics (Prometheus)
GET /metrics
```

---

## 🐛 Quick Troubleshooting

| Issue | Commands |
|-------|----------|
| App won't start | `az containerapp logs show --name ca-dealscout-dev-app --resource-group Hac4er` |
| Can't connect to DB | `psql -h postgres-xxxxx.postgres.database.azure.com -U dealscout -d dealscout` |
| Secrets not loading | `az keyvault secret list --vault-name kv-xxxxx` |
| Can't reach app | `curl -k https://ca-dealscout-dev-app.xxxxx.azurecontainerapps.io/health` |

---

## 📁 Key Configuration Files

```
.azure/
  ├── config.json              ← Subscription, RG, region
  └── plan.md                  ← Auto-generated deployment plan

infra/
  ├── main.bicep              ← All infrastructure resources
  ├── parameters.bicep        ← Parameter definitions
  ├── override.bicep          ← Custom overrides
  └── aca.bicep               ← Container Apps config notes

azure.yaml                    ← Service definitions for AZD
.env.deployment.template      ← Secrets template
```

---

## 🔗 Useful Links

- [DealScout Application Endpoint](https://ca-dealscout-dev-app.{region}.azurecontainerapps.io)
- [Azure Portal](https://portal.azure.com)
- [Container Apps Documentation](https://learn.microsoft.com/azure/container-apps/)
- [Bicep Reference](https://learn.microsoft.com/azure/azure-resource-manager/bicep/)

---

## ✅ Deployment Verification Checklist

After `azd up` completes:

- [ ] Application accessible at displayed URL
- [ ] Health endpoint responds: `/health`
- [ ] Logs visible in Application Insights
- [ ] Database connected (check logs)
- [ ] Redis cache accessible (check logs)
- [ ] Container images in ACR

---

## 📞 Emergency Commands

```bash
# Stop all services (pause deployment)
az containerapp delete --name ca-dealscout-dev-app \
  --resource-group Hac4er --yes

# Emergency cleanup (delete everything)
az group delete --name Hac4er --yes --no-wait

# View all resources in RG
az resource list --resource-group Hac4er --output table

# Check costs
az consumption usage list --subscription 44c11518-f168-4950-96d1-657ba8171ca7
```

---

**Region:** West US 2 (westus2)  
**Subscription:** 44c11518-f168-4950-96d1-657ba8171ca7  
**Resource Group:** Hac4er  
**Environment:** dealscout-dev
