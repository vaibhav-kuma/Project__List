<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class UserVerification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'verification_type',
        'provider',
        'external_id',
        'provider_reference',
        'status',
        'verified_at',
        'expires_at',
        'rejection_reason',
        'provider_response',
        'id_type',
        'id_country',
        'id_number_hash',
        'id_expiry_date',
        'id_document_data',
        'id_document_path',
        'selfie_path',
        'face_match_score',
        'linkedin_profile_url',
        'linkedin_profile_id',
        'linkedin_user_id',
        'linkedin_profile_data',
        'linkedin_verified',
        'linkedin_connections',
        'linkedin_headline',
        'linkedin_company',
        'corporate_email',
        'email_domain',
        'verification_code',
        'email_sent_at',
        'email_verified_at',
        'email_headers',
        'email_domain_verified',
        'checkr_candidate_id',
        'background_check_level',
        'background_check_results',
        'criminal_record_check',
        'sanctions_check',
        'employment_verification',
        'education_verification',
        'certification_name',
        'certification_issuer',
        'certification_number',
        'certification_issued_date',
        'certification_expiry_date',
        'certification_document_path',
        'certification_verified',
        'phone_number',
        'phone_country_code',
        'verification_sms_code',
        'sms_sent_at',
        'phone_verified_at',
        'phone_carrier',
        'phone_type',
        'video_call_id',
        'video_call_scheduled_at',
        'video_call_completed_at',
        'verified_by_agent',
        'agent_notes',
        'video_recording_path',
        'risk_score',
        'risk_level',
        'risk_factors',
        'fraud_indicators',
        'requester_ip',
        'user_agent',
        'audit_log',
        'manual_review_required',
        'reviewed_by',
        'reviewed_at',
        'review_notes',
    ];

    protected $casts = [
        'id_document_data' => 'array',
        'linkedin_profile_data' => 'array',
        'background_check_results' => 'array',
        'provider_response' => 'array',
        'risk_factors' => 'array',
        'fraud_indicators' => 'array',
        'audit_log' => 'array',
        'face_match_score' => 'decimal:2',
        'risk_score' => 'decimal:2',
        'id_expiry_date' => 'date',
        'certification_issued_date' => 'date',
        'certification_expiry_date' => 'date',
        'verified_at' => 'datetime',
        'expires_at' => 'datetime',
        'email_sent_at' => 'datetime',
        'email_verified_at' => 'datetime',
        'sms_sent_at' => 'datetime',
        'phone_verified_at' => 'datetime',
        'video_call_scheduled_at' => 'datetime',
        'video_call_completed_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    protected $dates = [
        'id_expiry_date',
        'certification_issued_date',
        'certification_expiry_date',
        'verified_at',
        'expires_at',
        'email_sent_at',
        'email_verified_at',
        'sms_sent_at',
        'phone_verified_at',
        'video_call_scheduled_at',
        'video_call_completed_at',
        'reviewed_at',
    ];

    // Activity logging
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'verification_type',
                'provider',
                'status',
                'verified_at',
                'risk_score',
                'risk_level',
                'manual_review_required',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('user_verification');
    }

    // Relationships
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function verifiedByAgent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by_agent');
    }

    // Scopes
    public function scopeByType($query, $type)
    {
        return $query->where('verification_type', $type);
    }

    public function scopeByProvider($query, $provider)
    {
        return $query->where('provider', $provider);
    }

    public function scopeVerified($query)
    {
        return $query->where('status', 'verified');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    public function scopeExpired($query)
    {
        return $query->where('expires_at', '<', now());
    }

    public function scopeRequiresReview($query)
    {
        return $query->where('manual_review_required', true);
    }

    public function scopeByRiskLevel($query, $level)
    {
        return $query->where('risk_level', $level);
    }

    // Accessors
    public function getIsVerifiedAttribute(): bool
    {
        return $this->status === 'verified' && 
               $this->verified_at !== null && 
               (!$this->expires_at || $this->expires_at->isFuture());
    }

    public function getIsExpiredAttribute(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    public function getStatusBadgeAttribute(): string
    {
        return match($this->status) {
            'verified' => 'success',
            'pending' => 'warning',
            'processing' => 'info',
            'rejected' => 'danger',
            'expired' => 'danger',
            'requires_action' => 'warning',
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

    public function getTypeLabelAttribute(): string
    {
        return match($this->verification_type) {
            'government_id' => 'Government ID',
            'linkedin' => 'LinkedIn Profile',
            'corporate_email' => 'Corporate Email',
            'background_check' => 'Background Check',
            'professional_certification' => 'Professional Certification',
            'phone_verification' => 'Phone Verification',
            'video_verification' => 'Video Verification',
            default => 'Unknown',
        };
    }

    public function getProviderLabelAttribute(): string
    {
        return match($this->provider) {
            'onfido' => 'Onfido',
            'jumio' => 'Jumio',
            'checkr' => 'Checkr',
            'linkedin' => 'LinkedIn',
            'internal' => 'Internal',
            'twilio' => 'Twilio',
            default => ucfirst($this->provider),
        };
    }

    public function getCompletionPercentageAttribute(): float
    {
        $steps = 0;
        $completed = 0;

        if ($this->verification_type === 'government_id') {
            $steps = 4;
            if ($this->id_document_path) $completed++;
            if ($this->selfie_path) $completed++;
            if ($this->face_match_score) $completed++;
            if ($this->provider_response) $completed++;
        } elseif ($this->verification_type === 'linkedin') {
            $steps = 3;
            if ($this->linkedin_profile_url) $completed++;
            if ($this->linkedin_profile_data) $completed++;
            if ($this->linkedin_verified) $completed++;
        } elseif ($this->verification_type === 'corporate_email') {
            $steps = 2;
            if ($this->corporate_email) $completed++;
            if ($this->email_verified_at) $completed++;
        }

        return $steps > 0 ? ($completed / $steps) * 100 : 0;
    }

    // Methods
    public function approve(User $reviewedBy = null, string $notes = null): bool
    {
        $this->update([
            'status' => 'verified',
            'verified_at' => now(),
            'reviewed_by' => $reviewedBy?->id,
            'reviewed_at' => now(),
            'review_notes' => $notes,
            'manual_review_required' => false,
        ]);

        // Update user verification status if all required verifications are complete
        $this->updateUserVerificationStatus();

        return true;
    }

    public function reject(string $reason, User $reviewedBy = null): bool
    {
        $this->update([
            'status' => 'rejected',
            'rejection_reason' => $reason,
            'reviewed_by' => $reviewedBy?->id,
            'reviewed_at' => now(),
            'manual_review_required' => false,
        ]);

        return true;
    }

    public function requestManualReview(string $reason): bool
    {
        $this->update([
            'manual_review_required' => true,
            'status' => 'pending',
            'rejection_reason' => $reason,
        ]);

        return true;
    }

    public function markRequiresAction(string $reason): bool
    {
        $this->update([
            'status' => 'requires_action',
            'rejection_reason' => $reason,
        ]);

        return true;
    }

    public function calculateRiskScore(): void
    {
        $score = 0.0;
        $factors = [];
        $indicators = [];

        if ($this->verification_type === 'government_id') {
            // Document quality checks
            if ($this->face_match_score && $this->face_match_score < 0.8) {
                $score += 30;
                $factors[] = 'Low face match score';
                $indicators[] = 'face_mismatch';
            }

            // Document expiry
            if ($this->id_expiry_date && $this->id_expiry_date->isPast()) {
                $score += 25;
                $factors[] = 'Expired ID document';
                $indicators[] = 'expired_document';
            }

            // Provider risk assessment
            if ($this->provider_response && isset($this->provider_response['risk'])) {
                $providerRisk = $this->provider_response['risk'];
                if ($providerRisk === 'high') {
                    $score += 40;
                    $factors[] = 'High risk from provider';
                    $indicators[] = 'provider_high_risk';
                } elseif ($providerRisk === 'medium') {
                    $score += 20;
                    $factors[] = 'Medium risk from provider';
                }
            }
        } elseif ($this->verification_type === 'linkedin') {
            // Profile completeness
            if ($this->linkedin_connections && $this->linkedin_connections < 50) {
                $score += 15;
                $factors[] = 'Low LinkedIn connections';
                $indicators[] = 'low_connections';
            }

            // Account age (if available)
            if ($this->linkedin_profile_data && isset($this->linkedin_profile_data['created_at'])) {
                $created = \Carbon\Carbon::parse($this->linkedin_profile_data['created_at']);
                if ($created->diffInYears(now()) < 1) {
                    $score += 20;
                    $factors[] = 'Recent LinkedIn account';
                    $indicators[] = 'new_account';
                }
            }
        } elseif ($this->verification_type === 'background_check') {
            // Criminal records
            if ($this->criminal_record_check && $this->background_check_results) {
                if (isset($this->background_check_results['criminal_records']) && 
                    count($this->background_check_results['criminal_records']) > 0) {
                    $score += 50;
                    $factors[] = 'Criminal records found';
                    $indicators[] = 'criminal_record';
                }
            }

            // Sanctions
            if ($this->sanctions_check && isset($this->background_check_results['sanctions'])) {
                if ($this->background_check_results['sanctions']['match']) {
                    $score += 60;
                    $factors[] = 'Sanctions list match';
                    $indicators[] = 'sanctions_match';
                }
            }
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
            'fraud_indicators' => $indicators,
        ]);
    }

    public function updateUserVerificationStatus(): void
    {
        $user = $this->user;
        
        // Check if all required verifications are complete
        $requiredVerifications = ['government_id', 'linkedin', 'corporate_email'];
        $completedVerifications = $user->verifications()
            ->whereIn('verification_type', $requiredVerifications)
            ->where('status', 'verified')
            ->where(function ($q) {
                $q->whereNull('expires_at')
                  ->orWhere('expires_at', '>', now());
            })
            ->count();

        if ($completedVerifications >= 2) { // Require at least 2 verifications
            $user->update([
                'verification_status' => 'verified',
                'verified_at' => now(),
            ]);
        }
    }

    public function canBeApproved(): bool
    {
        if ($this->status !== 'pending' && $this->status !== 'processing') {
            return false;
        }

        if ($this->verification_type === 'government_id') {
            return $this->id_document_path && 
                   $this->selfie_path && 
                   $this->face_match_score && 
                   $this->face_match_score >= 0.8;
        } elseif ($this->verification_type === 'linkedin') {
            return $this->linkedin_profile_url && 
                   $this->linkedin_profile_data && 
                   $this->linkedin_verified;
        } elseif ($this->verification_type === 'corporate_email') {
            return $this->corporate_email && 
                   $this->email_verified_at && 
                   $this->email_domain_verified;
        }

        return false;
    }

    public function hasFraudIndicators(): bool
    {
        return !empty($this->fraud_indicators);
    }

    public function getFraudIndicators(): array
    {
        return $this->fraud_indicators ?? [];
    }

    public function addAuditLogEntry(string $action, array $data = []): void
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

    // Events
    protected static function booted()
    {
        static::created(function ($verification) {
            $verification->addAuditLogEntry('verification_created');
        });

        static::updated(function ($verification) {
            if ($verification->wasChanged('status')) {
                $verification->addAuditLogEntry('status_changed', [
                    'old_status' => $verification->getOriginal('status'),
                    'new_status' => $verification->status,
                ]);
            }

            if ($verification->wasChanged(['risk_score', 'risk_level'])) {
                $verification->addAuditLogEntry('risk_assessment', [
                    'risk_score' => $verification->risk_score,
                    'risk_level' => $verification->risk_level,
                ]);
            }
        });
    }
}
