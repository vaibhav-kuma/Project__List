#!/bin/bash

# SecureScout Pro - Production Deployment Script
# This script automates the deployment process for production environments

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    error "This script should not be run as root for security reasons"
fi

# Configuration
PROJECT_DIR="/var/www/securescout"
BACKUP_DIR="/backup/securescout"
LOG_FILE="/var/log/securescout-deploy.log"

# Create log file
sudo mkdir -p "$(dirname "$LOG_FILE")"
sudo touch "$LOG_FILE"
sudo chown $USER:$USER "$LOG_FILE"

# Log everything
exec > >(tee -a "$LOG_FILE")
exec 2>&1

log "Starting SecureScout Pro deployment..."

# Pre-deployment checks
log "Performing pre-deployment checks..."

# Check if required commands exist
for cmd in git composer php nginx sudo; do
    if ! command -v $cmd &> /dev/null; then
        error "Required command '$cmd' is not installed"
    fi
done

# Check PHP version
PHP_VERSION=$(php -v | head -n1 | cut -d' ' -f2 | cut -d'.' -f1,2)
REQUIRED_PHP_VERSION="8.3"

if [ "$(printf '%s\n' "$REQUIRED_PHP_VERSION" "$PHP_VERSION" | sort -V | head -n1)" != "$REQUIRED_PHP_VERSION" ]; then
    error "PHP version $PHP_VERSION is not supported. Required: $REQUIRED_PHP_VERSION+"
fi

success "Pre-deployment checks passed"

# Backup current deployment
log "Creating backup of current deployment..."
if [ -d "$PROJECT_DIR" ]; then
    BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
    sudo mkdir -p "$BACKUP_DIR"
    sudo cp -r "$PROJECT_DIR" "$BACKUP_DIR/$BACKUP_NAME"
    sudo chown -R $USER:$USER "$BACKUP_DIR/$BACKUP_NAME"
    success "Backup created: $BACKUP_DIR/$BACKUP_NAME"
else
    warning "No existing deployment found, skipping backup"
fi

# Navigate to project directory
if [ ! -d "$PROJECT_DIR" ]; then
    log "Creating project directory..."
    sudo mkdir -p "$PROJECT_DIR"
    sudo chown $USER:www-data "$PROJECT_DIR"
fi

cd "$PROJECT_DIR"

# Maintenance mode
log "Enabling maintenance mode..."
php artisan down --render="errors::503" --retry=60

# Update code
log "Updating application code..."
if [ -d ".git" ]; then
    git fetch origin
    git pull origin main
else
    error "Not a git repository. Please clone the repository first."
fi

# Install/update dependencies
log "Installing dependencies..."
composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist

# Clear caches
log "Clearing application caches..."
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan event:clear

# Run database migrations
log "Running database migrations..."
php artisan migrate --force --no-interaction

# Optimize for production
log "Optimizing application for production..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
php artisan optimize

# Create storage links
log "Creating storage links..."
php artisan storage:link

# Set correct permissions
log "Setting file permissions..."
sudo find . -type f -exec chmod 644 {} \;
sudo find . -type d -exec chmod 755 {} \;
sudo chmod -R 775 storage bootstrap/cache
sudo chown -R www-data:www-data storage bootstrap/cache

# Restart services
log "Restarting services..."
sudo systemctl reload nginx
sudo systemctl restart php8.3-fpm
sudo systemctl restart securescout-queue 2>/dev/null || true

# Health check
log "Performing health check..."
HEALTH_CHECK_URL="https://$(grep 'APP_URL' .env | cut -d'=' -f2)/health"
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f -s "$HEALTH_CHECK_URL" > /dev/null; then
        success "Health check passed"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        log "Health check failed, retrying... ($RETRY_COUNT/$MAX_RETRIES)"
        sleep 2
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    error "Health check failed after $MAX_RETRIES attempts"
fi

# Disable maintenance mode
log "Disabling maintenance mode..."
php artisan up

# Post-deployment tasks
log "Running post-deployment tasks..."

# Clear OPCache if installed
if php -m | grep -q opcache; then
    php -r "opcache_reset();"
    log "OPCache cleared"
fi

# Warm up caches
log "Warming up caches..."
curl -s "https://$(grep 'APP_URL' .env | cut -d'=' -f2)" > /dev/null

# Security audit
log "Running security audit..."
composer audit --no-dev

# Generate deployment report
REPORT_FILE="$BACKUP_DIR/deployment_report_$(date +%Y%m%d_%H%M%S).txt"
cat > "$REPORT_FILE" << EOF
SecureScout Pro Deployment Report
=================================
Date: $(date)
Version: $(git rev-parse HEAD)
PHP Version: $(php -v | head -n1)
Laravel Version: $(php artisan --version | cut -d' ' -f3)

Deployment Status: SUCCESS
Backup Location: $BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S)
Log File: $LOG_FILE

Services Status:
- Nginx: $(systemctl is-active nginx)
- PHP-FPM: $(systemctl is-active php8.3-fpm)
- Redis: $(systemctl is-active redis-server)
- Queue Worker: $(systemctl is-active securescout-queue 2>/dev/null || echo 'Not configured')

Next Steps:
1. Monitor application logs: tail -f $PROJECT_DIR/storage/logs/laravel.log
2. Check queue processing: php artisan queue:monitor
3. Verify all services are running
4. Test critical functionality

Emergency Rollback:
1. sudo systemctl stop nginx php8.3-fpm
2. sudo rm -rf $PROJECT_DIR
3. sudo mv $BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S) $PROJECT_DIR
4. sudo systemctl start nginx php8.3-fpm
5. Run: php artisan config:cache && php artisan route:cache

EOF

success "Deployment completed successfully!"
success "Deployment report: $REPORT_FILE"

# Send notification (if configured)
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"SecureScout Pro deployment completed successfully on $(hostname)\"}" \
        "$SLACK_WEBHOOK_URL"
fi

if [ -n "$EMAIL_NOTIFICATION" ]; then
    echo "SecureScout Pro deployment completed successfully on $(hostname)" | \
        mail -s "Deployment Success: SecureScout Pro" "$EMAIL_NOTIFICATION"
fi

log "Deployment process completed. Monitor the application for any issues."
log "Next steps:"
log "1. Monitor logs: tail -f $PROJECT_DIR/storage/logs/laravel.log"
log "2. Check queue: php artisan queue:monitor"
log "3. Test functionality: curl -f $HEALTH_CHECK_URL"

exit 0
