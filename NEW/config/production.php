<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Production Configuration
    |--------------------------------------------------------------------------
    |
    | This file contains production-specific settings for SecureScout Pro.
    | These settings are optimized for security, performance, and reliability
    | in professional security consulting environments.
    |
    */

    'app' => [
        'name' => env('APP_NAME', 'SecureScout Pro'),
        'env' => env('APP_ENV', 'production'),
        'debug' => env('APP_DEBUG', false),
        'url' => env('APP_URL'),
        'timezone' => 'UTC',
        'locale' => 'en',
        'fallback_locale' => 'en',
        'faker_locale' => 'en_US',
        'key' => env('APP_KEY'),
        'cipher' => 'AES-256-CBC',
        'maintenance' => [
            'driver' => 'file',
            'store' => 'redis',
        ],
    ],

    'security' => [
        /*
        |--------------------------------------------------------------------------
        | Security Settings
        |--------------------------------------------------------------------------
        |
        | Production security configurations for professional security consulting.
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
    ],

    'database' => [
        /*
        |--------------------------------------------------------------------------
        | Database Configuration
        |--------------------------------------------------------------------------
        |
        | Production database settings optimized for performance and reliability.
        |
        */
        
        'default' => env('DB_CONNECTION', 'pgsql'),
        
        'connections' => [
            'pgsql' => [
                'driver' => 'pgsql',
                'url' => env('DATABASE_URL'),
                'host' => env('DB_HOST', '127.0.0.1'),
                'port' => env('DB_PORT', '5432'),
                'database' => env('DB_DATABASE'),
                'username' => env('DB_USERNAME'),
                'password' => env('DB_PASSWORD'),
                'charset' => 'utf8',
                'prefix' => '',
                'prefix_indexes' => true,
                'search_path' => 'public',
                'sslmode' => 'require',
                'strict' => true,
                'engine' => null,
                'options' => [
                    PDO::ATTR_TIMEOUT => 30,
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ],
            ],
        ],
        
        'pooling' => [
            'max_connections' => 100,
            'min_connections' => 10,
            'connect_timeout' => 10,
            'idle_timeout' => 300,
        ],
    ],

    'cache' => [
        /*
        |--------------------------------------------------------------------------
        | Cache Configuration
        |--------------------------------------------------------------------------
        |
        | Production cache settings for optimal performance.
        |
        */
        
        'default' => env('CACHE_DRIVER', 'redis'),
        
        'stores' => [
            'redis' => [
                'driver' => 'redis',
                'connection' => 'cache',
                'lock_connection' => 'default',
            ],
            
            'opcache' => [
                'driver' => 'opcache',
            ],
        ],
        
        'prefix' => env('CACHE_PREFIX', str_slug(env('APP_NAME', 'laravel'), '_').'_cache'),
    ],

    'queue' => [
        /*
        |--------------------------------------------------------------------------
        | Queue Configuration
        |--------------------------------------------------------------------------
        |
        | Production queue settings for reliable background processing.
        |
        */
        
        'default' => env('QUEUE_CONNECTION', 'redis'),
        
        'connections' => [
            'redis' => [
                'driver' => 'redis',
                'connection' => 'default',
                'queue' => env('REDIS_QUEUE', 'default'),
                'retry_after' => 90,
                'block_for' => null,
                'after_commit' => true,
            ],
        ],
        
        'failed' => [
            'driver' => env('QUEUE_FAILED_DRIVER', 'database'),
            'database' => env('DB_CONNECTION', 'pgsql'),
            'table' => 'failed_jobs',
        ],
        
        'workers' => [
            'default' => [
                'connection' => 'redis',
                'queue' => ['default', 'high', 'low'],
                'sleep' => 3,
                'tries' => 3,
                'timeout' => 3600,
                'max_time' => 3600,
                'force' => false,
                'memory' => 256,
                'stop_when_empty' => false,
                'max_jobs' => 0,
                'rest' => 0,
            ],
            
            'verification' => [
                'connection' => 'redis',
                'queue' => ['verification'],
                'sleep' => 5,
                'tries' => 5,
                'timeout' => 1800,
            ],
            
            'osint' => [
                'connection' => 'redis',
                'queue' => ['osint'],
                'sleep' => 2,
                'tries' => 2,
                'timeout' => 300,
            ],
        ],
    ],

    'filesystems' => [
        /*
        |--------------------------------------------------------------------------
        | Filesystem Configuration
        |--------------------------------------------------------------------------
        |
        | Production filesystem settings for secure file storage.
        |
        */
        
        'default' => env('FILESYSTEM_DISK', 's3'),
        
        'disks' => [
            'local' => [
                'driver' => 'local',
                'root' => storage_path('app'),
                'throw' => false,
            ],
            
            'public' => [
                'driver' => 'local',
                'root' => storage_path('app/public'),
                'url' => env('APP_URL').'/storage',
                'visibility' => 'public',
                'throw' => false,
            ],
            
            's3' => [
                'driver' => 's3',
                'key' => env('AWS_ACCESS_KEY_ID'),
                'secret' => env('AWS_SECRET_ACCESS_KEY'),
                'region' => env('AWS_DEFAULT_REGION'),
                'bucket' => env('AWS_BUCKET'),
                'url' => env('AWS_URL'),
                'endpoint' => env('AWS_ENDPOINT'),
                'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
                'throw' => false,
                'visibility' => 'private',
                'options' => [
                    'ServerSideEncryption' => 'AES256',
                    'ACL' => 'private',
                ],
            ],
            
            'secure' => [
                'driver' => 's3',
                'key' => env('AWS_ACCESS_KEY_ID'),
                'secret' => env('AWS_SECRET_ACCESS_KEY'),
                'region' => env('AWS_DEFAULT_REGION'),
                'bucket' => env('AWS_SECURE_BUCKET', env('AWS_BUCKET').'-secure'),
                'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
                'throw' => false,
                'visibility' => 'private',
                'options' => [
                    'ServerSideEncryption' => 'AES256',
                    'ACL' => 'private',
                    'Metadata' => [
                        'x-amz-meta-encrypted' => 'true',
                    ],
                ],
            ],
            
            'archive' => [
                'driver' => 's3',
                'key' => env('AWS_ACCESS_KEY_ID'),
                'secret' => env('AWS_SECRET_ACCESS_KEY'),
                'region' => env('AWS_DEFAULT_REGION'),
                'bucket' => env('AWS_ARCHIVE_BUCKET', env('AWS_BUCKET').'-archive'),
                'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
                'throw' => false,
                'visibility' => 'private',
                'options' => [
                    'ServerSideEncryption' => 'AES256',
                    'ACL' => 'private',
                    'StorageClass' => 'GLACIER',
                ],
            ],
            
            'reports' => [
                'driver' => 's3',
                'key' => env('AWS_ACCESS_KEY_ID'),
                'secret' => env('AWS_SECRET_ACCESS_KEY'),
                'region' => env('AWS_DEFAULT_REGION'),
                'bucket' => env('AWS_REPORTS_BUCKET', env('AWS_BUCKET').'-reports'),
                'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
                'throw' => false,
                'visibility' => 'private',
                'options' => [
                    'ServerSideEncryption' => 'AES256',
                    'ACL' => 'private',
                ],
            ],
        ],
    ],

    'mail' => [
        /*
        |--------------------------------------------------------------------------
        | Mail Configuration
        |--------------------------------------------------------------------------
        |
        | Production mail settings for reliable email delivery.
        |
        */
        
        'default' => env('MAIL_MAILER', 'smtp'),
        
        'mailers' => [
            'smtp' => [
                'transport' => 'smtp',
                'host' => env('MAIL_HOST', 'smtp.mailgun.org'),
                'port' => env('MAIL_PORT', 587),
                'encryption' => env('MAIL_ENCRYPTION', 'tls'),
                'username' => env('MAIL_USERNAME'),
                'password' => env('MAIL_PASSWORD'),
                'timeout' => 30,
                'local_domain' => env('MAIL_EHLO_DOMAIN'),
            ],
            
            'ses' => [
                'transport' => 'ses',
            ],
        ],
        
        'from' => [
            'address' => env('MAIL_FROM_ADDRESS', 'noreply@securescout.com'),
            'name' => env('MAIL_FROM_NAME', 'SecureScout Pro'),
        ],
    ],

    'logging' => [
        /*
        |--------------------------------------------------------------------------
        | Logging Configuration
        |--------------------------------------------------------------------------
        |
        | Production logging settings for security and debugging.
        |
        */
        
        'default' => env('LOG_CHANNEL', 'stack'),
        
        'channels' => [
            'stack' => [
                'driver' => 'stack',
                'channels' => ['single', 'security'],
                'ignore_exceptions' => false,
            ],
            
            'single' => [
                'driver' => 'single',
                'path' => storage_path('logs/laravel.log'),
                'level' => env('LOG_LEVEL', 'warning'),
                'replace_placeholders' => true,
            ],
            
            'security' => [
                'driver' => 'daily',
                'path' => storage_path('logs/security.log'),
                'level' => 'info',
                'days' => 90,
                'replace_placeholders' => true,
            ],
            
            'audit' => [
                'driver' => 'daily',
                'path' => storage_path('logs/audit.log'),
                'level' => 'info',
                'days' => 2555, // 7 years for legal compliance
                'replace_placeholders' => true,
            ],
            
            'error' => [
                'driver' => 'daily',
                'path' => storage_path('logs/error.log'),
                'level' => 'error',
                'days' => 30,
                'replace_placeholders' => true,
            ],
            
            'performance' => [
                'driver' => 'daily',
                'path' => storage_path('logs/performance.log'),
                'level' => 'debug',
                'days' => 7,
                'replace_placeholders' => true,
            ],
        ],
    ],

    'services' => [
        /*
        |--------------------------------------------------------------------------
        | Third-Party Services
        |--------------------------------------------------------------------------
        |
        | Production settings for external service integrations.
        |
        */
        
        'postmark' => [
            'token' => env('POSTMARK_TOKEN'),
        ],
        
        'ses' => [
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
        ],
        
        'resend' => [
            'key' => env('RESEND_KEY'),
        ],
        
        'slack' => [
            'notifications' => [
                'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
                'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
            ],
        ],
        
        'verification' => [
            'onfido' => [
                'api_key' => env('ONFIDO_API_KEY'),
                'api_url' => 'https://api.onfido.com/v3',
                'webhook_token' => env('ONFIDO_WEBHOOK_TOKEN'),
            ],
            
            'jumio' => [
                'api_key' => env('JUMIO_API_KEY'),
                'api_secret' => env('JUMIO_API_SECRET'),
                'api_url' => 'https://api.jumio.com',
            ],
            
            'checkr' => [
                'api_key' => env('CHECKR_API_KEY'),
                'api_url' => 'https://api.checkr.com/v1',
            ],
        ],
        
        'security_ecosystem' => [
            'shodan' => [
                'api_key' => env('SHODAN_API_KEY'),
                'rate_limit' => [
                    'requests_per_minute' => 1,
                    'requests_per_month' => 1000,
                ],
            ],
            
            'virustotal' => [
                'api_key' => env('VIRUSTOTAL_API_KEY'),
                'rate_limit' => [
                    'requests_per_minute' => 4,
                    'requests_per_month' => 15000,
                ],
            ],
            
            'abuseipdb' => [
                'api_key' => env('ABUSEIPDB_API_KEY'),
                'rate_limit' => [
                    'requests_per_minute' => 15,
                    'requests_per_month' => 5000,
                ],
            ],
            
            'haveibeenpwned' => [
                'api_key' => env('HAVEIBEENPWNED_API_KEY'),
                'rate_limit' => [
                    'requests_per_minute' => 2,
                    'requests_per_month' => 1500,
                ],
            ],
        ],
    ],

    'legal' => [
        /*
        |--------------------------------------------------------------------------
        | Legal & Compliance Settings
        |--------------------------------------------------------------------------
        |
        | Production legal configuration for compliance requirements.
        |
        */
        
        'company' => [
            'name' => env('LEGAL_COMPANY_NAME'),
            'address' => env('LEGAL_ADDRESS'),
            'phone' => env('LEGAL_PHONE'),
            'email' => env('LEGAL_EMAIL'),
            'website' => env('LEGAL_WEBSITE'),
        ],
        
        'compliance' => [
            'data_retention_years' => 7,
            'audit_log_retention_years' => 7,
            'evidence_retention_years' => 7,
            'require_legal_acceptance' => true,
            'gdpr_compliant' => true,
            'hipaa_compliant' => env('HIPAA_COMPLIANT', false),
            'pci_dss_compliant' => env('PCI_DSS_COMPLIANT', false),
        ],
        
        'notifications' => [
            'abuse_reports' => env('ABUSE_REPORT_EMAIL'),
            'legal_inquiries' => env('LEGAL_EMAIL'),
            'security_incidents' => env('SECURITY_INCIDENT_EMAIL'),
            'data_breaches' => env('DATA_BREACH_EMAIL'),
        ],
    ],

    'performance' => [
        /*
        |--------------------------------------------------------------------------
        | Performance Settings
        |--------------------------------------------------------------------------
        |
        | Production performance optimizations.
        |
        */
        
        'opcache' => [
            'enabled' => true,
            'memory_consumption' => 256,
            'max_accelerated_files' => 10000,
            'revalidate_freq' => 0,
            'validate_timestamps' => 0,
        ],
        
        'redis' => [
            'maxmemory' => '256mb',
            'maxmemory_policy' => 'allkeys-lru',
            'save' => ['900 1', '300 10', '60 10000'],
        ],
        
        'database' => [
            'connection_pool_size' => 20,
            'query_timeout' => 30,
            'slow_query_threshold' => 1000, // milliseconds
        ],
        
        'cache' => [
            'default_ttl' => 3600, // 1 hour
            'session_ttl' => 28800, // 8 hours
            'authorization_ttl' => 3600, // 1 hour
        ],
    ],

    'monitoring' => [
        /*
        |--------------------------------------------------------------------------
        | Monitoring & Health Checks
        |--------------------------------------------------------------------------
        |
        | Production monitoring configuration.
        |
        */
        
        'health' => [
            'enabled' => true,
            'endpoint' => '/health',
            'checks' => [
                'database' => true,
                'redis' => true,
                'filesystem' => true,
                'queue' => true,
                'cache' => true,
                'external_services' => true,
            ],
        ],
        
        'metrics' => [
            'enabled' => true,
            'collection_interval' => 60, // seconds
            'retention_days' => 30,
        ],
        
        'alerts' => [
            'email' => env('ALERT_EMAIL'),
            'slack_webhook' => env('SLACK_WEBHOOK_URL'),
            'thresholds' => [
                'error_rate' => 5, // percentage
                'response_time' => 5000, // milliseconds
                'queue_size' => 1000,
                'disk_usage' => 80, // percentage
                'memory_usage' => 85, // percentage
            ],
        ],
    ],

    'backup' => [
        /*
        |--------------------------------------------------------------------------
        | Backup Configuration
        |--------------------------------------------------------------------------
        |
        | Production backup settings for disaster recovery.
        |
        */
        
        'enabled' => true,
        'schedule' => '0 2 * * *', // Daily at 2 AM
        'retention_days' => 30,
        'compression' => true,
        'encryption' => true,
        
        'destinations' => [
            'local' => [
                'path' => '/backup/securescout',
                'enabled' => true,
            ],
            
            's3' => [
                'bucket' => env('AWS_BACKUP_BUCKET'),
                'enabled' => env('AWS_BACKUP_ENABLED', false),
            ],
        ],
        
        'include' => [
            'database' => true,
            'storage' => true,
            'config' => true,
        ],
        
        'exclude' => [
            'storage/logs/*.log',
            'storage/framework/cache/*',
            'storage/framework/sessions/*',
            'storage/framework/views/*',
        ],
    ],
];
