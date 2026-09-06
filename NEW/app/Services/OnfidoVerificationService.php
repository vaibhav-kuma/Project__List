<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserVerification;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Exception;

class OnfidoVerificationService
{
    private string $apiToken;
    private string $apiUrl;
    private string $workflowId;

    public function __construct()
    {
        $this->apiToken = config('services.onfido.api_token');
        $this->apiUrl = config('services.onfido.api_url', 'https://api.onfido.com/v3.4');
        $this->workflowId = config('services.onfido.workflow_id');
    }

    /**
     * Create a new verification check for a user
     */
    public function createVerification(User $user, array $documentData, array $selfieData = null): UserVerification
    {
        try {
            // Create applicant
            $applicant = $this->createApplicant($user);
            
            // Upload document
            $document = $this->uploadDocument($applicant['id'], $documentData);
            
            // Upload selfie if provided
            $selfie = null;
            if ($selfieData) {
                $selfie = $this->uploadSelfie($applicant['id'], $selfieData);
            }

            // Create verification record
            $verification = UserVerification::create([
                'user_id' => $user->id,
                'verification_type' => 'government_id',
                'provider' => 'onfido',
                'external_id' => $applicant['id'],
                'status' => 'processing',
                'id_type' => $documentData['type'] ?? 'passport',
                'id_country' => $documentData['country'] ?? null,
                'id_document_data' => $document,
                'selfie_path' => $selfie['id'] ?? null,
                'provider_response' => [
                    'applicant_id' => $applicant['id'],
                    'document_id' => $document['id'],
                    'selfie_id' => $selfie['id'] ?? null,
                ],
                'requester_ip' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);

            // Start workflow check
            $this->startWorkflowCheck($applicant['id'], $verification);

            return $verification;

        } catch (Exception $e) {
            Log::error('Onfido verification creation failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            throw new Exception('Failed to create verification: ' . $e->getMessage());
        }
    }

    /**
     * Create an applicant in Onfido
     */
    private function createApplicant(User $user): array
    {
        $response = Http::withToken($this->apiToken)
            ->post($this->apiUrl . '/applicants', [
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'dob' => $user->date_of_birth ?? null, // Optional
                'address' => [
                    'country' => $this->getCountryFromUser($user),
                ],
            ]);

        if (!$response->successful()) {
            throw new Exception('Failed to create applicant: ' . $response->body());
        }

        return $response->json();
    }

    /**
     * Upload identity document
     */
    private function uploadDocument(string $applicantId, array $documentData): array
    {
        $documentPath = $documentData['file_path'];
        $documentType = $documentData['type'] ?? 'passport';
        $country = $documentData['country'] ?? null;

        // Upload file to Onfido
        $response = Http::withToken($this->apiToken)
            ->attach('file', Storage::get($documentPath), basename($documentPath))
            ->post($this->apiUrl . '/documents', [
                'applicant_id' => $applicantId,
                'type' => $documentType,
                'side' => $documentData['side'] ?? 'front',
                'issuing_country' => $country,
            ]);

        if (!$response->successful()) {
            throw new Exception('Failed to upload document: ' . $response->body());
        }

        return $response->json();
    }

    /**
     * Upload selfie for facial recognition
     */
    private function uploadSelfie(string $applicantId, array $selfieData): array
    {
        $selfiePath = $selfieData['file_path'];

        $response = Http::withToken($this->apiToken)
            ->attach('file', Storage::get($selfiePath), basename($selfiePath))
            ->post($this->apiUrl . '/live_photos', [
                'applicant_id' => $applicantId,
            ]);

        if (!$response->successful()) {
            throw new Exception('Failed to upload selfie: ' . $response->body());
        }

        return $response->json();
    }

    /**
     * Start workflow check
     */
    private function startWorkflowCheck(string $applicantId, UserVerification $verification): void
    {
        if (!$this->workflowId) {
            // Fallback to individual checks if no workflow configured
            $this->startDocumentCheck($applicantId, $verification);
            if ($verification->selfie_path) {
                $this->startFacialSimilarityCheck($applicantId, $verification);
            }
            return;
        }

        $response = Http::withToken($this->apiToken)
            ->post($this->apiUrl . '/workflow_runs', [
                'workflow_id' => $this->workflowId,
                'applicant_id' => $applicantId,
            ]);

        if (!$response->successful()) {
            Log::error('Failed to start workflow check', [
                'applicant_id' => $applicantId,
                'response' => $response->body(),
            ]);
            return;
        }

        $workflowRun = $response->json();
        
        // Update verification with workflow run ID
        $verification->update([
            'provider_reference' => $workflowRun['id'],
            'provider_response' => array_merge($verification->provider_response ?? [], [
                'workflow_run_id' => $workflowRun['id'],
            ]),
        ]);
    }

    /**
     * Start document check (fallback method)
     */
    private function startDocumentCheck(string $applicantId, UserVerification $verification): void
    {
        $response = Http::withToken($this->apiToken)
            ->post($this->apiUrl . '/checks', [
                'applicant_id' => $applicantId,
                'check_types' => ['document'],
            ]);

        if (!$response->successful()) {
            Log::error('Failed to start document check', [
                'applicant_id' => $applicantId,
                'response' => $response->body(),
            ]);
            return;
        }

        $check = $response->json();
        
        $verification->update([
            'provider_reference' => $check['id'],
            'provider_response' => array_merge($verification->provider_response ?? [], [
                'document_check_id' => $check['id'],
            ]),
        ]);
    }

    /**
     * Start facial similarity check (fallback method)
     */
    private function startFacialSimilarityCheck(string $applicantId, UserVerification $verification): void
    {
        $response = Http::withToken($this->apiToken)
            ->post($this->apiUrl . '/checks', [
                'applicant_id' => $applicantId,
                'check_types' => ['facial_similarity'],
            ]);

        if (!$response->successful()) {
            Log::error('Failed to start facial similarity check', [
                'applicant_id' => $applicantId,
                'response' => $response->body(),
            ]);
            return;
        }

        $check = $response->json();
        
        $verification->update([
            'provider_response' => array_merge($verification->provider_response ?? [], [
                'facial_similarity_check_id' => $check['id'],
            ]),
        ]);
    }

    /**
     * Check verification status from Onfido
     */
    public function checkVerificationStatus(UserVerification $verification): array
    {
        if (!$verification->provider_reference) {
            return ['status' => 'unknown', 'message' => 'No provider reference'];
        }

        try {
            $response = Http::withToken($this->apiToken)
                ->get($this->apiUrl . '/workflow_runs/' . $verification->provider_reference);

            if (!$response->successful()) {
                // Try individual checks if workflow fails
                return $this->checkIndividualChecks($verification);
            }

            $workflowRun = $response->json();
            
            // Update verification with latest data
            $verification->update([
                'provider_response' => array_merge($verification->provider_response ?? [], [
                    'workflow_run' => $workflowRun,
                ]),
            ]);

            return $this->processWorkflowResult($workflowRun, $verification);

        } catch (Exception $e) {
            Log::error('Failed to check verification status', [
                'verification_id' => $verification->id,
                'error' => $e->getMessage(),
            ]);
            
            return ['status' => 'error', 'message' => $e->getMessage()];
        }
    }

    /**
     * Check individual document and facial similarity checks
     */
    private function checkIndividualChecks(UserVerification $verification): array
    {
        $results = [];
        $overallStatus = 'processing';

        // Check document check
        if (isset($verification->provider_response['document_check_id'])) {
            $docResponse = Http::withToken($this->apiToken)
                ->get($this->apiUrl . '/checks/' . $verification->provider_response['document_check_id']);
            
            if ($docResponse->successful()) {
                $results['document'] = $docResponse->json();
            }
        }

        // Check facial similarity check
        if (isset($verification->provider_response['facial_similarity_check_id'])) {
            $faceResponse = Http::withToken($this->apiToken)
                ->get($this->apiUrl . '/checks/' . $verification->provider_response['facial_similarity_check_id']);
            
            if ($faceResponse->successful()) {
                $results['facial_similarity'] = $faceResponse->json();
                
                // Extract face match score
                if (isset($results['facial_similarity']['result']['face_match']['breakdown']['overall_match'])) {
                    $verification->update([
                        'face_match_score' => $results['facial_similarity']['result']['face_match']['breakdown']['overall_match'],
                    ]);
                }
            }
        }

        // Determine overall status
        foreach ($results as $check) {
            if ($check['status'] === 'completed') {
                if ($check['result'] === 'clear') {
                    $overallStatus = 'verified';
                } elseif ($check['result'] === 'consider') {
                    $overallStatus = 'requires_action';
                } else {
                    $overallStatus = 'rejected';
                }
                break;
            }
        }

        return [
            'status' => $overallStatus,
            'results' => $results,
        ];
    }

    /**
     * Process workflow run result
     */
    private function processWorkflowResult(array $workflowRun, UserVerification $verification): array
    {
        $status = 'processing';
        $result = null;

        switch ($workflowRun['status']) {
            case 'approved':
                $status = 'verified';
                $result = 'clear';
                break;
            case 'rejected':
                $status = 'rejected';
                $result = 'reject';
                break;
            case 'review_needed':
                $status = 'requires_action';
                $result = 'consider';
                break;
            case 'completed':
                // Check overall result
                if (isset($workflowRun['output']['decision'])) {
                    $decision = $workflowRun['output']['decision'];
                    if ($decision === 'approve') {
                        $status = 'verified';
                        $result = 'clear';
                    } elseif ($decision === 'reject') {
                        $status = 'rejected';
                        $result = 'reject';
                    } else {
                        $status = 'requires_action';
                        $result = 'consider';
                    }
                }
                break;
        }

        // Extract face match score if available
        if (isset($workflowRun['output']['facial_similarity_score'])) {
            $verification->update([
                'face_match_score' => $workflowRun['output']['facial_similarity_score'],
            ]);
        }

        // Update verification status
        if ($status === 'verified') {
            $verification->approve();
        } elseif ($status === 'rejected') {
            $rejectionReason = $this->extractRejectionReason($workflowRun);
            $verification->reject($rejectionReason);
        } elseif ($status === 'requires_action') {
            $reason = $this->extractActionReason($workflowRun);
            $verification->markRequiresAction($reason);
        }

        return [
            'status' => $status,
            'result' => $result,
            'workflow_run' => $workflowRun,
        ];
    }

    /**
     * Extract rejection reason from workflow result
     */
    private function extractRejectionReason(array $workflowRun): string
    {
        if (isset($workflowRun['output']['reason'])) {
            return $workflowRun['output']['reason'];
        }

        if (isset($workflowRun['output']['breakdown'])) {
            $reasons = [];
            foreach ($workflowRun['output']['breakdown'] as $check) {
                if (isset($check['result']) && $check['result'] !== 'clear') {
                    $reasons[] = $check['name'] . ': ' . ($check['reason'] ?? 'Failed');
                }
            }
            return implode('; ', $reasons);
        }

        return 'Verification rejected by identity verification service';
    }

    /**
     * Extract action required reason from workflow result
     */
    private function extractActionReason(array $workflowRun): string
    {
        if (isset($workflowRun['output']['reason'])) {
            return $workflowRun['output']['reason'];
        }

        return 'Manual review required for identity verification';
    }

    /**
     * Get country from user data
     */
    private function getCountryFromUser(User $user): string
    {
        // Try to get country from user profile or default to US
        return $user->country ?? 'USA';
    }

    /**
     * Download document from Onfido for evidence
     */
    public function downloadDocument(string $documentId): string
    {
        $response = Http::withToken($this->apiToken)
            ->get($this->apiUrl . '/documents/' . $documentId . '/download');

        if (!$response->successful()) {
            throw new Exception('Failed to download document: ' . $response->body());
        }

        // Store file securely
        $filename = 'onfido_document_' . $documentId . '.jpg';
        $path = 'evidence/documents/' . $filename;
        
        Storage::disk('secure')->put($path, $response->body());
        
        return $path;
    }

    /**
     * Handle webhook from Onfido
     */
    public function handleWebhook(array $payload): bool
    {
        try {
            $event = $payload['payload']['action']['type'] ?? null;
            $workflowRunId = $payload['payload']['action']['object']['id'] ?? null;

            if (!$event || !$workflowRunId) {
                Log::warning('Invalid webhook payload', ['payload' => $payload]);
                return false;
            }

            // Find verification by workflow run ID
            $verification = UserVerification::where('provider_reference', $workflowRunId)
                ->where('provider', 'onfido')
                ->first();

            if (!$verification) {
                Log::warning('Verification not found for webhook', [
                    'workflow_run_id' => $workflowRunId,
                ]);
                return false;
            }

            // Check and update status
            $this->checkVerificationStatus($verification);

            Log::info('Webhook processed successfully', [
                'verification_id' => $verification->id,
                'event' => $event,
            ]);

            return true;

        } catch (Exception $e) {
            Log::error('Webhook processing failed', [
                'error' => $e->getMessage(),
                'payload' => $payload,
            ]);
            return false;
        }
    }

    /**
     * Delete applicant data (for GDPR compliance)
     */
    public function deleteApplicant(string $applicantId): bool
    {
        try {
            $response = Http::withToken($this->apiToken)
                ->delete($this->apiUrl . '/applicants/' . $applicantId);

            return $response->successful();
        } catch (Exception $e) {
            Log::error('Failed to delete applicant', [
                'applicant_id' => $applicantId,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }
}
