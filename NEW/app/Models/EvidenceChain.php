<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use Illuminate\Support\Facades\Storage;

class EvidenceChain extends Model
{
    use HasFactory;

    protected $fillable = [
        'leak_id',
        'evidence_type',
        'storage_path',
        'sha256_hash',
        'timestamp_signature',
        'collected_by',
        'collected_at',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
        'collected_at' => 'datetime',
    ];

    protected $dates = [
        'collected_at',
    ];

    // Activity logging
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'evidence_type',
                'storage_path',
                'sha256_hash',
                'collected_by',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('evidence_chain');
    }

    // Relationships
    public function leak(): BelongsTo
    {
        return $this->belongsTo(Leak::class);
    }

    public function collector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'collected_by');
    }

    // Scopes
    public function scopeByType($query, $type)
    {
        return $query->where('evidence_type', $type);
    }

    public function scopeByCollector($query, $userId)
    {
        return $query->where('collected_by', $userId);
    }

    // Accessors
    public function getTypeLabelAttribute(): string
    {
        return match($this->evidence_type) {
            'screenshot' => 'Screenshot',
            'document' => 'Document',
            'log' => 'Log File',
            'html_content' => 'HTML Content',
            'json_data' => 'JSON Data',
            'email_content' => 'Email Content',
            default => 'Unknown',
        };
    }

    // Methods
    public function verifyIntegrity(): bool
    {
        if (!$this->storage_path || !$this->sha256_hash) {
            return false;
        }

        try {
            $content = Storage::disk($this->getStorageDisk())->get($this->storage_path);
            $currentHash = hash('sha256', $content);
            
            return hash_equals($this->sha256_hash, $currentHash);
        } catch (\Exception $e) {
            \Log::error('Evidence integrity verification failed', [
                'evidence_id' => $this->id,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    public function getStorageDisk(): string
    {
        return config('evidence.disk', 's3');
    }

    public function downloadEvidence(): string
    {
        if (!$this->storage_path) {
            throw new \Exception('No storage path available');
        }

        return Storage::disk($this->getStorageDisk())->path($this->storage_path);
    }

    public function getContent(): string
    {
        if (!$this->storage_path) {
            throw new \Exception('No storage path available');
        }

        return Storage::disk($this->getStorageDisk())->get($this->storage_path);
    }
}
