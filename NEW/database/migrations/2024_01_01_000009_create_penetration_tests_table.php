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
        Schema::create('penetration_tests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->foreign('team_id')->references('id')->on('teams')->onDelete('cascade');
            
            // Project details
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->enum('type', ['external', 'internal', 'web_application', 'mobile_application', 'network', 'social_engineering', 'physical', 'comprehensive'])->default('external');
            
            // Client information
            $table->string('client_name')->nullable();
            $table->string('client_contact_name')->nullable();
            $table->string('client_email')->nullable();
            $table->string('client_phone')->nullable();
            $table->string('client_address')->nullable();
            
            // Timeline and scheduling
            $table->date('start_date');
            $table->date('end_date');
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->enum('status', ['planning', 'active', 'paused', 'reporting', 'completed', 'cancelled'])->default('planning');
            $table->timestamp('status_updated_at')->nullable();
            
            // Methodology and scope
            $table->enum('methodology', ['PTES', 'OWASP', 'OSSTMM', 'NIST', 'custom'])->default('PTES');
            $table->json('scope')->nullable(); // In-scope assets
            $table->json('out_of_scope')->nullable(); // Explicitly excluded
            $table->json('testing_methods')->nullable(); // Allowed testing methods
            $table->json('restrictions')->nullable(); // Testing restrictions
            $table->json('rules_of_engagement')->nullable();
            
            // Authorization and legal
            $table->uuid('authorization_id')->nullable();
            $table->foreign('authorization_id')->references('id')->on('authorizations')->onDelete('set null');
            $table->string('authorization_document_path')->nullable();
            $table->boolean('authorization_signed')->default(false);
            $table->timestamp('authorization_signed_at')->nullable();
            $table->string('liability_waiver_path')->nullable();
            $table->boolean('liability_waiver_signed')->default(false);
            $table->timestamp('liability_waiver_signed_at')->nullable();
            
            // Team assignment
            $table->json('team_members')->nullable(); // Array of user IDs and roles
            $table->uuid('lead_tester_id')->nullable();
            $table->foreign('lead_tester_id')->references('id')->on('users')->onDelete('set null');
            $table->uuid('project_manager_id')->nullable();
            $table->foreign('project_manager_id')->references('id')->on('users')->onDelete('set null');
            
            // Testing progress
            $table->enum('current_phase', [
                'reconnaissance',
                'scanning',
                'enumeration',
                'vulnerability_analysis',
                'exploitation',
                'post_exploitation',
                'reporting'
            ])->nullable();
            
            $table->decimal('progress_percentage', 5, 2)->default(0.00);
            $table->json('phase_progress')->nullable();
            $table->timestamp('last_activity_at')->nullable();
            
            // Findings summary
            $table->integer('total_findings')->default(0);
            $table->integer('critical_findings')->default(0);
            $table->integer('high_findings')->default(0);
            $table->integer('medium_findings')->default(0);
            $table->integer('low_findings')->default(0);
            $table->integer('info_findings')->default(0);
            $table->decimal('overall_risk_score', 5, 2)->default(0.00);
            
            // Report generation
            $table->enum('report_template', ['PTES', 'OWASP', 'custom', 'executive', 'technical'])->default('PTES');
            $table->string('report_path')->nullable(); // S3 storage
            $table->string('executive_summary_path')->nullable();
            $table->string('technical_appendix_path')->nullable();
            $table->string('evidence_zip_path')->nullable();
            $table->boolean('report_generated')->default(false);
            $table->timestamp('report_generated_at')->nullable();
            $table->boolean('report_delivered')->default(false);
            $table->timestamp('report_delivered_at')->nullable();
            
            // Budget and billing
            $table->decimal('budget_amount', 10, 2)->nullable();
            $table->string('budget_currency')->default('USD');
            $table->boolean('billable')->default(true);
            $table->decimal('hourly_rate', 8, 2)->nullable();
            $table->decimal('total_hours', 8, 2)->default(0.00);
            $table->decimal('total_cost', 10, 2)->default(0.00);
            $table->enum('billing_status', ['not_billed', 'billed', 'paid', 'overdue'])->default('not_billed');
            
            // Compliance and standards
            $table->boolean('soc2_relevant')->default(false);
            $table->boolean('pci_dss_relevant')->default(false);
            $table->boolean('iso27001_relevant')->default(false);
            $table->boolean('hipaa_relevant')->default(false);
            $table->json('compliance_requirements')->nullable();
            
            // Risk assessment
            $table->enum('risk_level', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->json('risk_factors')->nullable();
            $table->json('mitigation_recommendations')->nullable();
            
            // Communication and meetings
            $table->json('meetings')->nullable();
            $table->json('milestones')->nullable();
            $table->json('deliverables')->nullable();
            $table->timestamp('kickoff_meeting_at')->nullable();
            $table->timestamp('status_meeting_at')->nullable();
            $table->timestamp('findings_review_at')->nullable();
            $table->timestamp('final_presentation_at')->nullable();
            
            // Quality assurance
            $table->uuid('qa_reviewer_id')->nullable();
            $table->foreign('qa_reviewer_id')->references('id')->on('users')->onDelete('set null');
            $table->timestamp('qa_reviewed_at')->nullable();
            $table->text('qa_notes')->nullable();
            $table->boolean('qa_approved')->default(false);
            
            // Settings and preferences
            $table->json('notification_settings')->nullable();
            $table->json('report_settings')->nullable();
            $table->json('tool_settings')->nullable();
            $table->string('timezone')->default('UTC');
            
            // Archive and retention
            $table->boolean('is_archived')->default(false);
            $table->timestamp('archived_at')->nullable();
            $table->date('retention_until')->nullable(); // When to delete data
            
            // Audit and logging
            $table->uuid('created_by');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
            $table->uuid('updated_by')->nullable();
            $table->foreign('updated_by')->references('id')->on('users')->onDelete('set null');
            $table->json('audit_log')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['team_id', 'status']);
            $table->index(['slug']);
            $table->index(['status', 'start_date', 'end_date']);
            $table->index(['client_name']);
            $table->index(['authorization_id']);
            $table->index(['lead_tester_id']);
            $table->index(['project_manager_id']);
            $table->index(['current_phase']);
            $table->index(['methodology']);
            $table->index(['report_generated', 'report_delivered']);
            $table->index(['billing_status']);
            $table->index(['created_by']);
            $table->index(['is_archived']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('penetration_tests');
    }
};
