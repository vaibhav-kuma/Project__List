@description('DealScout Deployment Parameters Override File')
@minLength(12)
@secure()
param databasePassword string

@secure()
param tinyFishApiKey string

@minLength(32)
@secure()
param jwtSecret string

@minLength(32)
@secure()
param sessionSecret string

param location string = 'westus2'
param environmentName string = 'dealscout-dev'
param containerRegistry string = ''
param appServicePort int = 3001
param containerMemory string = '1.0Gi'
param containerCpu string = '0.5'
param appReplicas int = 2
param workerReplicas int = 1
param postgresSkuName string = 'Standard_B2s'
param redisCacheName string = 'redis-${uniqueString(resourceGroup().id)}'
