<?php

namespace App\Services;

use App\Models\Authorization;
use App\Models\Domain;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Exception;

class AuthorizationManagementService
{
    /**
     * Create new authorization request
     */
    public function createAuthorization(Team $team, array $authorizationData, User $createdBy): Authorization
    {
        try {
            // Validate authorization data
            $this->validateAuthorizationData($authorizationData);

            // Generate authorization ID
            $authorizationId = 'AUTH-' . strtoupper(Str::random(8));

            // Handle document upload
            $documentPath = null;
            $documentHash = null;
            if (isset($authorizationData['document'])) {
                $documentPath = $this->storeAuthorizationDocument($authorizationData['document'], $authorizationId);
                $documentHash = hash_file('sha256', Storage::disk('secure')->path($documentPath));
            }

            // Create authorization record
            $authorization = Authorization::create([
                'team_id' => $team->id,
                'target_id' => $authorizationData['target_id'] ?? null,
                'target_type' => $authorizationData['target_type'] ?? 'domain',
                'authorization_type' => $authorizationData['authorization_type'],
                'client_name' => $authorizationData['client_name'],
                'client_email' => $authorizationData['client_email'],
                'client_phone' => $authorizationData['client_phone'] ?? null,
                'project_name' => $authorizationData['project_name'],
                'project_description' => $authorizationData['project_description'],
                'document_path' => $documentPath,
                'document_hash' => $documentHash,
                'document_size' => $documentPath ? Storage::disk('secure')->size($documentPath) : null,
                'document_metadata' => $authorizationData['document_metadata'] ?? null,
                'scope_definition' => $authorizationData['scope_definition'],
                'out_of_scope' => $authorizationData['out_of_scope'] ?? [],
                'testing_methods' => $authorizationData['testing_methods'] ?? [],
                'restrictions' => $authorizationData['restrictions'] ?? [],
                'start_date' => $authorizationData['start_date'],
                'end_date' => $authorizationData['end_date'],
                'starts_at' => $authorizationData['start_date'] . ' 00:00:00',
                'expires_at' => $authorizationData['end_date'] . ' 23:59:59',
                'is_active' => false,
                'auto_renew' => $authorizationData['auto_renew'] ?? false,
                'status' => 'pending',
                'terms_signed' => false,
                'liability_waiver_signed' => false,
                'confidentiality_agreement_signed' => false,
                'technical_contact_email' => $authorizationData['technical_contact_email'] ?? $authorizationData['client_email'],
                'legal_contact_email' => $authorizationData['legal_contact_email'] ?? $authorizationData['client_email'],
                'emergency_contact_email' => $authorizationData['emergency_contact_email'] ?? $authorizationData['client_email'],
                'notification_preferences' => $authorizationData['notification_preferences'] ?? [],
                'created_by' => $createdBy->id,
            ]);

            // Send notifications
            $this->sendAuthorizationNotifications($authorization);

            Log::info('Authorization request created', [
                'authorization_id' => $authorization->id,
                'team_id' => $team->id,
                'type' => $authorization->authorization_type,
                'client' => $authorization->client_name,
                'created_by' => $createdBy->id,
            ]);

            return $authorization;

        } catch (Exception $e) {
            Log::error('Failed to create authorization', [
                'team_id' => $team->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            throw new Exception('Failed to create authorization: ' . $e->getMessage());
        }
    }

    /**
     * Validate authorization data
     */
    private function validateAuthorizationData(array $data): void
    {
        $required = [
            'authorization_type',
            'client_name',
            'client_email',
            'project_name',
            'project_description',
            'scope_definition',
            'start_date',
            'end_date',
        ];

        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new Exception("Required field missing: {$field}");
            }
        }

        // Validate email format
        if (!filter_var($data['client_email'], FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Invalid client email format');
        }

        // Validate dates
        $startDate = \Carbon\Carbon::parse($data['start_date']);
        $endDate = \Carbon\Carbon::parse($data['end_date']);
        
        if ($startDate->isPast()) {
            throw new Exception('Start date cannot be in the past');
        }
        
        if ($endDate->isBefore($startDate)) {
            throw new Exception('End date must be after start date');
        }

        // Validate authorization type
        $validTypes = [
            'pentest_contract',
            'bug_bounty',
            'internal_test',
            'law_enforcement',
            'third_party_client',
            'research_project',
        ];

        if (!in_array($data['authorization_type'], $validTypes)) {
            throw new Exception('Invalid authorization type');
        }

        // Validate scope definition
        if (empty($data['scope_definition']['domains']) && 
            empty($data['scope_definition']['ip_ranges'])) {
            throw new Exception('Scope must include at least one domain or IP range');
        }
    }

    /**
     * Store authorization document
     */
    private function storeAuthorizationDocument($document, string $authorizationId): string
    {
        if (is_string($document) && str_starts_with($document, 'data:')) {
            // Handle base64 upload
            $content = base64_decode(str_replace('data:application/pdf;base64,', '', $document));
            $filename = $authorizationId . '_authorization.pdf';
        } elseif (is_uploaded_file($document)) {
            // Handle file upload
            $content = file_get_contents($document);
            $filename = $authorizationId . '_authorization.' . pathinfo($document->getClientOriginalName(), PATHINFO_EXTENSION);
        } else {
            throw new Exception('Invalid document format');
        }

        $path = 'authorizations/' . date('Y/m/d') . '/' . $filename;
        Storage::disk('secure')->put($path, $content);

        return $path;
    }

    /**
     * Send authorization notifications
     */
    private function sendAuthorizationNotifications(Authorization $authorization): void
    {
        try {
            // Notify client
            Mail::to($authorization->client_email)->send(
                new \App\Mail\AuthorizationRequest($authorization)
            );

            // Notify technical contact if different
            if ($authorization->technical_contact_email !== $authorization->client_email) {
                Mail::to($authorization->technical_contact_email)->send(
                    new \App\Mail\AuthorizationRequest($authorization)
                );
            }

            // Notify internal team
            $reviewers = User::whereHas('roles', function ($query) {
                $query->where('name', 'authorization_reviewer');
            })->get();

            foreach ($reviewers as $reviewer) {
                Mail::to($reviewer->email)->send(
                    new \App\Mail\AuthorizationReview($authorization)
                );
            }

        } catch (Exception $e) {
            Log::error('Failed to send authorization notifications', [
                'authorization_id' => $authorization->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Review and approve authorization
     */
    public function reviewAuthorization(Authorization $authorization, User $reviewer, array $reviewData): bool
    {
        try {
            // Check if reviewer has permission
            if (!$reviewer->hasRole('authorization_reviewer')) {
                throw new Exception('User does not have authorization review permissions');
            }

            // Perform compliance checks
            $complianceCheck = $this->performComplianceCheck($authorization);
            
            if (!$complianceCheck['passed']) {
                $authorization->reject($complianceCheck['reason'], $reviewer);
                return false;
            }

            // Approve authorization
            $authorization->approve($reviewer, $reviewData);

            // Send approval notifications
            $this->sendApprovalNotifications($authorization);

            Log::info('Authorization approved', [
                'authorization_id' => $authorization->id,
                'reviewed_by' => $reviewer->id,
                'compliance_check' => $complianceCheck,
            ]);

            return true;

        } catch (Exception $e) {
            Log::error('Authorization review failed', [
                'authorization_id' => $authorization->id,
                'reviewer_id' => $reviewer->id,
                'error' => $e->getMessage(),
            ]);
            
            throw new Exception('Authorization review failed: ' . $e->getMessage());
        }
    }

    /**
     * Perform compliance check
     */
    private function performComplianceCheck(Authorization $authorization): array
    {
        $issues = [];

        // Check document integrity
        if ($authorization->document_path && $authorization->document_hash) {
            $currentHash = hash_file('sha256', Storage::disk('secure')->path($authorization->document_path));
            if (!hash_equals($authorization->document_hash, $currentHash)) {
                $issues[] = 'Document integrity check failed';
            }
        }

        // Check required signatures
        $requiredSignatures = ['terms_signed', 'liability_waiver_signed'];
        foreach ($requiredSignatures as $signature) {
            if (!$authorization->$signature) {
                $issues[] = 'Missing required signature: ' . str_replace('_', ' ', $signature);
            }
        }

        // Check scope validity
        if (!$this->validateScope($authorization->scope_definition)) {
            $issues[] = 'Invalid scope definition';
        }

        // Check client verification
        if (!$this->isClientVerified($authorization)) {
            $issues[] = 'Client verification required';
        }

        // Check for conflicts
        if ($this->hasConflictingAuthorization($authorization)) {
            $issues[] = 'Conflicting authorization exists';
        }

        return [
            'passed' => empty($issues),
            'reason' => implode('; ', $issues),
            'issues' => $issues,
        ];
    }

    /**
     * Validate scope definition
     */
    private function validateScope(array $scope): bool
    {
        if (empty($scope['domains']) && empty($scope['ip_ranges'])) {
            return false;
        }

        // Validate domains
        if (!empty($scope['domains'])) {
            foreach ($scope['domains'] as $domain) {
                if (!filter_var('http://' . $domain, FILTER_VALIDATE_URL)) {
                    return false;
                }
            }
        }

        // Validate IP ranges
        if (!empty($scope['ip_ranges'])) {
            foreach ($scope['ip_ranges'] as $range) {
                if (!$this->isValidIpRange($range)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Check if IP range is valid
     */
    private function isValidIpRange(string $range): bool
    {
        if (filter_var($range, FILTER_VALIDATE_IP)) {
            return true; // Single IP
        }

        if (str_contains($range, '/')) {
            // CIDR notation
            [$ip, $mask] = explode('/', $range);
            return filter_var($ip, FILTER_VALIDATE_IP) && is_numeric($mask) && $mask >= 0 && $mask <= 32;
        }

        if (str_contains($range, '-')) {
            // Range notation
            [$start, $end] = explode('-', $range);
            return filter_var($start, FILTER_VALIDATE_IP) && filter_var($end, FILTER_VALIDATE_IP);
        }

        return false;
    }

    /**
     * Check if client is verified
     */
    private function isClientVerified(Authorization $authorization): bool
    {
        // For internal tests, verification may not be required
        if (in_array($authorization->authorization_type, ['internal_test', 'research_project'])) {
            return true;
        }

        // Check if client email is from verified domain
        $domain = substr(strrchr($authorization->client_email, '@'), 1);
        
        // Check against known corporate domains
        $verifiedDomains = config('authorization.verified_domains', []);
        
        return in_array($domain, $verifiedDomains);
    }

    /**
     * Check for conflicting authorizations
     */
    private function hasConflictingAuthorization(Authorization $authorization): bool
    {
        return Authorization::where('id', '!=', $authorization->id)
            ->where('status', 'approved')
            ->where('is_active', true)
            ->where(function ($query) use ($authorization) {
                $query->where('client_email', $authorization->client_email)
                    ->orWhereJsonContains('scope_definition->domains', $authorization->scope_definition['domains'] ?? []);
            })
            ->where(function ($query) use ($authorization) {
                $query->where('starts_at', '<=', $authorization->ends_at)
                    ->where('expires_at', '>=', $authorization->starts_at);
            })
            ->exists();
    }

    /**
     * Send approval notifications
     */
    private function sendApprovalNotifications(Authorization $authorization): void
    {
        try {
            // Notify client
            Mail::to($authorization->client_email)->send(
                new \App\Mail\AuthorizationApproved($authorization)
            );

            // Notify team members
            $authorization->team->users()->each(function ($user) use ($authorization) {
                if ($user->hasPermissionTo('view_authorizations')) {
                    Mail::to($user->email)->send(
                        new \App\Mail\AuthorizationApproved($authorization)
                    );
                }
            });

        } catch (Exception $e) {
            Log::error('Failed to send approval notifications', [
                'authorization_id' => $authorization->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Revoke authorization
     */
    public function revokeAuthorization(Authorization $authorization, string $reason, User $revokedBy): bool
    {
        try {
            $authorization->update([
                'status' => 'revoked',
                'is_active' => false,
                'rejection_reason' => $reason,
            ]);

            // Revoke authorized domains
            Domain::where('current_authorization_id', $authorization->id)
                ->update([
                    'authorization_status' => 'revoked',
                    'current_authorization_id' => null,
                ]);

            // Send revocation notifications
            $this->sendRevocationNotifications($authorization, $reason);

            Log::info('Authorization revoked', [
                'authorization_id' => $authorization->id,
                'reason' => $reason,
                'revoked_by' => $revokedBy->id,
            ]);

            return true;

        } catch (Exception $e) {
            Log::error('Failed to revoke authorization', [
                'authorization_id' => $authorization->id,
                'error' => $e->getMessage(),
            ]);
            
            return false;
        }
    }

    /**
     * Send revocation notifications
     */
    private function sendRevocationNotifications(Authorization $authorization, string $reason): void
    {
        try {
            // Notify client
            Mail::to($authorization->client_email)->send(
                new \App\Mail\AuthorizationRevoked($authorization, $reason)
            );

            // Notify team members
            $authorization->team->users()->each(function ($user) use ($authorization) {
                if ($user->hasPermissionTo('view_authorizations')) {
                    Mail::to($user->email)->send(
                        new \App\Mail\AuthorizationRevoked($authorization, $reason)
                    );
                }
            });

        } catch (Exception $e) {
            Log::error('Failed to send revocation notifications', [
                'authorization_id' => $authorization->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Get authorization statistics
     */
    public function getAuthorizationStats(Team $team = null): array
    {
        $query = Authorization::query();
        
        if ($team) {
            $query->where('team_id', $team->id);
        }

        $total = $query->count();
        $pending = $query->where('status', 'pending')->count();
        $approved = $query->where('status', 'approved')->count();
        $rejected = $query->where('status', 'rejected')->count();
        $active = $query->where('is_active', true)->count();
        $expired = $query->where('expires_at', '<', now())->count();

        $byType = $query->selectRaw('authorization_type, count(*) as count')
            ->groupBy('authorization_type')
            ->pluck('count', 'authorization_type')
            ->toArray();

        return [
            'total' => $total,
            'pending' => $pending,
            'approved' => $approved,
            'rejected' => $rejected,
            'active' => $active,
            'expired' => $expired,
            'by_type' => $byType,
            'approval_rate' => $total > 0 ? round(($approved / $total) * 100, 2) : 0,
        ];
    }

    /**
     * Check for expiring authorizations
     */
    public function checkExpiringAuthorizations(int $days = 30): array
    {
        $expiring = Authorization::where('status', 'approved')
            ->where('is_active', true)
            ->where('expires_at', '<=', now()->addDays($days))
            ->where('expires_at', '>', now())
            ->whereDoesntHave('notifications', function ($query) {
                $query->where('type', 'expiry_warning')
                    ->where('created_at', '>', now()->subDays(7));
            })
            ->with(['team', 'createdBy'])
            ->get();

        foreach ($expiring as $authorization) {
            $this->sendExpiryWarning($authorization);
        }

        return [
            'count' => $expiring->count(),
            'authorizations' => $expiring,
        ];
    }

    /**
     * Send expiry warning
     */
    private function sendExpiryWarning(Authorization $authorization): void
    {
        try {
            Mail::to($authorization->client_email)->send(
                new \App\Mail\AuthorizationExpiring($authorization)
            );

            // Log notification
            $authorization->notifications()->create([
                'type' => 'expiry_warning',
                'sent_at' => now(),
            ]);

        } catch (Exception $e) {
            Log::error('Failed to send expiry warning', [
                'authorization_id' => $authorization->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Auto-renew expiring authorizations
     */
    public function autoRenewAuthorizations(): array
    {
        $renewed = [];
        $failed = [];

        $authorizations = Authorization::where('status', 'approved')
            ->where('is_active', true)
            ->where('auto_renew', true)
            ->where('expires_at', '<=', now()->addDays(7))
            ->where('expires_at', '>', now())
            ->get();

        foreach ($authorizations as $authorization) {
            try {
                $newExpiry = $authorization->expires_at->addDays(30);
                $authorization->update([
                    'expires_at' => $newExpiry,
                    'end_date' => $newExpiry->toDateString(),
                ]);

                $renewed[] = $authorization->id;

                // Send renewal notification
                Mail::to($authorization->client_email)->send(
                    new \App\Mail\AuthorizationRenewed($authorization)
                );

            } catch (Exception $e) {
                $failed[] = [
                    'authorization_id' => $authorization->id,
                    'error' => $e->getMessage(),
                ];
            }
        }

        Log::info('Authorization auto-renewal completed', [
            'renewed' => count($renewed),
            'failed' => count($failed),
        ]);

        return [
            'renewed' => $renewed,
            'failed' => $failed,
        ];
    }
}
