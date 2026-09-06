@echo off
echo === SecureScout Pro - PHP Extensions Fix Script ===
echo.

REM Check if we're in the right directory
if not exist "php.ini" (
    echo ERROR: php.ini not found in current directory
    echo Please run this script from your PHP installation directory
    echo Usually: C:\php-8.5.1\
    pause
    exit /b 1
)

echo Current directory: %CD%
echo.

REM Backup original php.ini
if exist "php.ini.backup" (
    echo Backup already exists
) else (
    echo Creating backup of php.ini...
    copy php.ini php.ini.backup
)

echo.
echo === Adding Required Extensions to php.ini ===
echo.

REM Check if extensions are already uncommented
findstr /B /C:";extension=exif" php.ini >nul
if errorlevel 1 (
    echo exif extension already enabled
) else (
    echo Enabling exif extension...
    powershell -Command "(Get-Content php.ini) -replace ';extension=exif', 'extension=exif' | Set-Content php.ini"
)

findstr /B /C:";extension=gd" php.ini >nul
if errorlevel 1 (
    echo gd extension already enabled
) else (
    echo Enabling gd extension...
    powershell -Command "(Get-Content php.ini) -replace ';extension=gd', 'extension=gd' | Set-Content php.ini"
)

findstr /B /C:";extension=zip" php.ini >nul
if errorlevel 1 (
    echo zip extension already enabled
) else (
    echo Enabling zip extension...
    powershell -Command "(Get-Content php.ini) -replace ';extension=zip', 'extension=zip' | Set-Content php.ini"
)

findstr /B /C:";extension=pdo_mysql" php.ini >nul
if errorlevel 1 (
    echo pdo_mysql extension already enabled
) else (
    echo Enabling pdo_mysql extension...
    powershell -Command "(Get-Content php.ini) -replace ';extension=pdo_mysql', 'extension=pdo_mysql' | Set-Content php.ini"
)

echo.
echo === Configuration Complete ===
echo.
echo Next steps:
echo 1. Make sure the DLL files exist in the 'ext' directory
echo 2. Restart your web server (Apache/IIS)
echo 3. Run: php check_extensions.php to verify
echo.

pause
