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
        Schema::create('leaks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->foreign('team_id')->references('id')->on('teams')->onDelete('cascade');
            
            $table->uuid('domain_id')->nullable();
            $table->foreign('domain_id')->references('id')->on('domains')->onDelete('cascade');
            
            // Source information
            $table->enum('source_type', [
                'pastebin',
                'github_gist',
                'ghostbin',
                'privatebin',
                'breach_database',
                'dark_web_forum',
                'telegram',
                'discord',
                'twitter',
                'reddit',
                'code_repository',
                'file_sharing',
                'misconfigured_server',
                'other'
            ])->default('pastebin');
            
            $table->string('source_url')->nullable();
            $table->string('source_name')->nullable();
            $table->string('source_id')->nullable(); // Paste ID, gist ID, etc.
            $table->json('source_metadata')->nullable();
            
            // Content details
            $table->text('title')->nullable();
            $table->longText('content');
            $table->text('excerpt')->nullable(); // First 255 characters for preview
            $table->enum('content_type', [
                'credentials',
                'api_keys',
                'source_code',
                'database_dump',
                'configuration',
                'personal_data',
                'financial_data',
                'internal_documents',
                'customer_data',
                'other'
            ])->default('credentials');
            
            // Classification and severity
            $table->enum('severity', ['critical', 'high', 'medium', 'low', 'info'])->default('medium');
            $table->enum('confidence', ['confirmed', 'likely', 'possible', 'false_positive'])->default('likely');
            $table->decimal('risk_score', 5, 2)->default(0.00);
            $table->json('risk_factors')->nullable();
            
            // Discovery information
            $table->timestamp('discovered_at');
            $table->timestamp('published_at')->nullable(); // When the leak was originally posted
            $table->uuid('discovered_by');
            $table->foreign('discovered_by')->references('id')->on('users')->onDelete('cascade');
            $table->string('discovery_method')->default('automated_monitoring');
            $table->json('discovery_context')->nullable();
            
            // Extracted data
            $table->json('extracted_emails')->nullable();
            $table->json('extracted_domains')->nullable();
            $table->json('extracted_ips')->nullable();
            $table->json('extracted_api_keys')->nullable();
            $table->json('extracted_credentials')->nullable();
            $table->json('extracted_phone_numbers')->nullable();
            $table->json('extracted_credit_cards')->nullable();
            $table->json('extracted_pii')->nullable();
            
            // Matching and correlation
            $table->json('matched_domains')->nullable(); // Domains that match this leak
            $table->json('matched_users')->nullable(); // Users mentioned in leak
            $table->json('matched_companies')->nullable();
            $table->json('matched_technologies')->nullable();
            
            // Status and workflow
            $table->enum('status', [
                'new',
                'analyzing',
                'confirmed',
                'false_positive',
                'investigating',
                'mitigated',
                'resolved',
                'archived'
            ])->default('new');
            
            $table->uuid('assigned_to')->nullable();
            $table->foreign('assigned_to')->references('id')->on('users')->onDelete('set null');
            $table->timestamp('status_updated_at')->nullable();
            $table->uuid('status_updated_by')->nullable();
            $table->foreign('status_updated_by')->references('id')->on('users')->onDelete('set null');
            
            // Verification and validation
            $table->boolean('verified')->default(false);
            $table->uuid('verified_by')->nullable();
            $table->foreign('verified_by')->references('id')->on('users')->onDelete('set null');
            $table->timestamp('verified_at')->nullable();
            $table->text('verification_notes')->nullable();
            $table->json('verification_evidence')->nullable();
            
            // Takedown actions
            $table->boolean('takedown_requested')->default(false);
            $table->timestamp('takedown_requested_at')->nullable();
            $table->string('takedown_reference')->nullable();
            $table->boolean('takedown_completed')->default(false);
            $table->timestamp('takedown_completed_at')->nullable();
            $table->text('takedown_notes')->nullable();
            
            // Notification and communication
            $table->boolean('stakeholders_notified')->default(false);
            $table->timestamp('notified_at')->nullable();
            $table->json('notification_recipients')->nullable();
            $table->text('notification_notes')->nullable();
            
            // Impact assessment
            $table->text('impact_assessment')->nullable();
            $table->integer('affected_users_count')->nullable();
            $table->integer('affected_records_count')->nullable();
            $table->enum('data_sensitivity', ['public', 'internal', 'confidential', 'restricted'])->nullable();
            $table->json('compliance_impact')->nullable(); // GDPR breach, etc.
            
            // Evidence collection
            $table->json('screenshots')->nullable();
            $table->json('evidence_files')->nullable();
            $table->string('evidence_zip_path')->nullable();
            $table->boolean('evidence_preserved')->default(false);
            $table->timestamp('evidence_preserved_at')->nullable();
            
            // External references
            $table->json('related_leaks')->nullable();
            $table->json('breach_database_references')->nullable();
            $table->json('threat_intel_references')->nullable();
            $table->json('news_references')->nullable();
            
            // Technical details
            $table->string('language')->nullable();
            $table->string('encoding')->nullable();
            $table->integer('content_size')->nullable();
            $table->json('content_hash')->nullable(); // Multiple hash algorithms
            $table->json('parsing_metadata')->nullable();
            
            // Machine learning analysis
            $table->decimal('ml_confidence_score', 5, 2)->nullable();
            $table->json('ml_classification')->nullable();
            $table->json('ml_features')->nullable();
            $table->boolean('ml_flagged_as_suspicious')->default(false);
            $table->text('ml_analysis_notes')->nullable();
            
            // Metrics and statistics
            $table->integer('view_count')->default(0);
            $table->integer('download_count')->default(0);
            $table->integer('share_count')->default(0);
            $table->timestamp('last_accessed_at')->nullable();
            
            // Retention and archiving
            $table->date('retention_until')->nullable();
            $table->boolean('is_archived')->default(false);
            $table->timestamp('archived_at')->nullable();
            $table->text('archival_reason')->nullable();
            
            // Legal and compliance
            $table->boolean('legal_review_required')->default(false);
            $table->uuid('legal_reviewed_by')->nullable();
            $table->foreign('legal_reviewed_by')->references('id')->on('users')->onDelete('set null');
            $table->timestamp('legal_reviewed_at')->nullable();
            $table->text('legal_notes')->nullable();
            $table->boolean('gdpr_breach_notification_required')->default(false);
            $table->timestamp('gdpr_notified_at')->nullable();
            
            // Notes and comments
            $table->text('internal_notes')->nullable();
            $table->json('comments')->nullable();
            $table->json('tags')->nullable();
            $table->json('activity_log')->nullable();
            
            // Audit and logging
            $table->uuid('created_by');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
            $table->uuid('updated_by')->nullable();
            $table->foreign('updated_by')->references('id')->on('users')->onDelete('set null');
            $table->json('audit_log')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['team_id', 'status']);
            $table->index(['domain_id', 'severity']);
            $table->index(['source_type', 'discovered_at']);
            $table->index(['content_type', 'severity']);
            $table->index(['severity', 'confidence']);
            $table->index(['status', 'assigned_to']);
            $table->index(['verified', 'verified_at']);
            $table->index(['takedown_requested', 'takedown_completed']);
            $table->index(['published_at']);
            $table->index(['discovered_by']);
            $table->index(['created_by']);
            $table->index(['is_archived']);
            // Search optimization (SQLite compatible)
            $table->index(['content']); // Basic index for content search
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leaks');
    }
};
