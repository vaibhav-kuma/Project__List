<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Str;

class Domain extends Model
{
    use HasFactory;

    protected $fillable = [
        'team_id',
        'domain',
        'normalized_domain',
        'description',
        'verification_status',
        'verified_at',
        'verification_expires_at',
        'verification_method',
        'verification_token',
        'verification_details',
        'authorization_status',
        'current_authorization_id',
        'authorized_at',
        'authorization_expires_at',
        'type',
        'parent_domain_id',
        'in_scope',
        'scope_restrictions',
        'excluded_subdomains',
        'allow_subdomain_monitoring',
        'monitoring_enabled',
        'monitoring_started_at',
        'monitoring_sources',
        'scan_frequency_hours',
        'last_scan_at',
        'next_scan_at',
        'risk_level',
        'risk_score',
        'risk_factors',
        'risk_assessed_at',
        'dns_records',
        'ssl_info',
        'technologies',
        'cloud_services',
        'ip_addresses',
        'gdpr_applicable',
        'pci_dss_applicable',
        'hipaa_applicable',
        'compliance_notes',
        'is_active',
        'is_archived',
        'archived_at',
        'notes',
        'tags',
        'total_findings',
        'critical_findings',
        'high_findings',
        'medium_findings',
        'low_findings',
        'statistics_updated_at',
    ];

    protected $casts = [
        'scope_restrictions' => 'array',
        'excluded_subdomains' => 'array',
        'monitoring_sources' => 'array',
        'risk_factors' => 'array',
        'dns_records' => 'array',
        'ssl_info' => 'array',
        'technologies' => 'array',
        'cloud_services' => 'array',
        'ip_addresses' => 'array',
        'compliance_notes' => 'array',
        'tags' => 'array',
        'verified_at' => 'datetime',
        'verification_expires_at' => 'datetime',
        'authorized_at' => 'datetime',
        'authorization_expires_at' => 'datetime',
        'monitoring_started_at' => 'datetime',
        'last_scan_at' => 'datetime',
        'next_scan_at' => 'datetime',
        'risk_assessed_at' => 'datetime',
        'archived_at' => 'datetime',
        'statistics_updated_at' => 'datetime',
    ];

    protected $dates = [
        'verified_at',
        'verification_expires_at',
        'authorized_at',
        'authorization_expires_at',
        'monitoring_started_at',
        'last_scan_at',
        'next_scan_at',
        'risk_assessed_at',
        'archived_at',
        'statistics_updated_at',
    ];

    // Activity logging
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'domain',
                'verification_status',
                'authorization_status',
                'monitoring_enabled',
                'risk_level',
                'risk_score',
                'is_active',
                'is_archived',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('domain');
    }

    // Relationships
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function parentDomain(): BelongsTo
    {
        return $this->belongsTo(Domain::class, 'parent_domain_id');
    }

    public function subdomains(): HasMany
    {
        return $this->hasMany(Domain::class, 'parent_domain_id');
    }

    public function verification(): HasMany
    {
        return $this->hasMany(DomainVerification::class);
    }

    public function currentVerification(): HasMany
    {
        return $this->hasMany(DomainVerification::class)
            ->where('status', 'verified')
            ->orderBy('verified_at', 'desc');
    }

    public function authorizations(): HasMany
    {
        return $this->hasMany(Authorization::class, 'target_id')
            ->where('target_type', 'domain');
    }

    public function currentAuthorization(): BelongsTo
    {
        return $this->belongsTo(Authorization::class, 'current_authorization_id');
    }

    public function findings(): HasMany
    {
        return $this->hasMany(Finding::class);
    }

    public function leaks(): HasMany
    {
        return $this->hasMany(Leak::class);
    }

    public function criticalFindings(): HasMany
    {
        return $this->findings()->where('severity', 'critical');
    }

    public function highFindings(): HasMany
    {
        return $this->findings()->where('severity', 'high');
    }

    public function mediumFindings(): HasMany
    {
        return $this->findings()->where('severity', 'medium');
    }

    public function lowFindings(): HasMany
    {
        return $this->findings()->where('severity', 'low');
    }

    public function evidenceChains(): HasMany
    {
        return $this->hasMany(EvidenceChain::class);
    }

    public function optOuts(): HasMany
    {
        return $this->hasMany(DomainOptOut::class, 'domain');
    }

    public function activeOptOut(): HasMany
    {
        return $this->optOuts()->where('is_active', true);
    }

    // Scopes
    public function scopeVerified($query)
    {
        return $query->where('verification_status', 'verified');
    }

    public function scopeAuthorized($query)
    {
        return $query->where('authorization_status', 'approved');
    }

    public function scopeMonitoring($query)
    {
        return $query->where('monitoring_enabled', true);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true)->where('is_archived', false);
    }

    public function scopeArchived($query)
    {
        return $query->where('is_archived', true);
    }

    public function scopeByRiskLevel($query, $level)
    {
        return $query->where('risk_level', $level);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopeInScope($query)
    {
        return $query->where('in_scope', true);
    }

    public function scopeNeedsScan($query)
    {
        return $query->where('monitoring_enabled', true)
            ->where(function ($q) {
                $q->whereNull('next_scan_at')
                  ->orWhere('next_scan_at', '<=', now());
            });
    }

    public function scopeWithExpiredVerification($query)
    {
        return $query->where('verification_expires_at', '<', now());
    }

    public function scopeWithExpiredAuthorization($query)
    {
        return $query->where('authorization_expires_at', '<', now());
    }

    // Accessors
    public function getIsVerifiedAttribute(): bool
    {
        return $this->verification_status === 'verified' && 
               $this->verified_at !== null && 
               (!$this->verification_expires_at || $this->verification_expires_at->isFuture());
    }

    public function getIsAuthorizedAttribute(): bool
    {
        return $this->authorization_status === 'approved' && 
               $this->authorized_at !== null && 
               (!$this->authorization_expires_at || $this->authorization_expires_at->isFuture());
    }

    public function getCanMonitorAttribute(): bool
    {
        return $this->is_verified && 
               $this->is_authorized && 
               $this->in_scope && 
               $this->is_active && 
               !$this->is_archived;
    }

    public function getIsSubdomainAttribute(): bool
    {
        return $this->type === 'subdomain' && $this->parent_domain_id !== null;
    }

    public function getVerificationStatusBadgeAttribute(): string
    {
        return match($this->verification_status) {
            'verified' => 'success',
            'pending' => 'warning',
            'failed' => 'danger',
            'expired' => 'danger',
            'revoked' => 'danger',
            default => 'secondary',
        };
    }

    public function getAuthorizationStatusBadgeAttribute(): string
    {
        return match($this->authorization_status) {
            'approved' => 'success',
            'pending' => 'warning',
            'rejected' => 'danger',
            'expired' => 'danger',
            default => 'secondary',
        };
    }

    public function getRiskLevelBadgeAttribute(): string
    {
        return match($this->risk_level) {
            'critical' => 'danger',
            'high' => 'warning',
            'medium' => 'info',
            'low' => 'success',
            default => 'secondary',
        };
    }

    public function getDomainWithSubdomainsAttribute(): string
    {
        if ($this->is_subdomain && $this->parentDomain) {
            return $this->domain . '.' . $this->parentDomain->domain;
        }
        return $this->domain;
    }

    public function getTldAttribute(): string
    {
        $parts = explode('.', $this->domain);
        return end($parts);
    }

    public function getRootDomainAttribute(): string
    {
        $parts = explode('.', $this->domain);
        if (count($parts) >= 2) {
            return $parts[count($parts) - 2] . '.' . $parts[count($parts) - 1];
        }
        return $this->domain;
    }

    public function getDaysSinceLastScanAttribute(): int
    {
        if (!$this->last_scan_at) {
            return -1; // Never scanned
        }
        return $this->last_scan_at->diffInDays(now());
    }

    public function getScanOverdueAttribute(): bool
    {
        if (!$this->monitoring_enabled || !$this->next_scan_at) {
            return false;
        }
        return $this->next_scan_at->isPast();
    }

    public function getComplianceScoreAttribute(): float
    {
        $score = 100.0;

        if ($this->gdpr_applicable && $this->critical_findings > 0) {
            $score -= 30;
        }
        if ($this->pci_dss_applicable && $this->high_findings > 0) {
            $score -= 20;
        }
        if ($this->hipaa_applicable && $this->medium_findings > 0) {
            $score -= 15;
        }

        if (!$this->is_verified) {
            $score -= 25;
        }
        if (!$this->is_authorized) {
            $score -= 25;
        }

        return max(0.0, $score);
    }

    // Methods
    public function verify(string $method, array $details = []): bool
    {
        $this->update([
            'verification_status' => 'verified',
            'verified_at' => now(),
            'verification_expires_at' => now()->addYear(),
            'verification_method' => $method,
            'verification_details' => $details,
        ]);

        return true;
    }

    public function revokeVerification(): bool
    {
        $this->update([
            'verification_status' => 'revoked',
            'verification_expires_at' => now(),
            'monitoring_enabled' => false,
        ]);

        return true;
    }

    public function authorize(Authorization $authorization): bool
    {
        $this->update([
            'authorization_status' => 'approved',
            'current_authorization_id' => $authorization->id,
            'authorized_at' => now(),
            'authorization_expires_at' => $authorization->expires_at,
        ]);

        return true;
    }

    public function revokeAuthorization(): bool
    {
        $this->update([
            'authorization_status' => 'expired',
            'current_authorization_id' => null,
            'authorization_expires_at' => now(),
            'monitoring_enabled' => false,
        ]);

        return true;
    }

    public function enableMonitoring(array $sources = null): bool
    {
        if (!$this->can_monitor) {
            return false;
        }

        $this->update([
            'monitoring_enabled' => true,
            'monitoring_started_at' => now(),
            'monitoring_sources' => $sources ?? config('security.monitoring.default_sources', []),
            'next_scan_at' => now()->addHours($this->scan_frequency_hours),
        ]);

        return true;
    }

    public function disableMonitoring(): bool
    {
        $this->update([
            'monitoring_enabled' => false,
            'next_scan_at' => null,
        ]);

        return true;
    }

    public function scheduleNextScan(): void
    {
        $this->update([
            'next_scan_at' => now()->addHours($this->scan_frequency_hours),
        ]);
    }

    public function recordScan(): void
    {
        $this->update([
            'last_scan_at' => now(),
            'next_scan_at' => now()->addHours($this->scan_frequency_hours),
        ]);
    }

    public function updateRiskScore(): void
    {
        $score = 0.0;
        $factors = [];

        // Base score from findings
        $score += $this->critical_findings * 10;
        $score += $this->high_findings * 5;
        $score += $this->medium_findings * 2;
        $score += $this->low_findings * 0.5;

        if ($this->critical_findings > 0) {
            $factors[] = 'Critical findings present';
        }
        if ($this->high_findings > 5) {
            $factors[] = 'Multiple high findings';
        }

        // Technology risk factors
        if ($this->technologies) {
            $riskyTechs = ['php', 'mysql', 'apache', 'wordpress'];
            foreach ($riskyTechs as $tech) {
                if (in_array($tech, array_column($this->technologies, 'name'))) {
                    $score += 1;
                    $factors[] = "Legacy technology: {$tech}";
                }
            }
        }

        // SSL/TLS issues
        if ($this->ssl_info && isset($this->ssl_info['valid']) && !$this->ssl_info['valid']) {
            $score += 5;
            $factors[] = 'Invalid SSL certificate';
        }

        // Exposure factors
        if ($this->leaks()->count() > 0) {
            $score += 3;
            $factors[] = 'Public leaks detected';
        }

        // Determine risk level
        $riskLevel = 'low';
        if ($score >= 80) {
            $riskLevel = 'critical';
        } elseif ($score >= 60) {
            $riskLevel = 'high';
        } elseif ($score >= 40) {
            $riskLevel = 'medium';
        }

        $this->update([
            'risk_score' => min($score, 100.0),
            'risk_level' => $riskLevel,
            'risk_factors' => $factors,
            'risk_assessed_at' => now(),
        ]);
    }

    public function updateStatistics(): void
    {
        $stats = [
            'total_findings' => $this->findings()->count(),
            'critical_findings' => $this->criticalFindings()->count(),
            'high_findings' => $this->highFindings()->count(),
            'medium_findings' => $this->mediumFindings()->count(),
            'low_findings' => $this->lowFindings()->count(),
        ];

        $this->update(array_merge($stats, [
            'statistics_updated_at' => now(),
        ]));
    }

    public function archive(): void
    {
        $this->update([
            'is_archived' => true,
            'archived_at' => now(),
            'monitoring_enabled' => false,
        ]);
    }

    public function unarchive(): void
    {
        $this->update([
            'is_archived' => false,
            'archived_at' => null,
        ]);
    }

    public function isExcluded(string $subdomain): bool
    {
        if (!$this->excluded_subdomains) {
            return false;
        }

        return in_array($subdomain, $this->excluded_subdomains);
    }

    public function isInScope(string $target): bool
    {
        if (!$this->in_scope) {
            return false;
        }

        // Check if target matches this domain or subdomains
        if (str_ends_with($target, $this->domain)) {
            return true;
        }

        // Check scope restrictions
        if ($this->scope_restrictions) {
            foreach ($this->scope_restrictions as $restriction) {
                if (str_contains($target, $restriction)) {
                    return true;
                }
            }
        }

        return false;
    }

    // Events
    protected static function booted()
    {
        static::creating(function ($domain) {
            if (!$domain->normalized_domain) {
                $domain->normalized_domain = strtolower($domain->domain);
            }
        });

        static::updated(function ($domain) {
            // Update statistics when findings change
            if ($domain->wasChanged(['total_findings', 'critical_findings', 'high_findings', 'medium_findings', 'low_findings'])) {
                $domain->updateRiskScore();
            }

            // Log security-relevant changes
            if ($domain->wasChanged(['verification_status', 'authorization_status', 'monitoring_enabled'])) {
                activity()
                    ->causedBy(auth()->user())
                    ->performedOn($domain)
                    ->withProperties([
                        'changes' => $domain->getChanges(),
                        'ip' => request()->ip(),
                    ])
                    ->event('security_status_change')
                    ->log('Domain security status changed');
            }
        });
    }
}
