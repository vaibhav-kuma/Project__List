# SecureScout Pro - Production Deployment Script (PowerShell)
# This script automates the deployment process for production environments on Windows

param(
    [switch]$SkipBackup,
    [switch]$Force,
    [string]$Environment = "production"
)

# Error handling
$ErrorActionPreference = "Stop"

# Colors for output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-ColorOutput "[$timestamp] $Message" "Cyan"
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "[SUCCESS] $Message" "Green"
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "[ERROR] $Message" "Red"
    exit 1
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "[WARNING] $Message" "Yellow"
}

# Configuration
$PROJECT_DIR = "F:\Resume\ninor_project\New"
$BACKUP_DIR = "F:\backup\securescout"
$LOG_FILE = "F:\logs\securescout-deploy.log"

# Create directories
New-Item -ItemType Directory -Force -Path (Split-Path $LOG_FILE) | Out-Null
New-Item -ItemType Directory -Force -Path $BACKUP_DIR | Out-Null

# Start logging
Start-Transcript -Path $LOG_FILE -Append

Write-Log "Starting SecureScout Pro deployment..."
Write-Log "Environment: $Environment"
Write-Log "Project Directory: $PROJECT_DIR"

# Pre-deployment checks
Write-Log "Performing pre-deployment checks..."

# Check if required commands exist
$requiredCommands = @("git", "composer", "php")
foreach ($cmd in $requiredCommands) {
    try {
        Get-Command $cmd -ErrorAction Stop | Out-Null
    } catch {
        Write-Error "Required command '$cmd' is not installed or not in PATH"
    }
}

# Check PHP version
try {
    $phpVersion = php -v | Select-Object -First 1
    Write-Log "PHP Version: $phpVersion"
    
    if ($phpVersion -notmatch "PHP 8\.3") {
        Write-Warning "PHP version 8.3 is recommended. Current version may not be compatible."
    }
} catch {
    Write-Error "Unable to determine PHP version"
}

Write-Success "Pre-deployment checks passed"

# Backup current deployment
if (-not $SkipBackup) {
    Write-Log "Creating backup of current deployment..."
    
    $backupName = "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    $backupPath = Join-Path $BACKUP_DIR $backupName
    
    try {
        Copy-Item -Path $PROJECT_DIR -Destination $backupPath -Recurse -Force
        Write-Success "Backup created: $backupPath"
    } catch {
        Write-Warning "Failed to create backup: $($_.Exception.Message)"
    }
} else {
    Write-Warning "Skipping backup as requested"
}

# Navigate to project directory
Set-Location $PROJECT_DIR

# Check if it's a git repository
if (-not (Test-Path ".git")) {
    Write-Error "Not a git repository. Please initialize git repository first."
}

# Maintenance mode (if Laravel is installed)
if (Test-Path "artisan") {
    Write-Log "Enabling maintenance mode..."
    try {
        php artisan down --render="errors::503" --retry=60
    } catch {
        Write-Warning "Could not enable maintenance mode: $($_.Exception.Message)"
    }
}

# Update code
Write-Log "Updating application code..."
try {
    git fetch origin
    git pull origin main
    Write-Success "Code updated successfully"
} catch {
    Write-Error "Failed to update code: $($_.Exception.Message)"
}

# Install/update dependencies
Write-Log "Installing dependencies..."
try {
    if ($Environment -eq "production") {
        composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist
    } else {
        composer install --optimize-autoloader --no-interaction --prefer-dist
    }
    Write-Success "Dependencies installed successfully"
} catch {
    Write-Error "Failed to install dependencies: $($_.Exception.Message)"
}

# Clear caches
if (Test-Path "artisan") {
    Write-Log "Clearing application caches..."
    try {
        php artisan cache:clear
        php artisan config:clear
        php artisan route:clear
        php artisan view:clear
        php artisan event:clear
        Write-Success "Caches cleared successfully"
    } catch {
        Write-Warning "Could not clear caches: $($_.Exception.Message)"
    }

    # Run database migrations
    Write-Log "Running database migrations..."
    try {
        php artisan migrate --force --no-interaction
        Write-Success "Database migrations completed successfully"
    } catch {
        Write-Error "Database migrations failed: $($_.Exception.Message)"
    }

    # Optimize for production
    if ($Environment -eq "production") {
        Write-Log "Optimizing application for production..."
        try {
            php artisan config:cache
            php artisan route:cache
            php artisan view:cache
            php artisan event:cache
            php artisan optimize
            Write-Success "Application optimized for production"
        } catch {
            Write-Warning "Could not optimize application: $($_.Exception.Message)"
        }
    }

    # Create storage links
    Write-Log "Creating storage links..."
    try {
        php artisan storage:link
        Write-Success "Storage links created successfully"
    } catch {
        Write-Warning "Could not create storage links: $($_.Exception.Message)"
    }

    # Disable maintenance mode
    Write-Log "Disabling maintenance mode..."
    try {
        php artisan up
        Write-Success "Maintenance mode disabled"
    } catch {
        Write-Warning "Could not disable maintenance mode: $($_.Exception.Message)"
    }
}

# Set correct permissions (Windows equivalent)
Write-Log "Setting file permissions..."
try {
    # Windows doesn't have the same permission system as Linux
    # But we can ensure the storage directory is writable
    $storagePath = Join-Path $PROJECT_DIR "storage"
    if (Test-Path $storagePath) {
        # Try to make storage writable (Windows equivalent)
        icacls $storagePath /grant "IIS_IUSRS:(OI)(CI)F" /T 2>$null
        icacls $storagePath /grant "IUSR:(OI)(CI)F" /T 2>$null
    }
    Write-Success "File permissions set"
} catch {
    Write-Warning "Could not set file permissions: $($_.Exception.Message)"
}

# Health check
if (Test-Path "artisan") {
    Write-Log "Performing health check..."
    
    try {
        # Check if Laravel is responding
        $healthCheck = php artisan about --json | ConvertFrom-Json
        
        if ($healthCheck.environment -eq $Environment) {
            Write-Success "Health check passed - Environment: $($healthCheck.environment)"
        } else {
            Write-Warning "Health check warning - Expected environment: $Environment, Actual: $($healthCheck.environment)"
        }
        
        # Check database connection
        $dbCheck = php artisan tinker --execute="DB::connection()->getPdo(); echo 'Database connection: OK';"
        if ($dbCheck -match "OK") {
            Write-Success "Database connection: OK"
        } else {
            Write-Warning "Database connection check failed"
        }
        
    } catch {
        Write-Warning "Health check failed: $($_.Exception.Message)"
    }
}

# Post-deployment tasks
Write-Log "Running post-deployment tasks..."

# Security audit
Write-Log "Running security audit..."
try {
    composer audit --no-dev
    Write-Success "Security audit completed"
} catch {
    Write-Warning "Security audit found issues: $($_.Exception.Message)"
}

# Generate deployment report
$reportFile = Join-Path $BACKUP_DIR "deployment_report_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"
$reportContent = @"
SecureScout Pro Deployment Report
=================================
Date: $(Get-Date)
Version: $(git rev-parse HEAD)
Environment: $Environment
PHP Version: $(php -v | Select-Object -First 1)

Deployment Status: SUCCESS
Project Directory: $PROJECT_DIR
Backup Directory: $BACKUP_DIR
Log File: $LOG_FILE

Next Steps:
1. Monitor application logs
2. Test critical functionality
3. Verify all services are running
4. Check queue processing if applicable

Emergency Rollback:
1. Stop web server
2. Restore from backup: $backupPath
3. Restart web server

"@ | Out-File -FilePath $reportFile -Encoding UTF8

Write-Success "Deployment completed successfully!"
Write-Success "Deployment report: $reportFile"

# Stop logging
Stop-Transcript

Write-Log "Deployment process completed. Monitor the application for any issues."
Write-Log "Next steps:"
Write-Log "1. Monitor logs: Get-Content $PROJECT_DIR\storage\logs\laravel.log -Tail -Wait"
Write-Log "2. Test functionality: Access your application in browser"
Write-Log "3. Check configuration: php artisan about"

Write-Success "SecureScout Pro deployment completed successfully!"
