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
        Schema::create('domain_opt_outs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            
            $table->string('domain')->unique();
            $table->string('normalized_domain')->unique();
            
            // Requester information
            $table->string('requester_name');
            $table->string('requester_email');
            $table->string('requester_phone')->nullable();
            $table->string('requester_company')->nullable();
            $table->string('requester_title')->nullable();
            
            // Verification
            $table->string('verification_token')->unique();
            $table->string('verification_code')->nullable();
            $table->timestamp('verification_email_sent_at')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->string('verified_ip')->nullable();
            $table->boolean('is_verified')->default(false);
            
            // Opt-out details
            $table->enum('reason', [
                'unauthorized_monitoring',
                'no_security_testing_consent',
                'company_policy',
                'legal_requirements',
                'privacy_concerns',
                'incorrect_domain',
                'temporary_opt_out',
                'other'
            ])->default('unauthorized_monitoring');
            
            $table->text('reason_description')->nullable();
            $table->enum('duration', ['permanent', 'temporary'])->default('permanent');
            $table->date('temporary_end_date')->nullable();
            $table->text('additional_notes')->nullable();
            
            // Evidence of ownership
            $table->json('ownership_evidence')->nullable();
            $table->string('dns_record_proof')->nullable();
            $table->string('website_screenshot')->nullable();
            $table->string('business_document')->nullable();
            $table->boolean('ownership_verified')->default(false);
            $table->timestamp('ownership_verified_at')->nullable();
            $table->uuid('ownership_verified_by')->nullable();
            $table->foreign('ownership_verified_by')->references('id')->on('users')->onDelete('set null');
            
            // Status and workflow
            $table->enum('status', [
                'pending_verification',
                'verified',
                'processing',
                'active',
                'expired',
                'revoked',
                'rejected'
            ])->default('pending_verification');
            
            $table->timestamp('activated_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->boolean('is_active')->default(false);
            
            // Processing details
            $table->uuid('processed_by')->nullable();
            $table->foreign('processed_by')->references('id')->on('users')->onDelete('set null');
            $table->timestamp('processed_at')->nullable();
            $table->text('processing_notes')->nullable();
            $table->json('processing_actions')->nullable();
            
            // Impact tracking
            $table->integer('teams_affected')->default(0);
            $table->integer('monitoring_instances_removed')->default(0);
            $table->integer('scans_cancelled')->default(0);
            $table->json('affected_teams')->nullable();
            $table->json('removed_monitoring_entries')->nullable();
            
            // Communication
            $table->json('communication_log')->nullable();
            $table->timestamp('last_notification_at')->nullable();
            $table->boolean('requester_notified')->default(false);
            $table->boolean('teams_notified')->default(false);
            
            // Legal and compliance
            $table->boolean('legal_review_required')->default(false);
            $table->uuid('legal_reviewed_by')->nullable();
            $table->foreign('legal_reviewed_by')->references('id')->on('users')->onDelete('set null');
            $table->timestamp('legal_reviewed_at')->nullable();
            $table->text('legal_notes')->nullable();
            
            // Abuse detection
            $table->boolean('potential_abuse')->default(false);
            $table->text('abuse_indicators')->nullable();
            $table->uuid('abuse_report_id')->nullable();
            $table->foreign('abuse_report_id')->references('id')->on('abuse_reports')->onDelete('set null');
            
            // Technical details
            $table->json('whois_info')->nullable();
            $table->json('dns_records')->nullable();
            $table->json('ssl_info')->nullable();
            $table->string('ip_address')->nullable();
            $table->string('hosting_provider')->nullable();
            $table->string('registrar')->nullable();
            
            // Audit and logging
            $table->string('requester_ip')->nullable();
            $table->string('user_agent')->nullable();
            $table->json('audit_log')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['domain', 'is_active']);
            $table->index(['normalized_domain']);
            $table->index(['status', 'verified_at']);
            $table->index(['is_verified', 'is_active']);
            $table->index(['verification_token']);
            $table->index(['requester_email']);
            $table->index(['reason']);
            $table->index(['expires_at']);
            $table->index(['processed_by']);
            $table->index(['ownership_verified_by']);
            $table->index(['abuse_report_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('domain_opt_outs');
    }
};
