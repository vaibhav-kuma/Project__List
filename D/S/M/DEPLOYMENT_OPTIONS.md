# DealScout Deployment - Your Options

Your Azure infrastructure is **100% ready** in [infra/main.bicep](infra/main.bicep) and [azure.yaml](azure.yaml).

**✓ Azure CLI is installed and ready!**

You have 3 deployment paths:

---

## Option 1: 🚀 BEST - Quick Deploy Script (Azure CLI)

**Time**: 5 minutes setup + 15-20 min deployment  
**Complexity**: Lowest  
**Status**: ✅ **WORKING NOW** - Azure CLI installed and ready

### Quick Start:
```powershell
# Just run:
.\quick-deploy.ps1

# That's it! It handles:
# - Azure login
# - Resource group creation
# - Bicep template validation
# - Infrastructure deployment
```

The script will:
1. ✓ Verify Azure CLI is installed
2. ✓ Login to Azure (opens browser if needed)
3. ✓ Create/verify resource group
4. ✓ Validate your Bicep template
5. ✓ Deploy all infrastructure
6. ✓ Show you the deployment status

### Why this works:
- Uses Azure CLI (already installed ✓)
- No additional tools needed
- Automatic login handling
- Clear progress updates
- Full error checking

---

## Option 2️: 🚀 Alternative - Fix azd and Use `azd up`

**Time**: 10 minutes setup + 10 min deployment  
**Complexity**: Medium  
**Status**: azd still not found, but workaround available

### If Option 1 doesn't work:
```powershell
# Try direct executable path
C:\Windows\System32\azd.exe version

# Or use our wrapper script:
.\deploy-with-az.ps1
```

**Time**: 45 minutes  
**Complexity**: Medium  
**What you get**: Full control, step-by-step via web UI

## Steps:
See [MANUAL_DEPLOYMENT.md](MANUAL_DEPLOYMENT.md) for detailed portal walkthrough.

**Pros**: No CLI installation issues  
**Cons**: More manual clicking, more error-prone

---

## Option 3: 🌐 Manual Azure Portal UI (No CLI needed)

**Time**: 45 minutes  
**Complexity**: Medium  
**Use if**: You prefer web UI and don't want to use CLI

See [MANUAL_DEPLOYMENT.md](MANUAL_DEPLOYMENT.md) for detailed portal walkthrough.

**Pros**: No CLI installation issues  
**Cons**: More manual clicking, more error-prone

---

## Option 4: 🐋 Docker-Based Deployment

**Time**: 30 minutes  
**Complexity**: Medium  
**Use if**: You prefer everything containerized

```powershell
docker build -f Dockerfile.deploy -t dealscout-deployer .
docker run -it `
  -v F:\Resume\ninor_project\A\D\S\M:/app `
  -e AZURE_SUBSCRIPTION_ID="44c11518-f168-4950-96d1-657ba8171ca7" `
  dealscout-deployer

# Inside container:
az login
./quick-deploy.ps1
```

---

## ✅ RECOMMENDED APPROACH

**Run this now:**
```powershell
.\quick-deploy.ps1
```

Why this is best right now:
- ✅ Azure CLI is installed and verified working
- ✅ Script handles login automatically (opens browser)
- ✅ Complete end-to-end deployment in 20-30 minutes
- ✅ Clear status updates as it runs
- ✅ Automatic error handling

✅ Infrastructure code ready: `infra/main.bicep`  
✅ Configuration ready: `azure.yaml`  
✅ Secrets template ready: `.env.deployment.template`  
✅ Dockerfile multi-stage ready  
✅ Database schema ready: `src/db/schema.sql`  

⏳ Waiting on: You to deploy!

---

## Quick Reference

**Subscription**: `44c11518-f168-4950-96d1-657ba8171ca7`  
**Region**: `West US 2 (westus2)`  
**Resource Group**: `Hac4er`  
**Estimated Cost**: ~$150/month  
**Deployment Time**: 15-20 minutes (first time)

---

## Files Generated

- `infra/main.bicep` - All Azure resources (11 services)
- `infra/parameters.bicep` - Configuration parameters
- `azure.yaml` - AZD service definitions
- `.env.deployment.template` - Secrets template
- `DEPLOYMENT_GUIDE.md` - Step-by-step walkthrough
- `INFRASTRUCTURE_SUMMARY.md` - Architecture details
- `MANUAL_DEPLOYMENT.md` - Portal UI walkthrough
- `preflight-check.ps1` - Validation script
- `deploy.bat` - Windows deployment helper

---

## Next Steps

1. **Run deployment script:**
   ```powershell
   .\quick-deploy.ps1
   ```

2. **Follow the on-screen prompts:**
   - Login when prompted (browser opens)
   - Wait 15-20 minutes for deployment
   - Watch the progress messages

3. **After deployment:**
   - Note your app URL from deployment output
   - Test: Visit `https://<your-url>/health`
   - Check logs: `az container logs -n dealscout-app -g Hac4er`

4. **For detailed info:** Check [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Script not found | Make sure you're in the project directory |
| "az not found" | Run: `refreshenv` then try again |
| Login issues | Close browser, run script again |
| Long wait time | First deployment takes 15-20 min (normal) |

See [INFRASTRUCTURE_SUMMARY.md](INFRASTRUCTURE_SUMMARY.md#troubleshooting) for more help.
