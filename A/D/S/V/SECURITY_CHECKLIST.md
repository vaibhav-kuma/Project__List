# ── Ninor Production Security Checklist ─────────────

## ── INFRASTRUCTURE ──────────────────────────────────

### Network Security
- [ ] VPC configured with public and private subnets
- [ ] Database in private subnet only (no public access)
- [ ] Redis in private subnet with auth token enabled
- [ ] EKS API endpoint set to private + public (public locked to office IPs)
- [ ] Security groups follow least-privilege principle
- [ ] Network policies restrict pod-to-pod communication
- [ ] WAF enabled with rate limiting, SQLi, XSS, bot control rules
- [ ] Shield Advanced enabled for DDoS protection
- [ ] ALB configured with TLS 1.2+ only
- [ ] VPC Flow Logs enabled and shipped to CloudWatch/S3

### Access Control
- [ ] IAM roles used instead of IAM users (no long-lived credentials)
- [ ] EKS node IAM role has minimum required permissions
- [ ] Pod identities used for AWS service access (IRSA)
- [ ] Terraform state bucket encrypted and versioned
- [ ] DynamoDB table for Terraform locks
- [ ] MFA required for AWS console access
- [ ] AWS CloudTrail enabled across all regions
- [ ] AWS Config rules enabled for compliance monitoring
- [ ] Access keys rotated every 90 days
- [ ] No hardcoded credentials in code or configs

### Kubernetes Security
- [ ] RBAC enabled with least-privilege roles
- [ ] Pod Security Standards (restricted profile)
- [ ] Secrets encrypted at rest with KMS (enabled in EKS)
- [ ] Secrets managed with External Secrets Operator or SealedSecrets
- [ ] Container images scanned for vulnerabilities (Trivy in CI)
- [ ] ImagePullPolicy set to Always
- [ ] Pod resource limits set (no unbounded pods)
- [ ] PodDisruptionBudget configured (minAvailable)
- [ ] HorizontalPodAutoscaler configured
- [ ] Network policies applied and tested
- [ ] OPA/Gatekeeper policies for admission control
- [ ] Kubernetes version updated within supported window

## ── APPLICATION ────────────────────────────────────

### API Security
- [ ] All endpoints require authentication (except /health, /auth/*)
- [ ] JWT tokens with short expiry (15m access, 7d refresh)
- [ ] Refresh token rotation implemented
- [ ] Rate limiting on auth endpoints (5 attempts/min)
- [ ] Rate limiting on all API endpoints (100 req/min per IP)
- [ ] Input validation with Zod schemas
- [ ] SQL injection prevention (parameterized queries via Prisma)
- [ ] XSS prevention (output encoding, CSP headers)
- [ ] CSRF protection (SameSite cookies, Origin checks)
- [ ] IDOR prevention (ownership checks on all resource access)
- [ ] Mass assignment protection (explicit field allowlists)
- [ ] API versioning for breaking changes
- [ ] Request size limits (body parser config)
- [ ] CORS configured with explicit origin allowlist
- [ ] Security headers set (HSTS, X-Frame-Options, etc.)

### Authentication & Authorization
- [ ] Password hashing with bcrypt (cost factor 12+)
- [ ] Password strength requirements enforced (8+ chars, mixed case, number)
- [ ] Account lockout after 5 failed attempts
- [ ] Email verification before full access
- [ ] Phone verification (SMS OTP) for sensitive operations
- [ ] 2FA support (TOTP)
- [ ] Session management with refresh tokens
- [ ] Role-based access control (user, moderator, admin)
- [ ] Admin routes protected by admin middleware
- [ ] Moderation routes protected by moderator middleware
- [ ] Premium feature gating with feature flag checks

### Data Security
- [ ] Sensitive data encrypted at rest (RDS, ElastiCache, S3)
- [ ] PII fields minimized in API responses
- [ ] User passwords never returned in responses
- [ ] Email addresses not exposed in public APIs
- [ ] Chat logs retention policy (30 days then anonymized)
- [ ] Video session data not persisted after session end
- [ ] Moderation action data retained for compliance (1 year)
- [ ] GDPR data export and deletion supported
- [ ] Data classification policy documented

### Compliance
- [ ] COPPA compliance (age verification for under 13)
- [ ] GDPR compliance (data export, deletion, consent records)
- [ ] Age verification for adult content (18+ check)
- [ ] Parental consent workflow for minors
- [ ] Legal document versioning and consent tracking
- [ ] Moderation appeal process documented
- [ ] Terms of Service and Privacy Policy displayed
- [ ] Cookie consent banner implemented
- [ ] CCPA compliance (opt-out of data sale)
- [ ] Accessibility (WCAG 2.1 AA) for core flows

## ── CI/CD ──────────────────────────────────────────

### Pipeline Security
- [ ] Secrets stored in GitHub Secrets / AWS Secrets Manager
- [ ] No secrets leaked in build logs
- [ ] Dependencies scanned for vulnerabilities (npm audit)
- [ ] Container images scanned (Trivy)
- [ ] SAST scanning (ESLint security plugin)
- [ ] Snyk/Dependabot enabled for dependency monitoring
- [ ] Third-party code reviews for dependency updates
- [ ] Signed commits (GPG)
- [ ] Branch protection rules on main branch
- [ ] Required PR reviews (min 2) for production
- [ ] Status checks required before merge
- [ ] No direct pushes to main/production branches

### Deployment Security
- [ ] Zero-downtime rolling updates
- [ ] Canary deployments for major changes
- [ ] Automatic rollback on health check failure
- [ ] Staging environment identical to production
- [ ] Database migrations run before app rollout
- [ ] Blue-green deployment capability
- [ ] Feature flags for gradual rollout
- [ ] Smoke tests run after deployment
- [ ] Performance tests before production deploy

## ── MONITORING & INCIDENT RESPONSE ─────────────────

### Monitoring
- [ ] Application performance monitoring (Sentry/APM)
- [ ] Error tracking with source maps (Sentry)
- [ ] Infrastructure monitoring (CPU, memory, disk, network)
- [ ] Database monitoring (connections, slow queries, replication lag)
- [ ] Redis monitoring (memory usage, hit rate, evictions)
- [ ] Uptime monitoring (external, multi-region)
- [ ] SSL certificate expiry monitoring
- [ ] Custom business metrics (active users, match rate, etc.)
- [ ] Log aggregation and search (Loki/CloudWatch)
- [ ] Metrics retention: 30 days Prometheus, 90 days logs

### Alerting
- [ ] Critical alerts → PagerDuty phone call (24/7)
- [ ] High alerts → Slack (office hours)
- [ ] Warning alerts → Slack (best effort)
- [ ] Alert on: pod restarts, high error rate, high latency, 5xx spikes
- [ ] Alert on: database connection pool exhaustion
- [ ] Alert on: disk space < 20%
- [ ] Alert on: certificate < 14 days to expiry
- [ ] No duplicate/alert-fatigue (appropriate thresholds and for duration)
- [ ] On-call rotation documented (primary + secondary)

### Incident Response
- [ ] Incident response plan documented
- [ ] Severity levels defined (SEV1: app down, SEV2: degraded, SEV3: minor)
- [ ] Runbooks for common incidents:
  - [ ] Database failover
  - [ ] Redis failover
  - [ ] Pod crash loop
  - [ ] High latency
  - [ ] Storage full
  - [ ] DDoS attack
- [ ] Post-mortem process established (blameless)
- [ ] Communication templates for user-facing incidents
- [ ] Backup tested monthly via restore drill

## ── BACKUP & DISASTER RECOVERY ─────────────────────

### Database Backups
- [ ] Automated daily backups (pg_dump custom format)
- [ ] Transaction log shipping (point-in-time recovery)
- [ ] Encrypted backups at rest (GPG)
- [ ] Backups stored in separate region (cross-region replication)
- [ ] Retention: daily (30 days), weekly (12 months), monthly (7 years)
- [ ] Backup integrity verified weekly
- [ ] Restore tested monthly
- [ ] RDS automated backups enabled (30 day retention)
- [ ] RDS multi-AZ deployment for HA

### Disaster Recovery
- [ ] RTO: 1 hour, RPO: 5 minutes
- [ ] Cross-region failover capability documented
- [ ] Infrastructure defined as code (Terraform)
- [ ] Configuration backed up (Kubernetes manifests in git)
- [ ] Environment variables documented (not in git)
- [ ] DNS failover with Route53 health checks
- [ ] Static assets in S3 with CloudFront (no dependency on app for serving)
- [ ] Dependency versions pinned (package-lock.json)
- [ ] Docker images cached in registry with tags

## ── DEPENDENCY & THIRD-PARTY ───────────────────────

- [ ] Stripe: webhook signature verification enabled
- [ ] Cloudinary: signed uploads, secure URLs
- [ ] Sentry: data scrubbing for PII
- [ ] LiveKit: API key + secret authentication
- [ ] SendGrid/AWS SES: DKIM, SPF, DMARC configured
- [ ] GitHub: branch protection, Dependabot, secret scanning
- [ ] npm: no deprecated packages, audit regularly
- [ ] Docker: base images pinned to specific digests
- [ ] Redis: AUTH token, TLS enabled
- [ ] PostgreSQL: SSL connections enforced

## ── REGULAR AUDITS ──────────────────────────────────

- [ ] Weekly: dependency audit (npm audit, Dependabot)
- [ ] Weekly: review error rates and latency trends
- [ ] Monthly: security review of new features
- [ ] Monthly: backup restore test
- [ ] Monthly: review IAM roles and permissions
- [ ] Quarterly: penetration test
- [ ] Quarterly: review incident response runbooks
- [ ] Quarterly: update disaster recovery plan
- [ ] Bi-annual: third-party security audit
- [ ] Annual: SOC2 / ISO 27001 readiness review
- [ ] Continuous: SAST/DAST scanning in CI pipeline
- [ ] Continuous: dependency vulnerability scanning

## ── CONTACTS ────────────────────────────────────────

| Role            | Name              | Phone             | Email                 |
|-----------------|-------------------|-------------------|-----------------------|
| Security Lead   | [Name]            | [Phone]           | security@ninor.app   |
| DevOps Lead     | [Name]            | [Phone]           | devops@ninor.app     |
| On-call Engineer| Rotation Schedule | [Phone]           | oncall@ninor.app     |
| DB Admin        | [Name]            | [Phone]           | dba@ninor.app        |
| Legal/Compliance| [Name]            | [Phone]           | legal@ninor.app      |

## ── SIGN-OFF ───────────────────────────────────────

- [ ] Security review completed by: ___________ Date: ___________
- [ ] Infrastructure review completed by: ___________ Date: ___________
- [ ] Compliance review completed by: ___________ Date: ___________
- [ ] Penetration test passed: ___________ Date: ___________
- [ ] Go/No-Go decision: ___________ Date: ___________
