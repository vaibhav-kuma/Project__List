<?php

namespace App\Services;

use App\Models\Team;
use App\Models\User;
use App\Models\Domain;
use App\Models\DomainVerification;
use App\Models\AbuseReport;
use App\Models\Leak;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AbuseDetectionService
{
    private array $riskThresholds = [
        'max_domains_per_hour' => 20,
        'max_verifications_per_hour' => 50,
        'max_failed_attempts_per_hour' => 100,
        'max_unique_ips_per_team' => 10,
        'suspicious_domain_score_threshold' => 70,
        'abuse_confidence_threshold' => 80,
    ];

    /**
     * Analyze user behavior for abuse patterns
     */
    public function analyzeUserBehavior(User $user): array
    {
        $risks = [];
        $score = 0;

        // Check rapid domain additions
        $domainAdditionRisk = $this->checkRapidDomainAdditions($user);
        if ($domainAdditionRisk['risk_score'] > 0) {
            $risks[] = $domainAdditionRisk;
            $score += $domainAdditionRisk['risk_score'];
        }

        // Check verification patterns
        $verificationRisk = $this->checkVerificationPatterns($user);
        if ($verificationRisk['risk_score'] > 0) {
            $risks[] = $verificationRisk;
            $score += $verificationRisk['risk_score'];
        }

        // Check failed login attempts
        $loginRisk = $this->checkFailedLoginAttempts($user);
        if ($loginRisk['risk_score'] > 0) {
            $risks[] = $loginRisk;
            $score += $loginRisk['risk_score'];
        }

        // Check IP diversity
        $ipRisk = $this->checkIpDiversity($user);
        if ($ipRisk['risk_score'] > 0) {
            $risks[] = $ipRisk;
            $score += $ipRisk['risk_score'];
        }

        // Check time-based patterns
        $timeRisk = $this->checkTimeBasedPatterns($user);
        if ($timeRisk['risk_score'] > 0) {
            $risks[] = $timeRisk;
            $score += $timeRisk['risk_score'];
        }

        return [
            'overall_score' => min($score, 100),
            'risk_level' => $this->calculateRiskLevel($score),
            'risks' => $risks,
            'recommendation' => $this->getRecommendation($score),
        ];
    }

    /**
     * Analyze team behavior for abuse patterns
     */
    public function analyzeTeamBehavior(Team $team): array
    {
        $risks = [];
        $score = 0;

        // Check team-wide domain additions
        $teamDomainRisk = $this->checkTeamDomainAdditions($team);
        if ($teamDomainRisk['risk_score'] > 0) {
            $risks[] = $teamDomainRisk;
            $score += $teamDomainRisk['risk_score'];
        }

        // Check authorization patterns
        $authorizationRisk = $this->checkAuthorizationPatterns($team);
        if ($authorizationRisk['risk_score'] > 0) {
            $risks[] = $authorizationRisk;
            $score += $authorizationRisk['risk_score'];
        }

        // Check user activity patterns
        $userActivityRisk = $this->checkTeamUserActivity($team);
        if ($userActivityRisk['risk_score'] > 0) {
            $risks[] = $userActivityRisk;
            $score += $userActivityRisk['risk_score'];
        }

        // Check leak discovery patterns
        $leakRisk = $this->checkLeakDiscoveryPatterns($team);
        if ($leakRisk['risk_score'] > 0) {
            $risks[] = $leakRisk;
            $score += $leakRisk['risk_score'];
        }

        return [
            'overall_score' => min($score, 100),
            'risk_level' => $this->calculateRiskLevel($score),
            'risks' => $risks,
            'recommendation' => $this->getRecommendation($score),
        ];
    }

    /**
     * Check rapid domain additions
     */
    private function checkRapidDomainAdditions(User $user): array
    {
        $domainsAdded = Domain::whereHas('team', function ($query) use ($user) {
                $query->whereHas('users', function ($q) use ($user) {
                    $q->where('user_id', $user->id);
                });
            })
            ->where('created_at', '>', now()->subHour())
            ->count();

        $threshold = $this->riskThresholds['max_domains_per_hour'];
        $riskScore = 0;

        if ($domainsAdded > $threshold) {
            $riskScore = min(($domainsAdded - $threshold) * 10, 50);
        }

        return [
            'type' => 'rapid_domain_additions',
            'risk_score' => $riskScore,
            'details' => [
                'domains_added' => $domainsAdded,
                'threshold' => $threshold,
                'timeframe' => '1 hour',
            ],
        ];
    }

    /**
     * Check verification patterns
     */
    private function checkVerificationPatterns(User $user): array
    {
        $verifications = DomainVerification::where('created_by', $user->id)
            ->where('created_at', '>', now()->subHour())
            ->count();

        $failedVerifications = DomainVerification::where('created_by', $user->id)
            ->where('status', 'failed')
            ->where('created_at', '>', now()->subHour())
            ->count();

        $threshold = $this->riskThresholds['max_verifications_per_hour'];
        $riskScore = 0;

        if ($verifications > $threshold) {
            $riskScore += min(($verifications - $threshold) * 5, 30);
        }

        if ($failedVerifications > ($threshold * 0.5)) {
            $riskScore += min($failedVerifications * 3, 20);
        }

        return [
            'type' => 'verification_patterns',
            'risk_score' => $riskScore,
            'details' => [
                'total_verifications' => $verifications,
                'failed_verifications' => $failedVerifications,
                'threshold' => $threshold,
                'timeframe' => '1 hour',
            ],
        ];
    }

    /**
     * Check failed login attempts
     */
    private function checkFailedLoginAttempts(User $user): array
    {
        $failedAttempts = DB::table('activity_log')
            ->where('causer_type', User::class)
            ->where('causer_id', $user->id)
            ->where('description', 'like', '%failed%')
            ->where('created_at', '>', now()->subHour())
            ->count();

        $threshold = $this->riskThresholds['max_failed_attempts_per_hour'];
        $riskScore = 0;

        if ($failedAttempts > $threshold) {
            $riskScore = min(($failedAttempts - $threshold) * 2, 40);
        }

        return [
            'type' => 'failed_login_attempts',
            'risk_score' => $riskScore,
            'details' => [
                'failed_attempts' => $failedAttempts,
                'threshold' => $threshold,
                'timeframe' => '1 hour',
            ],
        ];
    }

    /**
     * Check IP diversity
     */
    private function checkIpDiversity(User $user): array
    {
        $uniqueIps = DB::table('activity_log')
            ->where('causer_type', User::class)
            ->where('causer_id', $user->id)
            ->where('created_at', '>', now()->subDay())
            ->distinct('properties->ip')
            ->count();

        $threshold = $this->riskThresholds['max_unique_ips_per_team'];
        $riskScore = 0;

        if ($uniqueIps > $threshold) {
            $riskScore = min(($uniqueIps - $threshold) * 5, 30);
        }

        return [
            'type' => 'ip_diversity',
            'risk_score' => $riskScore,
            'details' => [
                'unique_ips' => $uniqueIps,
                'threshold' => $threshold,
                'timeframe' => '24 hours',
            ],
        ];
    }

    /**
     * Check time-based patterns
     */
    private function checkTimeBasedPatterns(User $user): array
    {
        $activities = DB::table('activity_log')
            ->where('causer_type', User::class)
            ->where('causer_id', $user->id)
            ->where('created_at', '>', now()->subDay())
            ->get();

        $riskScore = 0;
        $unusualHours = 0;

        foreach ($activities as $activity) {
            $hour = Carbon::parse($activity->created_at)->hour;
            
            // Activity between 2 AM - 6 AM is unusual
            if ($hour >= 2 && $hour <= 6) {
                $unusualHours++;
            }
        }

        if ($unusualHours > 10) {
            $riskScore = min($unusualHours * 2, 25);
        }

        return [
            'type' => 'time_based_patterns',
            'risk_score' => $riskScore,
            'details' => [
                'unusual_hour_activities' => $unusualHours,
                'total_activities' => $activities->count(),
                'timeframe' => '24 hours',
            ],
        ];
    }

    /**
     * Check team domain additions
     */
    private function checkTeamDomainAdditions(Team $team): array
    {
        $domainsAdded = Domain::where('team_id', $team->id)
            ->where('created_at', '>', now()->subHour())
            ->count();

        $threshold = $this->riskThresholds['max_domains_per_hour'] * 2; // Team threshold is higher
        $riskScore = 0;

        if ($domainsAdded > $threshold) {
            $riskScore = min(($domainsAdded - $threshold) * 8, 50);
        }

        return [
            'type' => 'team_domain_additions',
            'risk_score' => $riskScore,
            'details' => [
                'domains_added' => $domainsAdded,
                'threshold' => $threshold,
                'timeframe' => '1 hour',
            ],
        ];
    }

    /**
     * Check authorization patterns
     */
    private function checkAuthorizationPatterns(Team $team): array
    {
        $authorizations = DB::table('authorizations')
            ->where('team_id', $team->id)
            ->where('created_at', '>', now()->subDay())
            ->count();

        $rejectedAuthorizations = DB::table('authorizations')
            ->where('team_id', $team->id)
            ->where('status', 'rejected')
            ->where('created_at', '>', now()->subDay())
            ->count();

        $riskScore = 0;

        if ($authorizations > 10) {
            $riskScore += min($authorizations * 3, 30);
        }

        if ($rejectedAuthorizations > 5) {
            $riskScore += min($rejectedAuthorizations * 5, 30);
        }

        return [
            'type' => 'authorization_patterns',
            'risk_score' => $riskScore,
            'details' => [
                'total_authorizations' => $authorizations,
                'rejected_authorizations' => $rejectedAuthorizations,
                'timeframe' => '24 hours',
            ],
        ];
    }

    /**
     * Check team user activity
     */
    private function checkTeamUserActivity(Team $team): array
    {
        $activeUsers = DB::table('activity_log')
            ->where('created_at', '>', now()->subHour())
            ->whereHas('causer', function ($query) use ($team) {
                $query->whereHas('teams', function ($q) use ($team) {
                    $q->where('team_id', $team->id);
                });
            })
            ->distinct('causer_id')
            ->count();

        $riskScore = 0;

        if ($activeUsers > $team->max_users) {
            $riskScore = min(($activeUsers - $team->max_users) * 10, 40);
        }

        return [
            'type' => 'team_user_activity',
            'risk_score' => $riskScore,
            'details' => [
                'active_users' => $activeUsers,
                'max_allowed' => $team->max_users,
                'timeframe' => '1 hour',
            ],
        ];
    }

    /**
     * Check leak discovery patterns
     */
    private function checkLeakDiscoveryPatterns(Team $team): array
    {
        $leaksDiscovered = Leak::where('team_id', $team->id)
            ->where('created_at', '>', now()->subHour())
            ->count();

        $riskScore = 0;

        // Unusually high number of leak discoveries could indicate scraping
        if ($leaksDiscovered > 50) {
            $riskScore = min(($leaksDiscovered - 50) * 2, 40);
        }

        return [
            'type' => 'leak_discovery_patterns',
            'risk_score' => $riskScore,
            'details' => [
                'leaks_discovered' => $leaksDiscovered,
                'threshold' => 50,
                'timeframe' => '1 hour',
            ],
        ];
    }

    /**
     * Calculate risk level from score
     */
    private function calculateRiskLevel(int $score): string
    {
        if ($score >= 80) {
            return 'critical';
        } elseif ($score >= 60) {
            return 'high';
        } elseif ($score >= 40) {
            return 'medium';
        } elseif ($score >= 20) {
            return 'low';
        } else {
            return 'minimal';
        }
    }

    /**
     * Get recommendation based on risk score
     */
    private function getRecommendation(int $score): string
    {
        if ($score >= 80) {
            return 'IMMEDIATE_ACTION_REQUIRED: Suspend account and investigate';
        } elseif ($score >= 60) {
            return 'HIGH_PRIORITY: Review manually and consider temporary suspension';
        } elseif ($score >= 40) {
            return 'MONITOR: Increased monitoring and manual review recommended';
        } elseif ($score >= 20) {
            return 'WATCH: Monitor for continued suspicious activity';
        } else {
            return 'NORMAL: No immediate action required';
        }
    }

    /**
     * Check for honeypot domain access
     */
    public function checkHoneypotAccess(string $domain, string $ip): bool
    {
        $honeypotDomains = config('security.abuse_detection.honeypot_domains', [
            'honeypot.securescout.com',
            'trap.securescout.com',
        ]);

        if (in_array($domain, $honeypotDomains)) {
            $this->reportHoneypotAccess($domain, $ip);
            return true;
        }

        return false;
    }

    /**
     * Report honeypot access
     */
    private function reportHoneypotAccess(string $domain, string $ip): void
    {
        try {
            AbuseReport::create([
                'reported_domain' => $domain,
                'category' => 'unauthorized_scanning',
                'severity' => 'high',
                'description' => "Access to honeypot domain detected from IP: {$ip}",
                'evidence' => [
                    'honeypot_domain' => $domain,
                    'access_ip' => $ip,
                    'timestamp' => now()->toISOString(),
                ],
                'status' => 'open',
                'requester_ip' => $ip,
                'incident_discovered_at' => now(),
                'created_by' => null, // System generated
            ]);

            Log::warning('Honeypot access detected', [
                'domain' => $domain,
                'ip' => $ip,
            ]);

        } catch (Exception $e) {
            Log::error('Failed to create honeypot abuse report', [
                'domain' => $domain,
                'ip' => $ip,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Analyze domain for suspicious characteristics
     */
    public function analyzeDomainRisk(string $domain): array
    {
        $score = 0;
        $factors = [];

        // Check domain age (if WHOIS available)
        $ageRisk = $this->checkDomainAge($domain);
        if ($ageRisk > 0) {
            $score += $ageRisk;
            $factors[] = 'Recently registered domain';
        }

        // Check TLD reputation
        $tldRisk = $this->checkTldReputation($domain);
        if ($tldRisk > 0) {
            $score += $tldRisk;
            $factors[] = 'High-risk TLD';
        }

        // Check domain pattern
        $patternRisk = $this->checkDomainPattern($domain);
        if ($patternRisk > 0) {
            $score += $patternRisk;
            $factors[] = 'Suspicious domain pattern';
        }

        // Check DNS configuration
        $dnsRisk = $this->checkDnsConfiguration($domain);
        if ($dnsRisk > 0) {
            $score += $dnsRisk;
            $factors[] = 'Suspicious DNS configuration';
        }

        return [
            'domain' => $domain,
            'risk_score' => min($score, 100),
            'risk_level' => $this->calculateRiskLevel($score),
            'factors' => $factors,
        ];
    }

    /**
     * Check domain age
     */
    private function checkDomainAge(string $domain): int
    {
        // This would typically use a WHOIS API
        // For now, return 0 (no risk)
        return 0;
    }

    /**
     * Check TLD reputation
     */
    private function checkTldReputation(string $domain): int
    {
        $riskyTlds = [
            '.tk', '.ml', '.ga', '.cf', '.gq', // Free TLDs
            '.bit', '.onion', // Dark web
        ];

        foreach ($riskyTlds as $tld) {
            if (str_ends_with(strtolower($domain), $tld)) {
                return 30;
            }
        }

        return 0;
    }

    /**
     * Check domain pattern
     */
    private function checkDomainPattern(string $domain): int
    {
        $score = 0;

        // Lots of numbers
        if (preg_match('/[0-9]{5,}/', $domain)) {
            $score += 15;
        }

        // Very long domains
        if (strlen($domain) > 30) {
            $score += 10;
        }

        // Random looking strings
        if (preg_match('/^[a-z]{15,}\.[a-z]{2,}$/', $domain)) {
            $score += 20;
        }

        // Suspicious keywords
        $suspiciousKeywords = ['test', 'temp', 'fake', 'proxy', 'vpn'];
        foreach ($suspiciousKeywords as $keyword) {
            if (str_contains(strtolower($domain), $keyword)) {
                $score += 10;
            }
        }

        return $score;
    }

    /**
     * Check DNS configuration
     */
    private function checkDnsConfiguration(string $domain): int
    {
        $score = 0;

        try {
            // Check for missing DNS records
            $aRecords = @dns_get_record($domain, DNS_A);
            $mxRecords = @dns_get_record($domain, DNS_MX);

            if (empty($aRecords)) {
                $score += 15;
            }

            if (empty($mxRecords)) {
                $score += 10;
            }

        } catch (Exception $e) {
            $score += 20; // DNS lookup failed
        }

        return $score;
    }

    /**
     * Generate abuse report based on analysis
     */
    public function generateAbuseReport(array $analysis, User $user = null, Team $team = null): ?AbuseReport
    {
        if ($analysis['overall_score'] < $this->riskThresholds['abuse_confidence_threshold']) {
            return null;
        }

        $description = "Suspicious activity detected with risk score: {$analysis['overall_score']}/100\n\n";
        $description .= "Risk factors:\n";
        
        foreach ($analysis['risks'] as $risk) {
            $description .= "- {$risk['type']}: " . json_encode($risk['details']) . "\n";
        }

        return AbuseReport::create([
            'reported_user_id' => $user?->id,
            'reported_team_id' => $team?->id,
            'category' => 'terms_of_service_violation',
            'severity' => $analysis['risk_level'] === 'critical' ? 'critical' : 'high',
            'description' => $description,
            'evidence' => [
                'risk_analysis' => $analysis,
                'detection_timestamp' => now()->toISOString(),
            ],
            'status' => 'open',
            'requester_ip' => request()->ip(),
            'incident_discovered_at' => now(),
            'created_by' => null, // System generated
        ]);
    }

    /**
     * Run automated abuse detection
     */
    public function runAutomatedDetection(): array
    {
        $reports = [];
        $processedUsers = 0;
        $processedTeams = 0;

        // Check active users
        $activeUsers = User::where('last_login_at', '>', now()->subHours(24))
            ->where('is_active', true)
            ->where('is_suspended', false)
            ->get();

        foreach ($activeUsers as $user) {
            $analysis = $this->analyzeUserBehavior($user);
            
            if ($analysis['overall_score'] >= $this->riskThresholds['abuse_confidence_threshold']) {
                $report = $this->generateAbuseReport($analysis, $user);
                if ($report) {
                    $reports[] = $report;
                }
            }
            
            $processedUsers++;
        }

        // Check active teams
        $activeTeams = Team::where('is_active', true)
            ->where('is_suspended', false)
            ->get();

        foreach ($activeTeams as $team) {
            $analysis = $this->analyzeTeamBehavior($team);
            
            if ($analysis['overall_score'] >= $this->riskThresholds['abuse_confidence_threshold']) {
                $report = $this->generateAbuseReport($analysis, null, $team);
                if ($report) {
                    $reports[] = $report;
                }
            }
            
            $processedTeams++;
        }

        Log::info('Automated abuse detection completed', [
            'processed_users' => $processedUsers,
            'processed_teams' => $processedTeams,
            'reports_generated' => count($reports),
        ]);

        return [
            'processed_users' => $processedUsers,
            'processed_teams' => $processedTeams,
            'reports_generated' => count($reports),
            'reports' => $reports,
        ];
    }
}
