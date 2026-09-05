# Redis Installation Script for Windows
# This script sets up Redis for SecureScout Pro

Write-Host "=== Installing Redis for SecureScout Pro ===" -ForegroundColor Cyan

# Check if Redis is already running
try {
    $redisProcess = Get-Process -Name "redis-server" -ErrorAction SilentlyContinue
    if ($redisProcess) {
        Write-Host "Redis is already running!" -ForegroundColor Green
        exit 0
    }
} catch {
    Write-Host "Redis is not running, proceeding with installation..." -ForegroundColor Yellow
}

# Option 1: Use Chocolatey if available
if (Get-Command choco -ErrorAction SilentlyContinue) {
    Write-Host "Installing Redis via Chocolatey..." -ForegroundColor Blue
    choco install redis-64 -y
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Redis installed successfully via Chocolatey!" -ForegroundColor Green
        Start-Service redis
        Write-Host "Redis service started!" -ForegroundColor Green
        exit 0
    }
}

# Option 2: Download Memurai (Redis for Windows)
Write-Host "Downloading Memurai (Redis for Windows)..." -ForegroundColor Blue
$memuraiUrl = "https://github.com/memurai/memurai/releases/download/v2.0.2/memurai-2.0.2.zip"
$downloadPath = "$env:TEMP\memurai.zip"

try {
    Invoke-WebRequest -Uri $memuraiUrl -OutFile $downloadPath
    Write-Host "Memurai downloaded successfully!" -ForegroundColor Green
    
    # Extract
    $extractPath = "$env:TEMP\memurai"
    Expand-Archive -Path $downloadPath -DestinationPath $extractPath -Force
    
    # Find the executable
    $memuraiExe = Get-ChildItem -Path $extractPath -Recurse -Name "memurai.exe" | Select-Object -First 1
    $memuraiPath = Join-Path $extractPath $memuraiExe
    
    # Copy to program files
    $installPath = "C:\memurai"
    if (!(Test-Path $installPath)) {
        New-Item -ItemType Directory -Path $installPath -Force
    }
    
    Copy-Item -Path "$extractPath\*" -Destination $installPath -Recurse -Force
    
    Write-Host "Memurai installed to: $installPath" -ForegroundColor Green
    
    # Start Redis
    Start-Process -FilePath "$installPath\memurai.exe" -WindowStyle Hidden
    Write-Host "Redis server started!" -ForegroundColor Green
    
    # Test connection
    Start-Sleep -Seconds 2
    try {
        $redisTest = Test-NetConnection -ComputerName localhost -Port 6379 -WarningAction SilentlyContinue
        if ($redisTest.TcpTestSucceeded) {
            Write-Host "Redis connection test successful!" -ForegroundColor Green
        } else {
            Write-Host "Redis connection test failed!" -ForegroundColor Red
        }
    } catch {
        Write-Host "Could not test Redis connection!" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "Failed to install Memurai: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please install Redis manually from: https://redis.io/download" -ForegroundColor Yellow
}

Write-Host "=== Redis Installation Complete ===" -ForegroundColor Cyan
