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
        Schema::create('authorizations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->foreign('team_id')->references('id')->on('teams')->onDelete('cascade');
            
            $table->uuid('target_id')->nullable(); // Domain or pentest project
            $table->string('target_type')->nullable(); // 'domain' or 'pentest'
            
            // Authorization type and details
            $table->enum('authorization_type', [
                'pentest_contract', 
                'bug_bounty', 
                'internal_test', 
                'law_enforcement',
                'third_party_client',
                'research_project'
            ])->default('pentest_contract');
            
            $table->string('client_name')->nullable();
            $table->string('client_email')->nullable();
            $table->string('client_phone')->nullable();
            $table->string('project_name')->nullable();
            $table->text('project_description')->nullable();
            
            // Document storage (encrypted)
            $table->string('document_path')->nullable(); // S3 encrypted storage
            $table->string('document_hash')->nullable(); // SHA-256 for integrity
            $table->integer('document_size')->nullable();
            $table->string('document_mime_type')->nullable();
            $table->json('document_metadata')->nullable();
            
            // Scope definition
            $table->json('scope_definition')->nullable(); // In-scope domains, IPs, restrictions
            $table->json('out_of_scope')->nullable(); // Explicitly excluded targets
            $table->json('testing_methods')->nullable(); // Allowed testing methods
            $table->json('restrictions')->nullable(); // Specific restrictions and limitations
            
            // Timeline and validity
            $table->date('start_date');
            $table->date('end_date');
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('auto_renew')->default(false);
            
            // Verification and approval
            $table->uuid('verified_by')->nullable(); // Admin who approved
            $table->foreign('verified_by')->references('id')->on('users')->onDelete('set null');
            $table->timestamp('verified_at')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected', 'expired', 'revoked'])->default('pending');
            $table->text('rejection_reason')->nullable();
            $table->json('approval_notes')->nullable();
            
            // Legal compliance
            $table->boolean('terms_signed')->default(false);
            $table->timestamp('terms_signed_at')->nullable();
            $table->string('terms_signed_ip')->nullable();
            $table->boolean('liability_waiver_signed')->default(false);
            $table->timestamp('liability_waiver_signed_at')->nullable();
            $table->boolean('confidentiality_agreement_signed')->default(false);
            $table->timestamp('confidentiality_agreement_signed_at')->nullable();
            
            // Contact information for notifications
            $table->string('technical_contact_email')->nullable();
            $table->string('legal_contact_email')->nullable();
            $table->string('emergency_contact_email')->nullable();
            $table->json('notification_preferences')->nullable();
            
            // Usage tracking
            $table->integer('domains_count')->default(0);
            $table->integer('scans_performed')->default(0);
            $table->integer('findings_discovered')->default(0);
            $table->timestamp('last_used_at')->nullable();
            
            // Audit and compliance
            $table->uuid('created_by');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
            $table->uuid('updated_by')->nullable();
            $table->foreign('updated_by')->references('id')->on('users')->onDelete('set null');
            $table->json('audit_log')->nullable(); // Track all changes
            
            $table->timestamps();
            
            // Indexes
            $table->index(['team_id', 'status']);
            $table->index(['target_id', 'target_type']);
            $table->index(['authorization_type']);
            $table->index(['status', 'verified_at']);
            $table->index(['expires_at', 'is_active']);
            $table->index(['verified_by']);
            $table->index(['created_by']);
            $table->index(['start_date', 'end_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('authorizations');
    }
};
