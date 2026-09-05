<?php

namespace App\Services;

use App\Models\Leak;
use App\Models\Domain;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Exception;

class OSINTCollectionService
{
    private array $legalSources;
    private array $rateLimits;
    private string $userAgent;

    public function __construct()
    {
        $this->legalSources = config('osint.legal_sources', [
            'crtsh',
            'wayback_machine',
            'github_search',
            'linkedin_public',
            'news_articles',
            'public_records',
            'social_media_public',
            'company_websites',
            'job_postings',
            'patent_databases',
        ]);

        $this->rateLimits = config('osint.rate_limits', [
            'crtsh' => ['requests_per_minute' => 10, 'requests_per_hour' => 100],
            'wayback_machine' => ['requests_per_minute' => 5, 'requests_per_hour' => 50],
            'github_search' => ['requests_per_minute' => 30, 'requests_per_hour' => 1000],
            'linkedin_public' => ['requests_per_minute' => 10, 'requests_per_hour' => 100],
            'news_articles' => ['requests_per_minute' => 20, 'requests_per_hour' => 500],
        ]);

        $this->userAgent = 'SecureScout Pro OSINT Collector v1.0 - Legal Research Only';
    }

    /**
     * Collect OSINT data for authorized domains
     */
    public function collectOSINT(Domain $domain, array $sources = null, User $collector = null): array
    {
        try {
            // Verify authorization
            if (!$this->isAuthorizedForOSINT($domain)) {
                throw new Exception('Domain not authorized for OSINT collection');
            }

            $sources = $sources ?? array_keys($this->legalSources);
            $results = [];

            foreach ($sources as $source) {
                if (!in_array($source, $this->legalSources)) {
                    Log::warning('Illegal OSINT source attempted', [
                        'source' => $source,
                        'domain' => $domain->domain,
                        'user' => $collector?->id,
                    ]);
                    continue;
                }

                // Check rate limits
                if (!$this->checkRateLimit($source)) {
                    Log::warning('Rate limit exceeded for OSINT source', [
                        'source' => $source,
                        'domain' => $domain->domain,
                    ]);
                    continue;
                }

                try {
                    $results[$source] = $this->collectFromSource($source, $domain);
                } catch (Exception $e) {
                    Log::error('OSINT collection failed for source', [
                        'source' => $source,
                        'domain' => $domain->domain,
                        'error' => $e->getMessage(),
                    ]);
                    $results[$source] = ['error' => $e->getMessage()];
                }
            }

            // Create leak record if relevant data found
            if ($this->hasRelevantData($results)) {
                $this->createLeakRecord($domain, $results, $collector);
            }

            Log::info('OSINT collection completed', [
                'domain' => $domain->domain,
                'sources' => $sources,
                'collector' => $collector?->id,
                'data_points' => count($results),
            ]);

            return $results;

        } catch (Exception $e) {
            Log::error('OSINT collection failed', [
                'domain' => $domain->domain,
                'error' => $e->getMessage(),
            ]);
            
            throw new Exception('OSINT collection failed: ' . $e->getMessage());
        }
    }

    /**
     * Check if domain is authorized for OSINT collection
     */
    private function isAuthorizedForOSINT(Domain $domain): bool
    {
        // Check if domain has active authorization
        if (!$domain->current_authorization_id || !$domain->is_authorized) {
            return false;
        }

        // Check if authorization includes OSINT
        $authorization = $domain->currentAuthorization;
        if (!$authorization || !$authorization->is_active) {
            return false;
        }

        // Check if OSINT is in testing methods
        $testingMethods = $authorization->testing_methods ?? [];
        if (!in_array('osint_collection', $testingMethods) && !in_array('all', $testingMethods)) {
            return false;
        }

        // Check if domain is in scope
        if (!$authorization->isInScope($domain->domain)) {
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
        $cacheKey = "osint_rate_limit_{$source}";

        $current = Cache::get($cacheKey, ['minute' => 0, 'hour' => 0]);
        $now = now();

        // Reset counters if needed
        if (!isset($current['minute_reset']) || $current['minute_reset']->lt($now)) {
            $current['minute'] = 0;
            $current['minute_reset'] = $now->addMinute();
        }

        if (!isset($current['hour_reset']) || $current['hour_reset']->lt($now)) {
            $current['hour'] = 0;
            $current['hour_reset'] = $now->addHour();
        }

        // Check limits
        if ($current['minute'] >= $limits['requests_per_minute'] || 
            $current['hour'] >= $limits['requests_per_hour']) {
            return false;
        }

        // Increment counters
        $current['minute']++;
        $current['hour']++;
        Cache::put($cacheKey, $current, 3600);

        return true;
    }

    /**
     * Collect data from specific source
     */
    private function collectFromSource(string $source, Domain $domain): array
    {
        return match($source) {
            'crtsh' => $this->collectFromCrtSh($domain),
            'wayback_machine' => $this->collectFromWaybackMachine($domain),
            'github_search' => $this->collectFromGitHub($domain),
            'linkedin_public' => $this->collectFromLinkedIn($domain),
            'news_articles' => $this->collectFromNews($domain),
            'public_records' => $this->collectFromPublicRecords($domain),
            'social_media_public' => $this->collectFromSocialMedia($domain),
            'company_websites' => $this->collectFromCompanyWebsites($domain),
            'job_postings' => $this->collectFromJobPostings($domain),
            'patent_databases' => $this->collectFromPatentDatabases($domain),
            default => ['error' => 'Unknown source'],
        };
    }

    /**
     * Collect from crt.sh (Certificate Transparency)
     */
    private function collectFromCrtSh(Domain $domain): array
    {
        try {
            $url = "https://crt.sh/?q=" . urlencode($domain->domain) . "&output=json";
            
            $response = Http::timeout(30)
                ->withHeaders(['User-Agent' => $this->userAgent])
                ->get($url);

            if (!$response->successful()) {
                throw new Exception('crt.sh request failed: ' . $response->status());
            }

            $certificates = $response->json();
            $results = [];

            foreach ($certificates as $cert) {
                $results[] = [
                    'id' => $cert['id'] ?? null,
                    'name_value' => $cert['name_value'] ?? null,
                    'issuer_name' => $cert['issuer_name'] ?? null,
                    'not_before' => $cert['not_before'] ?? null,
                    'not_after' => $cert['not_after'] ?? null,
                ];
            }

            return [
                'source' => 'crtsh',
                'count' => count($results),
                'data' => $results,
                'collected_at' => now()->toISOString(),
            ];

        } catch (Exception $e) {
            throw new Exception('crt.sh collection failed: ' . $e->getMessage());
        }
    }

    /**
     * Collect from Wayback Machine
     */
    private function collectFromWaybackMachine(Domain $domain): array
    {
        try {
            $baseUrl = "https://web.archive.org/web/timemap/json";
            $url = $baseUrl . "?url=" . urlencode($domain->domain) . "/*&matchType=domain";
            
            $response = Http::timeout(30)
                ->withHeaders(['User-Agent' => $this->userAgent])
                ->get($url);

            if (!$response->successful()) {
                throw new Exception('Wayback Machine request failed: ' . $response->status());
            }

            $data = $response->json();
            $results = [];

            if (isset($data[1]) && is_array($data[1])) {
                foreach ($data[1] as $entry) {
                    $parts = explode(' ', $entry);
                    if (count($parts) >= 4) {
                        $results[] = [
                            'timestamp' => $parts[1] ?? null,
                            'url' => $parts[2] ?? null,
                            'mime_type' => $parts[3] ?? null,
                            'status_code' => $parts[4] ?? null,
                        ];
                    }
                }
            }

            return [
                'source' => 'wayback_machine',
                'count' => count($results),
                'data' => array_slice($results, 0, 100), // Limit to 100 most recent
                'collected_at' => now()->toISOString(),
            ];

        } catch (Exception $e) {
            throw new Exception('Wayback Machine collection failed: ' . $e->getMessage());
        }
    }

    /**
     * Collect from GitHub (public repositories only)
     */
    private function collectFromGitHub(Domain $domain): array
    {
        try {
            $query = "\"{$domain->domain}\" language:javascript,python,php,java,go,rust";
            $url = "https://api.github.com/search/repositories?q=" . urlencode($query) . "&sort=updated&order=desc";
            
            $response = Http::timeout(30)
                ->withHeaders([
                    'User-Agent' => $this->userAgent,
                    'Accept' => 'application/vnd.github.v3+json',
                ])
                ->get($url);

            if (!$response->successful()) {
                throw new Exception('GitHub API request failed: ' . $response->status());
            }

            $data = $response->json();
            $results = [];

            if (isset($data['items']) && is_array($data['items'])) {
                foreach ($data['items'] as $repo) {
                    $results[] = [
                        'id' => $repo['id'] ?? null,
                        'name' => $repo['name'] ?? null,
                        'full_name' => $repo['full_name'] ?? null,
                        'description' => $repo['description'] ?? null,
                        'html_url' => $repo['html_url'] ?? null,
                        'clone_url' => $repo['clone_url'] ?? null,
                        'language' => $repo['language'] ?? null,
                        'stars' => $repo['stargazers_count'] ?? 0,
                        'forks' => $repo['forks_count'] ?? 0,
                        'updated_at' => $repo['updated_at'] ?? null,
                        'created_at' => $repo['created_at'] ?? null,
                    ];
                }
            }

            return [
                'source' => 'github_search',
                'count' => count($results),
                'data' => $results,
                'collected_at' => now()->toISOString(),
            ];

        } catch (Exception $e) {
            throw new Exception('GitHub collection failed: ' . $e->getMessage());
        }
    }

    /**
     * Collect from LinkedIn (public profiles only)
     */
    private function collectFromLinkedIn(Domain $domain): array
    {
        try {
            // Note: LinkedIn scraping is against their ToS, so we use public search results
            $query = "site:linkedin.com \"{$domain->domain}\"";
            $url = "https://duckduckgo.com/html/?q=" . urlencode($query);
            
            $response = Http::timeout(30)
                ->withHeaders(['User-Agent' => $this->userAgent])
                ->get($url);

            if (!$response->successful()) {
                throw new Exception('LinkedIn search failed: ' . $response->status());
            }

            $html = $response->body();
            $results = [];
            
            // Parse HTML for LinkedIn profiles (simplified)
            if (preg_match_all('/<a[^>]*href="(https:\/\/www\.linkedin\.com\/in\/[^"]*)"[^>]*>([^<]*)<\/a>/i', $html, $matches)) {
                foreach ($matches[1] as $index => $profileUrl) {
                    $results[] = [
                        'profile_url' => $profileUrl,
                        'name' => $matches[2][$index] ?? null,
                        'source' => 'public_search',
                    ];
                }
            }

            return [
                'source' => 'linkedin_public',
                'count' => count($results),
                'data' => array_unique($results, SORT_REGULAR),
                'collected_at' => now()->toISOString(),
            ];

        } catch (Exception $e) {
            throw new Exception('LinkedIn collection failed: ' . $e->getMessage());
        }
    }

    /**
     * Collect from news articles
     */
    private function collectFromNews(Domain $domain): array
    {
        try {
            $query = "\"{$domain->domain}\" security OR breach OR vulnerability";
            $url = "https://news.google.com/rss/search?q=" . urlencode($query) . "&hl=en-US&gl=US&ceid=US:en";
            
            $response = Http::timeout(30)
                ->withHeaders(['User-Agent' => $this->userAgent])
                ->get($url);

            if (!$response->successful()) {
                throw new Exception('News search failed: ' . $response->status());
            }

            $xml = $response->body();
            $results = [];
            
            // Parse RSS feed
            if (function_exists('simplexml_load_string')) {
                $rss = simplexml_load_string($xml);
                if ($rss && isset($rss->channel->item)) {
                    foreach ($rss->channel->item as $item) {
                        $results[] = [
                            'title' => (string) $item->title,
                            'link' => (string) $item->link,
                            'description' => (string) $item->description,
                            'pub_date' => (string) $item->pubDate,
                            'source' => (string) $item->source,
                        ];
                    }
                }
            }

            return [
                'source' => 'news_articles',
                'count' => count($results),
                'data' => $results,
                'collected_at' => now()->toISOString(),
            ];

        } catch (Exception $e) {
            throw new Exception('News collection failed: ' . $e->getMessage());
        }
    }

    /**
     * Collect from public records
     */
    private function collectFromPublicRecords(Domain $domain): array
    {
        try {
            // WHOIS information
            $whois = $this->getWhoisInfo($domain->domain);
            
            // DNS records
            $dns = $this->getDnsRecords($domain->domain);

            $results = [
                'whois' => $whois,
                'dns' => $dns,
            ];

            return [
                'source' => 'public_records',
                'count' => count($results, COUNT_RECURSIVE) - count($results),
                'data' => $results,
                'collected_at' => now()->toISOString(),
            ];

        } catch (Exception $e) {
            throw new Exception('Public records collection failed: ' . $e->getMessage());
        }
    }

    /**
     * Collect from social media (public posts only)
     */
    private function collectFromSocialMedia(Domain $domain): array
    {
        try {
            $results = [];
            
            // Twitter/X public search
            $twitterResults = $this->searchTwitterPublic($domain->domain);
            if (!empty($twitterResults)) {
                $results['twitter'] = $twitterResults;
            }

            // Reddit public search
            $redditResults = $this->searchRedditPublic($domain->domain);
            if (!empty($redditResults)) {
                $results['reddit'] = $redditResults;
            }

            return [
                'source' => 'social_media_public',
                'count' => count($results, COUNT_RECURSIVE) - count($results),
                'data' => $results,
                'collected_at' => now()->toISOString(),
            ];

        } catch (Exception $e) {
            throw new Exception('Social media collection failed: ' . $e->getMessage());
        }
    }

    /**
     * Collect from company websites
     */
    private function collectFromCompanyWebsites(Domain $domain): array
    {
        try {
            $results = [];
            
            // Main website analysis
            $websiteInfo = $this->analyzeWebsite($domain->domain);
            $results['main_site'] = $websiteInfo;

            // Look for subdomains
            $subdomains = $this->discoverSubdomains($domain->domain);
            $results['subdomains'] = $subdomains;

            return [
                'source' => 'company_websites',
                'count' => count($results, COUNT_RECURSIVE) - count($results),
                'data' => $results,
                'collected_at' => now()->toISOString(),
            ];

        } catch (Exception $e) {
            throw new Exception('Company websites collection failed: ' . $e->getMessage());
        }
    }

    /**
     * Collect from job postings
     */
    private function collectFromJobPostings(Domain $domain): array
    {
        try {
            $query = "\"{$domain->domain}\" security OR engineer OR developer";
            $url = "https://duckduckgo.com/html/?q=" . urlencode($query . " site:indeed.com OR site:linkedin.com/jobs");
            
            $response = Http::timeout(30)
                ->withHeaders(['User-Agent' => $this->userAgent])
                ->get($url);

            if (!$response->successful()) {
                throw new Exception('Job search failed: ' . $response->status());
            }

            $html = $response->body();
            $results = [];
            
            // Parse HTML for job postings (simplified)
            if (preg_match_all('/<a[^>]*href="(https:\/\/[^"]*indeed\.com[^"]*)"[^>]*>([^<]*)<\/a>/i', $html, $matches)) {
                foreach ($matches[1] as $index => $jobUrl) {
                    $results[] = [
                        'url' => $jobUrl,
                        'title' => $matches[2][$index] ?? null,
                        'source' => 'public_search',
                    ];
                }
            }

            return [
                'source' => 'job_postings',
                'count' => count($results),
                'data' => array_unique($results, SORT_REGULAR),
                'collected_at' => now()->toISOString(),
            ];

        } catch (Exception $e) {
            throw new Exception('Job postings collection failed: ' . $e->getMessage());
        }
    }

    /**
     * Collect from patent databases
     */
    private function collectFromPatentDatabases(Domain $domain): array
    {
        try {
            // Google Patents search
            $query = "\"{$domain->domain}\"";
            $url = "https://patents.google.com/?q=" . urlencode($query) . "&oq=" . urlencode($query);
            
            $response = Http::timeout(30)
                ->withHeaders(['User-Agent' => $this->userAgent])
                ->get($url);

            if (!$response->successful()) {
                throw new Exception('Patent search failed: ' . $response->status());
            }

            $html = $response->body();
            $results = [];
            
            // Parse HTML for patents (simplified)
            if (preg_match_all('/<a[^>]*href="\/patent\/([^"]*)"[^>]*>([^<]*)<\/a>/i', $html, $matches)) {
                foreach ($matches[1] as $index => $patentId) {
                    $results[] = [
                        'patent_id' => $patentId,
                        'title' => $matches[2][$index] ?? null,
                        'url' => "https://patents.google.com/patent/{$patentId}",
                    ];
                }
            }

            return [
                'source' => 'patent_databases',
                'count' => count($results),
                'data' => $results,
                'collected_at' => now()->toISOString(),
            ];

        } catch (Exception $e) {
            throw new Exception('Patent databases collection failed: ' . $e->getMessage());
        }
    }

    /**
     * Helper methods for data collection
     */
    private function getWhoisInfo(string $domain): array
    {
        try {
            $records = dns_get_record($domain, DNS_ANY);
            return [
                'dns_records' => $records,
                'registrar' => 'Unknown', // Would require WHOIS API
                'created_date' => null,
                'expiry_date' => null,
            ];
        } catch (Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }

    private function getDnsRecords(string $domain): array
    {
        try {
            $records = [];
            $types = [DNS_A, DNS_AAAA, DNS_MX, DNS_TXT, DNS_CNAME];
            
            foreach ($types as $type) {
                $typeRecords = dns_get_record($domain, $type);
                if ($typeRecords) {
                    $records[$type] = $typeRecords;
                }
            }
            
            return $records;
        } catch (Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }

    private function searchTwitterPublic(string $domain): array
    {
        // Note: This would require Twitter API access
        // For now, return empty array as we don't scrape Twitter
        return [];
    }

    private function searchRedditPublic(string $domain): array
    {
        // Note: This would require Reddit API access
        // For now, return empty array as we don't scrape Reddit
        return [];
    }

    private function analyzeWebsite(string $domain): array
    {
        try {
            $url = "https://{$domain}";
            $response = Http::timeout(10)
                ->withHeaders(['User-Agent' => $this->userAgent])
                ->get($url);

            if (!$response->successful()) {
                return ['error' => 'Website not accessible'];
            }

            $html = $response->body();
            
            return [
                'status_code' => $response->status(),
                'content_length' => strlen($html),
                'has_forms' => str_contains($html, '<form'),
                'has_login' => str_contains($html, 'password') || str_contains($html, 'login'),
                'technologies' => $this->detectTechnologies($html),
                'security_headers' => $this->checkSecurityHeaders($response),
            ];

        } catch (Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }

    private function discoverSubdomains(string $domain): array
    {
        try {
            // Use crt.sh for subdomain discovery
            $url = "https://crt.sh/?q=%25." . urlencode($domain) . "&output=json";
            
            $response = Http::timeout(30)
                ->withHeaders(['User-Agent' => $this->userAgent])
                ->get($url);

            if (!$response->successful()) {
                return [];
            }

            $certificates = $response->json();
            $subdomains = [];

            foreach ($certificates as $cert) {
                if (isset($cert['name_value'])) {
                    $names = explode("\n", $cert['name_value']);
                    foreach ($names as $name) {
                        $name = trim($name);
                        if (str_ends_with($name, $domain) && $name !== $domain) {
                            $subdomains[] = $name;
                        }
                    }
                }
            }

            return array_unique($subdomains);

        } catch (Exception $e) {
            return [];
        }
    }

    private function detectTechnologies(string $html): array
    {
        $technologies = [];
        
        // Simple technology detection
        if (str_contains($html, 'jquery')) {
            $technologies[] = 'jQuery';
        }
        if (str_contains($html, 'bootstrap')) {
            $technologies[] = 'Bootstrap';
        }
        if (str_contains($html, 'react')) {
            $technologies[] = 'React';
        }
        if (str_contains($html, 'angular')) {
            $technologies[] = 'Angular';
        }
        if (str_contains($html, 'vue')) {
            $technologies[] = 'Vue.js';
        }
        
        return $technologies;
    }

    private function checkSecurityHeaders($response): array
    {
        $headers = $response->headers();
        $securityHeaders = [];

        $importantHeaders = [
            'x-frame-options',
            'x-content-type-options',
            'x-xss-protection',
            'strict-transport-security',
            'content-security-policy',
        ];

        foreach ($importantHeaders as $header) {
            $securityHeaders[$header] = $headers[strtoupper(str_replace('-', '_', $header))] ?? 'Not Set';
        }

        return $securityHeaders;
    }

    /**
     * Check if collected data is relevant
     */
    private function hasRelevantData(array $results): bool
    {
        foreach ($results as $source => $data) {
            if (isset($data['count']) && $data['count'] > 0) {
                return true;
            }
        }
        return false;
    }

    /**
     * Create leak record for OSINT findings
     */
    private function createLeakRecord(Domain $domain, array $osintData, User $collector = null): Leak
    {
        return Leak::create([
            'team_id' => $domain->team_id,
            'domain_id' => $domain->id,
            'source_type' => 'osint_collection',
            'source_name' => 'SecureScout Pro OSINT',
            'confidence_level' => 'medium',
            'severity' => $this->assessOSINTSeverity($osintData),
            'status' => 'discovered',
            'title' => "OSINT findings for {$domain->domain}",
            'description' => "Open-source intelligence data collected from legal public sources",
            'content_data' => $osintData,
            'classification' => 'public_information',
            'verified' => false,
            'verification_required' => true,
            'discovered_at' => now(),
            'created_by' => $collector?->id,
        ]);
    }

    /**
     * Assess severity of OSINT findings
     */
    private function assessOSINTSeverity(array $osintData): string
    {
        $riskScore = 0;

        foreach ($osintData as $source => $data) {
            if (isset($data['count'])) {
                switch ($source) {
                    case 'crtsh':
                        $riskScore += min($data['count'] * 0.5, 10);
                        break;
                    case 'github_search':
                        $riskScore += min($data['count'] * 1, 15);
                        break;
                    case 'news_articles':
                        // News articles about security issues increase risk
                        $riskScore += min($data['count'] * 3, 20);
                        break;
                    case 'social_media_public':
                        $riskScore += min($data['count'] * 0.2, 5);
                        break;
                    default:
                        $riskScore += min($data['count'] * 0.1, 5);
                }
            }
        }

        if ($riskScore >= 20) {
            return 'high';
        } elseif ($riskScore >= 10) {
            return 'medium';
        } else {
            return 'low';
        }
    }
}
