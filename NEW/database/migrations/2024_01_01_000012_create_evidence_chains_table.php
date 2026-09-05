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
        Schema::create('evidence_chains', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('leak_id');
            $table->foreign('leak_id')->references('id')->on('leaks')->onDelete('cascade');
            
            $table->enum('evidence_type', [
                'screenshot',
                'document', 
                'log',
                'html_content',
                'json_data',
                'email_content',
                'network_capture',
                'memory_dump',
                'other'
            ])->default('screenshot');
            
            $table->string('storage_path');
            $table->string('sha256_hash')->unique();
            $table->text('timestamp_signature');
            
            $table->uuid('collected_by');
            $table->foreign('collected_by')->references('id')->on('users')->onDelete('cascade');
            $table->timestamp('collected_at');
            
            $table->json('metadata')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index(['leak_id', 'evidence_type']);
            $table->index(['collected_by']);
            $table->index(['evidence_type']);
            $table->index(['collected_at']);
            $table->index(['sha256_hash']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evidence_chains');
    }
};
