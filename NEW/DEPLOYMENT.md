# SecureScout Pro - Production Deployment Guide

## 🚀 Production Deployment Checklist

### 📋 Prerequisites

#### System Requirements
- **PHP**: 8.3 or higher
- **Database**: PostgreSQL 14+ or MySQL 8.0+
- **Web Server**: Nginx 1.18+ or Apache 2.4+
- **Memory**: Minimum 4GB RAM (8GB+ recommended)
- **Storage**: 100GB+ SSD storage
- **SSL**: Valid SSL certificate required

#### External Services Required
- **Email Service**: SMTP server (SendGrid, AWS SES, etc.)
- **File Storage**: AWS S3, Google Cloud Storage, or compatible
- **Redis**: For caching and session storage
- **Queue Worker**: For background job processing

#### Security Certifications
- **Organization**: Must be registered legal entity
- **Insurance**: Professional liability insurance (recommended $2M+)
- **Compliance**: Relevant industry certifications (CISSP, CEH, etc.)

---

## 🔧 Installation Steps

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y nginx postgresql postgresql-contrib redis-server \
    php8.3 php8.3-fpm php8.3-pgsql php8.3-mbstring php8.3-xml \
    php8.3-curl php8.3-zip php8.3-bcmath php8.3-gd \
    composer unzip git

# Configure PHP
sudo nano /etc/php/8.3/fpm/php.ini
# Set: memory_limit = 512M, upload_max_filesize = 100M, post_max_size = 100M

# Configure Nginx
sudo nano /etc/nginx/sites-available/securescout
```

### 2. Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    root /var/www/securescout/public;
    index index.php;
    
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### 3. Database Setup

```bash
# Create database
sudo -u postgres psql
CREATE DATABASE securescout;
CREATE USER securescout WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE securescout TO securescout;
\q
```

### 4. Application Deployment

```bash
# Clone repository
cd /var/www
sudo git clone https://github.com/your-org/securescout-pro.git securescout
sudo chown -R www-data:www-data securescout
cd securescout

# Install dependencies
composer install --no-dev --optimize-autoloader

# Environment setup
cp .env.example .env
nano .env
```

### 5. Environment Configuration

```env
APP_NAME="SecureScout Pro"
APP_ENV=production
APP_KEY=base64:your-generated-key
APP_DEBUG=false
APP_URL=https://your-domain.com

# Database
DB_CONNECTION=pgsql
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=securescout
DB_USERNAME=securescout
DB_PASSWORD=your-secure-password

# Cache & Session
CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

# Mail
MAIL_MAILer=smtp
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=your-sendgrid-username
MAIL_PASSWORD=your-sendgrid-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@your-domain.com
MAIL_FROM_NAME="${APP_NAME}"

# File Storage
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=your-s3-bucket
AWS_USE_PATH_STYLE_ENDPOINT=false

# Security
ENCRYPTION_KEY=your-32-character-encryption-key
HASH_PEPPER=your-hash-pepper-value

# Verification Services
ONFIDO_API_KEY=your-onfido-key
JUMIO_API_KEY=your-jumio-key
CHECKR_API_KEY=your-checkr-key

# Security Ecosystem
SHODAN_API_KEY=your-shodan-key
VIRUSTOTAL_API_KEY=your-virustotal-key
ABUSEIPDB_API_KEY=your-abuseipdb-key

# Legal Compliance
LEGAL_COMPANY_NAME="Your Security Consulting Inc."
LEGAL_ADDRESS="123 Security Blvd, San Francisco, CA 94105"
LEGAL_PHONE="+1-555-SECURE-1"
LEGAL_EMAIL="legal@your-domain.com"
```

### 6. Final Setup

```bash
# Generate application key
php artisan key:generate

# Run migrations
php artisan migrate --force

# Create storage links
php artisan storage:link

# Optimize application
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Setup queue worker
sudo nano /etc/systemd/system/securescout-queue.service
```

### 7. Queue Worker Service

```ini
[Unit]
Description=SecureScout Queue Worker
After=network.target

[Service]
User=www-data
Group=www-data
Restart=always
ExecStart=/usr/bin/php /var/www/securescout/artisan queue:work --sleep=3 --tries=3 --max-time=3600

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start services
sudo systemctl enable securescout-queue
sudo systemctl start securescout-queue
sudo systemctl enable nginx
sudo systemctl restart nginx
sudo systemctl enable php8.3-fpm
sudo systemctl restart php8.3-fpm
```

---

## 🔒 Security Hardening

### 1. Firewall Configuration

```bash
# Configure UFW
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw deny 5432  # PostgreSQL from external
sudo ufw deny 6379  # Redis from external
```

### 2. SSL Configuration

```bash
# Install Certbot for free SSL
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

# Setup auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Security Headers

Add to Nginx configuration:
```nginx
# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```

### 4. File Permissions

```bash
# Secure file permissions
sudo chmod -R 755 /var/www/securescout
sudo chmod -R 777 /var/www/securescout/storage
sudo chmod -R 777 /var/www/securescout/bootstrap/cache
sudo chown -R www-data:www-data /var/www/securescout
```

---

## 🔍 Monitoring & Logging

### 1. Application Monitoring

```bash
# Setup log rotation
sudo nano /etc/logrotate.d/securescout
```

```
/var/www/securescout/storage/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload php8.3-fpm
    endscript
}
```

### 2. System Monitoring

Install monitoring tools:
```bash
# Install monitoring
sudo apt install -y htop iotop nethogs

# Setup log monitoring
sudo tail -f /var/www/securescout/storage/logs/laravel.log
```

### 3. Backup Strategy

```bash
# Create backup script
sudo nano /usr/local/bin/securescout-backup
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/securescout"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -h localhost -U securescout securescout | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Files backup
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /var/www/securescout/storage/app

# Upload to cloud storage (optional)
# aws s3 cp $BACKUP_DIR/db_$DATE.sql.gz s3://your-backup-bucket/

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

```bash
# Make executable and schedule
sudo chmod +x /usr/local/bin/securescout-backup
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/securescout-backup
```

---

## 🚀 Performance Optimization

### 1. PHP Optimization

```ini
# /etc/php/8.3/fpm/php.ini
memory_limit = 512M
max_execution_time = 300
upload_max_filesize = 100M
post_max_size = 100M
max_input_vars = 3000
opcache.enable = 1
opcache.memory_consumption = 256
opcache.max_accelerated_files = 10000
```

### 2. Database Optimization

```sql
-- PostgreSQL optimization
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
SELECT pg_reload_conf();
```

### 3. Redis Configuration

```bash
# /etc/redis/redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

---

## 📊 Scaling Considerations

### 1. Horizontal Scaling

- **Load Balancer**: Nginx or AWS ALB
- **Multiple App Servers**: Identical instances behind load balancer
- **Database Replication**: Read replicas for scaling
- **Redis Cluster**: For distributed caching

### 2. Vertical Scaling

- **CPU**: 4+ cores for production
- **RAM**: 8GB+ recommended
- **Storage**: SSD with high IOPS
- **Network**: 1Gbps+ connection

---

## 🔧 Maintenance Tasks

### 1. Regular Updates

```bash
# Monthly security updates
sudo apt update && sudo apt upgrade -y
composer update --no-dev
php artisan config:cache
php artisan route:cache
```

### 2. Health Checks

```bash
# Create health check endpoint
php artisan make:controller HealthController
```

```php
// Add to routes/web.php
Route::get('/health', function () {
    return response()->json([
        'status' => 'healthy',
        'timestamp' => now()->toISOString(),
        'version' => config('app.version'),
    ]);
});
```

### 3. Log Analysis

```bash
# Monitor error logs
tail -f /var/www/securescout/storage/logs/laravel.log | grep ERROR

# Monitor access patterns
sudo tail -f /var/log/nginx/access.log | grep -v "GET /health"
```

---

## 🚨 Troubleshooting

### Common Issues

1. **502 Bad Gateway**: Check PHP-FPM status
   ```bash
   sudo systemctl status php8.3-fpm
   sudo systemctl restart php8.3-fpm
   ```

2. **Database Connection**: Check PostgreSQL status
   ```bash
   sudo systemctl status postgresql
   sudo -u postgres psql -c "SELECT 1;"
   ```

3. **Queue Not Processing**: Check queue worker
   ```bash
   sudo systemctl status securescout-queue
   sudo systemctl restart securescout-queue
   ```

4. **File Upload Issues**: Check permissions
   ```bash
   sudo chown -R www-data:www-data /var/www/securescout/storage
   sudo chmod -R 777 /var/www/securescout/storage
   ```

---

## 📞 Support & Emergency Contacts

### Technical Support
- **Email**: support@securescout.com
- **Phone**: +1-555-SUPPORT
- **Documentation**: https://docs.securescout.com

### Legal & Compliance
- **Legal Team**: legal@securescout.com
- **Compliance Officer**: compliance@securescout.com
- **Emergency**: +1-555-EMERGENCY

### Security Incidents
- **Security Team**: security@securescout.com
- **Incident Response**: incident@securescout.com
- **Hotline**: +1-555-SECURITY

---

## ✅ Production Readiness Checklist

- [ ] SSL certificate installed and valid
- [ ] Database configured and migrated
- [ ] Environment variables set correctly
- [ ] Queue worker running
- [ ] File permissions set correctly
- [ ] Backup strategy implemented
- [ ] Monitoring configured
- [ ] Security headers implemented
- [ ] Legal compliance verified
- [ ] Performance optimization applied
- [ ] Documentation complete
- [ ] Emergency contacts configured

---

## 🎯 Go-Live Procedure

1. **Final Testing**: Verify all functionality in staging
2. **Backup Current**: Create full system backup
3. **Deploy Code**: Pull latest stable release
4. **Run Migrations**: Apply database changes
5. **Clear Caches**: Flush all application caches
6. **Verify Services**: Check all systems operational
7. **Monitor Closely**: Watch for issues first 24 hours
8. **Document**: Record deployment details

---

**🚀 SecureScout Pro is now ready for production deployment in professional security consulting environments!**

*This deployment guide ensures enterprise-grade security, compliance, and reliability for professional security consulting operations.*
