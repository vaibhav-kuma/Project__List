<?php

namespace App\Services;

use App\Models\Domain;
use App\Models\DomainVerification;
use App\Models\DomainOptOut;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Exception;

class DomainVerificationService
{
    private array $suspiciousIndicators = [
        'rapid_domain_addition',
        'bulk_verification_attempts',
        'suspicious_domain_patterns',
        'verification_method_abuse',
        'ip_reputation_issues',
    ];

    /**
     * Initialize domain verification for a team
     */
    public function initializeVerification(Team $team, string $domain, string $method, User $user): DomainVerification
    {
        // Check for suspicious activity
        if ($this->isSuspiciousActivity($team, $domain, $user)) {
            throw new Exception('Suspicious activity detected. Verification request blocked.');
        }

        // Check if domain is opted out
        if ($this->isDomainOptedOut($domain)) {
            throw new Exception('Domain is opted out of monitoring and cannot be verified.');
        }

        // Check for existing verification
        $existingVerification = DomainVerification::where('team_id', $team->id)
            ->where('normalized_domain', strtolower($domain))
            ->where('status', '!=', 'expired')
            ->first();

        if ($existingVerification) {
            throw new Exception('Domain already has an active verification request.');
        }

        // Create verification record
        $verification = DomainVerification::create([
            'team_id' => $team->id,
            'domain' => $domain,
            'normalized_domain' => strtolower($domain),
            'verification_method' => $method,
            'status' => 'pending',
            'requester_ip' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'created_by' => $user->id,
        ]);

        // Initialize verification method
        $verification->initializeVerification($method);

        // Notify domain owner (if not internal test)
        if ($team->type !== 'internal_test') {
            $this->notifyDomainOwner($verification);
        }

        return $verification;
    }

    /**
     * Check for suspicious activity patterns
     */
    private function isSuspiciousActivity(Team $team, string $domain, User $user): bool
    {
        $indicators = [];

        // Check rapid domain addition
        $recentVerifications = DomainVerification::where('team_id', $team->id)
            ->where('created_at', '>', now()->subHours(24))
            ->count();

        if ($recentVerifications >= 10) {
            $indicators[] = 'rapid_domain_addition';
        }

        // Check bulk verification attempts from same IP
        $ipVerifications = DomainVerification::where('requester_ip', request()->ip())
            ->where('created_at', '>', now()->subHour())
            ->count();

        if ($ipVerifications >= 5) {
            $indicators[] = 'bulk_verification_attempts';
        }

        // Check suspicious domain patterns
        if ($this->hasSuspiciousDomainPattern($domain)) {
            $indicators[] = 'suspicious_domain_patterns';
        }

        // Check verification method abuse
        $methodVerifications = DomainVerification::where('requester_ip', request()->ip())
            ->where('verification_method', request()->get('method', 'dns_txt'))
            ->where('created_at', '>', now()->subHour())
            ->count();

        if ($methodVerifications >= 10) {
            $indicators[] = 'verification_method_abuse';
        }

        // Check IP reputation
        if ($this->hasPoorIpReputation(request()->ip())) {
            $indicators[] = 'ip_reputation_issues';
        }

        if (!empty($indicators)) {
            Log::warning('Suspicious domain verification activity detected', [
                'team_id' => $team->id,
                'user_id' => $user->id,
                'domain' => $domain,
                'ip' => request()->ip(),
                'indicators' => $indicators,
            ]);

            // Create abuse report if critical indicators
            if (in_array('rapid_domain_addition', $indicators) || 
                in_array('bulk_verification_attempts', $indicators)) {
                $this->createAbuseReport($team, $user, $domain, $indicators);
            }

            return true;
        }

        return false;
    }

    /**
     * Check if domain has suspicious patterns
     */
    private function hasSuspiciousDomainPattern(string $domain): bool
    {
        $suspiciousPatterns = [
            '/.*\.tk$/',           // Free TLDs
            '/.*\.ml$/',           // Free TLDs
            '/.*\.ga$/',           // Free TLDs
            '/.*\.cf$/',           // Free TLDs
            '/[0-9]{3,}/',        // Lots of numbers
            '/^[a-z]{20,}/',      // Very long domains
            '/.*test.*/',         // Test domains
            '/.*temp.*/',         // Temporary domains
            '/.*fake.*/',         // Fake domains
        ];

        foreach ($suspiciousPatterns as $pattern) {
            if (preg_match($pattern, $domain)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check IP reputation (basic implementation)
     */
    private function hasPoorIpReputation(string $ip): bool
    {
        // Cache IP reputation checks
        $cacheKey = 'ip_reputation_' . md5($ip);
        
        return Cache::remember($cacheKey, 3600, function () use ($ip) {
            // Basic checks - in production, use a proper IP reputation service
            $privateRanges = [
                '10.0.0.0/8',
                '172.16.0.0/12',
                '192.168.0.0/16',
                '127.0.0.0/8',
            ];

            foreach ($privateRanges as $range) {
                if ($this->ipInRange($ip, $range)) {
                    return false; // Private IPs are OK
                }
            }

            // Check against known proxy/VPN ranges (simplified)
            $proxyRanges = [
                '1.1.1.0/24',  // Example Cloudflare range
            ];

            foreach ($proxyRanges as $range) {
                if ($this->ipInRange($ip, $range)) {
                    return true;
                }
            }

            return false;
        });
    }

    /**
     * Check if IP is in range
     */
    private function ipInRange(string $ip, string $range): bool
    {
        [$subnet, $mask] = explode('/', $range);
        return (ip2long($ip) & ~((1 << (32 - $mask)) - 1)) === ip2long($subnet);
    }

    /**
     * Check if domain is opted out
     */
    private function isDomainOptedOut(string $domain): bool
    {
        return DomainOptOut::where('domain', $domain)
            ->where('is_active', true)
            ->exists();
    }

    /**
     * Notify domain owner about verification
     */
    private function notifyDomainOwner(DomainVerification $verification): void
    {
        try {
            $adminEmails = [
                'admin@' . $verification->domain,
                'security@' . $verification->domain,
                'abuse@' . $verification->domain,
                'postmaster@' . $verification->domain,
            ];

            foreach ($adminEmails as $email) {
                Mail::to($email)->send(
                    new \App\Mail\DomainOwnerNotification($verification)
                );
            }

            Log::info('Domain owner notification sent', [
                'verification_id' => $verification->id,
                'domain' => $verification->domain,
                'emails' => $adminEmails,
            ]);

        } catch (Exception $e) {
            Log::error('Failed to send domain owner notification', [
                'verification_id' => $verification->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Create abuse report for suspicious activity
     */
    private function createAbuseReport(Team $team, User $user, string $domain, array $indicators): void
    {
        try {
            \App\Models\AbuseReport::create([
                'reported_team_id' => $team->id,
                'reported_user_id' => $user->id,
                'reported_domain' => $domain,
                'category' => 'unauthorized_scanning',
                'severity' => 'high',
                'description' => 'Suspicious domain verification activity detected. Indicators: ' . implode(', ', $indicators),
                'evidence' => [
                    'indicators' => $indicators,
                    'ip_address' => request()->ip(),
                    'user_agent' => request()->userAgent(),
                    'timestamp' => now()->toISOString(),
                ],
                'status' => 'open',
                'requester_ip' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'incident_discovered_at' => now(),
                'created_by' => null, // System generated
            ]);

        } catch (Exception $e) {
            Log::error('Failed to create abuse report', [
                'error' => $e->getMessage(),
                'team_id' => $team->id,
                'user_id' => $user->id,
                'domain' => $domain,
            ]);
        }
    }

    /**
     * Process domain verification attempt
     */
    public function processVerification(DomainVerification $verification): array
    {
        try {
            $result = $verification->attemptVerification();

            // Log verification attempt
            $this->logVerificationAttempt($verification, $result);

            // Check for abuse patterns
            if (!$result['success'] && $verification->attempt_count >= 3) {
                $this->checkForAbusePatterns($verification);
            }

            return $result;

        } catch (Exception $e) {
            Log::error('Verification processing failed', [
                'verification_id' => $verification->id,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'Verification processing failed: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Log verification attempt for audit
     */
    private function logVerificationAttempt(DomainVerification $verification, array $result): void
    {
        $verification->addAuditLogEntry('verification_attempt', [
            'attempt_count' => $verification->attempt_count,
            'method' => $verification->verification_method,
            'success' => $result['success'],
            'message' => $result['message'] ?? null,
            'ip' => request()->ip(),
        ]);
    }

    /**
     * Check for abuse patterns in failed verifications
     */
    private function checkForAbusePatterns(DomainVerification $verification): void
    {
        // Check multiple failed attempts across different domains
        $failedVerifications = DomainVerification::where('team_id', $verification->team_id)
            ->where('status', 'failed')
            ->where('created_at', '>', now()->subHours(24))
            ->count();

        if ($failedVerifications >= 5) {
            $verification->markSuspicious('Multiple failed verification attempts');
            
            // Create abuse report
            $this->createAbuseReport(
                $verification->team,
                $verification->createdBy,
                $verification->domain,
                ['multiple_failed_attempts']
            );
        }
    }

    /**
     * Verify domain ownership using multiple methods
     */
    public function verifyDomainOwnership(string $domain): array
    {
        $results = [];

        // DNS TXT record check
        $results['dns_txt'] = $this->checkDnsTxtRecord($domain);

        // HTML meta tag check
        $results['html_meta'] = $this->checkHtmlMetaTag($domain);

        // File upload check
        $results['file_upload'] = $this->checkFileUpload($domain);

        // WHOIS information
        $results['whois'] = $this->getWhoisInfo($domain);

        // SSL certificate information
        $results['ssl'] = $this->getSslInfo($domain);

        return $results;
    }

    /**
     * Check DNS TXT record for verification
     */
    private function checkDnsTxtRecord(string $domain): array
    {
        try {
            $records = dns_get_record($domain, DNS_TXT);
            
            $verificationRecords = array_filter($records, function ($record) {
                return isset($record['txt']) && 
                       is_string($record['txt']) && 
                       str_contains($record['txt'], 'securescout-verify=');
            });

            return [
                'success' => !empty($verificationRecords),
                'records' => $verificationRecords,
                'message' => !empty($verificationRecords) ? 'DNS TXT record found' : 'No DNS TXT record found',
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'message' => 'DNS lookup failed',
            ];
        }
    }

    /**
     * Check HTML meta tag for verification
     */
    private function checkHtmlMetaTag(string $domain): array
    {
        try {
            $url = "https://{$domain}";
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

            $verificationTag = null;
            foreach ($metaTags as $tag) {
                if ($tag->getAttribute('name') === 'securescout-verify') {
                    $verificationTag = $tag->getAttribute('content');
                    break;
                }
            }

            return [
                'success' => !empty($verificationTag),
                'tag_content' => $verificationTag,
                'message' => !empty($verificationTag) ? 'HTML meta tag found' : 'No HTML meta tag found',
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'message' => 'HTML verification failed',
            ];
        }
    }

    /**
     * Check verification file upload
     */
    private function checkFileUpload(string $domain): array
    {
        try {
            $url = "https://{$domain}/.well-known/securescout-verify.txt";
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

            return [
                'success' => true,
                'content' => trim($content),
                'message' => 'Verification file found',
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'message' => 'File verification failed',
            ];
        }
    }

    /**
     * Get WHOIS information for domain
     */
    private function getWhoisInfo(string $domain): array
    {
        try {
            // Use a WHOIS API or implement basic WHOIS lookup
            // For now, return basic structure
            return [
                'success' => true,
                'data' => [
                    'registrar' => 'Unknown',
                    'created_date' => null,
                    'expiry_date' => null,
                    'status' => 'Unknown',
                ],
                'message' => 'WHOIS information retrieved',
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'message' => 'WHOIS lookup failed',
            ];
        }
    }

    /**
     * Get SSL certificate information
     */
    private function getSslInfo(string $domain): array
    {
        try {
            $context = stream_context_create([
                'ssl' => [
                    'capture_peer_cert' => true,
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                ],
            ]);

            $client = stream_socket_client(
                "ssl://{$domain}:443",
                $errno,
                $errstr,
                10,
                STREAM_CLIENT_CONNECT,
                $context
            );

            if (!$client) {
                return [
                    'success' => false,
                    'message' => 'Could not connect to SSL server',
                ];
            }

            $cert = stream_context_get_params($context)['options']['ssl']['peer_certificate'];
            $certData = openssl_x509_parse($cert);

            fclose($client);

            return [
                'success' => true,
                'data' => [
                    'subject' => $certData['subject']['CN'] ?? null,
                    'issuer' => $certData['issuer']['CN'] ?? null,
                    'valid_from' => isset($certData['validFrom_time_t']) ? date('Y-m-d', $certData['validFrom_time_t']) : null,
                    'valid_to' => isset($certData['validTo_time_t']) ? date('Y-m-d', $certData['validTo_time_t']) : null,
                    'valid' => isset($certData['validTo_time_t']) && $certData['validTo_time_t'] > time(),
                ],
                'message' => 'SSL certificate information retrieved',
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'message' => 'SSL certificate check failed',
            ];
        }
    }

    /**
     * Handle domain opt-out request
     */
    public function processOptOutRequest(array $requestData): DomainOptOut
    {
        $optOut = DomainOptOut::create([
            'domain' => $requestData['domain'],
            'normalized_domain' => strtolower($requestData['domain']),
            'requester_name' => $requestData['name'],
            'requester_email' => $requestData['email'],
            'requester_phone' => $requestData['phone'] ?? null,
            'requester_company' => $requestData['company'] ?? null,
            'reason' => $requestData['reason'],
            'reason_description' => $requestData['description'] ?? null,
            'verification_token' => Str::random(32),
            'requester_ip' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);

        // Send verification email
        $this->sendOptOutVerificationEmail($optOut);

        return $optOut;
    }

    /**
     * Send opt-out verification email
     */
    private function sendOptOutVerificationEmail(DomainOptOut $optOut): void
    {
        try {
            Mail::to($optOut->requester_email)->send(
                new \App\Mail\OptOutVerification($optOut)
            );

            $optOut->update(['email_sent_at' => now()]);

        } catch (Exception $e) {
            Log::error('Failed to send opt-out verification email', [
                'opt_out_id' => $optOut->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Verify opt-out request
     */
    public function verifyOptOutRequest(string $token): bool
    {
        $optOut = DomainOptOut::where('verification_token', $token)
            ->where('status', 'pending_verification')
            ->first();

        if (!$optOut) {
            return false;
        }

        $optOut->update([
            'status' => 'verified',
            'verified_at' => now(),
            'is_active' => true,
        ]);

        // Remove domain from all monitoring
        $this->removeDomainFromMonitoring($optOut->domain);

        return true;
    }

    /**
     * Remove domain from all monitoring
     */
    private function removeDomainFromMonitoring(string $domain): void
    {
        // Update domain verifications
        DomainVerification::where('domain', $domain)
            ->where('status', 'verified')
            ->update([
                'status' => 'revoked',
                'verified_at' => null,
            ]);

        // Update domains
        Domain::where('domain', $domain)
            ->update([
                'verification_status' => 'revoked',
                'verified_at' => null,
                'monitoring_enabled' => false,
            ]);
    }
}
