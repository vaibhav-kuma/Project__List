// Main Bicep Template for DealScout Application
// Deploys complete infrastructure on Azure Container Apps with PostgreSQL and Redis

metadata description = 'DealScout - Autonomous E-commerce Intelligence Agent Infrastructure'
metadata version = '1.0.0'

// ============================================================================
// PARAMETERS - Configurable values for deployment
// ============================================================================

@secure()
@minLength(12)
param databasePassword string
@description('Password for PostgreSQL database')

@secure()
param tinyFishApiKey string
@description('API key for TinyFish service')

@secure()
param jwtSecret string
@description('JWT secret for token signing')

@secure()
param sessionSecret string
@description('Session secret for session management')

param location string = resourceGroup().location
@description('Azure region for resource deployment')

param environmentName string = 'dealscout-dev'
@description('Environment name for naming resources')

param containerRegistry string = ''
@description('Container registry URL for pulling images')

param appServicePort int = 3001
@description('Port for main application service')

param containerMemory string = '1.0Gi'
@description('Memory allocation for containers (app service)')

param containerCpu string = '0.5'
@description('CPU allocation for containers')

param appReplicas int = 2
@description('Number of replicas for main app service (min 1, max 5)')

param workerReplicas int = 1
@description('Number of replicas for worker service')

param postgresSkuName string = 'Standard_B2s'
@description('PostgreSQL Flexible Server SKU')

param redisCacheName string = 'redis-${uniqueString(resourceGroup().id)}'
@description('Name for Redis cache instance')

// ============================================================================
// VARIABLES - Computed values derived from parameters
// ============================================================================

var abbrs = {
  containerRegistry: 'acr'
  containerAppEnvironment: 'cae'
  containerApp: 'ca'
  keyVault: 'kv'
  logAnalyticsWorkspace: 'log'
  applicationInsights: 'appi'
  postgresServer: 'postgres'
  redisCache: 'redis'
  userAssignedIdentity: 'id'
}

var resourceTokens = {
  uniqueId: take(uniqueString(resourceGroup().id, subscription().displayName), 13)
}

var resources = {
  keyVault: {
    name: '${abbrs.keyVault}-${resourceTokens.uniqueId}'
  }
  containerRegistry: {
    name: '${abbrs.containerRegistry}${replace(toLower('${environmentName}-${resourceTokens.uniqueId}'), '-', '')}'
  }
  containerAppEnvironment: {
    name: '${abbrs.containerAppEnvironment}-${environmentName}'
  }
  logAnalyticsWorkspace: {
    name: '${abbrs.logAnalyticsWorkspace}-${environmentName}'
  }
  applicationInsights: {
    name: '${abbrs.applicationInsights}-${environmentName}'
  }
  appContainerApp: {
    name: 'ca-${environmentName}-app'
  }
  workerContainerApp: {
    name: 'ca-${environmentName}-worker'
  }
  postgresServer: {
    name: '${abbrs.postgresServer}-${resourceTokens.uniqueId}'
  }
  userAssignedIdentity: {
    name: '${abbrs.userAssignedIdentity}-${environmentName}'
  }
}

// ============================================================================
// RESOURCES - Azure resources to be created/deployed
// ============================================================================

// User-assigned managed identity for Container Apps authentication
resource userAssignedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: resources.userAssignedIdentity.name
  location: location
}

// Log Analytics Workspace for monitoring and diagnostics
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: resources.logAnalyticsWorkspace.name
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Application Insights for application monitoring and telemetry
resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: resources.applicationInsights.name
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    RetentionInDays: 30
    WorkspaceResourceId: logAnalyticsWorkspace.id
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// Container Registry for storing container images
resource containerRegistry 'Microsoft.ContainerRegistry/registries@2022-12-01-preview' = {
  name: resources.containerRegistry.name
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
    publicNetworkAccess: 'Enabled'
    anonymousPullEnabled: false
  }
}

// Key Vault for secure secret management
resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' = {
  name: resources.keyVault.name
  location: location
  properties: {
    enabledForDeployment: true
    enabledForTemplateDeployment: true
    enabledForDiskEncryption: false
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    accessPolicies: [
      {
        objectId: userAssignedIdentity.properties.principalId
        tenantId: subscription().tenantId
        permissions: {
          secrets: ['get', 'list']
          keys: []
          certificates: []
        }
      }
    ]
  }
}

// Key Vault Secrets for sensitive configuration
resource kvSecretDatabaseUrl 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'database-url'
  properties: {
    value: 'postgresql://dealscout:${databasePassword}@${resources.postgresServer.name}.postgres.database.azure.com:5432/dealscout?sslmode=require'
  }
}

resource kvSecretRedisUrl 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'redis-url'
  properties: {
    value: 'rediss://:${listKeys(redisCache.id, redisCache.apiVersion).primaryKey}@${redisCacheName}.redis.cache.windows.net:6380'
  }
}

resource kvSecretJwtSecret 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'jwt-secret'
  properties: {
    value: jwtSecret
  }
}

resource kvSecretSessionSecret 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'session-secret'
  properties: {
    value: sessionSecret
  }
}

resource kvSecretTinyFishApiKey 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'tinyfish-api-key'
  properties: {
    value: tinyFishApiKey
  }
}

// PostgreSQL Flexible Server for application database
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview' = {
  name: resources.postgresServer.name
  location: location
  sku: {
    name: postgresSkuName
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: 'dealscout'
    administratorLoginPassword: databasePassword
    version: '15'
    storage: {
      storageSizeGB: 32
    }
    network: {
      delegatedSubnetResourceId: postgresSubnet.id
      privateDnsZoneArmResourceId: privateDnsZonePostgres.id
    }
    highAvailability: {
      mode: 'Disabled'
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
  }
}

// PostgreSQL Database
resource postgresDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-03-01-preview' = {
  parent: postgresServer
  name: 'dealscout'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// PostgreSQL Firewall Rule for Container Apps (in VNet)
resource postgresFirewallRule 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-03-01-preview' = {
  parent: postgresServer
  name: 'AllowContainerApps'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '255.255.255.255'
  }
}

// Azure Cache for Redis
resource redisCache 'Microsoft.Cache/redis@2023-04-01' = {
  name: redisCacheName
  location: location
  properties: {
    sku: {
      name: 'Standard'
      family: 'C'
      capacity: 1
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
    redisConfiguration: {
      'maxmemory-policy': 'allkeys-lru'
      'notify-keyspace-events': ''
    }
  }
}

// Container Apps Managed Environment
resource containerAppEnvironment 'Microsoft.App/managedEnvironments@2023-04-01-preview' = {
  name: resources.containerAppEnvironment.name
  location: location
  properties: {
    vnetConfiguration: {
      internal: false
      infrastructureSubnetId: containerAppsSubnet.id
    }
    daprAIConnectionStringSecret: 'ai-connection-string'
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsWorkspace.properties.customerId
        sharedKey: logAnalyticsWorkspace.listKeys().primarySharedKey
      }
    }
    zoneRedundant: false
  }
}

// Main Application Container App
resource appContainerApp 'Microsoft.App/containerApps@2023-04-01-preview' = {
  name: resources.appContainerApp.name
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppEnvironment.id
    configuration: {
      ingress: {
        external: true
        targetPort: appServicePort
        transport: 'auto'
        allowInsecure: false
        traffic: [
          {
            weight: 100
            latestRevision: true
          }
        ]
      }
      secrets: [
        {
          name: 'database-url'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/database-url/'
          identity: userAssignedIdentity.id
        }
        {
          name: 'redis-url'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/redis-url/'
          identity: userAssignedIdentity.id
        }
        {
          name: 'tinyfish-api-key'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/tinyfish-api-key/'
          identity: userAssignedIdentity.id
        }
        {
          name: 'jwt-secret'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/jwt-secret/'
          identity: userAssignedIdentity.id
        }
        {
          name: 'session-secret'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/session-secret/'
          identity: userAssignedIdentity.id
        }
      ]
      registries: [
        {
          server: containerRegistry.properties.loginServer
          username: containerRegistry.listCredentials().username
          passwordSecretRef: 'registry-password'
        }
      ]
    }
    template: {
      revisionSuffix: 'initial'
      containers: [
        {
          image: empty(containerRegistry) ? 'node:18-alpine' : '${containerRegistry.properties.loginServer}/dealscout-app:latest'
          name: 'app'
          resources: {
            cpu: json(containerCpu)
            memory: containerMemory
          }
          ports: [
            {
              containerPort: appServicePort
              protocol: 'TCP'
            }
          ]
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'PORT'
              value: string(appServicePort)
            }
            {
              name: 'LOG_LEVEL'
              value: 'info'
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              value: applicationInsights.properties.ConnectionString
            }
            {
              name: 'DB_HOST'
              value: '${postgresServer.name}.postgres.database.azure.com'
            }
            {
              name: 'DB_PORT'
              value: '5432'
            }
            {
              name: 'DB_NAME'
              value: 'dealscout'
            }
            {
              name: 'DB_USER'
              value: 'dealscout'
            }
            {
              name: 'REDIS_HOST'
              value: '${redisCache.name}.redis.cache.windows.net'
            }
            {
              name: 'REDIS_PORT'
              value: '6380'
            }
            {
              name: 'TINYFISH_BASE_URL'
              value: 'https://api.tinyfish.com/v1'
            }
            {
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
            {
              name: 'REDIS_URL'
              secretRef: 'redis-url'
            }
            {
              name: 'TINYFISH_API_KEY'
              secretRef: 'tinyfish-api-key'
            }
            {
              name: 'JWT_SECRET'
              secretRef: 'jwt-secret'
            }
            {
              name: 'SESSION_SECRET'
              secretRef: 'session-secret'
            }
            {
              name: 'MAX_CONCURRENT_JOBS'
              value: '3'
            }
            {
              name: 'RATE_LIMIT_WINDOW_MS'
              value: '3600000'
            }
            {
              name: 'RATE_LIMIT_MAX_REQUESTS'
              value: '100'
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: appServicePort
                scheme: 'HTTPS'
              }
              initialDelaySeconds: 10
              periodSeconds: 30
              failureThreshold: 3
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/ready'
                port: appServicePort
                scheme: 'HTTPS'
              }
              initialDelaySeconds: 5
              periodSeconds: 10
              failureThreshold: 2
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: appReplicas
        rules: [
          {
            name: 'cpu'
            custom: {
              metric: {
                metadata: {
                  type: 'Utilization'
                  value: '75'
                }
                type: 'Resource'
              }
              rule: {
                operator: 'GreaterThan'
                threshold: '75'
                type: 'Utilization'
              }
            }
          }
          {
            name: 'memory'
            custom: {
              metric: {
                metadata: {
                  type: 'Utilization'
                  value: '80'
                }
                type: 'Resource'
              }
              rule: {
                operator: 'GreaterThan'
                threshold: '80'
                type: 'Utilization'
              }
            }
          }
        ]
      }
    }
  }
}

// Worker Container App (background jobs)
resource workerContainerApp 'Microsoft.App/containerApps@2023-04-01-preview' = {
  name: resources.workerContainerApp.name
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppEnvironment.id
    configuration: {
      ingress: {
        external: false
      }
      secrets: [
        {
          name: 'database-url'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/database-url/'
          identity: userAssignedIdentity.id
        }
        {
          name: 'redis-url'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/redis-url/'
          identity: userAssignedIdentity.id
        }
        {
          name: 'tinyfish-api-key'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/tinyfish-api-key/'
          identity: userAssignedIdentity.id
        }
        {
          name: 'jwt-secret'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/jwt-secret/'
          identity: userAssignedIdentity.id
        }
        {
          name: 'session-secret'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/session-secret/'
          identity: userAssignedIdentity.id
        }
      ]
      registries: [
        {
          server: containerRegistry.properties.loginServer
          username: containerRegistry.listCredentials().username
          passwordSecretRef: 'registry-password'
        }
      ]
    }
    template: {
      revisionSuffix: 'worker'
      containers: [
        {
          image: empty(containerRegistry) ? 'node:18-alpine' : '${containerRegistry.properties.loginServer}/dealscout-worker:latest'
          name: 'worker'
          resources: {
            cpu: json('0.5')
            memory: '0.5Gi'
          }
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'WORKER_MODE'
              value: 'true'
            }
            {
              name: 'LOG_LEVEL'
              value: 'info'
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              value: applicationInsights.properties.ConnectionString
            }
            {
              name: 'DB_HOST'
              value: '${postgresServer.name}.postgres.database.azure.com'
            }
            {
              name: 'DB_PORT'
              value: '5432'
            }
            {
              name: 'DB_NAME'
              value: 'dealscout'
            }
            {
              name: 'DB_USER'
              value: 'dealscout'
            }
            {
              name: 'REDIS_HOST'
              value: '${redisCache.name}.redis.cache.windows.net'
            }
            {
              name: 'REDIS_PORT'
              value: '6380'
            }
            {
              name: 'TINYFISH_BASE_URL'
              value: 'https://api.tinyfish.com/v1'
            }
            {
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
            {
              name: 'REDIS_URL'
              secretRef: 'redis-url'
            }
            {
              name: 'TINYFISH_API_KEY'
              secretRef: 'tinyfish-api-key'
            }
            {
              name: 'JWT_SECRET'
              secretRef: 'jwt-secret'
            }
            {
              name: 'SESSION_SECRET'
              secretRef: 'session-secret'
            }
            {
              name: 'MAX_CONCURRENT_JOBS'
              value: '3'
            }
          ]
        }
      ]
      scale: {
        minReplicas: workerReplicas
        maxReplicas: workerReplicas
      }
    }
  }
}

// ============================================================================
// NETWORKING - VNet, Subnets, and Private DNS
// ============================================================================

// Virtual Network for Container Apps integration
resource vnet 'Microsoft.Network/virtualNetworks@2023-02-01' = {
  name: 'vnet-${environmentName}'
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: [
        '10.0.0.0/16'
      ]
    }
    subnets: [
      {
        name: 'container-apps'
        properties: {
          addressPrefix: '10.0.1.0/24'
        }
      }
      {
        name: 'databases'
        properties: {
          addressPrefix: '10.0.2.0/24'
          serviceEndpoints: [
            {
              service: 'Microsoft.DBforPostgreSQL'
            }
          ]
          delegations: [
            {
              name: 'postgresqlDelegation'
              properties: {
                serviceName: 'Microsoft.DBforPostgreSQL/flexibleServers'
              }
            }
          ]
        }
      }
    ]
  }
}

resource containerAppsSubnet 'Microsoft.Network/virtualNetworks/subnets@2023-02-01' = {
  parent: vnet
  name: 'container-apps'
  properties: {
    addressPrefix: '10.0.1.0/24'
  }
}

resource postgresSubnet 'Microsoft.Network/virtualNetworks/subnets@2023-02-01' = {
  parent: vnet
  name: 'databases'
  properties: {
    addressPrefix: '10.0.2.0/24'
    delegations: [
      {
        name: 'postgresqlDelegation'
        properties: {
          serviceName: 'Microsoft.DBforPostgreSQL/flexibleServers'
        }
      }
    ]
  }
}

// Private DNS Zone for PostgreSQL
resource privateDnsZonePostgres 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: 'postgres.database.azure.com'
  location: 'global'
}

resource privateDnsZoneLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: privateDnsZonePostgres
  name: 'vnet-link'
  location: 'global'
  properties: {
    registrationEnabled: true
    virtualNetwork: {
      id: vnet.id
    }
  }
}

// ============================================================================
// OUTPUTS - Deployment outputs for reference
// ============================================================================

@export()
output applicationUrl string = appContainerApp.properties.configuration.ingress.fqdn != null 
  ? 'https://${appContainerApp.properties.configuration.ingress.fqdn}'
  : 'https://${appContainerApp.name}.${containerAppEnvironment.properties.defaultDomain}'

@export()
output containerRegistryLoginServer string = containerRegistry.properties.loginServer

@export()
output keyVaultName string = keyVault.name

@export()
output postgresServerName string = postgresServer.name

@export()
output redisCacheName string = redisCache.name

@export()
output containerAppEnvironmentName string = containerAppEnvironment.name

@export()
output applicationInsightsInstrumentationKey string = applicationInsights.properties.InstrumentationKey

@export()
output appContainerAppName string = appContainerApp.name

@export()
output workerContainerAppName string = workerContainerApp.name
