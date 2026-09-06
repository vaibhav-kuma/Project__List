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
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
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
            
            // Verification status
            $table->enum('verification_status', ['pending', 'verified', 'rejected', 'suspended'])->default('pending');
            $table->timestamp('verified_at')->nullable();
            $table->string('verification_rejection_reason')->nullable();
            
            // Professional information
            $table->string('company')->nullable();
            $table->string('job_title')->nullable();
            $table->string('linkedin_profile')->nullable();
            $table->json('certifications')->nullable(); // CEH, OSCP, CISSP, etc.
            
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
            $table->timestamp('last_login_at')->nullable();
            $table->string('last_login_ip')->nullable();
            $table->integer('failed_login_attempts')->default(0);
            $table->timestamp('locked_until')->nullable();
            
            $table->rememberToken();
            $table->timestamps();
            
            // Indexes for security and performance
            $table->index(['email', 'is_active']);
            $table->index(['verification_status', 'verified_at']);
            $table->index(['is_suspended', 'suspended_at']);
            $table->index(['last_login_at']);
            $table->index(['company', 'job_title']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
