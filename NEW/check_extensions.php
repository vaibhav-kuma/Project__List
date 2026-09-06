<?php

echo "=== SecureScout Pro - PHP Extensions Check ===\n\n";

echo "PHP Version: " . phpversion() . "\n";
echo "PHP SAPI: " . PHP_SAPI . "\n";
echo "PHP Configuration File: " . php_ini_loaded_file() . "\n";
echo "Extension Directory: " . ini_get('extension_dir') . "\n\n";

echo "=== Required Extensions Check ===\n";

$required = [
    'exif' => 'Image metadata processing',
    'gd' => 'Image processing and manipulation',
    'intl' => 'Internationalization functions',
    'mbstring' => 'Multibyte string handling',
    'openssl' => 'Cryptographic functions',
    'zip' => 'Archive handling',
    'bcmath' => 'Precision mathematics',
    'pdo' => 'Database abstraction layer',
    'pdo_mysql' => 'MySQL database driver',
    'pdo_pgsql' => 'PostgreSQL database driver',
    'curl' => 'HTTP client functionality',
    'json' => 'JSON processing',
    'fileinfo' => 'File type detection',
    'tokenizer' => 'PHP source parsing',
    'xml' => 'XML processing',
    'dom' => 'HTML/XML manipulation',
    'session' => 'Session management',
    'filter' => 'Data filtering',
];

$optional = [
    'redis' => 'Redis client (can use Predis as alternative)',
    'imagick' => 'Advanced image processing (optional)',
    'soap' => 'SOAP web services (optional)',
    'ldap' => 'LDAP protocol support (optional)',
];

$missing_required = [];
$missing_optional = [];

echo "REQUIRED EXTENSIONS:\n";
foreach ($required as $ext => $description) {
    $status = extension_loaded($ext) ? '✅' : '❌';
    echo sprintf("  %s %-15s - %s\n", $status, $ext, $description);
    if (!extension_loaded($ext)) {
        $missing_required[] = $ext;
    }
}

echo "\nOPTIONAL EXTENSIONS:\n";
foreach ($optional as $ext => $description) {
    $status = extension_loaded($ext) ? '✅' : '⚠️ ';
    echo sprintf("  %s %-15s - %s\n", $status, $ext, $description);
    if (!extension_loaded($ext)) {
        $missing_optional[] = $ext;
    }
}

echo "\n=== Summary ===\n";
$total_required = count($required);
$installed_required = $total_required - count($missing_required);
$percentage = round(($installed_required / $total_required) * 100, 1);

echo "Required Extensions: $installed_required/$total_required ($percentage%)\n";

if (empty($missing_required)) {
    echo "🎉 All required extensions are installed!\n";
} else {
    echo "❌ Missing required extensions: " . implode(', ', $missing_required) . "\n";
}

if (!empty($missing_optional)) {
    echo "⚠️  Missing optional extensions: " . implode(', ', $missing_optional) . "\n";
}

echo "\n=== Recommendations ===\n";

if (!empty($missing_required)) {
    echo "1. Install missing required extensions:\n";
    foreach ($missing_required as $ext) {
        echo "   - $ext\n";
    }
    echo "\n";
}

if (in_array('pdo_mysql', $missing_required) && in_array('pdo_pgsql', $missing_required)) {
    echo "2. Install either MySQL or PostgreSQL driver:\n";
    echo "   - For MySQL: extension=pdo_mysql\n";
    echo "   - For PostgreSQL: extension=pdo_pgsql\n\n";
}

if (in_array('redis', $missing_optional)) {
    echo "3. For Redis support, you have two options:\n";
    echo "   - Install php_redis extension\n";
    echo "   - Or use Predis package (pure PHP): composer require predis/predis\n\n";
}

echo "=== Next Steps ===\n";
if (empty($missing_required)) {
    echo "✅ Ready to install SecureScout Pro dependencies:\n";
    echo "   composer install --no-dev --optimize-autoloader --ignore-platform-reqs\n";
} else {
    echo "1. Install missing PHP extensions\n";
    echo "2. Restart your web server\n";
    echo "3. Run this script again to verify\n";
    echo "4. Install dependencies with composer\n";
}

echo "\n=== PHP Info ===\n";
echo "Memory Limit: " . ini_get('memory_limit') . "\n";
echo "Max Execution Time: " . ini_get('max_execution_time') . "\n";
echo "Upload Max Filesize: " . ini_get('upload_max_filesize') . "\n";
echo "Post Max Size: " . ini_get('post_max_size') . "\n";

echo "\n=== Laravel Requirements Check ===\n";
$laravel_requirements = [
    'PHP' => version_compare(PHP_VERSION, '8.2.0', '>='),
    'BCMath' => extension_loaded('bcmath'),
    'Ctype' => extension_loaded('ctype'),
    'Fileinfo' => extension_loaded('fileinfo'),
    'JSON' => extension_loaded('json'),
    'Mbstring' => extension_loaded('mbstring'),
    'OpenSSL' => extension_loaded('openssl'),
    'PDO' => extension_loaded('pdo'),
    'Tokenizer' => extension_loaded('tokenizer'),
    'XML' => extension_loaded('xml'),
];

echo "Laravel 11 Requirements:\n";
foreach ($laravel_requirements as $req => $met) {
    $status = $met ? '✅' : '❌';
    echo "  $status $req\n";
}

$all_met = array_reduce($laravel_requirements, function($carry, $item) {
    return $carry && $item;
}, true);

if ($all_met) {
    echo "\n🎉 Your system meets all Laravel requirements!\n";
} else {
    echo "\n❌ Your system does not meet all Laravel requirements.\n";
}

echo "\n=== Check Complete ===\n";
