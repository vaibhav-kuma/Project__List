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
        Schema::create('user_verifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            
            // Verification type
            $table->enum('verification_type', [
                'government_id',
                'linkedin',
                'corporate_email',
                'background_check',
                'professional_certification',
                'phone_verification',
                'video_verification'
            ])->default('government_id');
            
            // Provider information
            $table->string('provider'); // onfido, jumio, checkr, linkedin, etc.
            $table->string('external_id')->nullable(); // Provider's verification ID
            $table->string('provider_reference')->nullable();
            
            // Verification status
            $table->enum('status', ['pending', 'processing', 'verified', 'rejected', 'expired', 'requires_action'])->default('pending');
            $table->timestamp('verified_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->json('provider_response')->nullable();
            
            // Government ID verification
            $table->string('id_type')->nullable(); // passport, driver_license, national_id
            $table->string('id_country')->nullable();
            $table->string('id_number_hash')->nullable(); // Hashed for privacy
            $table->date('id_expiry_date')->nullable();
            $table->json('id_document_data')->nullable();
            $table->string('id_document_path')->nullable(); // Encrypted storage
            $table->string('selfie_path')->nullable(); // For liveness verification
            $table->decimal('face_match_score', 5, 2)->nullable();
            
            // LinkedIn verification
            $table->string('linkedin_profile_url')->nullable();
            $table->string('linkedin_profile_id')->nullable();
            $table->string('linkedin_user_id')->nullable();
            $table->json('linkedin_profile_data')->nullable();
            $table->boolean('linkedin_verified')->default(false);
            $table->integer('linkedin_connections')->nullable();
            $table->string('linkedin_headline')->nullable();
            $table->string('linkedin_company')->nullable();
            
            // Corporate email verification
            $table->string('corporate_email')->nullable();
            $table->string('email_domain')->nullable();
            $table->string('verification_code')->nullable();
            $table->timestamp('email_sent_at')->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->json('email_headers')->nullable();
            $table->boolean('email_domain_verified')->default(false);
            
            // Background check
            $table->string('checkr_candidate_id')->nullable();
            $table->enum('background_check_level', ['basic', 'standard', 'enhanced'])->nullable();
            $table->json('background_check_results')->nullable();
            $table->boolean('criminal_record_check')->default(false);
            $table->boolean('sanctions_check')->default(false);
            $table->boolean('employment_verification')->default(false);
            $table->boolean('education_verification')->default(false);
            
            // Professional certification verification
            $table->string('certification_name')->nullable();
            $table->string('certification_issuer')->nullable();
            $table->string('certification_number')->nullable();
            $table->date('certification_issued_date')->nullable();
            $table->date('certification_expiry_date')->nullable();
            $table->string('certification_document_path')->nullable();
            $table->boolean('certification_verified')->default(false);
            
            // Phone verification
            $table->string('phone_number')->nullable();
            $table->string('phone_country_code')->nullable();
            $table->string('verification_sms_code')->nullable();
            $table->timestamp('sms_sent_at')->nullable();
            $table->timestamp('phone_verified_at')->nullable();
            $table->string('phone_carrier')->nullable();
            $table->string('phone_type')->nullable(); // mobile, landline, voip
            
            // Video verification
            $table->string('video_call_id')->nullable();
            $table->timestamp('video_call_scheduled_at')->nullable();
            $table->timestamp('video_call_completed_at')->nullable();
            $table->uuid('verified_by_agent')->nullable();
            $table->foreign('verified_by_agent')->references('id')->on('users')->onDelete('set null');
            $table->text('agent_notes')->nullable();
            $table->string('video_recording_path')->nullable();
            
            // Risk assessment
            $table->decimal('risk_score', 5, 2)->default(0.00);
            $table->enum('risk_level', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->json('risk_factors')->nullable();
            $table->json('fraud_indicators')->nullable();
            
            // Audit and compliance
            $table->string('requester_ip')->nullable();
            $table->string('user_agent')->nullable();
            $table->json('audit_log')->nullable();
            $table->boolean('manual_review_required')->default(false);
            $table->uuid('reviewed_by')->nullable();
            $table->foreign('reviewed_by')->references('id')->on('users')->onDelete('set null');
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_notes')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['user_id', 'verification_type']);
            $table->index(['status', 'verified_at']);
            $table->index(['provider', 'external_id']);
            $table->index(['verification_type']);
            $table->index(['risk_level', 'risk_score']);
            $table->index(['expires_at']);
            $table->index(['reviewed_by']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_verifications');
    }
};
