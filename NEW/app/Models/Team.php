<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Team extends Model
{
    use HasFactory;

    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        static::creating(function ($team) {
            // Generate slug if not provided
            if (!$team->slug) {
                $team->slug = Str::slug($team->name);
            }
        });

        static::updating(function ($team) {
            if ($team->isDirty('name') && !$team->isDirty('slug')) {
                $team->slug = Str::slug($team->name);
            }
        });
    }

    protected $fillable = [
        'name',
        'slug',
        'description',
        'owner_id',
        'type',
        'verification_status',
        'verified_at',
        'verification_rejection_reason',
        'company_registration',
        'tax_id',
        'address',
        'city',
        'state',
        'country',
        'postal_code',
        'phone',
        'website',
        'terms_accepted',
        'terms_accepted_at',
        'terms_accepted_by',
        'aup_accepted',
        'aup_accepted_at',
        'privacy_policy_accepted',
        'privacy_policy_accepted_at',
        'subscription_tier',
        'stripe_customer_id',
        'stripe_subscription_id',
        'subscription_starts_at',
        'subscription_ends_at',
        'subscription_active',
        'max_domains',
        'max_users',
        'max_reports_per_month',
        'max_api_calls_per_hour',
        'settings',
        'require_approval_for_new_domains',
        'auto_approve_authorizations',
        'default_timezone',
        'is_active',
        'is_suspended',
        'suspended_at',
        'suspension_reason',
    ];

    protected $casts = [
        'settings' => 'array',
        'terms_accepted_at' => 'datetime',
        'aup_accepted_at' => 'datetime',
        'privacy_policy_accepted_at' => 'datetime',
        'verified_at' => 'datetime',
        'subscription_starts_at' => 'datetime',
        'subscription_ends_at' => 'datetime',
        'suspended_at' => 'datetime',
    ];

    protected $dates = [
        'terms_accepted_at',
        'aup_accepted_at',
        'privacy_policy_accepted_at',
        'verified_at',
        'subscription_starts_at',
        'subscription_ends_at',
        'suspended_at',
    ];

    // Activity logging
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'name',
                'description',
                'type',
                'verification_status',
                'subscription_tier',
                'is_active',
                'is_suspended',
                'max_domains',
                'max_users',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('team');
    }

    // Relationships
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
            ->withPivot('role', 'joined_at', 'invited_by')
            ->withTimestamps();
    }

    public function domains(): HasMany
    {
        return $this->hasMany(Domain::class);
    }

    public function verifiedDomains(): HasMany
    {
        return $this->hasMany(Domain::class)->where('verification_status', 'verified');
    }

    public function authorizations(): HasMany
    {
        return $this->hasMany(Authorization::class);
    }

    public function activeAuthorizations(): HasMany
    {
        return $this->hasMany(Authorization::class)
            ->where('is_active', true)
            ->where('status', 'approved');
    }

    public function domainVerifications(): HasMany
    {
        return $this->hasMany(DomainVerification::class);
    }

    public function penetrationTests(): HasMany
    {
        return $this->hasMany(PenetrationTest::class);
    }

    public function activePenetrationTests(): HasMany
    {
        return $this->hasMany(PenetrationTest::class)
            ->whereIn('status', ['planning', 'active', 'reporting']);
    }

    public function findings(): HasMany
    {
        return $this->hasMany(Finding::class, 'team_id');
    }

    public function leaks(): HasMany
    {
        return $this->hasMany(Leak::class);
    }

    public function evidenceChains(): HasMany
    {
        return $this->hasMany(EvidenceChain::class);
    }

    public function abuseReports(): HasMany
    {
        return $this->hasMany(AbuseReport::class, 'reported_team_id');
    }

    public function optOuts(): HasMany
    {
        return $this->hasMany(DomainOptOut::class);
    }

    // Scopes
    public function scopeVerified($query)
    {
        return $query->where('verification_status', 'verified');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true)->where('is_suspended', false);
    }

    public function scopeSuspended($query)
    {
        return $query->where('is_suspended', true);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopeBySubscriptionTier($query, $tier)
    {
        return $query->where('subscription_tier', $tier);
    }

    public function scopeWithActiveSubscription($query)
    {
        return $query->where('subscription_active', true)
            ->where(function ($q) {
                $q->whereNull('subscription_ends_at')
                  ->orWhere('subscription_ends_at', '>', now());
            });
    }

    // Accessors
    public function getIsVerifiedAttribute(): bool
    {
        return $this->verification_status === 'verified' && $this->verified_at !== null;
    }

    public function getCanAddDomainsAttribute(): bool
    {
        if (!$this->is_active || $this->is_suspended) {
            return false;
        }

        return $this->domains()->count() < $this->max_domains;
    }

    public function getCanAddUsersAttribute(): bool
    {
        if (!$this->is_active || $this->is_suspended) {
            return false;
        }

        return $this->users()->count() < $this->max_users;
    }

    public function getDomainsCountAttribute(): int
    {
        return $this->domains()->count();
    }

    public function getVerifiedDomainsCountAttribute(): int
    {
        return $this->verifiedDomains()->count();
    }

    public function getUsersCountAttribute(): int
    {
        return $this->users()->count();
    }

    public function getActivePenetrationTestsCountAttribute(): int
    {
        return $this->activePenetrationTests()->count();
    }

    public function getTotalFindingsCountAttribute(): int
    {
        return $this->findings()->count();
    }

    public function getCriticalFindingsCountAttribute(): int
    {
        return $this->findings()->where('severity', 'critical')->count();
    }

    public function getHighFindingsCountAttribute(): int
    {
        return $this->findings()->where('severity', 'high')->count();
    }

    public function getSubscriptionStatusAttribute(): string
    {
        if (!$this->subscription_active) {
            return 'inactive';
        }

        if ($this->subscription_ends_at && $this->subscription_ends_at->isPast()) {
            return 'expired';
        }

        if ($this->subscription_ends_at && $this->subscription_ends_at->diffInDays(now()) <= 7) {
            return 'expiring_soon';
        }

        return 'active';
    }

    public function getUsagePercentageAttribute(): float
    {
        $maxUsage = max($this->max_domains, $this->max_users, $this->max_reports_per_month);
        $currentUsage = max(
            $this->domains_count,
            $this->users_count,
            $this->getCurrentReportsUsage()
        );

        return $maxUsage > 0 ? ($currentUsage / $maxUsage) * 100 : 0;
    }

    // Methods
    public function addUser(User $user, string $role = 'member', User $invitedBy = null): bool
    {
        if ($this->users()->where('user_id', $user->id)->exists()) {
            return false;
        }

        if (!$this->can_add_users) {
            return false;
        }

        $this->users()->attach($user->id, [
            'role' => $role,
            'joined_at' => now(),
            'invited_by' => $invitedBy?->id,
        ]);

        return true;
    }

    public function removeUser(User $user): bool
    {
        if ($user->id === $this->owner_id) {
            return false; // Cannot remove owner
        }

        return $this->users()->detach($user->id) > 0;
    }

    public function changeUserRole(User $user, string $role): bool
    {
        if ($user->id === $this->owner_id && $role !== 'owner') {
            return false; // Cannot change owner role
        }

        return $this->users()->updateExistingPivot($user->id, ['role' => $role]);
    }

    public function getUserRole(User $user): ?string
    {
        if ($user->id === $this->owner_id) {
            return 'owner';
        }

        $membership = $this->users()->where('user_id', $user->id)->first();
        return $membership?->pivot->role;
    }

    public function isUserMember(User $user): bool
    {
        return $this->users()->where('user_id', $user->id)->exists();
    }

    public function isUserAdmin(User $user): bool
    {
        $role = $this->getUserRole($user);
        return in_array($role, ['owner', 'admin']);
    }

    public function acceptTerms(User $acceptedBy): void
    {
        $this->update([
            'terms_accepted' => true,
            'terms_accepted_at' => now(),
            'terms_accepted_by' => $acceptedBy->id,
        ]);
    }

    public function acceptAup(): void
    {
        $this->update([
            'aup_accepted' => true,
            'aup_accepted_at' => now(),
        ]);
    }

    public function acceptPrivacyPolicy(): void
    {
        $this->update([
            'privacy_policy_accepted' => true,
            'privacy_policy_accepted_at' => now(),
        ]);
    }

    public function verify(): void
    {
        $this->update([
            'verification_status' => 'verified',
            'verified_at' => now(),
            'verification_rejection_reason' => null,
        ]);
    }

    public function reject(string $reason): void
    {
        $this->update([
            'verification_status' => 'rejected',
            'verification_rejection_reason' => $reason,
        ]);
    }

    public function suspend(string $reason): void
    {
        $this->update([
            'is_suspended' => true,
            'suspended_at' => now(),
            'suspension_reason' => $reason,
            'is_active' => false,
        ]);

        // Suspend all monitoring
        $this->domains()->update(['monitoring_enabled' => false]);
    }

    public function unsuspend(): void
    {
        $this->update([
            'is_suspended' => false,
            'suspended_at' => null,
            'suspension_reason' => null,
            'is_active' => true,
        ]);
    }

    public function upgradeSubscription(string $tier, array $limits): void
    {
        $this->update([
            'subscription_tier' => $tier,
            'max_domains' => $limits['max_domains'] ?? $this->max_domains,
            'max_users' => $limits['max_users'] ?? $this->max_users,
            'max_reports_per_month' => $limits['max_reports_per_month'] ?? $this->max_reports_per_month,
            'max_api_calls_per_hour' => $limits['max_api_calls_per_hour'] ?? $this->max_api_calls_per_hour,
        ]);
    }

    public function getCurrentReportsUsage(): int
    {
        // This would typically query reports created this month
        return $this->penetrationTests()
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();
    }

    public function getCurrentApiUsage(): int
    {
        // This would typically query API usage logs
        return 0; // Placeholder
    }

    public function getSettingsAttribute($value): array
    {
        $defaults = [
            'timezone' => 'UTC',
            'email_notifications' => true,
            'slack_notifications' => false,
            'auto_scan_enabled' => true,
            'scan_frequency' => 24, // hours
            'alert_threshold' => 'high',
            'require_approval_for_critical' => true,
        ];

        return array_merge($defaults, (array) $value);
    }

    public function getRiskScore(): float
    {
        $criticalFindings = $this->critical_findings_count;
        $highFindings = $this->high_findings_count;
        $totalFindings = $this->total_findings_count;

        if ($totalFindings === 0) {
            return 0.0;
        }

        // Weighted risk score calculation
        $score = ($criticalFindings * 10) + ($highFindings * 5) + ($totalFindings * 0.5);
        
        return min($score, 100.0); // Cap at 100
    }

    public function getRiskLevel(): string
    {
        $score = $this->getRiskScore();

        if ($score >= 80) {
            return 'critical';
        } elseif ($score >= 60) {
            return 'high';
        } elseif ($score >= 40) {
            return 'medium';
        } elseif ($score >= 20) {
            return 'low';
        } else {
            return 'minimal';
        }
    }
}
