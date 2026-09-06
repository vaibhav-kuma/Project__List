<?php

namespace App\Services;

use App\Models\PenetrationTest;
use App\Models\Finding;
use App\Models\Authorization;
use App\Models\Team;
use App\Models\User;
use App\Models\Domain;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Exception;

class PenetrationTestingService
{
    private array $testingMethodologies;
    private array $severityLevels;
    private array $findingCategories;

    public function __construct()
    {
        $this->testingMethodologies = [
            'owasp_wstg' => 'OWASP Web Security Testing Guide',
            'owasp_mstg' => 'OWASP Mobile Security Testing Guide',
            'nist_800_115' => 'NIST SP 800-115',
            'ptes' => 'Penetration Testing Execution Standard',
            'osstmm' => 'Open Source Security Testing Methodology Manual',
            'custom' => 'Custom Methodology',
        ];

        $this->severityLevels = [
            'critical' => 4,
            'high' => 3,
            'medium' => 2,
            'low' => 1,
            'info' => 0,
        ];

        $this->findingCategories = [
            'injection' => 'Injection Flaws',
            'broken_auth' => 'Broken Authentication',
            'sensitive_data' => 'Sensitive Data Exposure',
            'xml_external' => 'XML External Entities (XXE)',
            'broken_access' => 'Broken Access Control',
            'security_misconfig' => 'Security Misconfiguration',
            'xss' => 'Cross-Site Scripting (XSS)',
            'insecure_deserial' => 'Insecure Deserialization',
            'vulnerable_components' => 'Using Components with Known Vulnerabilities',
            'insufficient_logging' => 'Insufficient Logging & Monitoring',
            'crypto' => 'Cryptographic Failures',
            'business_logic' => 'Business Logic Flaws',
            'server_side_request' => 'Server-Side Request Forgery (SSRF)',
            'file_inclusion' => 'File Inclusion',
            'information_disclosure' => 'Information Disclosure',
            'denial_of_service' => 'Denial of Service',
            'privilege_escalation' => 'Privilege Escalation',
            'network_security' => 'Network Security Issues',
            'physical_security' => 'Physical Security Issues',
            'social_engineering' => 'Social Engineering',
            'other' => 'Other',
        ];
    }

    /**
     * Create new penetration test project
     */
    public function createPenetrationTest(Team $team, array $testData, User $createdBy): PenetrationTest
    {
        try {
            // Validate authorization
            if (!isset($testData['authorization_id'])) {
                throw new Exception('Authorization ID is required');
            }

            $authorization = Authorization::findOrFail($testData['authorization_id']);
            
            if ($authorization->team_id !== $team->id || !$authorization->is_active) {
                throw new Exception('Invalid or inactive authorization');
            }

            // Generate test ID
            $testId = 'PT-' . strtoupper(Str::random(8));

            // Create penetration test record
            $pentest = PenetrationTest::create([
                'team_id' => $team->id,
                'authorization_id' => $authorization->id,
                'project_name' => $testData['project_name'],
                'project_code' => $testId,
                'client_name' => $authorization->client_name,
                'client_email' => $authorization->client_email,
                'client_phone' => $authorization->client_phone,
                'project_description' => $testData['project_description'],
                'objectives' => $testData['objectives'] ?? [],
                'scope' => $authorization->scope_definition,
                'out_of_scope' => $authorization->out_of_scope,
                'testing_methodology' => $testData['testing_methodology'] ?? 'owasp_wstg',
                'testing_types' => $testData['testing_types'] ?? ['web_application'],
                'tools' => $testData['tools'] ?? [],
                'start_date' => $testData['start_date'],
                'end_date' => $testData['end_date'],
                'testing_start_date' => $testData['testing_start_date'] ?? $testData['start_date'],
                'testing_end_date' => $testData['testing_end_date'] ?? $testData['end_date'],
                'status' => 'planning',
                'priority' => $testData['priority'] ?? 'medium',
                'budget' => $testData['budget'] ?? null,
                'currency' => $testData['currency'] ?? 'USD',
                'billing_method' => $testData['billing_method'] ?? 'fixed_price',
                'team_lead_id' => $testData['team_lead_id'] ?? $createdBy->id,
                'assigned_testers' => $testData['assigned_testers'] ?? [$createdBy->id],
                'client_requirements' => $testData['client_requirements'] ?? [],
                'deliverables' => $testData['deliverables'] ?? [],
                'reporting_requirements' => $testData['reporting_requirements'] ?? [],
                'notification_preferences' => $testData['notification_preferences'] ?? [],
                'created_by' => $createdBy->id,
            ]);

            // Assign team members
            if (!empty($testData['assigned_testers'])) {
                $this->assignTeamMembers($pentest, $testData['assigned_testers']);
            }

            // Send notifications
            $this->sendPentestNotifications($pentest, 'created');

            Log::info('Penetration test created', [
                'pentest_id' => $pentest->id,
                'project_code' => $pentest->project_code,
                'team_id' => $team->id,
                'authorization_id' => $authorization->id,
                'created_by' => $createdBy->id,
            ]);

            return $pentest;

        } catch (Exception $e) {
            Log::error('Failed to create penetration test', [
                'team_id' => $team->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            throw new Exception('Failed to create penetration test: ' . $e->getMessage());
        }
    }

    /**
     * Start penetration test
     */
    public function startPenetrationTest(PenetrationTest $pentest, User $startedBy): bool
    {
        try {
            // Validate authorization is still active
            if (!$pentest->authorization || !$pentest->authorization->is_active) {
                throw new Exception('Authorization is no longer active');
            }

            // Validate test is within authorization dates
            if (!$pentest->authorization->is_current) {
                throw new Exception('Test is outside authorization period');
            }

            // Update status
            $pentest->update([
                'status' => 'in_progress',
                'testing_start_date' => now(),
                'progress_percentage' => 0,
            ]);

            // Initialize testing phases
            $this->initializeTestingPhases($pentest);

            // Send notifications
            $this->sendPentestNotifications($pentest, 'started');

            Log::info('Penetration test started', [
                'pentest_id' => $pentest->id,
                'project_code' => $pentest->project_code,
                'started_by' => $startedBy->id,
            ]);

            return true;

        } catch (Exception $e) {
            Log::error('Failed to start penetration test', [
                'pentest_id' => $pentest->id,
                'error' => $e->getMessage(),
            ]);
            
            return false;
        }
    }

    /**
     * Add finding to penetration test
     */
    public function addFinding(PenetrationTest $pentest, array $findingData, User $foundBy): Finding
    {
        try {
            // Validate finding data
            $this->validateFindingData($findingData);

            // Calculate CVSS score if not provided
            $cvssScore = $findingData['cvss_score'] ?? $this->calculateCVSSScore($findingData);

            // Determine severity based on CVSS score
            $severity = $this->determineSeverity($cvssScore);

            // Create finding record
            $finding = Finding::create([
                'penetration_test_id' => $pentest->id,
                'domain_id' => $findingData['domain_id'] ?? null,
                'title' => $findingData['title'],
                'description' => $findingData['description'],
                'category' => $findingData['category'],
                'severity' => $severity,
                'cvss_score' => $cvssScore,
                'cvss_vector' => $findingData['cvss_vector'] ?? null,
                'affected_systems' => $findingData['affected_systems'] ?? [],
                'affected_components' => $findingData['affected_components'] ?? [],
                'vulnerability_type' => $findingData['vulnerability_type'] ?? null,
                'cve_id' => $findingData['cve_id'] ?? null,
                'cwe_id' => $findingData['cwe_id'] ?? null,
                'references' => $findingData['references'] ?? [],
                'proof_of_concept' => $findingData['proof_of_concept'] ?? null,
                'steps_to_reproduce' => $findingData['steps_to_reproduce'] ?? [],
                'impact_assessment' => $findingData['impact_assessment'] ?? [],
                'business_impact' => $findingData['business_impact'] ?? null,
                'remediation' => $findingData['remediation'] ?? null,
                'remediation_priority' => $findingData['remediation_priority'] ?? $severity,
                'remediation_complexity' => $findingData['remediation_complexity'] ?? 'medium',
                'remediation_steps' => $findingData['remediation_steps'] ?? [],
                'status' => 'discovered',
                'discovered_at' => now(),
                'discovered_by' => $foundBy->id,
                'evidence' => $findingData['evidence'] ?? [],
                'notes' => $findingData['notes'] ?? null,
            ]);

            // Update pentest progress
            $this->updatePentestProgress($pentest);

            // Send notification for critical findings
            if ($severity === 'critical') {
                $this->sendCriticalFindingNotification($finding);
            }

            Log::info('Finding added to penetration test', [
                'finding_id' => $finding->id,
                'pentest_id' => $pentest->id,
                'severity' => $severity,
                'cvss_score' => $cvssScore,
                'found_by' => $foundBy->id,
            ]);

            return $finding;

        } catch (Exception $e) {
            Log::error('Failed to add finding', [
                'pentest_id' => $pentest->id,
                'error' => $e->getMessage(),
            ]);
            
            throw new Exception('Failed to add finding: ' . $e->getMessage());
        }
    }

    /**
     * Validate finding data
     */
    private function validateFindingData(array $data): void
    {
        $required = [
            'title',
            'description',
            'category',
        ];

        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new Exception("Required field missing: {$field}");
            }
        }

        // Validate category
        if (!array_key_exists($data['category'], $this->findingCategories)) {
            throw new Exception('Invalid finding category');
        }
    }

    /**
     * Calculate CVSS score (simplified)
     */
    private function calculateCVSSScore(array $findingData): float
    {
        // This is a simplified CVSS calculation
        // In production, use a proper CVSS calculator library
        
        $baseScore = 0.0;
        
        // Attack Vector
        $av = $findingData['attack_vector'] ?? 'network';
        $avScore = match($av) {
            'network' => 0.85,
            'adjacent' => 0.62,
            'local' => 0.55,
            'physical' => 0.2,
            default => 0.85,
        };
        
        // Attack Complexity
        $ac = $findingData['attack_complexity'] ?? 'low';
        $acScore = match($ac) {
            'low' => 0.77,
            'high' => 0.44,
            default => 0.77,
        };
        
        // Privileges Required
        $pr = $findingData['privileges_required'] ?? 'none';
        $prScore = match($pr) {
            'none' => 0.85,
            'low' => 0.62,
            'high' => 0.27,
            default => 0.85,
        };
        
        // User Interaction
        $ui = $findingData['user_interaction'] ?? 'none';
        $uiScore = match($ui) {
            'none' => 0.85,
            'required' => 0.62,
            default => 0.85,
        };
        
        // Impact
        $impact = $findingData['impact'] ?? 'high';
        $impactScore = match($impact) {
            'high' => 0.56,
            'low' => 0.22,
            'none' => 0.0,
            default => 0.56,
        };
        
        // Simplified CVSS calculation
        $exploitability = 8.22 * $avScore * $acScore * $prScore * $uiScore;
        $impactScore = 6.42 * $impactScore;
        
        if ($impactScore <= 0) {
            return 0.0;
        }
        
        $baseScore = min(($exploitability + $impactScore), 10.0);
        
        return round($baseScore, 1);
    }

    /**
     * Determine severity from CVSS score
     */
    private function determineSeverity(float $cvssScore): string
    {
        if ($cvssScore >= 9.0) {
            return 'critical';
        } elseif ($cvssScore >= 7.0) {
            return 'high';
        } elseif ($cvssScore >= 4.0) {
            return 'medium';
        } elseif ($cvssScore > 0.0) {
            return 'low';
        } else {
            return 'info';
        }
    }

    /**
     * Initialize testing phases
     */
    private function initializeTestingPhases(PenetrationTest $pentest): void
    {
        $phases = [
            'reconnaissance' => [
                'name' => 'Reconnaissance',
                'status' => 'in_progress',
                'start_date' => now(),
                'description' => 'Information gathering and target analysis',
            ],
            'scanning' => [
                'name' => 'Scanning & Enumeration',
                'status' => 'pending',
                'description' => 'Vulnerability scanning and service enumeration',
            ],
            'exploitation' => [
                'name' => 'Exploitation',
                'status' => 'pending',
                'description' => 'Attempt to exploit identified vulnerabilities',
            ],
            'post_exploitation' => [
                'name' => 'Post-Exploitation',
                'status' => 'pending',
                'description' => 'Assess impact and lateral movement',
            ],
            'reporting' => [
                'name' => 'Reporting',
                'status' => 'pending',
                'description' => 'Prepare and deliver final report',
            ],
        ];

        $pentest->update([
            'testing_phases' => $phases,
        ]);
    }

    /**
     * Update pentest progress
     */
    private function updatePentestProgress(PenetrationTest $pentest): void
    {
        $totalFindings = $pentest->findings()->count();
        $criticalFindings = $pentest->findings()->where('severity', 'critical')->count();
        $highFindings = $pentest->findings()->where('severity', 'high')->count();
        
        // Calculate progress based on findings and phases
        $progress = min(($totalFindings * 5) + 10, 90); // Max 90% until report is complete
        
        $pentest->update([
            'progress_percentage' => $progress,
            'findings_count' => $totalFindings,
            'critical_findings_count' => $criticalFindings,
            'high_findings_count' => $highFindings,
        ]);
    }

    /**
     * Complete penetration test
     */
    public function completePenetrationTest(PenetrationTest $pentest, array $completionData, User $completedBy): bool
    {
        try {
            // Generate final report
            $reportPath = $this->generateFinalReport($pentest, $completionData);
            
            // Update pentest status
            $pentest->update([
                'status' => 'completed',
                'testing_end_date' => now(),
                'progress_percentage' => 100,
                'final_report_path' => $reportPath,
                'executive_summary' => $completionData['executive_summary'] ?? null,
                'recommendations' => $completionData['recommendations'] ?? [],
                'next_steps' => $completionData['next_steps'] ?? [],
                'completed_by' => $completedBy->id,
            ]);

            // Send final report to client
            $this->sendFinalReport($pentest);

            // Archive test data
            $this->archiveTestData($pentest);

            Log::info('Penetration test completed', [
                'pentest_id' => $pentest->id,
                'project_code' => $pentest->project_code,
                'completed_by' => $completedBy->id,
                'findings_count' => $pentest->findings_count,
            ]);

            return true;

        } catch (Exception $e) {
            Log::error('Failed to complete penetration test', [
                'pentest_id' => $pentest->id,
                'error' => $e->getMessage(),
            ]);
            
            return false;
        }
    }

    /**
     * Generate final report
     */
    private function generateFinalReport(PenetrationTest $pentest, array $completionData): string
    {
        try {
            $reportData = [
                'project_info' => [
                    'project_name' => $pentest->project_name,
                    'project_code' => $pentest->project_code,
                    'client_name' => $pentest->client_name,
                    'testing_period' => [
                        'start' => $pentest->testing_start_date,
                        'end' => $pentest->testing_end_date,
                    ],
                ],
                'executive_summary' => $completionData['executive_summary'] ?? null,
                'methodology' => $this->testingMethodologies[$pentest->testing_methodology],
                'scope' => $pentest->scope,
                'findings_summary' => $this->generateFindingsSummary($pentest),
                'detailed_findings' => $this->generateDetailedFindings($pentest),
                'recommendations' => $completionData['recommendations'] ?? [],
                'appendices' => $completionData['appendices'] ?? [],
            ];

            // Generate PDF report
            $filename = "pentest_report_{$pentest->project_code}_" . date('Y-m-d') . ".pdf";
            $path = "reports/penetration_tests/" . date('Y/m/d') . "/" . $filename;
            
            // This would use a PDF generation library like DomPDF or TCPDF
            // For now, we'll store as JSON
            Storage::disk('secure')->put($path . '.json', json_encode($reportData, JSON_PRETTY_PRINT));
            
            return $path . '.json';

        } catch (Exception $e) {
            Log::error('Failed to generate final report', [
                'pentest_id' => $pentest->id,
                'error' => $e->getMessage(),
            ]);
            
            throw new Exception('Failed to generate final report');
        }
    }

    /**
     * Generate findings summary
     */
    private function generateFindingsSummary(PenetrationTest $pentest): array
    {
        $findings = $pentest->findings()->get();
        
        $summary = [
            'total_findings' => $findings->count(),
            'by_severity' => [
                'critical' => $findings->where('severity', 'critical')->count(),
                'high' => $findings->where('severity', 'high')->count(),
                'medium' => $findings->where('severity', 'medium')->count(),
                'low' => $findings->where('severity', 'low')->count(),
                'info' => $findings->where('severity', 'info')->count(),
            ],
            'by_category' => [],
            'average_cvss_score' => $findings->avg('cvss_score'),
            'highest_cvss_score' => $findings->max('cvss_score'),
        ];

        // Group by category
        foreach ($findings as $finding) {
            $category = $finding->category;
            if (!isset($summary['by_category'][$category])) {
                $summary['by_category'][$category] = 0;
            }
            $summary['by_category'][$category]++;
        }

        return $summary;
    }

    /**
     * Generate detailed findings
     */
    private function generateDetailedFindings(PenetrationTest $pentest): array
    {
        return $pentest->findings()
            ->orderByRaw("FIELD(severity, 'critical', 'high', 'medium', 'low', 'info')")
            ->get()
            ->map(function ($finding) {
                return [
                    'id' => $finding->id,
                    'title' => $finding->title,
                    'severity' => $finding->severity,
                    'cvss_score' => $finding->cvss_score,
                    'category' => $finding->category,
                    'description' => $finding->description,
                    'affected_systems' => $finding->affected_systems,
                    'remediation' => $finding->remediation,
                    'references' => $finding->references,
                ];
            })
            ->toArray();
    }

    /**
     * Send final report to client
     */
    private function sendFinalReport(PenetrationTest $pentest): void
    {
        try {
            Mail::to($pentest->client_email)->send(
                new \App\Mail\PentestReport($pentest)
            );

            // Also send to technical contact if different
            if ($pentest->authorization && 
                $pentest->authorization->technical_contact_email !== $pentest->client_email) {
                Mail::to($pentest->authorization->technical_contact_email)->send(
                    new \App\Mail\PentestReport($pentest)
                );
            }

        } catch (Exception $e) {
            Log::error('Failed to send final report', [
                'pentest_id' => $pentest->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Archive test data
     */
    private function archiveTestData(PenetrationTest $pentest): void
    {
        try {
            $archiveData = [
                'pentest' => $pentest->toArray(),
                'findings' => $pentest->findings->toArray(),
                'authorization' => $pentest->authorization->toArray(),
                'team' => $pentest->team->toArray(),
            ];

            $archivePath = "archives/penetration_tests/{$pentest->project_code}_" . date('Y-m-d') . ".json";
            Storage::disk('archive')->put($archivePath, json_encode($archiveData, JSON_PRETTY_PRINT));

            Log::info('Penetration test data archived', [
                'pentest_id' => $pentest->id,
                'archive_path' => $archivePath,
            ]);

        } catch (Exception $e) {
            Log::error('Failed to archive test data', [
                'pentest_id' => $pentest->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Assign team members to pentest
     */
    private function assignTeamMembers(PenetrationTest $pentest, array $testerIds): void
    {
        // This would create assignments in a pivot table
        // For now, we just store the IDs
        $pentest->update([
            'assigned_testers' => $testerIds,
        ]);
    }

    /**
     * Send pentest notifications
     */
    private function sendPentestNotifications(PenetrationTest $pentest, string $action): void
    {
        try {
            switch ($action) {
                case 'created':
                    // Notify team members
                    foreach ($pentest->assigned_testers as $testerId) {
                        $tester = User::find($testerId);
                        if ($tester) {
                            Mail::to($tester->email)->send(
                                new \App\Mail\PentestCreated($pentest)
                            );
                        }
                    }
                    break;

                case 'started':
                    // Notify client and team
                    Mail::to($pentest->client_email)->send(
                        new \App\Mail\PentestStarted($pentest)
                    );
                    break;
            }

        } catch (Exception $e) {
            Log::error('Failed to send pentest notifications', [
                'pentest_id' => $pentest->id,
                'action' => $action,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Send critical finding notification
     */
    private function sendCriticalFindingNotification(Finding $finding): void
    {
        try {
            // Notify client immediately
            Mail::to($finding->penetrationTest->client_email)->send(
                new \App\Mail\CriticalFinding($finding)
            );

            // Notify technical contact
            if ($finding->penetrationTest->authorization && 
                $finding->penetrationTest->authorization->technical_contact_email) {
                Mail::to($finding->penetrationTest->authorization->technical_contact_email)->send(
                    new \App\Mail\CriticalFinding($finding)
                );
            }

            // Notify team lead
            if ($finding->penetrationTest->teamLead) {
                Mail::to($finding->penetrationTest->teamLead->email)->send(
                    new \App\Mail\CriticalFinding($finding)
                );
            }

        } catch (Exception $e) {
            Log::error('Failed to send critical finding notification', [
                'finding_id' => $finding->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Get pentest statistics
     */
    public function getPentestStats(Team $team = null): array
    {
        $query = PenetrationTest::query();
        
        if ($team) {
            $query->where('team_id', $team->id);
        }

        $total = $query->count();
        $planning = $query->where('status', 'planning')->count();
        $inProgress = $query->where('status', 'in_progress')->count();
        $completed = $query->where('status', 'completed')->count();
        $onHold = $query->where('status', 'on_hold')->count();

        $totalFindings = \App\Models\Finding::whereHas('penetrationTest', function ($q) use ($team) {
            if ($team) {
                $q->where('team_id', $team->id);
            }
        })->count();

        $criticalFindings = \App\Models\Finding::whereHas('penetrationTest', function ($q) use ($team) {
            if ($team) {
                $q->where('team_id', $team->id);
            }
        })->where('severity', 'critical')->count();

        return [
            'total_tests' => $total,
            'planning' => $planning,
            'in_progress' => $inProgress,
            'completed' => $completed,
            'on_hold' => $onHold,
            'total_findings' => $totalFindings,
            'critical_findings' => $criticalFindings,
            'completion_rate' => $total > 0 ? round(($completed / $total) * 100, 2) : 0,
        ];
    }
}
