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
        Schema::create('teams', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            
            // Team ownership
            $table->uuid('owner_id');
            $table->foreign('owner_id')->references('id')->on('users')->onDelete('cascade');
            
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
            
            // Team settings
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
            
            // Indexes
            $table->index(['slug', 'is_active']);
            $table->index(['owner_id']);
            $table->index(['verification_status', 'verified_at']);
            $table->index(['type', 'subscription_tier']);
            $table->index(['is_suspended', 'suspended_at']);
        });
        
        Schema::create('team_user', function (Blueprint $table) {
            $table->uuid('team_id');
            $table->uuid('user_id');
            $table->enum('role', ['owner', 'admin', 'member', 'viewer'])->default('member');
            $table->timestamp('joined_at')->useCurrent();
            $table->timestamp('invited_by')->nullable();
            
            $table->primary(['team_id', 'user_id']);
            $table->foreign('team_id')->references('id')->on('teams')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            
            $table->index(['team_id', 'role']);
            $table->index(['user_id', 'role']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('team_user');
        Schema::dropIfExists('teams');
    }
};
