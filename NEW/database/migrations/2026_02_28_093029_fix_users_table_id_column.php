<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        // Drop tables in correct order (child tables first)
        $tables = [
            'team_user',
            'evidence_chains', 
            'leaks',
            'findings',
            'penetration_tests',
            'domain_opt_outs',
            'abuse_reports',
            'user_verifications',
            'domain_verifications',
            'authorizations',
            'domains',
            'teams',
            'users'
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                Schema::dropIfExists($table);
            }
        }

        // Recreate users table with integer ID
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->string('timezone')->default('UTC');
            $table->string('locale')->default('en');
            $table->json('preferences')->nullable();
            
            // Security fields
            $table->boolean('mfa_enabled')->default(false);
            $table->string('mfa_secret')->nullable();
            $table->json('mfa_recovery_codes')->nullable();
            $table->timestamp('mfa_setup_at')->nullable();
            $table->json('webauthn_credentials')->nullable();
            
            // Verification fields
            $table->enum('verification_status', ['pending', 'verified', 'rejected'])->default('pending');
            $table->timestamp('verified_at')->nullable();
            $table->string('verification_rejection_reason')->nullable();
            
            // Profile fields
            $table->string('company')->nullable();
            $table->string('job_title')->nullable();
            $table->string('linkedin_profile')->nullable();
            $table->json('certifications')->nullable();
            
            // Legal compliance
            $table->boolean('terms_accepted')->default(false);
            $table->timestamp('terms_accepted_at')->nullable();
            $table->string('terms_ip_address')->nullable();
            $table->boolean('aup_accepted')->default(false);
            $table->timestamp('aup_accepted_at')->nullable();
            $table->boolean('privacy_policy_accepted')->default(false);
            $table->timestamp('privacy_policy_accepted_at')->nullable();
            
            // Account status
            $table->boolean('is_active')->default(true);
            $table->boolean('is_suspended')->default(false);
            $table->timestamp('suspended_at')->nullable();
            $table->string('suspension_reason')->nullable();
            
            // Security tracking
            $table->timestamp('last_login_at')->nullable();
            $table->string('last_login_ip')->nullable();
            $table->integer('failed_login_attempts')->default(0);
            $table->timestamp('locked_until')->nullable();
            
            $table->rememberToken();
            $table->timestamps();
        });

        // Recreate teams table with integer ID
        Schema::create('teams', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            
            // Team ownership
            $table->foreignId('owner_id')->constrained('users')->onDelete('cascade');
            
            // Team type and verification
            $table->enum('type', ['individual', 'corporate', 'pentesting_firm', 'mssp', 'government'])->default('individual');
            $table->enum('verification_status', ['pending', 'verified', 'rejected', 'suspended'])->default('pending');
            $table->timestamp('verified_at')->nullable();
            $table->string('verification_rejection_reason')->nullable();
            
            // Corporate information
            $table->string('company_registration')->nullable();
            $table->string('tax_id')->nullable();
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('country')->nullable();
            $table->string('postal_code')->nullable();
            $table->string('phone')->nullable();
            $table->string('website')->nullable();
            
            // Legal compliance
            $table->boolean('terms_accepted')->default(false);
            $table->timestamp('terms_accepted_at')->nullable();
            $table->string('terms_accepted_by')->nullable();
            $table->boolean('aup_accepted')->default(false);
            $table->timestamp('aup_accepted_at')->nullable();
            $table->boolean('privacy_policy_accepted')->default(false);
            $table->timestamp('privacy_policy_accepted_at')->nullable();
            
            // Subscription and billing
            $table->enum('subscription_tier', ['individual', 'team', 'enterprise', 'government'])->default('individual');
            $table->string('stripe_customer_id')->nullable();
            $table->string('stripe_subscription_id')->nullable();
            $table->timestamp('subscription_starts_at')->nullable();
            $table->timestamp('subscription_ends_at')->nullable();
            $table->boolean('subscription_active')->default(false);
            
            // Usage limits
            $table->integer('max_domains')->default(10);
            $table->integer('max_users')->default(5);
            $table->integer('max_reports_per_month')->default(50);
            $table->integer('max_api_calls_per_hour')->default(1000);
            
            // Settings
            $table->json('settings')->nullable();
            $table->boolean('require_approval_for_new_domains')->default(true);
            $table->boolean('auto_approve_authorizations')->default(false);
            $table->string('default_timezone')->default('UTC');
            
            // Status
            $table->boolean('is_active')->default(true);
            $table->boolean('is_suspended')->default(false);
            $table->timestamp('suspended_at')->nullable();
            $table->string('suspension_reason')->nullable();
            
            $table->timestamps();
        });

        // Create team_user pivot table
        Schema::create('team_user', function (Blueprint $table) {
            $table->foreignId('team_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->enum('role', ['owner', 'admin', 'analyst', 'viewer'])->default('analyst');
            $table->timestamp('joined_at')->nullable();
            $table->foreignId('invited_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            
            $table->primary(['team_id', 'user_id']);
        });

        // Create other tables with foreign key references (simplified versions)
        Schema::create('domains', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->onDelete('cascade');
            $table->string('domain');
            $table->string('normalized_domain');
            $table->text('description')->nullable();
            $table->enum('verification_status', ['pending', 'verified', 'rejected', 'expired'])->default('pending');
            $table->timestamp('verified_at')->nullable();
            $table->timestamp('verification_expires_at')->nullable();
            $table->enum('verification_method', ['dns', 'file', 'meta', 'email'])->nullable();
            $table->string('verification_token')->nullable();
            $table->text('verification_value')->nullable();
            $table->text('verification_instructions')->nullable();
            $table->json('dns_records')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->unique('normalized_domain');
        });

        Schema::create('authorizations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->onDelete('cascade');
            $table->morphs('target');
            $table->enum('authorization_type', ['passive', 'active', 'cooperative', 'legal'])->default('passive');
            $table->string('client_name');
            $table->string('client_email');
            $table->string('client_phone')->nullable();
            $table->string('project_name');
            $table->text('project_description');
            $table->date('start_date');
            $table->date('end_date');
            $table->enum('status', ['pending', 'approved', 'rejected', 'expired', 'revoked'])->default('pending');
            $table->text('rejection_reason')->nullable();
            $table->string('authorization_token')->unique();
            $table->timestamp('authorized_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->json('scope')->nullable();
            $table->json('limitations')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });

        // Create remaining tables with minimal structure
        Schema::create('domain_verifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->onDelete('cascade');
            $table->foreignId('domain_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('domain');
            $table->string('normalized_domain');
            $table->enum('verification_method', ['dns', 'file', 'meta', 'email']);
            $table->string('verification_token');
            $table->text('verification_value');
            $table->text('verification_instructions');
            $table->enum('status', ['pending', 'completed', 'failed', 'expired'])->default('pending');
            $table->timestamp('completed_at')->nullable();
            $table->json('dns_records')->nullable();
            $table->json('evidence')->nullable();
            $table->timestamps();
        });

        Schema::create('user_verifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->enum('verification_type', ['identity', 'professional', 'business'])->default('identity');
            $table->string('provider');
            $table->string('external_id');
            $table->string('provider_reference');
            $table->enum('status', ['pending', 'verified', 'rejected'])->default('pending');
            $table->timestamp('verified_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->json('verification_data')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('abuse_reports', function (Blueprint $table) {
            $table->id();
            $table->string('reporter_name');
            $table->string('reporter_email');
            $table->string('reporter_phone')->nullable();
            $table->string('reporter_company')->nullable();
            $table->boolean('reporter_anonymous')->default(false);
            $table->enum('reporter_type', ['individual', 'corporate', 'law_enforcement', 'government'])->default('individual');
            $table->foreignId('reported_team_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('reported_user_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('reported_domain')->nullable();
            $table->text('description');
            $table->enum('severity', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->enum('status', ['pending', 'investigating', 'resolved', 'dismissed'])->default('pending');
            $table->text('resolution_notes')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });

        Schema::create('domain_opt_outs', function (Blueprint $table) {
            $table->id();
            $table->string('domain');
            $table->string('normalized_domain');
            $table->enum('opt_out_type', ['permanent', 'temporary'])->default('permanent');
            $table->date('expires_at')->nullable();
            $table->string('reason');
            $table->string('contact_email');
            $table->string('contact_phone')->nullable();
            $table->boolean('is_verified')->default(false);
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
            
            $table->unique('normalized_domain');
        });

        Schema::create('penetration_tests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->onDelete('cascade');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->string('name');
            $table->text('description');
            $table->enum('type', ['black_box', 'white_box', 'gray_box'])->default('black_box');
            $table->enum('status', ['planning', 'active', 'paused', 'completed', 'cancelled'])->default('planning');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->json('scope')->nullable();
            $table->json('objectives')->nullable();
            $table->enum('severity_level', ['informational', 'low', 'medium', 'high', 'critical'])->default('medium');
            $table->timestamps();
        });

        Schema::create('findings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('penetration_test_id')->constrained()->onDelete('cascade');
            $table->foreignId('discovered_by')->constrained('users')->onDelete('cascade');
            $table->string('title');
            $table->text('description');
            $table->enum('severity', ['informational', 'low', 'medium', 'high', 'critical'])->default('medium');
            $table->enum('status', ['open', 'in_progress', 'resolved', 'false_positive'])->default('open');
            $table->text('proof_of_concept')->nullable();
            $table->text('recommendation')->nullable();
            $table->decimal('cvss_score', 3, 1)->nullable();
            $table->string('cve_id')->nullable();
            $table->json('affected_assets')->nullable();
            $table->timestamps();
        });

        Schema::create('leaks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('penetration_test_id')->nullable()->constrained()->onDelete('cascade');
            $table->enum('type', ['credential', 'data', 'source_code', 'configuration', 'other'])->default('other');
            $table->string('source');
            $table->text('description');
            $table->longText('content');
            $table->enum('severity', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->enum('status', ['unverified', 'verified', 'false_positive'])->default('unverified');
            $table->timestamp('leaked_at')->nullable();
            $table->timestamp('discovered_at')->nullable();
            $table->foreignId('discovered_by')->nullable()->constrained('users')->onDelete('set null');
            $table->boolean('is_public')->default(false);
            $table->timestamps();
            
            $table->index('content');
        });

        Schema::create('evidence_chains', function (Blueprint $table) {
            $table->id();
            $table->foreignId('leak_id')->nullable()->constrained()->onDelete('cascade');
            $table->enum('evidence_type', ['screenshot', 'log_file', 'network_capture', 'memory_dump', 'file_hash', 'other'])->default('other');
            $table->string('storage_path');
            $table->string('sha256_hash');
            $table->text('timestamp_signature');
            $table->foreignId('collected_by')->constrained('users')->onDelete('cascade');
            $table->timestamp('collected_at');
            $table->json('metadata')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_verified')->default(false);
            $table->timestamps();
        });

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evidence_chains');
        Schema::dropIfExists('leaks');
        Schema::dropIfExists('findings');
        Schema::dropIfExists('penetration_tests');
        Schema::dropIfExists('domain_opt_outs');
        Schema::dropIfExists('abuse_reports');
        Schema::dropIfExists('user_verifications');
        Schema::dropIfExists('domain_verifications');
        Schema::dropIfExists('authorizations');
        Schema::dropIfExists('domains');
        Schema::dropIfExists('team_user');
        Schema::dropIfExists('teams');
        Schema::dropIfExists('users');
    }
};
