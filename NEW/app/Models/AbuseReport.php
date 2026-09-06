<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class AbuseReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'reporter_name',
        'reporter_email',
        'reporter_phone',
        'reporter_company',
        'reporter_anonymous',
        'reporter_type',
        'reported_team_id',
        'reported_user_id',
        'reported_domain',
        'reported_ip',
        'reported_activity',
        'category',
        'description',
        'additional_context',
        'severity',
        'immediate_threat',
        'evidence',
        'attachments',
        'incident_timeline',
        'affected_domains',
        'affected_systems',
        'requester_ip',
        'user_agent',
        'request_headers',
        'incident_occurred_at',
        'incident_discovered_at',
        'status',
        'assigned_to',
        'escalated_to',
        'resolution',
        'resolution_type',
        'actions_taken',
        'preventive_measures',
        'law_enforcement_notified',
        'law_enforcement_details',
        'communication_log',
        'last_contact_at',
        'reporter_notified_of_resolution',
        'reporter_notified_at',
        'legal_review_required',
        'legal_reviewed_by',
        'legal_reviewed_at',
        'legal_notes',
        'gdpr_data_subject_request',
        'first_response_due_at',
        'resolution_due_at',
        'first_response_at',
        'resolved_at',
        'response_time_hours',
        'resolution_time_hours',
        'parent_report_id',
        'duplicate_report_ids',
        'related_report_ids',
        'created_by',
        'updated_by',
        'audit_log',
    ];

    protected $casts = [
        'evidence' => 'array',
        'attachments' => 'array',
        'incident_timeline' => 'array',
        'affected_domains' => 'array',
        'affected_systems' => 'array',
        'request_headers' => 'array',
        'actions_taken' => 'array',
        'preventive_measures' => 'array',
        'communication_log' => 'array',
        'duplicate_report_ids' => 'array',
        'related_report_ids' => 'array',
        'audit_log' => 'array',
        'reporter_anonymous' => 'boolean',
        'immediate_threat' => 'boolean',
        'law_enforcement_notified' => 'boolean',
        'legal_review_required' => 'boolean',
        'gdpr_data_subject_request' => 'boolean',
        'reporter_notified_of_resolution' => 'boolean',
        'incident_occurred_at' => 'datetime',
        'incident_discovered_at' => 'datetime',
        'first_response_due_at' => 'datetime',
        'resolution_due_at' => 'datetime',
        'first_response_at' => 'datetime',
        'resolved_at' => 'datetime',
        'last_contact_at' => 'datetime',
        'reporter_notified_at' => 'datetime',
        'legal_reviewed_at' => 'datetime',
    ];

    protected $dates = [
        'incident_occurred_at',
        'incident_discovered_at',
        'first_response_due_at',
        'resolution_due_at',
        'first_response_at',
        'resolved_at',
        'last_contact_at',
        'reporter_notified_at',
        'legal_reviewed_at',
    ];

    // Activity logging
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'category',
                'severity',
                'status',
                'immediate_threat',
                'assigned_to',
                'escalated_to',
                'resolution_type',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->useLogName('abuse_report');
    }

    // Relationships
    public function reportedTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'reported_team_id');
    }

    public function reportedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_user_id');
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function escalatedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'escalated_to');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function legalReviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'legal_reviewed_by');
    }

    public function parentReport(): BelongsTo
    {
        return $this->belongsTo(AbuseReport::class, 'parent_report_id');
    }

    public function duplicateReports(): HasMany
    {
        return $this->hasMany(AbuseReport::class, 'parent_report_id');
    }

    public function relatedReports(): HasMany
    {
        return $this->hasMany(AbuseReport::class, 'parent_report_id');
    }

    // Scopes
    public function scopeByCategory($query, $category)
    {
        return $query->where('category', $category);
    }

    public function scopeBySeverity($query, $severity)
    {
        return $query->where('severity', $severity);
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopeOpen($query)
    {
        return $query->whereIn('status', ['open', 'under_review', 'investigating', 'awaiting_response', 'escalated']);
    }

    public function scopeResolved($query)
    {
        return $query->whereIn('status', ['resolved', 'false_positive', 'duplicate']);
    }

    public function scopeImmediateThreat($query)
    {
        return $query->where('immediate_threat', true);
    }

    public function scopeOverdue($query)
    {
        return $query->where('first_response_due_at', '<', now())
            ->whereNotIn('status', ['resolved', 'false_positive', 'duplicate']);
    }

    public function scopeAssignedTo($query, $userId)
    {
        return $query->where('assigned_to', $userId);
    }

    // Accessors
    public function getStatusBadgeAttribute(): string
    {
        return match($this->status) {
            'open' => 'warning',
            'under_review' => 'info',
            'investigating' => 'primary',
            'awaiting_response' => 'warning',
            'escalated' => 'danger',
            'resolved' => 'success',
            'false_positive' => 'secondary',
            'duplicate' => 'secondary',
            default => 'secondary',
        };
    }

    public function getSeverityBadgeAttribute(): string
    {
        return match($this->severity) {
            'critical' => 'danger',
            'high' => 'warning',
            'medium' => 'info',
            'low' => 'success',
            default => 'secondary',
        };
    }

    public function getCategoryLabelAttribute(): string
    {
        return match($this->category) {
            'unauthorized_scanning' => 'Unauthorized Scanning',
            'domain_monitoring_without_permission' => 'Unauthorized Domain Monitoring',
            'fake_authorization' => 'Fake Authorization',
            'harassment' => 'Harassment',
            'data_privacy_violation' => 'Data Privacy Violation',
            'commercial_exploitation' => 'Commercial Exploitation',
            'legal_violation' => 'Legal Violation',
            'terms_of_service_violation' => 'Terms of Service Violation',
            'other' => 'Other',
            default => 'Unknown',
        };
    }

    public function getReporterTypeLabelAttribute(): string
    {
        return match($this->reporter_type) {
            'domain_owner' => 'Domain Owner',
            'security_professional' => 'Security Professional',
            'law_enforcement' => 'Law Enforcement',
            'concerned_citizen' => 'Concerned Citizen',
            'other' => 'Other',
            default => 'Unknown',
        };
    }

    public function getResolutionTypeLabelAttribute(): string
    {
        return match($this->resolution_type) {
            'account_suspended' => 'Account Suspended',
            'account_terminated' => 'Account Terminated',
            'warning_issued' => 'Warning Issued',
            'domains_removed' => 'Domains Removed',
            'legal_action_taken' => 'Legal Action Taken',
            'no_action_taken' => 'No Action Taken',
            'false_positive' => 'False Positive',
            default => 'Unknown',
        };
    }

    public function getIsOverdueAttribute(): bool
    {
        if (in_array($this->status, ['resolved', 'false_positive', 'duplicate'])) {
            return false;
        }

        return $this->first_response_due_at && $this->first_response_due_at->isPast();
    }

    public function getResponseTimeAttribute(): ?string
    {
        if (!$this->first_response_at || !$this->incident_discovered_at) {
            return null;
        }

        $hours = $this->incident_discovered_at->diffInHours($this->first_response_at);
        return "{$hours} hours";
    }

    public function getResolutionTimeAttribute(): ?string
    {
        if (!$this->resolved_at || !$this->incident_discovered_at) {
            return null;
        }

        $hours = $this->incident_discovered_at->diffInHours($this->resolved_at);
        return "{$hours} hours";
    }

    public function getDaysOpenAttribute(): int
    {
        if ($this->resolved_at) {
            return $this->incident_discovered_at->diffInDays($this->resolved_at);
        }

        return $this->incident_discovered_at->diffInDays(now());
    }

    public function getReporterDisplayAttribute(): string
    {
        if ($this->reporter_anonymous) {
            return 'Anonymous Reporter';
        }

        if ($this->reporter_name) {
            return $this->reporter_name;
        }

        if ($this->reporter_email) {
            return $this->reporter_email;
        }

        return 'Unknown Reporter';
    }

    public function getTargetDisplayAttribute(): string
    {
        if ($this->reported_domain) {
            return $this->reported_domain;
        }

        if ($this->reportedUser) {
            return $this->reportedUser->full_name;
        }

        if ($this->reportedTeam) {
            return $this->reportedTeam->name;
        }

        return 'Unknown Target';
    }

    // Methods
    public function assignTo(User $user): bool
    {
        $this->update([
            'assigned_to' => $user->id,
            'status' => 'under_review',
        ]);

        $this->addCommunicationLogEntry('assigned', [
            'assigned_to' => $user->id,
            'assigned_by' => auth()->id(),
        ]);

        return true;
    }

    public function escalateTo(User $user, string $reason = null): bool
    {
        $this->update([
            'escalated_to' => $user->id,
            'status' => 'escalated',
        ]);

        $this->addCommunicationLogEntry('escalated', [
            'escalated_to' => $user->id,
            'escalated_by' => auth()->id(),
            'reason' => $reason,
        ]);

        return true;
    }

    public function startInvestigation(): bool
    {
        $this->update([
            'status' => 'investigating',
            'first_response_at' => now(),
        ]);

        $this->calculateResponseTime();

        $this->addCommunicationLogEntry('investigation_started', [
            'started_by' => auth()->id(),
        ]);

        return true;
    }

    public function requestResponse(): bool
    {
        $this->update([
            'status' => 'awaiting_response',
        ]);

        $this->addCommunicationLogEntry('response_requested', [
            'requested_by' => auth()->id(),
        ]);

        return true;
    }

    public function resolve(string $resolutionType, string $resolution = null, array $actions = null): bool
    {
        $this->update([
            'status' => 'resolved',
            'resolution_type' => $resolutionType,
            'resolution' => $resolution,
            'actions_taken' => $actions,
            'resolved_at' => now(),
        ]);

        $this->calculateResolutionTime();

        $this->addCommunicationLogEntry('resolved', [
            'resolved_by' => auth()->id(),
            'resolution_type' => $resolutionType,
        ]);

        // Notify reporter if not anonymous
        if (!$this->reporter_anonymous && $this->reporter_email) {
            $this->notifyReporter();
        }

        return true;
    }

    public function markAsFalsePositive(string $reason): bool
    {
        $this->update([
            'status' => 'false_positive',
            'resolution_type' => 'false_positive',
            'resolution' => $reason,
            'resolved_at' => now(),
        ]);

        $this->calculateResolutionTime();

        $this->addCommunicationLogEntry('marked_false_positive', [
            'marked_by' => auth()->id(),
            'reason' => $reason,
        ]);

        return true;
    }

    public function markAsDuplicate(AbuseReport $parentReport): bool
    {
        $this->update([
            'status' => 'duplicate',
            'resolution_type' => 'duplicate',
            'parent_report_id' => $parentReport->id,
            'resolved_at' => now(),
        ]);

        $this->addCommunicationLogEntry('marked_duplicate', [
            'marked_by' => auth()->id(),
            'parent_report_id' => $parentReport->id,
        ]);

        return true;
    }

    public function requireLegalReview(User $reviewedBy = null): bool
    {
        $this->update([
            'legal_review_required' => true,
            'legal_reviewed_by' => $reviewedBy?->id,
        ]);

        $this->addCommunicationLogEntry('legal_review_required', [
            'required_by' => auth()->id(),
            'reviewed_by' => $reviewedBy?->id,
        ]);

        return true;
    }

    public function completeLegalReview(User $reviewedBy, string $notes): bool
    {
        $this->update([
            'legal_reviewed_by' => $reviewedBy->id,
            'legal_reviewed_at' => now(),
            'legal_notes' => $notes,
        ]);

        $this->addCommunicationLogEntry('legal_review_completed', [
            'reviewed_by' => $reviewedBy->id,
            'notes' => $notes,
        ]);

        return true;
    }

    public function notifyLawEnforcement(string $details): bool
    {
        $this->update([
            'law_enforcement_notified' => true,
            'law_enforcement_details' => $details,
        ]);

        $this->addCommunicationLogEntry('law_enforcement_notified', [
            'notified_by' => auth()->id(),
            'details' => $details,
        ]);

        // Send notification to legal team
        // Implementation depends on notification system

        return true;
    }

    public function addCommunicationLogEntry(string $type, array $data = []): void
    {
        $log = $this->communication_log ?? [];
        $log[] = [
            'timestamp' => now()->toISOString(),
            'type' => $type,
            'user_id' => auth()->id(),
            'data' => $data,
        ];

        $this->update([
            'communication_log' => $log,
            'last_contact_at' => now(),
        ]);
    }

    public function addEvidence(array $evidence): void
    {
        $current = $this->evidence ?? [];
        $new = [
            'id' => Str::uuid()->toString(),
            'timestamp' => now()->toISOString(),
            'added_by' => auth()->id(),
            'data' => $evidence,
        ];

        $this->update(['evidence' => array_merge($current, [$new])]);
    }

    public function addAttachment(array $attachment): void
    {
        $current = $this->attachments ?? [];
        $new = [
            'id' => Str::uuid()->toString(),
            'timestamp' => now()->toISOString(),
            'added_by' => auth()->id(),
            'data' => $attachment,
        ];

        $this->update(['attachments' => array_merge($current, [$new])]);
    }

    public function calculateResponseTime(): void
    {
        if ($this->first_response_at && $this->incident_discovered_at) {
            $hours = $this->incident_discovered_at->diffInHours($this->first_response_at);
            $this->update(['response_time_hours' => $hours]);
        }
    }

    public function calculateResolutionTime(): void
    {
        if ($this->resolved_at && $this->incident_discovered_at) {
            $hours = $this->incident_discovered_at->diffInHours($this->resolved_at);
            $this->update(['resolution_time_hours' => $hours]);
        }
    }

    public function notifyReporter(): bool
    {
        if ($this->reporter_anonymous || !$this->reporter_email) {
            return false;
        }

        try {
            \Mail::to($this->reporter_email)->send(
                new \App\Mail\AbuseReportResolution($this)
            );

            $this->update([
                'reporter_notified_of_resolution' => true,
                'reporter_notified_at' => now(),
            ]);

            return true;
        } catch (\Exception $e) {
            \Log::error('Failed to send abuse report resolution email', [
                'report_id' => $this->id,
                'email' => $this->reporter_email,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    public function setDueDates(): void
    {
        $now = now();
        
        // SLA: First response within 24 hours for normal, 4 hours for critical
        $firstResponseHours = $this->severity === 'critical' ? 4 : 24;
        
        // SLA: Resolution within 7 days for normal, 48 hours for critical
        $resolutionHours = $this->severity === 'critical' ? 48 : 168;

        $this->update([
            'first_response_due_at' => $now->addHours($firstResponseHours),
            'resolution_due_at' => $now->addHours($resolutionHours),
        ]);
    }

    // Events
    protected static function booted()
    {
        static::creating(function ($report) {
            $report->setDueDates();
        });

        static::updated(function ($report) {
            if ($report->wasChanged('status')) {
                $report->addAuditLogEntry('status_changed', [
                    'old_status' => $report->getOriginal('status'),
                    'new_status' => $report->status,
                ]);
            }

            if ($report->wasChanged('assigned_to')) {
                $report->addAuditLogEntry('assignment_changed', [
                    'old_assigned_to' => $report->getOriginal('assigned_to'),
                    'new_assigned_to' => $report->assigned_to,
                ]);
            }
        });
    }
}
