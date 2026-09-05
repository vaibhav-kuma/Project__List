#!/bin/bash
# DealScout Azure Deployment Helper Script
# Automates common deployment tasks

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SUBSCRIPTION_ID="44c11518-f168-4950-96d1-657ba8171ca7"
RESOURCE_GROUP="Hac4er"
LOCATION="westus2"
ENV_NAME="dealscout-dev"

# Functions
print_header() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}========================================${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check Azure CLI
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI not installed. Install from: https://aka.ms/azure-cli"
        exit 1
    fi
    print_success "Azure CLI: $(az --version | head -1)"
    
    # Check AZD
    if ! command -v azd &> /dev/null; then
        print_error "Azure Developer CLI not installed. Install from: https://aka.ms/azd"
        exit 1
    fi
    print_success "Azure Developer CLI: $(azd version)"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker not installed. Install from: https://docs.docker.com/get-docker"
        exit 1
    fi
    print_success "Docker: $(docker --version)"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js not installed. Install version 18+"
        exit 1
    fi
    print_success "Node.js: $(node --version)"
}

setup_azure_cli() {
    print_header "Setting Up Azure CLI"
    
    print_info "Logging into Azure..."
    az login
    
    print_info "Setting subscription..."
    az account set --subscription $SUBSCRIPTION_ID
    
    print_info "Creating resource group..."
    az group create \
        --name $RESOURCE_GROUP \
        --location $LOCATION 2>/dev/null || print_info "Resource group already exists"
    
    print_success "Azure CLI setup complete"
}

setup_azd_environment() {
    print_header "Setting Up AZD Environment"
    
    print_info "Creating AZD environment..."
    azd env new $ENV_NAME --no-prompt 2>/dev/null || print_info "Environment already exists"
    
    print_info "Configuring environment variables..."
    azd env set AZURE_SUBSCRIPTION_ID $SUBSCRIPTION_ID
    azd env set AZURE_RESOURCE_GROUP $RESOURCE_GROUP
    azd env set AZURE_LOCATION $LOCATION
    
    print_success "AZD environment setup complete"
}

configure_secrets() {
    print_header "Configuring Deployment Secrets"
    
    print_info "You will be prompted to enter secrets"
    print_info "Leave empty to use existing secrets or skip"
    
    read -sp "Enter DATABASE_PASSWORD (or press Enter to skip): " DB_PASS
    if [ ! -z "$DB_PASS" ]; then
        azd env set DATABASE_PASSWORD "$DB_PASS"
        print_success "DATABASE_PASSWORD configured"
    fi
    
    read -sp "Enter TINYFISH_API_KEY (or press Enter to skip): " API_KEY
    if [ ! -z "$API_KEY" ]; then
        azd env set TINYFISH_API_KEY "$API_KEY"
        print_success "TINYFISH_API_KEY configured"
    fi
    
    read -sp "Enter JWT_SECRET (or press Enter to skip): " JWT
    if [ ! -z "$JWT" ]; then
        azd env set JWT_SECRET "$JWT"
        print_success "JWT_SECRET configured"
    fi
    
    read -sp "Enter SESSION_SECRET (or press Enter to skip): " SESSION
    if [ ! -z "$SESSION" ]; then
        azd env set SESSION_SECRET "$SESSION"
        print_success "SESSION_SECRET configured"
    fi
}

deploy_application() {
    print_header "Deploying Application"
    
    print_info "This will build, push, and deploy your application"
    print_info "This may take 15-20 minutes for first deployment"
    
    read -p "Continue with deployment? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        azd up --no-prompt
        print_success "Deployment complete!"
        
        print_header "Deployment Outputs"
        azd env get-values
    else
        print_info "Deployment cancelled"
    fi
}

check_deployment() {
    print_header "Checking Deployment Status"
    
    print_info "Checking Container Apps..."
    az containerapp list \
        --resource-group $RESOURCE_GROUP \
        --query "[].{name:name, status:properties.provisioningState}" \
        -o table
    
    print_info "Checking PostgreSQL Server..."
    az postgres flexible-server list \
        --resource-group $RESOURCE_GROUP \
        --query "[].{name:name, state:state}" \
        -o table
    
    print_info "Checking Redis Cache..."
    az redis list \
        --resource-group $RESOURCE_GROUP \
        --query "[].{name:name, state:provisioningState}" \
        -o table
}

view_logs() {
    print_header "Viewing Application Logs"
    
    APP_NAME="ca-${ENV_NAME}-app"
    
    print_info "Fetching logs from $APP_NAME..."
    az containerapp logs show \
        --resource-group $RESOURCE_GROUP \
        --name $APP_NAME \
        --tail 50 \
        --format table
}

verify_health() {
    print_header "Verifying Application Health"
    
    APP_URL=$(azd env get-value APP_ENDPOINT 2>/dev/null || echo "")
    
    if [ -z "$APP_URL" ]; then
        print_error "Could not get application endpoint"
        print_info "Run: azd env get-values"
        return 1
    fi
    
    print_info "Testing health endpoint at: $APP_URL"
    
    # Try health check
    if curl -s -k "$APP_URL/health" > /dev/null 2>&1; then
        print_success "Health check passed"
    else
        print_error "Health check failed"
        print_info "Application may still be starting up"
    fi
}

cleanup() {
    print_header "Cleanup"
    
    read -p "Delete all Azure resources in $RESOURCE_GROUP? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Deleting resource group: $RESOURCE_GROUP"
        az group delete \
            --name $RESOURCE_GROUP \
            --yes --no-wait
        print_success "Resource group deletion initiated"
    else
        print_info "Cleanup cancelled"
    fi
}

show_menu() {
    echo ""
    echo "DealScout Azure Deployment Helper"
    echo "=================================="
    echo "1. Check prerequisites"
    echo "2. Setup Azure CLI"
    echo "3. Setup AZD environment"
    echo "4. Configure secrets"
    echo "5. Deploy application (full: build + push + deploy)"
    echo "6. Check deployment status"
    echo "7. View application logs"
    echo "8. Verify application health"
    echo "9. Cleanup (delete all resources)"
    echo "10. Exit"
    echo ""
    read -p "Select an option (1-10): " choice
}

# Main script
main() {
    while true; do
        show_menu
        
        case $choice in
            1) check_prerequisites ;;
            2) setup_azure_cli ;;
            3) setup_azd_environment ;;
            4) configure_secrets ;;
            5) deploy_application ;;
            6) check_deployment ;;
            7) view_logs ;;
            8) verify_health ;;
            9) cleanup ;;
            10) 
                print_info "Exiting..."
                exit 0
                ;;
            *)
                print_error "Invalid option. Please try again."
                ;;
        esac
    done
}

# Run main function
main "$@"
