<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Carbon\Carbon;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        static::creating(function ($user) {
            // Set default timezone and locale
            if (!$user->timezone) {
                $user->timezone = config('app.timezone', 'UTC');
            }
            if (!$user->locale) {
                $user->locale = config('app.locale', 'en');
            }
        });

        static::updated(function ($user) {
            // Log critical security changes
            if ($user->wasChanged(['is_suspended', 'suspension_reason', 'verification_status'])) {
                // Simple logging for now (activity() requires spatie package)
                \Log::info('User security status changed', [
                    'user_id' => $user->id,
                    'changes' => $user->getChanges(),
                    'ip' => request()->ip(),
                ]);
            }
        });
    }

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'phone',
        'password',
        'timezone',
        'locale',
        'preferences',
        'mfa_enabled',
        'mfa_secret',
        'mfa_recovery_codes',
        'mfa_setup_at',
        'webauthn_credentials',
        'verification_status',
        'verified_at',
        'verification_rejection_reason',
        'company',
        'job_title',
        'linkedin_profile',
        'certifications',
        'terms_accepted',
        'terms_accepted_at',
        'terms_ip_address',
        'aup_accepted',
        'aup_accepted_at',
        'privacy_policy_accepted',
        'privacy_policy_accepted_at',
        'is_active',
        'is_suspended',
        'suspended_at',
        'suspension_reason',
        'last_login_at',
        'last_login_ip',
        'failed_login_attempts',
        'locked_until',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'mfa_secret',
        'mfa_recovery_codes',
        'webauthn_credentials',
    ];

    protected $casts = [
        'preferences' => 'array',
        'mfa_recovery_codes' => 'array',
        'webauthn_credentials' => 'array',
        'certifications' => 'array',
        'terms_accepted_at' => 'datetime',
        'aup_accepted_at' => 'datetime',
        'privacy_policy_accepted_at' => 'datetime',
        'verified_at' => 'datetime',
        'suspended_at' => 'datetime',
        'mfa_setup_at' => 'datetime',
        'last_login_at' => 'datetime',
        'locked_until' => 'datetime',
        'email_verified_at' => 'datetime',
    ];

    protected $dates = [
        'terms_accepted_at',
        'aup_accepted_at',
        'privacy_policy_accepted_at',
        'verified_at',
        'suspended_at',
        'mfa_setup_at',
        'last_login_at',
        'locked_until',
        'email_verified_at',
    ];

    // Activity logging
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'first_name',
                'last_name',
                'email',
                'phone',
                'company',
                'job_title',
                'verification_status',
                'is_active',
                'is_suspended',
                'mfa_enabled',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('user');
    }

    // Relationships
    public function ownedTeams(): HasMany
    {
        return $this->hasMany(Team::class, 'owner_id');
    }

    public function teams(): BelongsToMany
    {
        return $this->belongsToMany(Team::class)
            ->withPivot('role', 'joined_at', 'invited_by')
            ->withTimestamps();
    }

    public function currentTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'current_team_id');
    }

    public function verifications(): HasMany
    {
        return $this->hasMany(UserVerification::class);
    }

    public function governmentIdVerification(): HasMany
    {
        return $this->hasMany(UserVerification::class)->where('verification_type', 'government_id');
    }

    public function linkedinVerification(): HasMany
    {
        return $this->hasMany(UserVerification::class)->where('verification_type', 'linkedin');
    }

    public function backgroundCheck(): HasMany
    {
        return $this->hasMany(UserVerification::class)->where('verification_type', 'background_check');
    }

    public function domains(): HasMany
    {
        return $this->hasMany(Domain::class);
    }

    public function authorizations(): HasMany
    {
        return $this->hasMany(Authorization::class, 'created_by');
    }

    public function domainVerifications(): HasMany
    {
        return $this->hasMany(DomainVerification::class, 'created_by');
    }

    public function penetrationTests(): HasMany
    {
        return $this->hasMany(PenetrationTest::class, 'created_by');
    }

    public function findings(): HasMany
    {
        return $this->hasMany(Finding::class, 'discovered_by');
    }

    public function assignedFindings(): HasMany
    {
        return $this->hasMany(Finding::class, 'assigned_to');
    }

    public function leaks(): HasMany
    {
        return $this->hasMany(Leak::class, 'discovered_by');
    }

    public function assignedLeaks(): HasMany
    {
        return $this->hasMany(Leak::class, 'assigned_to');
    }

    public function evidenceChains(): HasMany
    {
        return $this->hasMany(EvidenceChain::class, 'collected_by');
    }

    public function trainingCompletions(): HasMany
    {
        return $this->hasMany(TrainingCompletion::class);
    }

    public function abuseReports(): HasMany
    {
        return $this->hasMany(AbuseReport::class, 'reported_user_id');
    }

    public function createdAbuseReports(): HasMany
    {
        return $this->hasMany(AbuseReport::class, 'created_by');
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

    public function scopeWithMfa($query)
    {
        return $query->where('mfa_enabled', true);
    }

    public function scopeByRole($query, $role)
    {
        return $query->whereHas('roles', function ($q) use ($role) {
            $q->where('name', $role);
        });
    }

    // Accessors
    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }

    public function getInitialsAttribute(): string
    {
        return strtoupper(substr($this->first_name, 0, 1) . substr($this->last_name, 0, 1));
    }

    public function getIsVerifiedAttribute(): bool
    {
        return $this->verification_status === 'verified' && $this->verified_at !== null;
    }

    public function getIsLockedAttribute(): bool
    {
        return $this->locked_until && $this->locked_until->isFuture();
    }

    public function getCanLoginAttribute(): bool
    {
        return $this->is_active && !$this->is_suspended && !$this->is_locked;
    }

    public function getHasCompletedOnboardingAttribute(): bool
    {
        return $this->terms_accepted && 
               $this->aup_accepted && 
               $this->privacy_policy_accepted &&
               $this->mfa_enabled;
    }

    public function getGravatarUrlAttribute(): string
    {
        $hash = md5(strtolower(trim($this->email)));
        return "https://www.gravatar.com/avatar/{$hash}?s=200&d=identicon";
    }

    // Methods
    public function enableMfa(string $secret = null): bool
    {
        $google2fa = new Google2FA();
        
        if (!$secret) {
            $secret = $google2fa->generateSecretKey();
        }

        $this->update([
            'mfa_secret' => encrypt($secret),
            'mfa_recovery_codes' => $this->generateRecoveryCodes(),
            'mfa_enabled' => true,
            'mfa_setup_at' => now(),
        ]);

        return true;
    }

    public function disableMfa(): bool
    {
        $this->update([
            'mfa_enabled' => false,
            'mfa_secret' => null,
            'mfa_recovery_codes' => null,
            'mfa_setup_at' => null,
        ]);

        return true;
    }

    public function verifyMfaCode(string $code): bool
    {
        if (!$this->mfa_enabled || !$this->mfa_secret) {
            return false;
        }

        $google2fa = new Google2FA();
        $secret = decrypt($this->mfa_secret);

        return $google2fa->verifyKey($secret, $code);
    }

    public function verifyRecoveryCode(string $code): bool
    {
        if (!$this->mfa_recovery_codes) {
            return false;
        }

        $recoveryCodes = $this->mfa_recovery_codes;
        
        if (in_array($code, $recoveryCodes)) {
            // Remove used recovery code
            $recoveryCodes = array_diff($recoveryCodes, [$code]);
            $this->update(['mfa_recovery_codes' => array_values($recoveryCodes)]);
            return true;
        }

        return false;
    }

    public function generateRecoveryCodes(): array
    {
        $codes = [];
        for ($i = 0; $i < 10; $i++) {
            $codes[] = strtoupper(str()->random(8));
        }
        return $codes;
    }

    public function recordLogin(string $ip): void
    {
        $this->update([
            'last_login_at' => now(),
            'last_login_ip' => $ip,
            'failed_login_attempts' => 0,
            'locked_until' => null,
        ]);
    }

    public function recordFailedLogin(): void
    {
        $attempts = $this->failed_login_attempts + 1;
        $maxAttempts = config('security.authentication.max_login_attempts', 5);
        $lockoutDuration = config('security.authentication.lockout_duration', 15); // minutes

        $updateData = ['failed_login_attempts' => $attempts];

        if ($attempts >= $maxAttempts) {
            $updateData['locked_until'] = now()->addMinutes($lockoutDuration);
        }

        $this->update($updateData);
    }

    public function suspend(string $reason): void
    {
        $this->update([
            'is_suspended' => true,
            'suspended_at' => now(),
            'suspension_reason' => $reason,
            'is_active' => false,
        ]);

        // Revoke all API tokens
        $this->tokens()->delete();
    }

    public function unsuspend(): void
    {
        $this->update([
            'is_suspended' => false,
            'suspended_at' => null,
            'suspension_reason' => null,
            'is_active' => true,
            'failed_login_attempts' => 0,
            'locked_until' => null,
        ]);
    }

    public function acceptTerms(string $ip): void
    {
        $this->update([
            'terms_accepted' => true,
            'terms_accepted_at' => now(),
            'terms_ip_address' => $ip,
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

    public function isMemberOf(Team $team): bool
    {
        return $this->teams()->where('team_id', $team->id)->exists();
    }

    public function hasTeamRole(Team $team, string $role): bool
    {
        return $this->teams()
            ->where('team_id', $team->id)
            ->where('team_user.role', $role)
            ->exists();
    }

    public function isOwnerOf(Team $team): bool
    {
        return $this->id === $team->owner_id || $this->hasTeamRole($team, 'owner');
    }

    public function isAdminOf(Team $team): bool
    {
        return $this->hasTeamRole($team, 'admin') || $this->isOwnerOf($team);
    }

    // Notifications
    public function sendEmailVerificationNotification()
    {
        $this->notify(new VerifyEmail());
    }

    public function sendPasswordResetNotification($token)
    {
        $this->notify(new ResetPassword($token));
    }
}
