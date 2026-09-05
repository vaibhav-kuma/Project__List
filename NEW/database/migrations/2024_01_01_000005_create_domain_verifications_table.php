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
        Schema::create('domain_verifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->foreign('team_id')->references('id')->on('teams')->onDelete('cascade');
            
            $table->uuid('domain_id')->nullable();
            $table->foreign('domain_id')->references('id')->on('domains')->onDelete('cascade');
            
            $table->string('domain');
            $table->string('normalized_domain');
            
            // Verification method and token
            $table->enum('verification_method', [
                'dns_txt', 
                'html_meta', 
                'file_upload', 
                'email',
                'manual'
            ])->default('dns_txt');
            
            $table->string('verification_token')->unique();
            $table->string('verification_value')->nullable(); // The actual value to place
            $table->text('verification_instructions')->nullable();
            
            // Verification status
            $table->enum('status', ['pending', 'verified', 'failed', 'expired', 'revoked'])->default('pending');
            $table->timestamp('verified_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('last_attempt_at')->nullable();
            $table->integer('attempt_count')->default(0);
            
            // DNS-specific verification
            $table->string('dns_record_name')->nullable();
            $table->string('dns_record_type')->nullable();
            $table->string('dns_record_value')->nullable();
            $table->json('dns_verification_response')->nullable();
            
            // HTML meta tag verification
            $table->string('meta_tag_name')->nullable();
            $table->string('meta_tag_content')->nullable();
            $table->string('verification_url')->nullable();
            $table->json('html_verification_response')->nullable();
            
            // File upload verification
            $table->string('file_path')->nullable();
            $table->string('file_content')->nullable();
            $table->json('file_verification_response')->nullable();
            
            // Email verification
            $table->string('verification_email')->nullable();
            $table->string('email_code')->nullable();
            $table->timestamp('email_sent_at')->nullable();
            $table->timestamp('email_verified_at')->nullable();
            
            // Manual verification
            $table->uuid('verified_by')->nullable();
            $table->foreign('verified_by')->references('id')->on('users')->onDelete('set null');
            $table->text('manual_verification_notes')->nullable();
            $table->json('manual_verification_evidence')->nullable();
            
            // Technical details
            $table->json('dns_records')->nullable(); // Current DNS records
            $table->json('whois_info')->nullable();
            $table->json('ssl_info')->nullable();
            $table->json('http_headers')->nullable();
            $table->string('ip_address')->nullable();
            
            // Security and abuse prevention
            $table->string('requester_ip')->nullable();
            $table->string('user_agent')->nullable();
            $table->boolean('suspicious_activity')->default(false);
            $table->text('suspicious_activity_reason')->nullable();
            
            // Audit and logging
            $table->uuid('created_by');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
            $table->json('audit_log')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['team_id', 'status']);
            $table->index(['domain_id']);
            $table->index(['domain', 'status']);
            $table->index(['normalized_domain']);
            $table->index(['verification_method']);
            $table->index(['verification_token']);
            $table->index(['status', 'verified_at']);
            $table->index(['expires_at']);
            $table->index(['verified_by']);
            $table->index(['created_by']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('domain_verifications');
    }
};
