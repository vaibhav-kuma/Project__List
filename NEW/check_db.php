<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$kernel->bootstrap();

echo "=== Database Check ===\n";

echo "Users in database:\n";
$users = \App\Models\User::all();
foreach($users as $user) {
    echo 'ID: ' . $user->id . ' (Type: ' . gettype($user->id) . ') - Email: ' . $user->email . "\n";
}

echo "\nChecking user table schema:\n";
$columns = \Illuminate\Support\Facades\Schema::getColumnListing('users');
echo "Columns: " . implode(', ', $columns) . "\n";

echo "\nChecking team table schema:\n";
$teamColumns = \Illuminate\Support\Facades\Schema::getColumnListing('teams');
echo "Columns: " . implode(', ', $teamColumns) . "\n";
