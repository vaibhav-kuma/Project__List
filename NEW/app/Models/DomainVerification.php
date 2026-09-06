<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use Illuminate\Support\Str;

class DomainVerification extends Model
{
    use HasFactory;

    protected $fillable = [
        'team_id',
        'domain_id',
        'domain',
        'normalized_domain',
        'verification_method',
        'verification_token',
        'verification_value',
        'verification_instructions',
        'status',
        'verified_at',
        'expires_at',
        'last_attempt_at',
        'attempt_count',
        'dns_record_name',
        'dns_record_type',
        'dns_record_value',
        'dns_verification_response',
        'meta_tag_name',
        'meta_tag_content',
        'verification_url',
        'html_verification_response',
        'file_path',
        'file_content',
        'file_verification_response',
        'verification_email',
        'email_code',
        'email_sent_at',
        'email_verified_at',
        'verified_by',
        'manual_verification_notes',
        'manual_verification_evidence',
        'dns_records',
        'whois_info',
        'ssl_info',
        'http_headers',
        'ip_address',
        'requester_ip',
        'user_agent',
        'suspicious_activity',
        'suspicious_activity_reason',
        'created_by',
        'audit_log',
    ];

    protected $casts = [
        'dns_verification_response' => 'array',
        'html_verification_response' => 'array',
        'file_verification_response' => 'array',
        'dns_records' => 'array',
        'whois_info' => 'array',
        'ssl_info' => 'array',
        'http_headers' => 'array',
        'manual_verification_evidence' => 'array',
        'audit_log' => 'array',
        'verified_at' => 'datetime',
        'expires_at' => 'datetime',
        'last_attempt_at' => 'datetime',
        'email_sent_at' => 'datetime',
        'email_verified_at' => 'datetime',
    ];

    protected $dates = [
        'verified_at',
        'expires_at',
        'last_attempt_at',
        'email_sent_at',
        'email_verified_at',
    ];

    // Activity logging
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'domain',
                'verification_method',
                'status',
                'verified_at',
                'attempt_count',
                'suspicious_activity',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('domain_verification');
    }

    // Relationships
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function domain(): BelongsTo
    {
        return $this->belongsTo(Domain::class);
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Scopes
    public function scopeByMethod($query, $method)
    {
        return $query->where('verification_method', $method);
    }

    public function scopeVerified($query)
    {
        return $query->where('status', 'verified');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }

    public function scopeExpired($query)
    {
        return $query->where('expires_at', '<', now());
    }

    public function scopeSuspicious($query)
    {
        return $query->where('suspicious_activity', true);
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
            'failed' => 'danger',
            'expired' => 'danger',
            'revoked' => 'danger',
            default => 'secondary',
        };
    }

    public function getMethodLabelAttribute(): string
    {
        return match($this->verification_method) {
            'dns_txt' => 'DNS TXT Record',
            'html_meta' => 'HTML Meta Tag',
            'file_upload' => 'File Upload',
            'email' => 'Email Verification',
            'manual' => 'Manual Verification',
            default => 'Unknown',
        };
    }

    public function getInstructionsAttribute(): string
    {
        if ($this->verification_instructions) {
            return $this->verification_instructions;
        }

        return match($this->verification_method) {
            'dns_txt' => "Add a TXT record to your domain's DNS settings with name '{$this->dns_record_name}' and value '{$this->verification_value}'",
            'html_meta' => "Add this meta tag to your homepage's HTML: <meta name=\"{$this->meta_tag_name}\" content=\"{$this->meta_tag_content}\">",
            'file_upload' => "Create a file at {$this->file_path} with content: {$this->file_content}",
            'email' => "Check your email at {$this->verification_email} for the verification code",
            'manual' => 'Await manual verification by our team',
            default => 'No instructions available',
        };
    }

    public function getVerificationStatusAttribute(): string
    {
        if ($this->is_verified) {
            return 'Verified';
        } elseif ($this->is_expired) {
            return 'Expired';
        } elseif ($this->status === 'failed') {
            return 'Failed';
        } elseif ($this->attempt_count >= 5) {
            return 'Max Attempts Reached';
        } elseif ($this->last_attempt_at && $this->last_attempt_at->diffInMinutes(now()) < 5) {
            return 'Please Wait';
        } else {
            return 'Pending Verification';
        }
    }

    public function canRetry(): bool
    {
        return $this->status === 'pending' && 
               $this->attempt_count < 5 && 
               (!$this->last_attempt_at || $this->last_attempt_at->diffInMinutes(now()) >= 5);
    }

    public function getRetryWaitTimeAttribute(): int
    {
        if (!$this->last_attempt_at) {
            return 0;
        }

        $waitTime = 5 - $this->last_attempt_at->diffInMinutes(now());
        return max(0, $waitTime);
    }

    // Methods
    public static function generateToken(): string
    {
        return 'securescout-verify=' . Str::random(32);
    }

    public static function generateEmailCode(): string
    {
        return strtoupper(Str::random(8));
    }

    public function initializeVerification(string $method): bool
    {
        $token = self::generateToken();
        
        $this->update([
            'verification_method' => $method,
            'verification_token' => $token,
            'status' => 'pending',
            'attempt_count' => 0,
            'verified_at' => null,
            'expires_at' => now()->addDays(7),
        ]);

        switch ($method) {
            case 'dns_txt':
                $this->setupDnsVerification();
                break;
            case 'html_meta':
                $this->setupHtmlMetaVerification();
                break;
            case 'file_upload':
                $this->setupFileUploadVerification();
                break;
            case 'email':
                $this->setupEmailVerification();
                break;
        }

        return true;
    }

    public function setupDnsVerification(): void
    {
        $this->update([
            'dns_record_name' => '_securescout-verify',
            'dns_record_type' => 'TXT',
            'dns_record_value' => $this->verification_token,
            'verification_value' => $this->verification_token,
            'verification_instructions' => $this->getInstructions(),
        ]);
    }

    public function setupHtmlMetaVerification(): void
    {
        $this->update([
            'meta_tag_name' => 'securescout-verify',
            'meta_tag_content' => $this->verification_token,
            'verification_url' => "https://{$this->domain}",
            'verification_value' => $this->verification_token,
            'verification_instructions' => $this->getInstructions(),
        ]);
    }

    public function setupFileUploadVerification(): void
    {
        $this->update([
            'file_path' => ".well-known/securescout-verify.txt",
            'file_content' => $this->verification_token,
            'verification_value' => $this->verification_token,
            'verification_instructions' => $this->getInstructions(),
        ]);
    }

    public function setupEmailVerification(): void
    {
        $email = "admin@{$this->domain}";
        $code = self::generateEmailCode();

        $this->update([
            'verification_email' => $email,
            'email_code' => $code,
            'verification_value' => $code,
            'verification_instructions' => $this->getInstructions(),
        ]);

        // Send verification email
        $this->sendVerificationEmail();
    }

    public function sendVerificationEmail(): bool
    {
        try {
            // Queue email sending
            \Mail::to($this->verification_email)->send(
                new \App\Mail\DomainVerificationEmail($this)
            );

            $this->update(['email_sent_at' => now()]);
            return true;
        } catch (\Exception $e) {
            \Log::error('Failed to send domain verification email', [
                'verification_id' => $this->id,
                'email' => $this->verification_email,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    public function attemptVerification(): array
    {
        if (!$this->canRetry()) {
            return [
                'success' => false,
                'message' => 'Cannot retry verification. ' . $this->verification_status,
            ];
        }

        $this->increment('attempt_count');
        $this->update(['last_attempt_at' => now()]);

        $result = match($this->verification_method) {
            'dns_txt' => $this->verifyDnsRecord(),
            'html_meta' => $this->verifyHtmlMeta(),
            'file_upload' => $this->verifyFileUpload(),
            'email' => $this->verifyEmailCode(),
            default => ['success' => false, 'message' => 'Unknown verification method'],
        };

        if ($result['success']) {
            $this->update([
                'status' => 'verified',
                'verified_at' => now(),
            ]);

            // Update domain verification status
            if ($this->domain) {
                $this->domain->verify($this->verification_method, $result);
            }
        } elseif ($this->attempt_count >= 5) {
            $this->update(['status' => 'failed']);
        }

        return $result;
    }

    public function verifyDnsRecord(): array
    {
        try {
            $records = dns_get_record($this->domain, DNS_TXT);
            
            foreach ($records as $record) {
                if (isset($record['txt']) && str_contains($record['txt'], $this->verification_token)) {
                    return [
                        'success' => true,
                        'message' => 'DNS TXT record verified successfully',
                        'response' => $record,
                    ];
                }
            }

            return [
                'success' => false,
                'message' => 'DNS TXT record not found or incorrect',
                'response' => $records,
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'DNS lookup failed: ' . $e->getMessage(),
            ];
        }
    }

    public function verifyHtmlMeta(): array
    {
        try {
            $url = "https://{$this->domain}";
            $context = stream_context_create([
                'http' => [
                    'timeout' => 10,
                    'user_agent' => 'SecureScout Pro Verification Bot/1.0',
                ],
            ]);

            $html = file_get_contents($url, false, $context);
            if ($html === false) {
                return [
                    'success' => false,
                    'message' => 'Failed to fetch homepage',
                ];
            }

            $dom = new \DOMDocument();
            @$dom->loadHTML($html);
            $metaTags = $dom->getElementsByTagName('meta');

            foreach ($metaTags as $tag) {
                if ($tag->getAttribute('name') === $this->meta_tag_name &&
                    $tag->getAttribute('content') === $this->meta_tag_content) {
                    return [
                        'success' => true,
                        'message' => 'HTML meta tag verified successfully',
                        'response' => ['tag_found' => true],
                    ];
                }
            }

            return [
                'success' => false,
                'message' => 'HTML meta tag not found or incorrect',
                'response' => ['html_length' => strlen($html)],
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'HTML verification failed: ' . $e->getMessage(),
            ];
        }
    }

    public function verifyFileUpload(): array
    {
        try {
            $url = "https://{$this->domain}/{$this->file_path}";
            $context = stream_context_create([
                'http' => [
                    'timeout' => 10,
                    'user_agent' => 'SecureScout Pro Verification Bot/1.0',
                ],
            ]);

            $content = file_get_contents($url, false, $context);
            if ($content === false) {
                return [
                    'success' => false,
                    'message' => 'Verification file not found',
                ];
            }

            if (trim($content) === $this->file_content) {
                return [
                    'success' => true,
                    'message' => 'Verification file verified successfully',
                    'response' => ['content_match' => true],
                ];
            }

            return [
                'success' => false,
                'message' => 'Verification file content incorrect',
                'response' => ['expected' => $this->file_content, 'found' => trim($content)],
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'File verification failed: ' . $e->getMessage(),
            ];
        }
    }

    public function verifyEmailCode(string $code = null): array
    {
        $providedCode = $code ?? request()->get('verification_code');

        if (!$providedCode) {
            return [
                'success' => false,
                'message' => 'Verification code required',
            ];
        }

        if ($providedCode === $this->email_code) {
            $this->update(['email_verified_at' => now()]);
            return [
                'success' => true,
                'message' => 'Email verification code verified successfully',
                'response' => ['code_verified' => true],
            ];
        }

        return [
            'success' => false,
            'message' => 'Invalid verification code',
        ];
    }

    public function manualVerify(User $verifiedBy, string $notes = null, array $evidence = null): bool
    {
        $this->update([
            'status' => 'verified',
            'verified_at' => now(),
            'verified_by' => $verifiedBy->id,
            'manual_verification_notes' => $notes,
            'manual_verification_evidence' => $evidence,
        ]);

        if ($this->domain) {
            $this->domain->verify('manual', [
                'verified_by' => $verifiedBy->id,
                'notes' => $notes,
                'evidence' => $evidence,
            ]);
        }

        return true;
    }

    public function revoke(): bool
    {
        $this->update([
            'status' => 'revoked',
            'verified_at' => null,
        ]);

        if ($this->domain && $this->domain->verification_status === 'verified') {
            $this->domain->revokeVerification();
        }

        return true;
    }

    public function markSuspicious(string $reason): bool
    {
        $this->update([
            'suspicious_activity' => true,
            'suspicious_activity_reason' => $reason,
        ]);

        // Log suspicious activity
        activity()
            ->causedBy(auth()->user())
            ->performedOn($this)
            ->withProperties([
                'reason' => $reason,
                'ip' => $this->requester_ip,
                'user_agent' => $this->user_agent,
            ])
            ->event('suspicious_activity')
            ->log('Suspicious domain verification activity detected');

        return true;
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
        static::creating(function ($verification) {
            if (!$verification->normalized_domain) {
                $verification->normalized_domain = strtolower($verification->domain);
            }
            if (!$verification->verification_token) {
                $verification->verification_token = self::generateToken();
            }
        });

        static::updated(function ($verification) {
            if ($verification->wasChanged('status')) {
                $verification->addAuditLogEntry('status_changed', [
                    'old_status' => $verification->getOriginal('status'),
                    'new_status' => $verification->status,
                ]);
            }

            if ($verification->wasChanged('suspicious_activity')) {
                $verification->addAuditLogEntry('suspicious_flag', [
                    'suspicious_activity' => $verification->suspicious_activity,
                    'reason' => $verification->suspicious_activity_reason,
                ]);
            }
        });
    }
}
