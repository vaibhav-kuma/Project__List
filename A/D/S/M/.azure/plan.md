# DealScout Azure Deployment Plan

## Application Summary
- **Name**: DealScout
- **Type**: Full-stack containerized application  
- **Components**: 
  - Node.js backend (Express server)
  - React frontend (Vite)
  - PostgreSQL database
  - Redis cache/queue
  - Bull queue worker process
  - Winston logging

## Deployment Mode
**MODIFY** — Existing containerized application, prepare for Azure deployment

---

## PHASE 1: PLANNING (This Plan)

### 1. Workspace Analysis ✓
- Existing Docker setup with docker-compose.yml
- Dockerfile with multi-stage builds (frontend, backend-deps, production)
- .env file with configuration
- Frontend (React/Vite) + Backend (Node.js/Express)
- Database: PostgreSQL
- Cache/Queue: Redis with Bull
- Worker: Separate Node.js process for queue processing

### 2. Requirements Gathered ✓
**Scale**: Medium (hackathon project, scalable infrastructure)
**Classification**: Application with stateful services (database, cache, background jobs)
**Budget**: Cloud-optimized (use managed services to reduce ops overhead)
**HA/Failover**: Not initially required, but should be manageable
**Secrets**: API keys, JWT secrets stored in .env

### 3. Codebase Scanned ✓
```
Backend: Node.js (v18+, Express, Helmet, Winston, Bull queues)
Frontend: React 18, Vite, Socket.IO client, Recharts, React Query
Database: PostgreSQL 15
Cache/Queue: Redis 7
Key Dependencies: pg, redis, bull, axios, socket.io, prom-client (metrics)
```

### 4. Recipe Selected: **Azure Developer CLI (azd) + Bicep**
- **Why azd**: Simplest end-to-end deployment for full-stack apps
- **Why Bicep**: Native Azure language, excellent container orchestration support
- **Deployment Target**: Azure Container Apps (ACA)
  - Supports multiple containers (app + worker)
  - Built-in load balancing & auto-scaling
  - Service-to-service connectivity via internal endpoints
  - Integrated with Azure Monitor & Application Insights
  - Managed PostgreSQL (Azure Database for PostgreSQL - Flexible Server)
  - Cache: Azure Cache for Redis (or container-based for dev)

### 5. Architecture Plan ✓

```
┌─────────────────────────────────────────────────────────┐
│                    Azure Public IP                      │
│                  (Application Gateway)                  │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
   ┌────▼────┐          ┌────▼────┐
   │   App   │          │  Worker │
   │ (Port   │          │ Service │
   │  3001)  │          │         │
   └────┬────┘          └────┬────┘
        │                    │
    ┌───┴────────────────────┴────┐
    │   Azure Container Apps      │
    │   Managed Environment       │
    └───┬────────────────────┬────┘
        │                    │
    ┌───▼───┐        ┌──────▼──────┐
    │  DB   │        │   Redis     │
    │       │        │   Cache     │
    │ PG Db │        │ + Queue     │
    └───────┘        └─────────────┘
```

### 6. Service Mapping ✓

| Component | Current | Azure Service | Notes |
|-----------|---------|---|---|
| Frontend | React/Vite in Docker | Served from app container + Storage Account (optional CDN) | Can also use Static Web App |
| Backend | Node Express | Container App | Exposes port 3001 |
| Worker | Node process | Container App (separate) | Runs `node src/worker.js` |
| Database | PostgreSQL in container | Azure Database for PostgreSQL Flexible | Managed, secure, backed up |
| Cache/Queue | Redis in container | Azure Cache for Redis | Managed, auto-replicated |
| Logs | Winston local files | Application Insights / Log Analytics | Centralized observability |
| Monitoring | Prometheus | Azure Monitor + App Insights | Built-in metrics & alerts |

---

## PHASE 2: EXECUTION (Pending User Approval)

### Step 1: Create Azure resources using azd init + Bicep
- [ ] Initialize azure.yaml
- [ ] Create infra/main.bicep with:
  - Container Apps Managed Environment
  - 2 Container App services (app, worker)
  - Azure Database for PostgreSQL
  - Azure Cache for Redis
  - Key Vault (secrets: DB_USER, DB_PASSWORD, JWT_SECRET, API_KEY, SESSION_SECRET)
  - Application Insights resource
  - Log Analytics workspace

### Step 2: Configure application environment
- [ ] Map .env variables → Azure Key Vault secrets
- [ ] Configure container registry (Azure Container Registry)
- [ ] Update docker-compose service names to Azure resources

### Step 3: Prepare dockerfile
- [ ] Verify multi-stage Dockerfile is production-ready
- [ ] Add health checks (already present ✓)
- [ ] Ensure non-root user enforcement

### Step 4: Setup database
- [ ] Deploy PostgreSQL schema (init-db.sql)
- [ ] Configure connection strings:
  - Backend: `DATABASE_URL=postgresql://user:pass@server.postgres.database.azure.com:5432/dealscout`
  - Via Key Vault + Managed Identity

### Step 5: Validate deployment
- [ ] Run azure-validate to check all prerequisites
- [ ] Verify secret permissions
- [ ] Test connection strings

### Step 6: Deploy infrastructure & app
- [ ] Run `azd up` to deploy everything
- [ ] Verify both app and worker containers are running
- [ ] Check health endpoints

### Step 7: Post-deployment
- [ ] Verify logs in Application Insights
- [ ] Test frontend → backend connectivity
- [ ] Monitor worker queue processing
- [ ] Set up autoscaling policies

---

## Configuration Notes

### Environment Variables (→ Azure Key Vault)
```
DATABASE_URL=postgresql://dealscout:PASSWORD@server.postgres.database.azure.com:5432/dealscout
REDIS_URL=redis://localhost:6379  # Use Azure Cache for Redis endpoint
TINYFISH_API_KEY=sk-tinyfish-XXXX
JWT_SECRET=XXXX  (rotate in Azure Key Vault)
SESSION_SECRET=XXXX
```

### Container Images
- `app:latest` → Runs `node src/server.js` (port 3001)
- `worker:latest` → Runs `node src/worker.js` (no exposed port)

---

## Next Steps

1. **Confirm this plan** — User approves architecture
2. **Provide Azure Context**:
   - Azure subscription ID (or current subscription)
   - Azure region for deployment (default: eastus)
   - Resource group name (default: dealscout-rg)
3. **Run Phase 2** — Execute Bicep generation, validation, and deployment

---

## Estimated Timeline
- **Planning**: ✓ Complete
- **Infrastructure setup**: 5 min (azd + Bicep)
- **Deployment**: 10-15 min (first deploy, subsequent: 2-3 min)
- **Validation**: 5 min
- **Total**: ~25 min end-to-end

---

## Status
- [x] User approves plan ✓
- [x] Azure context confirmed ✓
  - Subscription: 44c11518-f168-4950-96d1-657ba8171ca7
  - Region: westus2
  - Resource Group: Hac4er
- [x] Infrastructure code generated ✓
- [ ] Choose deployment method (see DEPLOYMENT_OPTIONS.md)
- [ ] Execute Phase 2 deployment

## Deployment Options
1. **Option 1 (Recommended)**: Fix CLI tools and run `azd up`
2. **Option 2**: Manual Azure Portal UI (no CLI needed)
3. **Option 3**: Docker-based deployment container

See **DEPLOYMENT_OPTIONS.md** for detailed instructions.
