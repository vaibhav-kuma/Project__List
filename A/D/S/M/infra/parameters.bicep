// Parameters for DealScout Bicep Infrastructure Template
// This file defines parameters and their acceptable ranges for deployment configuration

// ============================================================================
// SECURITY & SECRETS
// ============================================================================

@description('Password for PostgreSQL database admin (dealscout user). Must be 12+ characters with mixed case, numbers, and special characters.')
@minLength(12)
@secure()
param databasePassword string

@description('API key for TinyFish service integration.')
@secure()
param tinyFishApiKey string

@description('JWT secret for authentication token signing. Should be a strong random string.')
@minLength(32)
@secure()
param jwtSecret string

@description('Session secret for session management. Should be a strong random string.')
@minLength(32)
@secure()
param sessionSecret string

// ============================================================================
// INFRASTRUCTURE CONFIGURATION
// ============================================================================

@description('Azure region for all resources (e.g., westus2, eastus, uksouth).')
param location string = resourceGroup().location

@description('Environment name for resource naming and tagging (e.g., dev, staging, prod).')
@minLength(3)
@maxLength(30)
param environmentName string = 'dealscout-dev'

@description('Container registry URL. Leave empty to skip registry configurations. Example: myregistry.azurecr.io')
param containerRegistry string = ''

// ============================================================================
// CONTAINER APPS CONFIGURATION
// ============================================================================

@description('Port number for main application service HTTP listener.')
@minValue(1024)
@maxValue(65535)
param appServicePort int = 3001

@description('Memory allocation for container instances. Examples: 0.5Gi, 1.0Gi, 2.0Gi')
@allowed(['0.5Gi', '1.0Gi', '1.5Gi', '2.0Gi', '3.0Gi', '4.0Gi'])
param containerMemory string = '1.0Gi'

@description('CPU allocation for container instances. Must be compatible with memory selection.')
@allowed(['0.25', '0.5', '1.0', '1.5', '2.0', '4.0'])
param containerCpu string = '0.5'

@description('Number of replicas for main app service. Supports auto-scaling between 1 and this value.')
@minValue(1)
@maxValue(10)
param appReplicas int = 2

@description('Number of replicas for worker service (background jobs processor).')
@minValue(1)
@maxValue(5)
param workerReplicas int = 1

// ============================================================================
// DATABASE CONFIGURATION
// ============================================================================

@description('PostgreSQL Flexible Server SKU. Options: Standard_B1ms, Standard_B2s, Standard_B2ms, Standard_D2s_v3')
@allowed(['Standard_B1ms', 'Standard_B2s', 'Standard_B2ms', 'Standard_D2s_v3', 'Standard_D4s_v3'])
param postgresSkuName string = 'Standard_B2s'

@description('PostgreSQL server version.')
@allowed(['12', '13', '14', '15', '16'])
param postgresVersion string = '15'

@description('Storage size for PostgreSQL server in GB.')
@minValue(32)
@maxValue(1024)
param postgresStorageGB int = 32

@description('Backup retention days for PostgreSQL automatic backups.')
@minValue(7)
@maxValue(35)
param postgresBackupRetentionDays int = 7

// ============================================================================
// REDIS CACHE CONFIGURATION
// ============================================================================

@description('Azure Cache for Redis instance name. Must be globally unique.')
param redisCacheName string = 'redis-${uniqueString(resourceGroup().id)}'

@description('Redis Cache SKU family.')
@allowed(['C', 'P'])
param redisCacheFamily string = 'C'

@description('Redis Cache capacity (0-6 scale for C family).')
@minValue(0)
@maxValue(6)
param redisCacheCapacity int = 1

// ============================================================================
// MONITORING & OBSERVABILITY
// ============================================================================

@description('Log Analytics Workspace retention in days.')
@minValue(7)
@maxValue(730)
param logRetentionDays int = 30

@description('Application Insights retention in days.')
@minValue(30)
@maxValue(730)
param appInsightsRetentionDays int = 30

// ============================================================================
// VALIDATION - Cross-parameter validation rules
// ============================================================================

/*
Memory/CPU combinations must be compatible:
- 0.25 CPU: 0.5Gi memory
- 0.5 CPU: 1.0Gi, 1.5Gi memory
- 1.0 CPU: 1.5Gi, 2.0Gi, 3.0Gi, 4.0Gi memory
- 1.5 CPU: 2.0Gi, 3.0Gi, 4.0Gi memory
- 2.0 CPU: 4.0Gi memory
- 4.0 CPU: 8.0Gi memory
*/
