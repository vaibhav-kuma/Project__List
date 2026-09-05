<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Security Configuration
    |--------------------------------------------------------------------------
    |
    | This file contains security configurations for SecureScout Pro.
    |
    */

    'encryption' => [
        'key' => env('ENCRYPTION_KEY'),
        'cipher' => 'AES-256-GCM',
        'salt' => env('ENCRYPTION_SALT'),
    ],
    
    'hashing' => [
        'pepper' => env('HASH_PEPPER'),
        'rounds' => 12,
    ],
    
    'session' => [
        'lifetime' => 480, // 8 hours
        'expire_on_close' => false,
        'encrypt' => true,
        'files' => null,
        'connection' => null,
        'table' => 'sessions',
        'store' => 'redis',
        'lottery' => [2, 100],
        'cookie' => 'securescout_session',
        'path' => '/',
        'domain' => env('SESSION_DOMAIN'),
        'secure' => env('SESSION_SECURE_COOKIE', true),
        'http_only' => true,
        'same_site' => 'lax',
    ],
    
    'csrf' => [
        'token_lifetime' => 7200, // 2 hours
        'refresh_interval' => 3600, // 1 hour
    ],
    
    'rate_limiting' => [
        'api' => '1000:1', // 1000 requests per minute
        'auth' => '10:1',   // 10 login attempts per minute
        'verification' => '5:1', // 5 verification attempts per minute
        'osint' => '60:1', // 60 OSINT requests per minute
    ],
    
    'password_policy' => [
        'min_length' => 12,
        'require_uppercase' => true,
        'require_lowercase' => true,
        'require_numbers' => true,
        'require_symbols' => true,
        'prevent_reuse' => 5,
        'expiry_days' => 90,
    ],
    
    'mfa' => [
        'required' => true,
        'backup_codes' => 10,
        'code_lifetime' => 300, // 5 minutes
    ],
    
    'authorization' => [
        'required_for_testing' => true,
        'auto_expire_days' => 30,
        'require_document_upload' => true,
        'allowed_types' => [
            'penetration_test' => 'Penetration Testing',
            'vulnerability_assessment' => 'Vulnerability Assessment',
            'security_audit' => 'Security Audit',
            'compliance_assessment' => 'Compliance Assessment',
            'internal_test' => 'Internal Security Test',
            'law_enforcement' => 'Law Enforcement Investigation',
        ],
        'scope_validation' => true,
        'auto_approval_enabled' => false,
    ],
    
    'abuse_detection' => [
        'enabled' => true,
        'honeypot_enabled' => true,
        'behavioral_analysis' => true,
        'suspicious_patterns' => [
            'rapid_requests' => 100, // requests per minute
            'failed_logins' => 5, // failed attempts
            'unusual_timing' => true,
            'geographic_anomalies' => true,
        ],
        'auto_block_threshold' => 10,
        'block_duration_minutes' => 60,
    ],
    
    'evidence' => [
        'encryption_enabled' => true,
        'timestamping_enabled' => true,
        'retention_years' => 7,
        'hash_algorithm' => 'sha256',
        'timestamp_authority' => 'http://timestamp.digicert.com',
    ],
    
    'monitoring' => [
        'log_all_actions' => true,
        'audit_trail_enabled' => true,
        'real_time_alerts' => true,
        'alert_thresholds' => [
            'failed_attempts' => 5,
            'suspicious_activities' => 3,
            'unauthorized_access' => 1,
        ],
    ],
];
