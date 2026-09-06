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
        Schema::create('abuse_reports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            
            // Reporter information
            $table->string('reporter_name')->nullable();
            $table->string('reporter_email')->nullable();
            $table->string('reporter_phone')->nullable();
            $table->string('reporter_company')->nullable();
            $table->boolean('reporter_anonymous')->default(false);
            $table->enum('reporter_type', ['domain_owner', 'security_professional', 'law_enforcement', 'concerned_citizen', 'other'])->default('domain_owner');
            
            // Reported entity
            $table->uuid('reported_team_id')->nullable();
            $table->foreign('reported_team_id')->references('id')->on('teams')->onDelete('set null');
            $table->uuid('reported_user_id')->nullable();
            $table->foreign('reported_user_id')->references('id')->on('users')->onDelete('set null');
            $table->string('reported_domain')->nullable();
            $table->string('reported_ip')->nullable();
            $table->string('reported_activity')->nullable();
            
            // Report details
            $table->enum('category', [
                'unauthorized_scanning',
                'domain_monitoring_without_permission',
                'fake_authorization',
                'harassment',
                'data_privacy_violation',
                'commercial_exploitation',
                'legal_violation',
                'terms_of_service_violation',
                'other'
            ])->default('unauthorized_scanning');
            
            $table->text('description');
            $table->text('additional_context')->nullable();
            $table->enum('severity', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->boolean('immediate_threat')->default(false);
            
            // Evidence and attachments
            $table->json('evidence')->nullable(); // Screenshots, logs, URLs
            $table->json('attachments')->nullable(); // File paths to uploaded evidence
            $table->string('incident_timeline')->nullable();
            $table->json('affected_domains')->nullable();
            $table->json('affected_systems')->nullable();
            
            // Technical details
            $table->string('requester_ip')->nullable();
            $table->string('user_agent')->nullable();
            $table->json('request_headers')->nullable();
            $table->timestamp('incident_occurred_at')->nullable();
            $table->timestamp('incident_discovered_at')->nullable();
            
            // Report status and workflow
            $table->enum('status', [
                'open', 
                'under_review', 
                'investigating', 
                'awaiting_response', 
                'escalated', 
                'resolved', 
                'false_positive', 
                'duplicate'
            ])->default('open');
            
            $table->uuid('assigned_to')->nullable(); // Admin handling the case
            $table->foreign('assigned_to')->references('id')->on('users')->onDelete('set null');
            $table->uuid('escalated_to')->nullable(); // Senior admin or legal
            $table->foreign('escalated_to')->references('id')->on('users')->onDelete('set null');
            
            // Resolution details
            $table->text('resolution')->nullable();
            $table->enum('resolution_type', [
                'account_suspended',
                'account_terminated',
                'warning_issued',
                'domains_removed',
                'legal_action_taken',
                'no_action_taken',
                'false_positive'
            ])->nullable();
            
            $table->json('actions_taken')->nullable();
            $table->json('preventive_measures')->nullable();
            $table->boolean('law_enforcement_notified')->default(false);
            $table->text('law_enforcement_details')->nullable();
            
            // Communication log
            $table->json('communication_log')->nullable(); // All communications with reporter and reported party
            $table->timestamp('last_contact_at')->nullable();
            $table->boolean('reporter_notified_of_resolution')->default(false);
            $table->timestamp('reporter_notified_at')->nullable();
            
            // Legal and compliance
            $table->boolean('legal_review_required')->default(false);
            $table->uuid('legal_reviewed_by')->nullable();
            $table->foreign('legal_reviewed_by')->references('id')->on('users')->onDelete('set null');
            $table->timestamp('legal_reviewed_at')->nullable();
            $table->text('legal_notes')->nullable();
            $table->boolean('gdpr_data_subject_request')->default(false);
            
            // SLA and metrics
            $table->timestamp('first_response_due_at')->nullable();
            $table->timestamp('resolution_due_at')->nullable();
            $table->timestamp('first_response_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->integer('response_time_hours')->nullable();
            $table->integer('resolution_time_hours')->nullable();
            
            // Related reports and duplicates
            $table->uuid('parent_report_id')->nullable(); // For duplicate reports
            $table->foreign('parent_report_id')->references('id')->on('abuse_reports')->onDelete('set null');
            $table->json('duplicate_report_ids')->nullable();
            $table->json('related_report_ids')->nullable();
            
            // Audit and tracking
            $table->uuid('created_by')->nullable();
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->uuid('updated_by')->nullable();
            $table->foreign('updated_by')->references('id')->on('users')->onDelete('set null');
            $table->json('audit_log')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['status', 'created_at']);
            $table->index(['reported_team_id']);
            $table->index(['reported_user_id']);
            $table->index(['reported_domain']);
            $table->index(['category', 'severity']);
            $table->index(['assigned_to']);
            $table->index(['escalated_to']);
            $table->index(['resolution_type']);
            $table->index(['incident_occurred_at']);
            $table->index(['first_response_due_at']);
            $table->index(['resolution_due_at']);
            $table->index(['parent_report_id']);
            $table->index(['reporter_email']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('abuse_reports');
    }
};
