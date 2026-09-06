<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use Illuminate\Support\Str;

class Authorization extends Model
{
    use HasFactory;

    protected $fillable = [
        'team_id',
        'target_id',
        'target_type',
        'authorization_type',
        'client_name',
        'client_email',
        'client_phone',
        'project_name',
        'project_description',
        'document_path',
        'document_hash',
        'document_size',
        'document_mime_type',
        'document_metadata',
        'scope_definition',
        'out_of_scope',
        'testing_methods',
        'restrictions',
        'start_date',
        'end_date',
        'starts_at',
        'expires_at',
        'is_active',
        'auto_renew',
        'verified_by',
        'verified_at',
        'status',
        'rejection_reason',
        'approval_notes',
        'terms_signed',
        'terms_signed_at',
        'terms_signed_ip',
        'liability_waiver_signed',
        'liability_waiver_signed_at',
        'confidentiality_agreement_signed',
        'confidentiality_agreement_signed_at',
        'technical_contact_email',
        'legal_contact_email',
        'emergency_contact_email',
        'notification_preferences',
        'domains_count',
        'scans_performed',
        'findings_discovered',
        'last_used_at',
        'created_by',
        'updated_by',
        'audit_log',
    ];

    protected $casts = [
        'scope_definition' => 'array',
        'out_of_scope' => 'array',
        'testing_methods' => 'array',
        'restrictions' => 'array',
        'document_metadata' => 'array',
        'notification_preferences' => 'array',
        'audit_log' => 'array',
        'starts_at' => 'datetime',
        'expires_at' => 'datetime',
        'terms_signed_at' => 'datetime',
        'liability_waiver_signed_at' => 'datetime',
        'confidentiality_agreement_signed_at' => 'datetime',
        'verified_at' => 'datetime',
        'last_used_at' => 'datetime',
    ];

    protected $dates = [
        'starts_at',
        'expires_at',
        'terms_signed_at',
        'liability_waiver_signed_at',
        'confidentiality_agreement_signed_at',
        'verified_at',
        'last_used_at',
    ];

    // Activity logging
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'authorization_type',
                'client_name',
                'project_name',
                'status',
                'is_active',
                'start_date',
                'end_date',
                'domains_count',
                'scans_performed',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('authorization');
    }

    // Relationships
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function target(): MorphTo
    {
        return $this->morphTo();
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function domains(): HasMany
    {
        return $this->hasMany(Domain::class, 'current_authorization_id');
    }

    public function penetrationTests(): HasMany
    {
        return $this->hasMany(PenetrationTest::class, 'authorization_id');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true)
            ->where('status', 'approved');
    }

    public function scopeExpired($query)
    {
        return $query->where('expires_at', '<', now());
    }

    public function scopeExpiringSoon($query, $days = 30)
    {
        return $query->where('expires_at', '<=', now()->addDays($days))
            ->where('expires_at', '>', now());
    }

    public function scopeByType($query, $type)
    {
        return $query->where('authorization_type', $type);
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    // Accessors
    public function getIsCurrentAttribute(): bool
    {
        return $this->is_active && 
               $this->status === 'approved' && 
               $this->starts_at->isPast() && 
               $this->expires_at->isFuture();
    }

    public function getIsExpiredAttribute(): bool
    {
        return $this->expires_at->isPast();
    }

    public function getIsFutureAttribute(): bool
    {
        return $this->starts_at->isFuture();
    }

    public function getDaysUntilExpiryAttribute(): int
    {
        return $this->expires_at->diffInDays(now());
    }

    public function getDaysUntilStartAttribute(): int
    {
        return $this->starts_at->diffInDays(now());
    }

    public function getDurationDaysAttribute(): int
    {
        return $this->start_date->diffInDays($this->end_date);
    }

    public function getStatusBadgeAttribute(): string
    {
        return match($this->status) {
            'approved' => 'success',
            'pending' => 'warning',
            'rejected' => 'danger',
            'expired' => 'danger',
            'revoked' => 'danger',
            default => 'secondary',
        };
    }

    public function getTypeLabelAttribute(): string
    {
        return match($this->authorization_type) {
            'pentest_contract' => 'Penetration Testing Contract',
            'bug_bounty' => 'Bug Bounty Program',
            'internal_test' => 'Internal Security Test',
            'law_enforcement' => 'Law Enforcement',
            'third_party_client' => 'Third-Party Client',
            'research_project' => 'Research Project',
            default => 'Unknown',
        };
    }

    public function getComplianceScoreAttribute(): float
    {
        $score = 100.0;

        if (!$this->terms_signed) {
            $score -= 25;
        }
        if (!$this->liability_waiver_signed) {
            $score -= 20;
        }
        if (!$this->confidentiality_agreement_signed) {
            $score -= 15;
        }
        if (!$this->document_path) {
            $score -= 30;
        }
        if (!$this->scope_definition) {
            $score -= 10;
        }

        return max(0.0, $score);
    }

    public function getUsagePercentageAttribute(): float
    {
        if ($this->duration_days === 0) {
            return 0.0;
        }

        $elapsedDays = $this->starts_at->isPast() 
            ? min(now()->diffInDays($this->starts_at), $this->duration_days)
            : 0;

        return ($elapsedDays / $this->duration_days) * 100;
    }

    public function getScopeSummaryAttribute(): string
    {
        if (!$this->scope_definition) {
            return 'No scope defined';
        }

        $domains = $this->scope_definition['domains'] ?? [];
        $ips = $this->scope_definition['ip_ranges'] ?? [];
        $count = count($domains) + count($ips);

        if ($count === 0) {
            return 'No scope defined';
        }

        $parts = [];
        if (count($domains) > 0) {
            $parts[] = count($domains) . ' domains';
        }
        if (count($ips) > 0) {
            $parts[] = count($ips) . ' IP ranges';
        }

        return implode(', ', $parts);
    }

    // Methods
    public function approve(User $verifiedBy, array $notes = []): bool
    {
        $this->update([
            'status' => 'approved',
            'verified_by' => $verifiedBy->id,
            'verified_at' => now(),
            'approval_notes' => $notes,
            'is_active' => true,
        ]);

        // Activate authorized domains
        if ($this->target_type === 'domain') {
            $this->target?->authorize($this);
        }

        return true;
    }

    public function reject(string $reason, User $verifiedBy = null): bool
    {
        $this->update([
            'status' => 'rejected',
            'verified_by' => $verifiedBy?->id,
            'verified_at' => now(),
            'rejection_reason' => $reason,
            'is_active' => false,
        ]);

        return true;
    }

    public function revoke(): bool
    {
        $this->update([
            'status' => 'revoked',
            'is_active' => false,
        ]);

        // Revoke authorized domains
        if ($this->target_type === 'domain') {
            $this->target?->revokeAuthorization();
        }

        return true;
    }

    public function renew(int $days = 30): bool
    {
        $newExpiry = $this->expires_at->addDays($days);

        $this->update([
            'expires_at' => $newExpiry,
            'end_date' => $newExpiry->toDateString(),
        ]);

        return true;
    }

    public function signTerms(string $ip): bool
    {
        $this->update([
            'terms_signed' => true,
            'terms_signed_at' => now(),
            'terms_signed_ip' => $ip,
        ]);

        return true;
    }

    public function signLiabilityWaiver(): bool
    {
        $this->update([
            'liability_waiver_signed' => true,
            'liability_waiver_signed_at' => now(),
        ]);

        return true;
    }

    public function signConfidentialityAgreement(): bool
    {
        $this->update([
            'confidentiality_agreement_signed' => true,
            'confidentiality_agreement_signed_at' => now(),
        ]);

        return true;
    }

    public function isFullySigned(): bool
    {
        return $this->terms_signed && 
               $this->liability_waiver_signed && 
               $this->confidentiality_agreement_signed;
    }

    public function canBeApproved(): bool
    {
        return $this->status === 'pending' && 
               $this->document_path && 
               $this->scope_definition && 
               $this->isFullySigned();
    }

    public function recordUsage(): void
    {
        $this->increment('scans_performed');
        $this->update(['last_used_at' => now()]);
    }

    public function recordFinding(): void
    {
        $this->increment('findings_discovered');
    }

    public function addDomain(Domain $domain): bool
    {
        if (!$this->isInScope($domain->domain)) {
            return false;
        }

        $domain->authorize($this);
        $this->increment('domains_count');

        return true;
    }

    public function removeDomain(Domain $domain): bool
    {
        if ($domain->current_authorization_id !== $this->id) {
            return false;
        }

        $domain->revokeAuthorization();
        $this->decrement('domains_count');

        return true;
    }

    public function isInScope(string $target): bool
    {
        if (!$this->scope_definition) {
            return false;
        }

        // Check domains
        $domains = $this->scope_definition['domains'] ?? [];
        foreach ($domains as $domain) {
            if (str_contains($target, $domain)) {
                return true;
            }
        }

        // Check IP ranges
        $ipRanges = $this->scope_definition['ip_ranges'] ?? [];
        foreach ($ipRanges as $range) {
            if ($this->ipInRange($target, $range)) {
                return true;
            }
        }

        // Check custom patterns
        $patterns = $this->scope_definition['patterns'] ?? [];
        foreach ($patterns as $pattern) {
            if (preg_match('/' . $pattern . '/', $target)) {
                return true;
            }
        }

        return false;
    }

    public function isOutOfScope(string $target): bool
    {
        if (!$this->out_of_scope) {
            return false;
        }

        foreach ($this->out_of_scope as $excluded) {
            if (str_contains($target, $excluded)) {
                return true;
            }
        }

        return false;
    }

    public function canTest(string $target): bool
    {
        return $this->is_current && 
               $this->isInScope($target) && 
               !$this->isOutOfScope($target);
    }

    public function getScopeDomains(): array
    {
        return $this->scope_definition['domains'] ?? [];
    }

    public function getScopeIpRanges(): array
    {
        return $this->scope_definition['ip_ranges'] ?? [];
    }

    public function getTestingMethodsAllowed(): array
    {
        return $this->testing_methods ?? ['all'];
    }

    public function hasRestriction(string $restriction): bool
    {
        if (!$this->restrictions) {
            return false;
        }

        return in_array($restriction, $this->restrictions);
    }

    public function getRestrictions(): array
    {
        return $this->restrictions ?? [];
    }

    public function generateAuditLogEntry(string $action, array $data = []): void
    {
        $log = $this->audit_log ?? [];
        $log[] = [
            'timestamp' => now()->toISOString(),
            'action' => $action,
            'user_id' => auth()->id(),
            'ip' => request()->ip(),
            'data' => $data,
        ];

        $this->update(['audit_log' => $log]);
    }

    // Helper methods
    private function ipInRange(string $ip, string $range): bool
    {
        if (str_contains($range, '/')) {
            // CIDR notation
            [$subnet, $mask] = explode('/', $range);
            return (ip2long($ip) & ~((1 << (32 - $mask)) - 1)) === ip2long($subnet);
        } elseif (str_contains($range, '-')) {
            // Range notation
            [$start, $end] = explode('-', $range);
            return ip2long($ip) >= ip2long($start) && ip2long($ip) <= ip2long($end);
        } else {
            // Single IP
            return $ip === $range;
        }
    }

    // Events
    protected static function booted()
    {
        static::creating(function ($authorization) {
            if (!$authorization->starts_at) {
                $authorization->starts_at = $authorization->start_date . ' 00:00:00';
            }
            if (!$authorization->expires_at) {
                $authorization->expires_at = $authorization->end_date . ' 23:59:59';
            }
        });

        static::updated(function ($authorization) {
            // Log status changes
            if ($authorization->wasChanged('status')) {
                $authorization->generateAuditLogEntry('status_change', [
                    'old_status' => $authorization->getOriginal('status'),
                    'new_status' => $authorization->status,
                ]);
            }

            // Log usage
            if ($authorization->wasChanged('scans_performed')) {
                $authorization->generateAuditLogEntry('scan_performed');
            }
        });
    }
}
