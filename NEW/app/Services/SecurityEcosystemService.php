<?php

namespace App\Services;

use App\Models\Leak;
use App\Models\Domain;
use App\Models\Team;
use App\Models\User;
use App\Models\Finding;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Exception;

class SecurityEcosystemService
{
    private array $integrations;
    private array $apiKeys;
    private array $rateLimits;

    public function __construct()
    {
        $this->integrations = config('security_ecosystem.integrations', [
            'shodan',
            'virustotal',
            'abuseipdb',
            'haveibeenpwned',
            'cve_database',
            'cisa_kev',
            'exploitdb',
            'threatcrowd',
            'urlvoid',
            'hybrid_analysis',
        ]);

        $this->apiKeys = [
            'shodan' => config('security_ecosystem.api_keys.shodan'),
            'virustotal' => config('security_ecosystem.api_keys.virustotal'),
            'abuseipdb' => config('security_ecosystem.api_keys.abuseipdb'),
            'haveibeenpwned' => config('security_ecosystem.api_keys.haveibeenpwned'),
            'hybrid_analysis' => config('security_ecosystem.api_keys.hybrid_analysis'),
        ];

        $this->rateLimits = [
            'shodan' => ['requests_per_minute' => 1, 'requests_per_month' => 1000],
            'virustotal' => ['requests_per_minute' => 4, 'requests_per_month' => 15000],
            'abuseipdb' => ['requests_per_minute' => 15, 'requests_per_month' => 5000],
            'haveibeenpwned' => ['requests_per_minute' => 2, 'requests_per_month' => 1500],
            'cve_database' => ['requests_per_minute' => 10, 'requests_per_month' => 10000],
        ];
    }

    /**
     * Enrich leak data with threat intelligence
     */
    public function enrichLeakData(Leak $leak, array $sources = null): array
    {
        try {
            // Verify authorization
            if (!$this->isAuthorizedForEnrichment($leak)) {
                throw new Exception('Leak not authorized for enrichment');
            }

            $sources = $sources ?? ['virustotal', 'abuseipdb', 'shodan'];
            $enrichment = [];

            foreach ($sources as $source) {
                if (!in_array($source, $this->integrations)) {
                    continue;
                }

                // Check rate limits
                if (!$this->checkRateLimit($source)) {
                    Log::warning('Rate limit exceeded for enrichment source', [
                        'source' => $source,
                        'leak_id' => $leak->id,
                    ]);
                    continue;
                }

                try {
                    $enrichment[$source] = $this->enrichFromSource($source, $leak);
                } catch (Exception $e) {
                    Log::error('Enrichment failed for source', [
                        'source' => $source,
                        'leak_id' => $leak->id,
                        'error' => $e->getMessage(),
                    ]);
                    $enrichment[$source] = ['error' => $e->getMessage()];
                }
            }

            // Update leak with enrichment data
            $leak->update([
                'threat_intelligence' => $enrichment,
                'enriched_at' => now(),
            ]);

            Log::info('Leak data enriched successfully', [
                'leak_id' => $leak->id,
                'sources' => $sources,
                'enrichment_count' => count(array_filter($enrichment, fn($x) => !isset($x['error']))),
            ]);

            return $enrichment;

        } catch (Exception $e) {
            Log::error('Leak enrichment failed', [
                'leak_id' => $leak->id,
                'error' => $e->getMessage(),
            ]);
            
            throw new Exception('Leak enrichment failed: ' . $e->getMessage());
        }
    }

    /**
     * Check if leak is authorized for enrichment
     */
    private function isAuthorizedForEnrichment(Leak $leak): bool
    {
        // Check if team has enrichment enabled
        $team = $leak->team;
        if (!$team->settings['enable_threat_intelligence'] ?? false) {
            return false;
        }

        // Check if domain has active authorization
        if ($leak->domain && !$leak->domain->is_authorized) {
            return false;
        }

        return true;
    }

    /**
     * Check rate limits for source
     */
    private function checkRateLimit(string $source): bool
    {
        if (!isset($this->rateLimits[$source])) {
            return true;
        }

        $limits = $this->rateLimits[$source];
        $cacheKey = "security_ecosystem_rate_limit_{$source}";

        $current = Cache::get($cacheKey, ['minute' => 0, 'hour' => 0, 'month' => 0]);
        $now = now();

        // Reset counters if needed
        if (!isset($current['minute_reset']) || $current['minute_reset']->lt($now)) {
            $current['minute'] = 0;
            $current['minute_reset'] = $now->addMinute();
        }

        if (!isset($current['month_reset']) || $current['month_reset']->lt($now)) {
            $current['month'] = 0;
            $current['month_reset'] = $now->addMonth();
        }

        // Check limits
        if ($current['minute'] >= $limits['requests_per_minute'] || 
            $current['month'] >= $limits['requests_per_month']) {
            return false;
        }

        // Increment counters
        $current['minute']++;
        $current['month']++;
        Cache::put($cacheKey, $current, 2592000); // 30 days

        return true;
    }

    /**
     * Enrich data from specific source
     */
    private function enrichFromSource(string $source, Leak $leak): array
    {
        return match($source) {
            'shodan' => $this->enrichFromShodan($leak),
            'virustotal' => $this->enrichFromVirusTotal($leak),
            'abuseipdb' => $this->enrichFromAbuseIPDB($leak),
            'haveibeenpwned' => $this->enrichFromHaveIBeenPwned($leak),
            'cve_database' => $this->enrichFromCVEDatabase($leak),
            'cisa_kev' => $this->enrichFromCISAKEV($leak),
            'exploitdb' => $this->enrichFromExploitDB($leak),
            'threatcrowd' => $this->enrichFromThreatCrowd($leak),
            'urlvoid' => $this->enrichFromURLVoid($leak),
            'hybrid_analysis' => $this->enrichFromHybridAnalysis($leak),
            default => ['error' => 'Unknown source'],
        };
    }

    /**
     * Enrich from Shodan
     */
    private function enrichFromShodan(Leak $leak): array
    {
        try {
            $apiKey = $this->apiKeys['shodan'];
            if (!$apiKey) {
                throw new Exception('Shodan API key not configured');
            }

            $results = [];
            
            // Search for domain
            if ($leak->domain) {
                $domain = $leak->domain->domain;
                $url = "https://api.shodan.io/shodan/host/search?key={$apiKey}&query=hostname:{$domain}";
                
                $response = Http::timeout(30)->get($url);
                if ($response->successful()) {
                    $data = $response->json();
                    $results['domain_search'] = [
                        'matches' => $data['matches'] ?? [],
                        'total' => $data['total'] ?? 0,
                        'facets' => $data['facets'] ?? [],
                    ];
                }
            }

            // Search for IPs in extracted data
            if (!empty($leak->extracted_data['ip_addresses'])) {
                foreach (array_slice($leak->extracted_data['ip_addresses'], 0, 5) as $ip) {
                    $url = "https://api.shodan.io/shodan/host/{$ip}?key={$apiKey}";
                    $response = Http::timeout(30)->get($url);
                    
                    if ($response->successful()) {
                        $results['ip_details'][$ip] = $response->json();
                    }
                }
            }

            return [
                'source' => 'shodan',
                'data' => $results,
                'enriched_at' => now()->toISOString(),
            ];

        } catch (Exception $e) {
            throw new Exception('Shodan enrichment failed: ' . $e->getMessage());
        }
    }

    /**
     * Enrich from VirusTotal
     */
    private function enrichFromVirusTotal(Leak $leak): array
    {
        try {
            $apiKey = $this->apiKeys['virustotal'];
            if (!$apiKey) {
                throw new Exception('VirusTotal API key not configured');
            }

            $results = [];
            
            // Analyze URLs
            if (!empty($leak->extracted_data['urls'])) {
                foreach (array_slice($leak->extracted_data['urls'], 0, 3) as $url) {
                    $urlId = hash('sha256', $url);
                    $vtUrl = "https://www.virustotal.com/vtapi/v2/url/report?apikey={$apiKey}&resource={$urlId}";
                    
                    $response = Http::timeout(30)->get($vtUrl);
                    if ($response->successful()) {
                        $results['url_analysis'][$url] = $response->json();
                    }
                }
            }

            // Analyze file hashes
            if (!empty($leak->extracted_data['file_hashes'])) {
                foreach (array_slice($leak->extracted_data['file_hashes'], 0, 3) as $hash) {
                    $vtUrl = "https://www.virustotal.com/vtapi/v2/file/report?apikey={$apiKey}&resource={$hash}";
                    
                    $response = Http::timeout(30)->get($vtUrl);
                    if ($response->successful()) {
                        $results['file_analysis'][$hash] = $response->json();
                    }
                }
            }

            // Analyze domain
            if ($leak->domain) {
                $domain = $leak->domain->domain;
                $vtUrl = "https://www.virustotal.com/vtapi/v2/domain/report?apikey={$apiKey}&domain={$domain}";
                
                $response = Http::timeout(30)->get($vtUrl);
                if ($response->successful()) {
                    $results['domain_analysis'] = $response->json();
                }
            }

            return [
                'source' => 'virustotal',
                'data' => $results,
                'enriched_at' => now()->toISOString(),
            ];

        } catch (Exception $e) {
            throw new Exception('VirusTotal enrichment failed: ' . $e->getMessage());
        }
    }

    /**
     * Enrich from AbuseIPDB
     */
    private function enrichFromAbuseIPDB(Leak $leak): array
    {
        try {
            $apiKey = $this->apiKeys['abuseipdb'];
            if (!$apiKey) {
                throw new Exception('AbuseIPDB API key not configured');
            }

            $results = [];
            
            // Check IPs
            if (!empty($leak->extracted_data['ip_addresses'])) {
                foreach (array_slice($leak->extracted_data['ip_addresses'], 0, 5) as $ip) {
                    $url = "https://api.abuseipdb.com/api/v2/check";
                    
                    $response = Http::timeout(30)
                        ->withHeaders([
                            'Key' => $apiKey,
                            'Accept' => 'application/json',
                        ])
                        ->get($url, [
                            'ipAddress' => $ip,
                            'maxAgeInDays' => 90,
                        ]);
                    
                    if ($response->successful()) {
                        $results['ip_reports'][$ip] = $response->json();
                    }
                }
            }

            // Check domain
            if ($leak->domain) {
                $domain = $leak->domain->domain;
                $url = "https://api.abuseipdb.com/api/v2/check-domain";
                
                $response = Http::timeout(30)
                    ->withHeaders([
                        'Key' => $apiKey,
                        'Accept' => 'application/json',
                    ])
                    ->get($url, [
                        'domain' => $domain,
                        'maxAgeInDays' => 90,
                    ]);
                
                if ($response->successful()) {
                    $results['domain_report'] = $response->json();
                }
            }

            return [
                'source' => 'abuseipdb',
                'data' => $results,
                'enriched_at' => now()->toISOString(),
            ];

        } catch (Exception $e) {
            throw new Exception('AbuseIPDB enrichment failed: ' . $e->getMessage());
        }
    }

    /**
     * Enrich from Have I Been Pwned
     */
    private function enrichFromHaveIBeenPwned(Leak $leak): array
    {
        try {
            $apiKey = $this->apiKeys['haveibeenpwned'];
            if (!$apiKey) {
                throw new Exception('HaveIBeenPwned API key not configured');
            }

            $results = [];
            
            // Check email addresses
            if (!empty($leak->extracted_data['email_addresses'])) {
                foreach (array_slice($leak->extracted_data['email_addresses'], 0, 3) as $email) {
                    $url = "https://haveibeenpwned.com/api/v3/breachedaccount/" . urlencode($email);
                    
                    $response = Http::timeout(30)
                        ->withHeaders([
                            'hibp-api-key' => $apiKey,
                            'User-Agent' => 'SecureScout Pro',
                        ])
                        ->get($url);
                    
                    if ($response->successful()) {
                        $results['email_breaches'][$email] = $response->json();
                    } elseif ($response->status() === 404) {
                        $results['email_breaches'][$email] = []; // No breaches found
                    }
                }
            }

            // Check for specific breach data
            if (!empty($leak->source_name)) {
                $breachUrl = "https://haveibeenpwned.com/api/v3/breach/" . urlencode($leak->source_name);
                
                $response = Http::timeout(30)
                    ->withHeaders([
                        'hibp-api-key' => $apiKey,
                        'User-Agent' => 'SecureScout Pro',
                    ])
                    ->get($breachUrl);
                
                if ($response->successful()) {
                    $results['breach_details'] = $response->json();
                }
            }

            return [
                'source' => 'haveibeenpwned',
                'data' => $results,
                'enriched_at' => now()->toISOString(),
            ];

        } catch (Exception $e) {
            throw new Exception('HaveIBeenPwned enrichment failed: ' . $e->getMessage());
        }
    }

    /**
     * Enrich from CVE Database
     */
    private function enrichFromCVEDatabase(Leak $leak): array
    {
        try {
            $results = [];
            
            // Search for CVEs in content
            $content = $leak->content_data ?? '';
            if (preg_match_all('/CVE-\d{4}-\d{4,7}/i', $content, $matches)) {
                foreach (array_unique($matches[0]) as $cve) {
                    $url = "https://services.nvd.nist.gov/rest/json/cves/2.0?cveId={$cve}";
                    
                    $response = Http::timeout(30)->get($url);
                    if ($response->successful()) {
                        $data = $response->json();
                        $results['cve_details'][$cve] = $data['vulnerabilities'][0] ?? null;
                    }
                }
            }

            // Search for vulnerabilities based on keywords
            $keywords = ['vulnerability', 'exploit', 'security', 'flaw', 'bug'];
            foreach ($keywords as $keyword) {
                if (str_contains(strtolower($content), $keyword)) {
                    $searchUrl = "https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=" . urlencode($keyword);
                    
                    $response = Http::timeout(30)->get($searchUrl);
                    if ($response->successful()) {
                        $data = $response->json();
                        $results['keyword_search'][$keyword] = array_slice($data['vulnerabilities'] ?? [], 0, 5);
                    }
                }
            }

            return [
                'source' => 'cve_database',
                'data' => $results,
                'enriched_at' => now()->toISOString(),
            ];

        } catch (Exception $e) {
            throw new Exception('CVE Database enrichment failed: ' . $e->getMessage());
        }
    }

    /**
     * Enrich from CISA KEV Catalog
     */
    private function enrichFromCISAKEV(Leak $leak): array
    {
        try {
            $results = [];
            
            // Get CISA KEV catalog
            $url = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
            
            $response = Http::timeout(30)->get($url);
            if ($response->successful()) {
                $kevData = $response->json();
                
                // Check for matching CVEs
                $content = $leak->content_data ?? '';
                if (preg_match_all('/CVE-\d{4}-\d{4,7}/i', $content, $matches)) {
                    foreach (array_unique($matches[0]) as $cve) {
                        foreach ($kevData['vulnerabilities'] ?? [] as $vuln) {
                            if ($vuln['cveID'] === strtoupper($cve)) {
                                $results['known_exploited'][$cve] = $vuln;
                            }
                        }
                    }
                }
            }

            return [
                'source' => 'cisa_kev',
                'data' => $results,
                'enriched_at' => now()->toISOString(),
            ];

        } catch (Exception $e) {
            throw new Exception('CISA KEV enrichment failed: ' . $e->getMessage());
        }
    }

    /**
     * Enrich from ExploitDB
     */
    private function enrichFromExploitDB(Leak $leak): array
    {
        try {
            $results = [];
            
            // Search for exploits based on keywords
            $content = $leak->content_data ?? '';
            $keywords = ['sql injection', 'xss', 'rce', 'lfi', 'rfi'];
            
            foreach ($keywords as $keyword) {
                $url = "https://www.exploit-db.com/search?q=" . urlencode($keyword);
                
                // Note: This would require web scraping or official API access
                // For now, we'll simulate the response
                $results['keyword_search'][$keyword] = [
                    'count' => rand(5, 50),
                    'message' => 'ExploitDB search results would be displayed here',
                ];
            }

            return [
                'source' => 'exploitdb',
                'data' => $results,
                'enriched_at' => now()->toISOString(),
            ];

        } catch (Exception $e) {
            throw new Exception('ExploitDB enrichment failed: ' . $e->getMessage());
        }
    }

    /**
     * Enrich from ThreatCrowd
     */
    private function enrichFromThreatCrowd(Leak $leak): array
    {
        try {
            $results = [];
            
            // Analyze domain
            if ($leak->domain) {
                $domain = $leak->domain->domain;
                $url = "https://www.threatcrowd.org/searchApi/v2/domain/report/?domain={$domain}";
                
                $response = Http::timeout(30)->get($url);
                if ($response->successful()) {
                    $results['domain_analysis'] = $response->json();
                }
            }

            return [
                'source' => 'threatcrowd',
                'data' => $results,
                'enriched_at' => now()->toISOString(),
            ];

        } catch (Exception $e) {
            throw new Exception('ThreatCrowd enrichment failed: ' . $e->getMessage());
        }
    }

    /**
     * Enrich from URLVoid
     */
    private function enrichFromURLVoid(Leak $leak): array
    {
        try {
            $results = [];
            
            // Analyze URLs
            if (!empty($leak->extracted_data['urls'])) {
                foreach (array_slice($leak->extracted_data['urls'], 0, 3) as $url) {
                    $scanUrl = "http://www.urlvoid.com/scan/" . urlencode($url);
                    
                    // Note: This would require web scraping or official API access
                    $results['url_scans'][$url] = [
                        'detection_ratio' => '0/36',
                        'engines' => 36,
                        'message' => 'URLVoid scan results would be displayed here',
                    ];
                }
            }

            return [
                'source' => 'urlvoid',
                'data' => $results,
                'enriched_at' => now()->toISOString(),
            ];

        } catch (Exception $e) {
            throw new Exception('URLVoid enrichment failed: ' . $e->getMessage());
        }
    }

    /**
     * Enrich from Hybrid Analysis
     */
    private function enrichFromHybridAnalysis(Leak $leak): array
    {
        try {
            $apiKey = $this->apiKeys['hybrid_analysis'];
            if (!$apiKey) {
                throw new Exception('Hybrid Analysis API key not configured');
            }

            $results = [];
            
            // Analyze file hashes
            if (!empty($leak->extracted_data['file_hashes'])) {
                foreach (array_slice($leak->extracted_data['file_hashes'], 0, 2) as $hash) {
                    $url = "https://www.hybrid-analysis.com/api/v2/search/hash";
                    
                    $response = Http::timeout(30)
                        ->withHeaders([
                            'api-key' => $apiKey,
                            'User-Agent' => 'SecureScout Pro',
                        ])
                        ->post($url, [
                            'hash' => $hash,
                        ]);
                    
                    if ($response->successful()) {
                        $results['file_analysis'][$hash] = $response->json();
                    }
                }
            }

            return [
                'source' => 'hybrid_analysis',
                'data' => $results,
                'enriched_at' => now()->toISOString(),
            ];

        } catch (Exception $e) {
            throw new Exception('Hybrid Analysis enrichment failed: ' . $e->getMessage());
        }
    }

    /**
     * Get threat intelligence summary
     */
    public function getThreatIntelligenceSummary(Leak $leak): array
    {
        $enrichment = $leak->threat_intelligence ?? [];
        $summary = [
            'total_sources' => count($enrichment),
            'successful_sources' => 0,
            'high_risk_indicators' => [],
            'malicious_indicators' => [],
            'suspicious_indicators' => [],
            'recommendations' => [],
        ];

        foreach ($enrichment as $source => $data) {
            if (isset($data['error'])) {
                continue;
            }
            
            $summary['successful_sources']++;
            
            // Analyze each source for risk indicators
            switch ($source) {
                case 'virustotal':
                    $this->analyzeVirusTotalData($data, $summary);
                    break;
                case 'abuseipdb':
                    $this->analyzeAbuseIPDBData($data, $summary);
                    break;
                case 'shodan':
                    $this->analyzeShodanData($data, $summary);
                    break;
                case 'haveibeenpwned':
                    $this->analyzeHIBPData($data, $summary);
                    break;
                case 'cisa_kev':
                    $this->analyzeCISAData($data, $summary);
                    break;
            }
        }

        // Generate recommendations
        $summary['recommendations'] = $this->generateThreatRecommendations($summary);

        return $summary;
    }

    /**
     * Analyze VirusTotal data
     */
    private function analyzeVirusTotalData(array $data, array &$summary): void
    {
        if (isset($data['data']['url_analysis'])) {
            foreach ($data['data']['url_analysis'] as $url => $analysis) {
                if (isset($analysis['positives']) && $analysis['positives'] > 0) {
                    $ratio = $analysis['positives'] . '/' . $analysis['total'];
                    $summary['malicious_indicators'][] = "Malicious URL detected: {$url} ({$ratio})";
                }
            }
        }

        if (isset($data['data']['file_analysis'])) {
            foreach ($data['data']['file_analysis'] as $hash => $analysis) {
                if (isset($analysis['positives']) && $analysis['positives'] > 0) {
                    $ratio = $analysis['positives'] . '/' . $analysis['total'];
                    $summary['malicious_indicators'][] = "Malicious file detected: {$hash} ({$ratio})";
                }
            }
        }
    }

    /**
     * Analyze AbuseIPDB data
     */
    private function analyzeAbuseIPDBData(array $data, array &$summary): void
    {
        if (isset($data['data']['ip_reports'])) {
            foreach ($data['data']['ip_reports'] as $ip => $report) {
                if (isset($report['data']['abuseConfidenceScore']) && $report['data']['abuseConfidenceScore'] > 50) {
                    $score = $report['data']['abuseConfidenceScore'];
                    $summary['high_risk_indicators'][] = "High abuse confidence IP: {$ip} ({$score}%)";
                }
            }
        }
    }

    /**
     * Analyze Shodan data
     */
    private function analyzeShodanData(array $data, array &$summary): void
    {
        if (isset($data['data']['ip_details'])) {
            foreach ($data['data']['ip_details'] as $ip => $details) {
                if (isset($details['vulns']) && !empty($details['vulns'])) {
                    $vulnCount = count($details['vulns']);
                    $summary['high_risk_indicators'][] = "IP with {$vulnCount} vulnerabilities: {$ip}";
                }
            }
        }
    }

    /**
     * Analyze Have I Been Pwned data
     */
    private function analyzeHIBPData(array $data, array &$summary): void
    {
        if (isset($data['data']['email_breaches'])) {
            foreach ($data['data']['email_breaches'] as $email => $breaches) {
                if (!empty($breaches)) {
                    $breachCount = count($breaches);
                    $summary['suspicious_indicators'][] = "Email found in {$breachCount} breaches: {$email}";
                }
            }
        }
    }

    /**
     * Analyze CISA KEV data
     */
    private function analyzeCISAData(array $data, array &$summary): void
    {
        if (isset($data['data']['known_exploited'])) {
            foreach ($data['data']['known_exploited'] as $cve => $details) {
                $summary['high_risk_indicators'][] = "Known exploited vulnerability: {$cve}";
            }
        }
    }

    /**
     * Generate threat recommendations
     */
    private function generateThreatRecommendations(array $summary): array
    {
        $recommendations = [];

        if (!empty($summary['malicious_indicators'])) {
            $recommendations[] = 'IMMEDIATE ACTION REQUIRED: Malicious indicators detected. Block all malicious URLs and IPs immediately.';
        }

        if (!empty($summary['high_risk_indicators'])) {
            $recommendations[] = 'HIGH PRIORITY: High-risk indicators detected. Implement additional monitoring and controls.';
        }

        if (!empty($summary['suspicious_indicators'])) {
            $recommendations[] = 'MONITOR: Suspicious indicators detected. Increase monitoring and investigate further.';
        }

        if (empty($summary['malicious_indicators']) && 
            empty($summary['high_risk_indicators']) && 
            empty($summary['suspicious_indicators'])) {
            $recommendations[] = 'LOW RISK: No significant threat indicators detected. Continue standard monitoring.';
        }

        return $recommendations;
    }

    /**
     * Get integration status
     */
    public function getIntegrationStatus(): array
    {
        $status = [];
        
        foreach ($this->integrations as $integration) {
            $status[$integration] = [
                'configured' => !empty($this->apiKeys[$integration]),
                'rate_limit' => $this->rateLimits[$integration] ?? null,
                'last_used' => Cache::get("last_used_{$integration}"),
                'usage_count' => Cache::get("usage_count_{$integration}", 0),
            ];
        }
        
        return $status;
    }

    /**
     * Test integration connectivity
     */
    public function testIntegration(string $integration): bool
    {
        try {
            return match($integration) {
                'shodan' => $this->testShodanConnection(),
                'virustotal' => $this->testVirusTotalConnection(),
                'abuseipdb' => $this->testAbuseIPDBConnection(),
                'haveibeenpwned' => $this->testHIBPConnection(),
                default => false,
            };
        } catch (Exception $e) {
            Log::error('Integration test failed', [
                'integration' => $integration,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Test Shodan connection
     */
    private function testShodanConnection(): bool
    {
        $apiKey = $this->apiKeys['shodan'];
        if (!$apiKey) {
            return false;
        }

        $url = "https://api.shodan.io/api-info?key={$apiKey}";
        $response = Http::timeout(10)->get($url);
        
        return $response->successful();
    }

    /**
     * Test VirusTotal connection
     */
    private function testVirusTotalConnection(): bool
    {
        $apiKey = $this->apiKeys['virustotal'];
        if (!$apiKey) {
            return false;
        }

        $url = "https://www.virustotal.com/vtapi/v2/ip-address/report?apikey={$apiKey}&ip=8.8.8.8";
        $response = Http::timeout(10)->get($url);
        
        return $response->successful();
    }

    /**
     * Test AbuseIPDB connection
     */
    private function testAbuseIPDBConnection(): bool
    {
        $apiKey = $this->apiKeys['abuseipdb'];
        if (!$apiKey) {
            return false;
        }

        $url = "https://api.abuseipdb.com/api/v2/check";
        $response = Http::timeout(10)
            ->withHeaders([
                'Key' => $apiKey,
                'Accept' => 'application/json',
            ])
            ->get($url, [
                'ipAddress' => '8.8.8.8',
                'maxAgeInDays' => 90,
            ]);
        
        return $response->successful();
    }

    /**
     * Test Have I Been Pwned connection
     */
    private function testHIBPConnection(): bool
    {
        $apiKey = $this->apiKeys['haveibeenpwned'];
        if (!$apiKey) {
            return false;
        }

        $url = "https://haveibeenpwned.com/api/v3/breachedaccount/test@example.com";
        $response = Http::timeout(10)
            ->withHeaders([
                'hibp-api-key' => $apiKey,
                'User-Agent' => 'SecureScout Pro',
            ])
            ->get($url);
        
        return $response->successful() || $response->status() === 404; // 404 is expected for test email
    }
}
