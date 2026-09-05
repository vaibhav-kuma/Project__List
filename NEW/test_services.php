<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$kernel->bootstrap();

echo "=== SecureScout Pro - Services Configuration Test ===\n\n";

// Test Database
try {
    $tables = DB::select("SELECT name FROM sqlite_master WHERE type='table'");
    echo "✅ Database: " . count($tables) . " tables created\n";
    echo "   Tables: " . implode(', ', array_column($tables, 'name')) . "\n";
} catch (Exception $e) {
    echo "❌ Database: " . $e->getMessage() . "\n";
}

// Test Cache
try {
    Cache::put('test_key', 'test_value', 60);
    $value = Cache::get('test_key');
    echo "✅ Cache: Working ({$value})\n";
} catch (Exception $e) {
    echo "❌ Cache: " . $e->getMessage() . "\n";
}

// Test File Storage
try {
    Storage::put('test.txt', 'Hello SecureScout Pro!');
    $content = Storage::get('test.txt');
    echo "✅ File Storage: Working ({$content})\n";
    Storage::delete('test.txt');
} catch (Exception $e) {
    echo "❌ File Storage: " . $e->getMessage() . "\n";
}

// Test Mail Configuration
try {
    $config = config('mail');
    echo "✅ Mail: Configured ({$config['default']} driver)\n";
    echo "   Host: {$config['mailers'][$config['default']]['host']}\n";
} catch (Exception $e) {
    echo "❌ Mail: " . $e->getMessage() . "\n";
}

// Test Models
$models = ['User', 'Team', 'Domain', 'Authorization', 'AbuseReport', 'EvidenceChain'];
foreach ($models as $model) {
    try {
        $modelClass = "App\\Models\\{$model}";
        $instance = new $modelClass();
        echo "✅ {$model} Model: OK\n";
    } catch (Exception $e) {
        echo "❌ {$model} Model: " . $e->getMessage() . "\n";
    }
}

// Test Services
$services = [
    'AuthorizationManagementService',
    'DomainVerificationService', 
    'AbuseDetectionService',
    'EvidenceIntegrityService',
    'OSINTCollectionService',
    'PenetrationTestingService',
    'ProfessionalReportingService',
    'SecurityEcosystemService'
];

foreach ($services as $service) {
    try {
        $serviceClass = "App\\Services\\{$service}";
        $instance = new $serviceClass();
        echo "✅ {$service}: OK\n";
    } catch (Exception $e) {
        echo "❌ {$service}: " . $e->getMessage() . "\n";
    }
}

// Test Routes
$routes = [
    '/' => 'Welcome Page',
    '/health' => 'Health Check',
    '/legal/terms' => 'Terms of Service',
    '/legal/privacy' => 'Privacy Policy',
    '/legal/acceptable-use' => 'Acceptable Use Policy'
];

echo "\n=== Route Testing ===\n";
foreach ($routes as $route => $description) {
    try {
        $response = app('router')->dispatch(app('request')->create($route));
        echo "✅ {$route} ({$description}): {$response->getStatusCode()}\n";
    } catch (Exception $e) {
        echo "❌ {$route}: " . $e->getMessage() . "\n";
    }
}

echo "\n=== Configuration Summary ===\n";
echo "App Name: " . config('app.name') . "\n";
echo "Environment: " . config('app.env') . "\n";
echo "Debug Mode: " . (config('app.debug') ? 'ON' : 'OFF') . "\n";
echo "Database: " . config('database.default') . "\n";
echo "Cache: " . config('cache.default') . "\n";
echo "Session: " . config('session.driver') . "\n";
echo "Queue: " . config('queue.default') . "\n";
echo "Mail: " . config('mail.default') . "\n";

echo "\n=== Test Complete ===\n";
