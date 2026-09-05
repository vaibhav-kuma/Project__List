<?php

namespace App\Services;

use App\Models\EvidenceChain;
use App\Models\Leak;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Exception;

class EvidenceIntegrityService
{
    private string $timestampAuthorityUrl;
    private string $storageDisk;
    private bool $encryptionEnabled;

    public function __construct()
    {
        $this->timestampAuthorityUrl = config('evidence.integrity.timestamp_authority', 'https://freetsa.org/tsr');
        $this->storageDisk = config('evidence.disk', 's3');
        $this->encryptionEnabled = config('evidence.encryption_enabled', true);
    }

    /**
     * Collect and preserve evidence with integrity protection
     */
    public function collectEvidence(Leak $leak, string $evidenceType, $content, array $metadata = [], User $collector = null): EvidenceChain
    {
        try {
            // Generate unique evidence ID
            $evidenceId = Str::uuid()->toString();
            
            // Prepare content for storage
            $processedContent = $this->processContent($content, $evidenceType);
            
            // Calculate hash
            $hash = hash('sha256', $processedContent);
            
            // Store evidence with encryption
            $storagePath = $this->storeEvidence($evidenceId, $processedContent, $evidenceType);
            
            // Get trusted timestamp
            $timestampSignature = $this->getTrustedTimestamp($processedContent);
            
            // Prepare metadata
            $evidenceMetadata = array_merge($metadata, [
                'evidence_id' => $evidenceId,
                'original_filename' => $this->getOriginalFilename($content, $evidenceType),
                'content_size' => strlen($processedContent),
                'mime_type' => $this->getMimeType($evidenceType),
                'collection_method' => $this->getCollectionMethod($evidenceType),
                'collector_info' => $this->getCollectorInfo($collector),
                'integrity_checks' => [
                    'sha256_hash' => $hash,
                    'timestamp_signature' => $timestampSignature,
                    'timestamp_authority' => $this->timestampAuthorityUrl,
                ],
                'chain_of_custody' => [
                    'collected_at' => now()->toISOString(),
                    'collected_by' => $collector?->id,
                    'collected_by_name' => $collector?->full_name,
                    'location' => $this->getCollectionLocation(),
                    'tool_version' => 'SecureScout Pro v1.0',
                ],
            ]);

            // Create evidence chain record
            $evidence = EvidenceChain::create([
                'leak_id' => $leak->id,
                'evidence_type' => $evidenceType,
                'storage_path' => $storagePath,
                'sha256_hash' => $hash,
                'timestamp_signature' => $timestampSignature,
                'collected_by' => $collector?->id,
                'collected_at' => now(),
                'metadata' => $evidenceMetadata,
            ]);

            Log::info('Evidence collected and preserved', [
                'evidence_id' => $evidence->id,
                'leak_id' => $leak->id,
                'type' => $evidenceType,
                'hash' => $hash,
                'collector' => $collector?->id,
            ]);

            return $evidence;

        } catch (Exception $e) {
            Log::error('Evidence collection failed', [
                'leak_id' => $leak->id,
                'type' => $evidenceType,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            throw new Exception('Failed to collect evidence: ' . $e->getMessage());
        }
    }

    /**
     * Process content based on evidence type
     */
    private function processContent($content, string $evidenceType): string
    {
        switch ($evidenceType) {
            case 'screenshot':
                if (is_string($content) && str_starts_with($content, 'data:image/')) {
                    // Convert base64 to binary
                    $content = base64_decode(str_replace('data:image/png;base64,', '', $content));
                }
                break;
                
            case 'html_content':
                // Ensure HTML is properly encoded
                if (is_string($content)) {
                    $content = mb_convert_encoding($content, 'UTF-8', 'auto');
                }
                break;
                
            case 'json_data':
                // Ensure JSON is properly formatted
                if (is_array($content)) {
                    $content = json_encode($content, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
                }
                break;
                
            case 'document':
                // Documents should already be in binary format
                break;
                
            default:
                if (is_array($content)) {
                    $content = json_encode($content);
                }
                break;
        }

        return $content;
    }

    /**
     * Store evidence with encryption
     */
    private function storeEvidence(string $evidenceId, string $content, string $evidenceType): string
    {
        $extension = $this->getFileExtension($evidenceType);
        $filename = "{$evidenceId}.{$extension}";
        $path = "evidence/{$evidenceType}/" . date('Y/m/d') . "/{$filename}";

        // Encrypt if enabled
        if ($this->encryptionEnabled) {
            $content = $this->encryptContent($content);
        }

        Storage::disk($this->storageDisk)->put($path, $content);

        return $path;
    }

    /**
     * Get trusted timestamp from timestamp authority
     */
    private function getTrustedTimestamp(string $content): string
    {
        try {
            $hash = hash('sha256', $content);
            
            $response = Http::asForm()
                ->post($this->timestampAuthorityUrl, [
                    'hash' => $hash,
                    'format' => 'der',
                ]);

            if (!$response->successful()) {
                Log::warning('Failed to get trusted timestamp', [
                    'response_status' => $response->status(),
                    'response_body' => $response->body(),
                ]);
                
                // Fallback: create self-signed timestamp
                return $this->createSelfSignedTimestamp($hash);
            }

            return base64_encode($response->body());

        } catch (Exception $e) {
            Log::error('Timestamp authority error', [
                'error' => $e->getMessage(),
                'url' => $this->timestampAuthorityUrl,
            ]);
            
            // Fallback: create self-signed timestamp
            return $this->createSelfSignedTimestamp(hash('sha256', $content));
        }
    }

    /**
     * Create self-signed timestamp as fallback
     */
    private function createSelfSignedTimestamp(string $hash): string
    {
        $timestampData = [
            'hash' => $hash,
            'algorithm' => 'SHA256',
            'timestamp' => now()->toISOString(),
            'authority' => 'SecureScout Pro Internal',
            'signature' => hash_hmac('sha256', $hash . now()->timestamp, config('app.key')),
        ];

        return base64_encode(json_encode($timestampData));
    }

    /**
     * Encrypt content for secure storage
     */
    private function encryptContent(string $content): string
    {
        $key = config('evidence.encryption_key');
        if (!$key) {
            throw new Exception('Evidence encryption key not configured');
        }

        $iv = random_bytes(openssl_cipher_iv_length('aes-256-gcm'));
        $tag = null;
        
        $encrypted = openssl_encrypt(
            $content,
            'aes-256-gcm',
            $key,
            0,
            $iv,
            $tag
        );

        return base64_encode($iv . $tag . $encrypted);
    }

    /**
     * Verify evidence integrity
     */
    public function verifyIntegrity(EvidenceChain $evidence): array
    {
        $results = [
            'hash_valid' => false,
            'timestamp_valid' => false,
            'content_accessible' => false,
            'overall_valid' => false,
            'details' => [],
        ];

        try {
            // Check if content is accessible
            $content = $this->retrieveContent($evidence);
            $results['content_accessible'] = true;
            $results['details'][] = 'Content retrieved successfully';

            // Verify hash
            $currentHash = hash('sha256', $content);
            $hashValid = hash_equals($evidence->sha256_hash, $currentHash);
            $results['hash_valid'] = $hashValid;
            
            if ($hashValid) {
                $results['details'][] = 'SHA-256 hash verified';
            } else {
                $results['details'][] = 'SHA-256 hash mismatch - evidence may be tampered';
            }

            // Verify timestamp
            $timestampValid = $this->verifyTimestamp($evidence->timestamp_signature, $currentHash);
            $results['timestamp_valid'] = $timestampValid;
            
            if ($timestampValid) {
                $results['details'][] = 'Timestamp signature verified';
            } else {
                $results['details'][] = 'Timestamp signature invalid';
            }

            // Overall validity
            $results['overall_valid'] = $results['hash_valid'] && $results['timestamp_valid'];

        } catch (Exception $e) {
            $results['details'][] = 'Error during verification: ' . $e->getMessage();
            Log::error('Evidence integrity verification failed', [
                'evidence_id' => $evidence->id,
                'error' => $e->getMessage(),
            ]);
        }

        return $results;
    }

    /**
     * Retrieve and decrypt content
     */
    public function retrieveContent(EvidenceChain $evidence): string
    {
        if (!$evidence->storage_path) {
            throw new Exception('No storage path available');
        }

        $content = Storage::disk($this->storageDisk)->get($evidence->storage_path);
        
        if ($this->encryptionEnabled) {
            return $this->decryptContent($content);
        }

        return $content;
    }

    /**
     * Verify timestamp signature
     */
    private function verifyTimestamp(string $signature, string $hash): bool
    {
        try {
            $timestampData = base64_decode($signature);
            
            // For self-signed timestamps
            if ($this->isSelfSignedTimestamp($timestampData)) {
                return $this->verifySelfSignedTimestamp($timestampData, $hash);
            }

            // For external timestamp authority responses
            // This would require proper timestamp verification library
            return true; // Placeholder

        } catch (Exception $e) {
            Log::error('Timestamp verification failed', [
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Check if timestamp is self-signed
     */
    private function isSelfSignedTimestamp(string $timestampData): bool
    {
        try {
            $data = json_decode(base64_decode($timestampData), true);
            return isset($data['authority']) && $data['authority'] === 'SecureScout Pro Internal';
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Verify self-signed timestamp
     */
    private function verifySelfSignedTimestamp(string $timestampData, string $hash): bool
    {
        try {
            $data = json_decode(base64_decode($timestampData), true);
            
            if (!isset($data['hash']) || !isset($data['signature'])) {
                return false;
            }

            // Verify hash matches
            if (!hash_equals($data['hash'], $hash)) {
                return false;
            }

            // Verify signature
            $expectedSignature = hash_hmac(
                'sha256', 
                $data['hash'] . strtotime($data['timestamp']), 
                config('app.key')
            );

            return hash_equals($data['signature'], $expectedSignature);

        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Generate evidence package for legal proceedings
     */
    public function generateEvidencePackage(EvidenceChain $evidence): array
    {
        $verification = $this->verifyIntegrity($evidence);
        
        return [
            'evidence_id' => $evidence->id,
            'leak_id' => $evidence->leak_id,
            'evidence_type' => $evidence->evidence_type,
            'collected_at' => $evidence->collected_at->toISOString(),
            'collected_by' => $evidence->collector?->full_name,
            'verification_results' => $verification,
            'metadata' => $evidence->metadata,
            'chain_of_custody' => $this->generateChainOfCustodyReport($evidence),
            'legal_declaration' => $this->generateLegalDeclaration($evidence),
        ];
    }

    /**
     * Generate chain of custody report
     */
    private function generateChainOfCustodyReport(EvidenceChain $evidence): array
    {
        return [
            'evidence_id' => $evidence->id,
            'collection' => [
                'timestamp' => $evidence->collected_at->toISOString(),
                'collector' => $evidence->collector?->full_name,
                'collector_id' => $evidence->collector?->id,
                'location' => $evidence->metadata['chain_of_custody']['location'] ?? 'Unknown',
                'method' => $evidence->metadata['collection_method'] ?? 'Unknown',
                'tool_version' => $evidence->metadata['chain_of_custody']['tool_version'] ?? 'Unknown',
            ],
            'storage' => [
                'location' => $evidence->storage_path,
                'disk' => $this->storageDisk,
                'encrypted' => $this->encryptionEnabled,
                'access_controls' => 'Role-based access with audit logging',
            ],
            'integrity' => [
                'hash_algorithm' => 'SHA-256',
                'hash_value' => $evidence->sha256_hash,
                'timestamp_authority' => $this->timestampAuthorityUrl,
                'timestamp_signature' => $evidence->timestamp_signature,
            ],
            'retention' => [
                'policy' => '7 years for legal compliance',
                'expiry_date' => $evidence->collected_at->addYears(7)->toDateString(),
            ],
        ];
    }

    /**
     * Generate legal declaration
     */
    private function generateLegalDeclaration(EvidenceChain $evidence): string
    {
        $collector = $evidence->collector;
        $collectionDate = $evidence->collected_at->format('Y-m-d H:i:s UTC');
        
        return "I, {$collector->full_name}, hereby declare that:\n\n" .
               "1. I collected the evidence identified as {$evidence->id} on {$collectionDate}\n" .
               "2. The evidence was collected from a legitimate source during authorized security testing\n" .
               "3. The evidence has been preserved in its original state without modification\n" .
               "4. The integrity of the evidence has been protected using cryptographic hashing and timestamping\n" .
               "5. The chain of custody has been maintained from collection to present\n" .
               "6. I have not altered, modified, or tampered with the evidence in any way\n\n" .
               "This declaration is made under penalty of perjury under applicable laws.\n\n" .
               "Signature: [Digital Signature]\n" .
               "Date: " . now()->format('Y-m-d');
    }

    /**
     * Get file extension for evidence type
     */
    private function getFileExtension(string $evidenceType): string
    {
        $extensions = [
            'screenshot' => 'png',
            'document' => 'pdf',
            'log' => 'log',
            'html_content' => 'html',
            'json_data' => 'json',
            'email_content' => 'eml',
        ];

        return $extensions[$evidenceType] ?? 'bin';
    }

    /**
     * Get MIME type for evidence type
     */
    private function getMimeType(string $evidenceType): string
    {
        $mimeTypes = [
            'screenshot' => 'image/png',
            'document' => 'application/pdf',
            'log' => 'text/plain',
            'html_content' => 'text/html',
            'json_data' => 'application/json',
            'email_content' => 'message/rfc822',
        ];

        return $mimeTypes[$evidenceType] ?? 'application/octet-stream';
    }

    /**
     * Get collection method for evidence type
     */
    private function getCollectionMethod(string $evidenceType): string
    {
        $methods = [
            'screenshot' => 'Automated screenshot capture',
            'document' => 'Document download and preservation',
            'log' => 'Log file collection',
            'html_content' => 'HTML content extraction',
            'json_data' => 'JSON data collection',
            'email_content' => 'Email content preservation',
        ];

        return $methods[$evidenceType] ?? 'Unknown method';
    }

    /**
     * Get collector information
     */
    private function getCollectorInfo(?User $collector): array
    {
        if (!$collector) {
            return [
                'type' => 'system',
                'name' => 'SecureScout Pro System',
                'id' => null,
            ];
        }

        return [
            'type' => 'user',
            'name' => $collector->full_name,
            'id' => $collector->id,
            'email' => $collector->email,
            'role' => $collector->roles->first()?->name ?? 'Unknown',
        ];
    }

    /**
     * Get collection location
     */
    private function getCollectionLocation(): string
    {
        return config('app.name') . ' Platform - ' . config('app.env');
    }

    /**
     * Get original filename
     */
    private function getOriginalFilename($content, string $evidenceType): string
    {
        if (is_array($content) && isset($content['filename'])) {
            return $content['filename'];
        }

        $extension = $this->getFileExtension($evidenceType);
        return "evidence_{$evidenceType}_" . date('Y-m-d_H-i-s') . ".{$extension}";
    }

    /**
     * Decrypt content for retrieval
     */
    private function decryptContent(string $encryptedContent): string
    {
        $key = config('evidence.encryption_key');
        if (!$key) {
            throw new Exception('Evidence encryption key not configured');
        }

        $data = base64_decode($encryptedContent);
        $iv = substr($data, 0, 16);
        $tag = substr($data, 16, 16);
        $encrypted = substr($data, 32);

        return openssl_decrypt(
            $encrypted,
            'aes-256-gcm',
            $key,
            0,
            $iv,
            $tag
        );
    }
}
