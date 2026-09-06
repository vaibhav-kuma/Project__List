<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$kernel->bootstrap();

// Test database connection
try {
    $dbConnection = DB::connection()->getPdo();
    echo "✅ Database Connection: OK\n";
    echo "   Database: " . DB::connection()->getDatabaseName() . "\n";
} catch (Exception $e) {
    echo "❌ Database Connection: FAILED - " . $e->getMessage() . "\n";
}

// Test cache
try {
    Cache::put('test', 'value', 60);
    $value = Cache::get('test');
    echo "✅ Cache: OK\n";
} catch (Exception $e) {
    echo "❌ Cache: FAILED - " . $e->getMessage() . "\n";
}

// Test sessions
try {
    session_start();
    $_SESSION['test'] = 'value';
    echo "✅ Sessions: OK\n";
} catch (Exception $e) {
    echo "❌ Sessions: FAILED - " . $e->getMessage() . "\n";
}

// Test models
try {
    $user = new App\Models\User();
    echo "✅ User Model: OK\n";
} catch (Exception $e) {
    echo "❌ User Model: FAILED - " . $e->getMessage() . "\n";
}

try {
    $team = new App\Models\Team();
    echo "✅ Team Model: OK\n";
} catch (Exception $e) {
    echo "❌ Team Model: FAILED - " . $e->getMessage() . "\n";
}

// Test services
try {
    $service = new App\Services\AuthorizationManagementService();
    echo "✅ Authorization Service: OK\n";
} catch (Exception $e) {
    echo "❌ Authorization Service: FAILED - " . $e->getMessage() . "\n";
}

echo "\n=== Application Test Complete ===\n";
