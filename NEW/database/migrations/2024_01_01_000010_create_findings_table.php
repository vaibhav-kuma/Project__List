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
        Schema::create('findings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('pentest_id');
            $table->foreign('pentest_id')->references('id')->on('penetration_tests')->onDelete('cascade');
            
            // Linked evidence
            $table->uuid('leak_id')->nullable();
            $table->foreign('leak_id')->references('id')->on('leaks')->onDelete('set null');
            $table->uuid('domain_id')->nullable();
            $table->foreign('domain_id')->references('id')->on('domains')->onDelete('set null');
            
            // Finding details
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('description');
            $table->text('impact')->nullable();
            $table->text('remediation')->nullable();
            $table->text('proof_of_concept')->nullable();
            $table->text('technical_details')->nullable();
            
            // Classification and severity
            $table->enum('severity', ['critical', 'high', 'medium', 'low', 'info'])->default('medium');
            $table->decimal('cvss_score', 5, 2)->nullable();
            $table->string('cvss_vector')->nullable();
            $table->enum('likelihood', ['very_high', 'high', 'medium', 'low', 'very_low'])->default('medium');
            $table->enum('impact_level', ['very_high', 'high', 'medium', 'low', 'very_low'])->default('medium');
            $table->decimal('risk_score', 5, 2)->default(0.00);
            
            // Vulnerability classification
            $table->string('cve_id')->nullable();
            $table->string('cwe_id')->nullable();
            $table->string('owasp_category')->nullable();
            $table->enum('finding_type', [
                'vulnerability',
                'misconfiguration',
                'information_disclosure',
                'weakness',
                'exposure',
                'policy_violation',
                'compliance_issue',
                'other'
            ])->default('vulnerability');
            
            $table->string('category')->nullable(); // SQL Injection, XSS, etc.
            $table->string('subcategory')->nullable();
            $table->json('tags')->nullable();
            
            // Technical details
            $table->string('affected_asset')->nullable();
            $table->string('affected_component')->nullable();
            $table->string('affected_version')->nullable();
            $table->string('vulnerable_parameter')->nullable();
            $table->text('vulnerable_code')->nullable();
            $table->json('affected_urls')->nullable();
            $table->json('affected_endpoints')->nullable();
            
            // Discovery information
            $table->uuid('discovered_by');
            $table->foreign('discovered_by')->references('id')->on('users')->onDelete('cascade');
            $table->timestamp('discovered_at');
            $table->enum('discovery_method', [
                'automated_scan',
                'manual_testing',
                'osint',
                'code_review',
                'configuration_review',
                'social_engineering',
                'other'
            ])->default('manual_testing');
            
            $table->string('tool_used')->nullable();
            $table->json('scan_results')->nullable();
            $table->json('discovery_evidence')->nullable();
            
            // Status and workflow
            $table->enum('status', [
                'open',
                'confirmed',
                'false_positive',
                'risk_accepted',
                'in_progress',
                'remediated',
                'verified',
                'closed'
            ])->default('open');
            
            $table->uuid('assigned_to')->nullable();
            $table->foreign('assigned_to')->references('id')->on('users')->onDelete('set null');
            $table->date('due_date')->nullable();
            $table->timestamp('status_updated_at')->nullable();
            $table->uuid('status_updated_by')->nullable();
            $table->foreign('status_updated_by')->references('id')->on('users')->onDelete('set null');
            
            // Remediation tracking
            $table->text('remediation_steps')->nullable();
            $table->json('remediation_resources')->nullable();
            $table->uuid('remediated_by')->nullable();
            $table->foreign('remediated_by')->references('id')->on('users')->onDelete('set null');
            $table->timestamp('remediated_at')->nullable();
            $table->text('remediation_notes')->nullable();
            
            // Verification
            $table->uuid('verified_by')->nullable();
            $table->foreign('verified_by')->references('id')->on('users')->onDelete('set null');
            $table->timestamp('verified_at')->nullable();
            $table->text('verification_notes')->nullable();
            $table->boolean('retest_required')->default(false);
            $table->timestamp('retest_scheduled_at')->nullable();
            
            // Evidence and attachments
            $table->json('evidence_files')->nullable(); // Screenshots, logs, etc.
            $table->json('evidence_hashes')->nullable(); // SHA-256 hashes for chain of custody
            $table->json('evidence_timestamps')->nullable(); // RFC 3161 timestamps
            $table->string('evidence_zip_path')->nullable();
            $table->boolean('evidence_collected')->default(false);
            $table->timestamp('evidence_collected_at')->nullable();
            
            // Business impact
            $table->text('business_impact')->nullable();
            $table->enum('business_risk', ['critical', 'high', 'medium', 'low'])->nullable();
            $table->json('affected_business_processes')->nullable();
            $table->json('compliance_impact')->nullable(); // GDPR, PCI-DSS, etc.
            $table->boolean('data_breach_risk')->default(false);
            $table->text('data_breach_details')->nullable();
            
            // Client communication
            $table->boolean('client_notified')->default(false);
            $table->timestamp('client_notified_at')->nullable();
            $table->text('client_communication_notes')->nullable();
            $table->enum('client_priority', ['urgent', 'high', 'medium', 'low'])->default('medium');
            
            // Report inclusion
            $table->boolean('include_in_executive_summary')->default(false);
            $table->boolean('include_in_technical_report')->default(true);
            $table->boolean('include_in_appendix')->default(false);
            $table->text('report_summary')->nullable();
            $table->integer('report_section_order')->nullable();
            
            // Related findings
            $table->json('related_findings')->nullable();
            $table->uuid('parent_finding_id')->nullable();
            $table->foreign('parent_finding_id')->references('id')->on('findings')->onDelete('set null');
            $table->json('child_findings')->nullable();
            
            // External references
            $table->json('external_references')->nullable();
            $table->json('advisories')->nullable();
            $table->json('exploit_references')->nullable();
            $table->json('patches')->nullable();
            
            // Metrics and statistics
            $table->integer('views_count')->default(0);
            $table->integer('comments_count')->default(0);
            $table->integer('attachments_count')->default(0);
            $table->timestamp('last_viewed_at')->nullable();
            
            // Quality assurance
            $table->uuid('qa_reviewed_by')->nullable();
            $table->foreign('qa_reviewed_by')->references('id')->on('users')->onDelete('set null');
            $table->timestamp('qa_reviewed_at')->nullable();
            $table->text('qa_notes')->nullable();
            $table->boolean('qa_approved')->default(false);
            
            // Notes and comments
            $table->text('internal_notes')->nullable();
            $table->json('comments')->nullable();
            $table->json('activity_log')->nullable();
            
            // Audit and logging
            $table->uuid('created_by');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
            $table->uuid('updated_by')->nullable();
            $table->foreign('updated_by')->references('id')->on('users')->onDelete('set null');
            $table->json('audit_log')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['pentest_id', 'severity']);
            $table->index(['slug']);
            $table->index(['status', 'due_date']);
            $table->index(['severity', 'cvss_score']);
            $table->index(['finding_type', 'category']);
            $table->index(['discovered_by', 'discovered_at']);
            $table->index(['assigned_to', 'status']);
            $table->index(['cve_id']);
            $table->index(['cwe_id']);
            $table->index(['client_priority']);
            $table->index(['include_in_executive_summary']);
            $table->index(['domain_id']);
            $table->index(['leak_id']);
            $table->index(['created_by']);
            $table->index(['qa_approved']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('findings');
    }
};
