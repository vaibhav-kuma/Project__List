<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Team;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create admin user
        $adminUser = User::create([
            'first_name' => 'Admin',
            'last_name' => 'User',
            'email' => 'admin@securescout.com',
            'password' => Hash::make('password'),
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
                'locale' => 'en',
                'notifications' => [
                    'email' => true,
                    'sms' => false,
                    'push' => true
                ]
            ]
        ]);

        $this->command->info('✅ Admin user created with ID: ' . $adminUser->id);

        // Create test analyst user
        $analystUser = User::create([
            'first_name' => 'Security',
            'last_name' => 'Analyst',
            'email' => 'analyst@securescout.com',
            'password' => Hash::make('password'),
            'phone' => '+1234567891',
            'email_verified_at' => now(),
            'verification_status' => 'verified',
            'verified_at' => now(),
            'company' => 'SecureScout Pro',
            'job_title' => 'Security Analyst',
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
                'locale' => 'en',
                'notifications' => [
                    'email' => true,
                    'sms' => false,
                    'push' => true
                ]
            ]
        ]);

        // Create test team
        $this->command->info('📝 Creating team with owner_id: ' . $adminUser->id);
        $team = Team::create([
            'name' => 'SecureScout Demo Team',
            'slug' => 'securescout-demo-team',
            'description' => 'Demo team for testing SecureScout Pro functionality',
            'owner_id' => $adminUser->id,
            'type' => 'corporate',
            'verification_status' => 'verified',
            'verified_at' => now(),
            'settings' => [
                'max_members' => 50,
                'allow_self_signup' => false,
                'require_approval' => true,
                'default_role' => 'analyst'
            ]
        ]);
        $this->command->info('✅ Team created with ID: ' . $team->id);

        // Attach admin to team
        $team->users()->attach($adminUser->id, [
            'role' => 'owner',
            'joined_at' => now(),
            'invited_by' => $adminUser->id
        ]);

        // Attach analyst to team
        $team->users()->attach($analystUser->id, [
            'role' => 'analyst',
            'joined_at' => now(),
            'invited_by' => $adminUser->id
        ]);

        $this->command->info('✅ Database seeded successfully!');
        $this->command->info('📧 Admin User: admin@securescout.com / password');
        $this->command->info('📧 Analyst User: analyst@securescout.com / password');
        $this->command->info('👥 Team: SecureScout Demo Team');
    }
}
