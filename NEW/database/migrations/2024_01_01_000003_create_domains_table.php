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
        Schema::create('domains', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->foreign('team_id')->references('id')->on('teams')->onDelete('cascade');
            
            $table->string('domain')->unique();
            $table->string('normalized_domain')->unique(); // Lowercase, punycode
            $table->text('description')->nullable();
            
            // Domain ownership verification
            $table->enum('verification_status', ['pending', 'verified', 'failed', 'expired', 'revoked'])->default('pending');
            $table->timestamp('verified_at')->nullable();
            $table->timestamp('verification_expires_at')->nullable();
            $table->enum('verification_method', ['dns_txt', 'html_meta', 'file_upload', 'email', 'manual'])->nullable();
            $table->string('verification_token')->nullable();
            $table->text('verification_details')->nullable();
            
            // Authorization status
            $table->enum('authorization_status', ['none', 'pending', 'approved', 'rejected', 'expired'])->default('none');
            $table->uuid('current_authorization_id')->nullable();
            $table->timestamp('authorized_at')->nullable();
            $table->timestamp('authorization_expires_at')->nullable();
            
            // Domain classification
            $table->enum('type', ['primary', 'subdomain', 'related', 'third_party'])->default('primary');
            $table->uuid('parent_domain_id')->nullable(); // For subdomains
            $table->foreign('parent_domain_id')->references('id')->on('domains')->onDelete('set null');
            
            // Scope and restrictions
            $table->boolean('in_scope')->default(true);
            $table->json('scope_restrictions')->nullable(); // IP ranges, specific subdomains, etc.
            $table->json('excluded_subdomains')->nullable();
            $table->boolean('allow_subdomain_monitoring')->default(true);
            
            // Monitoring settings
            $table->boolean('monitoring_enabled')->default(false);
            $table->timestamp('monitoring_started_at')->nullable();
            $table->json('monitoring_sources')->nullable(); // Which OSINT sources to monitor
            $table->integer('scan_frequency_hours')->default(24);
            $table->timestamp('last_scan_at')->nullable();
            $table->timestamp('next_scan_at')->nullable();
            
            // Risk assessment
            $table->enum('risk_level', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->decimal('risk_score', 5, 2)->default(0.00);
            $table->json('risk_factors')->nullable();
            $table->timestamp('risk_assessed_at')->nullable();
            
            // Technical information
            $table->json('dns_records')->nullable();
            $table->json('ssl_info')->nullable();
            $table->json('technologies')->nullable(); // From Wappalyzer/BuiltWith
            $table->json('cloud_services')->nullable(); // AWS, Azure, GCP detection
            $table->json('ip_addresses')->nullable();
            
            // Compliance and legal
            $table->boolean('gdpr_applicable')->default(false);
            $table->boolean('pci_dss_applicable')->default(false);
            $table->boolean('hipaa_applicable')->default(false);
            $table->json('compliance_notes')->nullable();
            
            // Status and metadata
            $table->boolean('is_active')->default(true);
            $table->boolean('is_archived')->default(false);
            $table->timestamp('archived_at')->nullable();
            $table->text('notes')->nullable();
            $table->json('tags')->nullable();
            
            // Statistics
            $table->integer('total_findings')->default(0);
            $table->integer('critical_findings')->default(0);
            $table->integer('high_findings')->default(0);
            $table->integer('medium_findings')->default(0);
            $table->integer('low_findings')->default(0);
            $table->timestamp('statistics_updated_at')->nullable();
            
            $table->timestamps();
            
            // Indexes for performance and security
            $table->index(['team_id', 'is_active']);
            $table->index(['domain', 'verification_status']);
            $table->index(['normalized_domain']);
            $table->index(['verification_status', 'verified_at']);
            $table->index(['authorization_status', 'authorized_at']);
            $table->index(['monitoring_enabled', 'next_scan_at']);
            $table->index(['risk_level', 'risk_score']);
            $table->index(['type', 'parent_domain_id']);
            $table->index(['last_scan_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('domains');
    }
};
