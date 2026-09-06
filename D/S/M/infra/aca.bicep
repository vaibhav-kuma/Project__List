// DealScout Container Apps Infrastructure - Bicep Modules
// Specialized configuration for Azure Container Apps deployment

// Import main template
using './main.bicep'

// ============================================================================
// CONTAINER APPS NETWORKING
// ============================================================================

// Configuration for Container Apps Managed Environment (CAME)
// The CAME provides:
// - Automatic scaling based on CPU/Memory utilization
// - Built-in monitoring with Application Insights
// - VNet integration for secure communication with databases
// - Internal DNS for service-to-service communication

// Key networking features:
// - Container App to PostgreSQL: Direct connectivity via VNet
// - Container App to Redis: Direct connectivity via Azure Cache network
// - App Container App: Public ingress on port 3001
// - Worker Container App: Internal only (no public access)

// ============================================================================
// HEALTH CHECK CONFIGURATION
// ============================================================================

// Main App Service Health Checks:
// 1. Liveness Probe: /health endpoint (checks if app is running)
//    - Runs every 30 seconds
//    - Fails after 3 consecutive failures
//    - Initial delay: 10 seconds
// 
// 2. Readiness Probe: /ready endpoint (checks if app can accept traffic)
//    - Runs every 10 seconds
//    - Fails after 2 consecutive failures
//    - Initial delay: 5 seconds
//    - Used by load balancer before routing traffic

// Worker Service:
// - No public health checks (internal service)
// - Runs continuously processing Bull queue jobs

// ============================================================================
// AUTO-SCALING RULES
// ============================================================================

// Main App Service Scaling:
// - CPU-based: Scale up when CPU utilization > 75%
// - Memory-based: Scale up when Memory utilization > 80%
// - Minimum: 1 replica (cannot scale below this)
// - Maximum: 2 replicas (configurable via appReplicas parameter)
// - Cooldown: Default Azure Container Apps cooldown applies

// Worker Service Scaling:
// - Fixed replicas: 1 (no auto-scaling)
// - Can be increased manually for high throughput scenarios

// ============================================================================
// SECRETS & KEY VAULT INTEGRATION
// ============================================================================

// Secrets stored in Azure Key Vault:
// 1. database-url: PostgreSQL connection string
// 2. redis-url: Redis connection string with auth
// 3. tinyfish-api-key: TinyFish API credentials
// 4. jwt-secret: JWT token signing key
// 5. session-secret: Session management key

// Access Pattern:
// - Container Apps use User-Assigned Managed Identity
// - Identity has Key Vault secret GET and LIST permissions
// - Secrets are mounted as environment variables at runtime
// - No secret values are stored in yaml or Bicep files

// ============================================================================
// SERVICE-TO-SERVICE COMMUNICATION
// ============================================================================

// Network Architecture:
//
// Public Internet
//     |
//     v
// App Service (Container App)
//     |
//     +---> PostgreSQL Database (via VNet)
//     |
//     +---> Redis Cache (via managed connection)
//
// App Service <---> Worker Service (Bull Queue via Redis)

// Connection Details:
// - App <-> Worker: Via Redis at redis.redis.cache.windows.net:6380
// - App <-> Database: Via PostgreSQL Flexible Server at postgres-xxx.postgres.database.azure.com:5432
// - App <-> Redis: Direct HTTPS connection with TLS 1.2 minimum

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

// All services receive these environment variables:
// - NODE_ENV: production
// - LOG_LEVEL: info
// - Database connection details (host, port, credentials)
// - Redis connection details
// - API credentials and secrets (from Key Vault)

// App Service specific:
// - PORT: 3001
// - APPLICATIONINSIGHTS_CONNECTION_STRING: For telemetry
// - All HTTP-enabled endpoints

// Worker Service specific:
// - WORKER_MODE: true
// - No PORT (not exposed)
// - Processes Bull queue jobs asynchronously

// ============================================================================
// LOGGING & MONITORING
// ============================================================================

// Application Insights Integration:
// - Automatic instrumentation via APPLICATIONINSIGHTS_CONNECTION_STRING
// - Request tracking for HTTP endpoints
// - Exception and error logging
// - Performance metrics (response time, throughput)
// - Dependency tracking (database, Redis calls)

// Log Analytics Integration:
// - Container Apps stdout/stderr sent to Log Analytics
// - 30-day retention (configurable)
// - KQL queries for troubleshooting
// - Alerts and monitoring dashboards

// ============================================================================
// REGISTRY & IMAGE REFERENCES
// ============================================================================

// Container Image Resolution:
// 1. Images pulled from specified Container Registry
// 2. Registry credentials stored as Container App secret
// 3. If no registry specified, deployment uses public images (demo only)

// Image naming convention:
// - App: ${registry}/dealscout-app:latest
// - Worker: ${registry}/dealscout-worker:latest

// Build and Push Images:
// az acr build --registry ${REGISTRY_NAME} --image dealscout-app:latest .
// az acr build --registry ${REGISTRY_NAME} --image dealscout-worker:latest .

// ============================================================================
// MANAGED IDENTITY & RBAC
// ============================================================================

// User-Assigned Managed Identity provides:
// - Access to Key Vault (secrets reading)
// - No credential management needed
// - Workload identity federation support (future)

// RBAC Role Assignments:
// - Key Vault Secrets User: For reading secret values
// - Container Registry Pull: For pulling images

// ============================================================================
// DATABASE SCHEMA INITIALIZATION
// ============================================================================

// PostgreSQL database 'dealscout' is created automatically
// Connection string: postgresql://dealscout:<password>@<host>:5432/dealscout?sslmode=require

// Schema Migration:
// Run migrations after deployment:
// psql -h <postgres-host> -U dealscout -d dealscout < src/db/schema.sql

// Or from within container:
// npm run migrate

// ============================================================================
// DEPLOYMENT CHECKLIST
// ============================================================================

/*
Before running: azd up

✓ Ensure azure.yaml exists in root
✓ Ensure infra/main.bicep exists
✓ Ensure infra/parameters.bicep exists
✓ Container images built and pushed to registry (if using private registry)
✓ Secrets prepared or generated:
  - Database password (12+ chars)
  - JWT secret (32+ chars)
  - Session secret (32+ chars)
  - TinyFish API key

Deployment command:
  azd up

This will:
  1. Validate azure.yaml and Bicep templates
  2. Package container images
  3. Push images to Container Registry
  4. Deploy all Bicep resources
  5. Configure Key Vault secrets
  6. Start Container Apps
  7. Display application URL

Post-deployment:
  1. Run database migrations
  2. Verify health check endpoints respond
  3. Check Application Insights for errors
  4. Monitor logs in Log Analytics
*/
