<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

$kernel->bootstrap();

echo "=== Debug Seeder ===\n";

try {
    // Create admin user
    echo "Creating admin user...\n";
    $adminUser = \App\Models\User::create([
        'id' => \Illuminate\Support\Str::uuid(),
        'first_name' => 'Admin',
        'last_name' => 'User',
        'email' => 'admin@securescout.com',
        'password' => \Illuminate\Support\Facades\Hash::make('password'),
        'phone' => '+1234567890',
        'email_verified_at' => now(),
        'verification_status' => 'verified',
        'verified_at' => now(),
        'company' => 'SecureScout Pro',
        'job_title' => 'Security Administrator',
        'terms_accepted' => true,
        'terms_accepted_at' => now(),
        'terms_ip_address' => '127.0.0.1',
        'aup_accepted' => true,
        'aup_accepted_at' => now(),
        'privacy_policy_accepted' => true,
        'privacy_policy_accepted_at' => now(),
        'is_active' => true,
        'preferences' => [
            'timezone' => 'UTC',
            'locale' => 'en'
        ]
    ]);
    
    echo "✅ Admin user created with ID: " . $adminUser->id . "\n";
    
    // Create team
    echo "Creating team...\n";
    $team = \App\Models\Team::create([
        'id' => \Illuminate\Support\Str::uuid(),
        'name' => 'SecureScout Demo Team',
        'slug' => 'securescout-demo-team',
        'description' => 'Demo team for testing',
        'owner_id' => $adminUser->id,
        'type' => 'corporate',
        'verification_status' => 'verified',
        'verified_at' => now()
    ]);
    
    echo "✅ Team created with ID: " . $team->id . "\n";
    echo "✅ Team owner_id: " . $team->owner_id . "\n";
    
    // Test relationship
    echo "Testing relationship...\n";
    $teamOwner = $team->owner;
    echo "✅ Team owner: " . $teamOwner->email . "\n";
    
    echo "=== Debug Complete ===\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
