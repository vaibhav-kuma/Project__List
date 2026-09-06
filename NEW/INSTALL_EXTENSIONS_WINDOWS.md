# Installing PHP Extensions on Windows for SecureScout Pro

## 🪟 **Method 1: XAMPP (Easiest for Development)**

### Step 1: Download XAMPP with PHP 8.3+
```bash
# Visit: https://www.apachefriends.org/download.html
# Download XAMPP with PHP 8.3 or higher
```

### Step 2: Enable Extensions in php.ini
1. Open XAMPP Control Panel
2. Click "Config" next to Apache
3. Select "PHP (php.ini)"
4. Uncomment (remove `;`) these lines:
```ini
extension=exif
extension=gd
extension=intl
extension=mbstring
extension=openssl
extension=pdo_mysql
extension=pdo_pgsql
extension=zip
extension=bcmath
```

### Step 3: Restart Apache
```bash
# In XAMPP Control Panel:
# 1. Stop Apache
# 2. Start Apache
```

---

## 🪟 **Method 2: Official PHP Build**

### Step 1: Download PHP Extensions
```bash
# Visit: https://windows.php.net/download/
# Download PHP 8.3+ Thread Safe version
# Download additional extensions from: https://pecl.php.net/
```

### Step 2: Configure php.ini
1. Find your php.ini file (usually in `C:\php`)
2. Add these lines:
```ini
extension_dir = "ext"
extension=php_exif.dll
extension=php_gd.dll
extension=php_intl.dll
extension=php_mbstring.dll
extension=php_openssl.dll
extension=php_pdo_mysql.dll
extension=php_pdo_pgsql.dll
extension=php_zip.dll
extension=php_bcmath.dll
extension=php_redis.dll
```

### Step 3: Download DLL Files
```bash
# Download missing DLLs from:
# - https://windows.php.net/downloads/pecl/releases/
# - https://pecl.php.net/package/redis
# - https://pecl.php.net/package/imagick

# Place DLL files in C:\php\ext\
```

---

## 🪟 **Method 3: Using Composer (Quick Fix)**

### Install Extensions via Composer
```bash
# Install Imagick (requires ImageMagick installed)
composer require imagick/imagick

# Install Redis client
composer require predis/predis

# Install other dependencies
composer install --ignore-platform-reqs
```

---

## 🔍 **Verify Extensions Installation**

### Check Installed Extensions
```bash
# Check all extensions
php -m

# Check specific extension
php -m | findstr exif
php -m | findstr gd
php -m | findstr intl
php -m | findstr mbstring
php -m | findstr openssl
php -m | findstr zip
php -m | findstr bcmath
```

### Test with PHP Script
```php
<?php
// Create test_extensions.php
echo "PHP Version: " . phpversion() . "\n";
echo "Required Extensions Check:\n";

$required = ['exif', 'gd', 'intl', 'mbstring', 'openssl', 'zip', 'bcmath'];

foreach ($required as $ext) {
    if (extension_loaded($ext)) {
        echo "✅ $ext - Loaded\n";
    } else {
        echo "❌ $ext - Missing\n";
    }
}

// Check database extensions
if (extension_loaded('pdo_mysql')) {
    echo "✅ pdo_mysql - Loaded\n";
} elseif (extension_loaded('pdo_pgsql')) {
    echo "✅ pdo_pgsql - Loaded\n";
} else {
    echo "❌ Database extension - Missing\n";
}
?>
```

Run: `php test_extensions.php`

---

## 🛠️ **Troubleshooting Common Issues**

### Issue 1: "Unable to load dynamic library"
**Solution:** 
1. Ensure DLL files are in the correct `ext` folder
2. Check that `extension_dir` points to the right location
3. Run Command Prompt as Administrator

### Issue 2: "ImageMagick not found"
**Solution:**
1. Download ImageMagick from: https://imagemagick.org/script/download.php#windows
2. Install with "Add to system PATH" option
3. Restart Apache/PHP

### Issue 3: "Redis extension fails"
**Solution:**
1. Use `predis/predis` package instead (pure PHP implementation)
2. Add to composer.json: `"predis/predis": "^2.2"`
3. Run: `composer update`

---

## 🚀 **Quick Installation Script (Windows)**

Create `install_extensions.bat`:
```batch
@echo off
echo Installing PHP Extensions for SecureScout Pro...

REM Check if PHP is installed
php -v >nul 2>&1
if errorlevel 1 (
    echo ERROR: PHP is not installed or not in PATH
    pause
    exit /b 1
)

echo PHP Version:
php -v

echo.
echo Checking required extensions...

php -r "
$required = ['exif', 'gd', 'intl', 'mbstring', 'openssl', 'zip', 'bcmath'];
$missing = [];
foreach ($required as $ext) {
    if (!extension_loaded($ext)) {
        $missing[] = $ext;
    }
}
if (empty($missing)) {
    echo 'All required extensions are installed!';
} else {
    echo 'Missing extensions: ' . implode(', ', $missing);
    echo '';
    echo 'Please install missing extensions and try again.';
}
"

pause
```

Run: `install_extensions.bat`

---

## 📋 **Post-Installation Steps**

### 1. Update Composer Dependencies
```bash
cd "F:\Resume\ninor_project\New"
composer install --no-dev --optimize-autoloader --ignore-platform-reqs
```

### 2. Generate Laravel Key
```bash
php artisan key:generate
```

### 3. Test Laravel Installation
```bash
php artisan about
```

### 4. Run Database Migrations
```bash
php artisan migrate --force
```

---

## 🎯 **Recommended Approach for SecureScout Pro**

### **For Development:**
1. **Install XAMPP** with PHP 8.3+
2. **Enable extensions** in XAMPP's php.ini
3. **Use Composer** with `--ignore-platform-reqs`
4. **Configure local database** (MySQL/PostgreSQL)

### **For Production:**
1. **Use official PHP build** from windows.php.net
2. **Install all required extensions** manually
3. **Configure IIS/Nginx** with FastCGI
4. **Setup proper security** and SSL certificates

---

## 📞 **Getting Help**

If you encounter issues:

1. **Check PHP Error Logs**: `C:\php\logs\php_error.log`
2. **Verify Extension Paths**: Ensure `extension_dir` is correct
3. **Check System Path**: PHP must be in system PATH
4. **Restart Services**: Always restart web server after changes

### **Common Extension Locations:**
- **XAMPP**: `C:\xampp\php\ext\`
- **Official PHP**: `C:\php\ext\`
- **WAMP**: `C:\wamp64\bin\php\php8.3.x\ext\`

---

## ✅ **Verification Checklist**

After installation, verify:

- [ ] PHP 8.3+ is installed
- [ ] All required extensions are loaded
- [ ] Composer can install dependencies
- [ ] Laravel artisan commands work
- [ ] Database connection is functional
- [ ] Web server can serve PHP files

Once all extensions are installed, SecureScout Pro will be fully operational!
