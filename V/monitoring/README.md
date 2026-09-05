# ── Ninor Monitoring Guide ──────────────────────────
# Components: Prometheus + Grafana + Sentry + Uptime Kuma + Loki + Alertmanager

## ── 1. Prometheus (Metrics Collection) ─────────────

# Deploy via Helm into the monitoring namespace
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  --set grafana.enabled=true \
  --set grafana.adminPassword=CHANGEME \
  --set prometheus.prometheusSpec.scrapeInterval=15s \
  --set prometheus.prometheusSpec.retention=30d \
  --set prometheus.prometheusSpec.retentionSize=50GB \
  --set alertmanager.enabled=true \
  --set alertmanager.config.global.resolve_timeout=5m \
  -f - <<EOF
alertmanager:
  config:
    global:
      slack_api_url: "https://hooks.slack.com/services/CHANGEME"
    route:
      receiver: "slack-critical"
      routes:
        - match:
            severity: critical
          receiver: "slack-critical"
        - match:
            severity: warning
          receiver: "slack-warning"
    receivers:
      - name: "slack-critical"
        slack_configs:
          - channel: "#alerts-critical"
            title: "[CRITICAL] {{ .GroupLabels.alertname }}"
            text: "{{ .CommonAnnotations.description }}"
            send_resolved: true
      - name: "slack-warning"
        slack_configs:
          - channel: "#alerts-warnings"
            title: "[WARNING] {{ .GroupLabels.alertname }}"
            text: "{{ .CommonAnnotations.description }}"
            send_resolved: true
EOF

# Custom PrometheusRules (save as monitoring/alerts.yaml)
cat > monitoring/alerts.yaml << 'ALERTS'
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ninor-alerts
  namespace: monitoring
spec:
  groups:
  - name: ninor-backend
    rules:
    - alert: BackendDown
      expr: up{job="ninor-backend"} == 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Backend is down"
        description: "Backend pod {{ $labels.pod }} has been down for >1m"

    - alert: HighErrorRate
      expr: rate(http_requests_duration_seconds_count{status=~"5.."}[5m]) / rate(http_requests_duration_seconds_count[5m]) > 0.05
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High error rate ({{ $value | humanizePercentage }})"
        description: "Backend error rate > 5% for 5m"

    - alert: HighLatency
      expr: histogram_quantile(0.95, rate(http_requests_duration_seconds_bucket[5m])) > 2
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High latency (p95: {{ $value }}s)"
        description: "API p95 latency > 2s for 5m"

    - alert: HighCPUUsage
      expr: sum(rate(container_cpu_usage_seconds_total{namespace="ninor"}[5m])) by (pod) / sum(kube_pod_container_resource_limits{namespace="ninor", resource="cpu"}) by (pod) > 0.8
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High CPU on {{ $labels.pod }}"
        description: "CPU usage > 80% for 10m"

    - alert: HighMemoryUsage
      expr: sum(container_memory_working_set_bytes{namespace="ninor"}) by (pod) / sum(kube_pod_container_resource_limits{namespace="ninor", resource="memory"}) by (pod) > 0.85
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High memory on {{ $labels.pod }}"
        description: "Memory usage > 85% for 10m"

    - alert: DatabaseConnectionsHigh
      expr: pg_stat_activity_count > 80
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High DB connections"
        description: "PostgreSQL connections > 80"

    - alert: RedisMemoryHigh
      expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.8
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Redis memory > 80%"
        description: "Redis is using {{ $value | humanizePercentage }} of max memory"
ALERTS

## ── 2. Grafana Dashboards ──────────────────────────

# Import dashboards:
# - Kubernetes / Views (ID: 15759) — cluster overview
# - Node Exporter Full (ID: 1860) — node metrics
# - PostgreSQL (ID: 9628) — database metrics
# - Redis (ID: 11835) — cache metrics

# Ninor-specific dashboard queries:
# Dashboard: "Ninor Application Overview"
#
# Panel: Request Rate
#   PromQL: sum(rate(http_requests_total{namespace="ninor"}[5m]))
#
# Panel: Error Rate
#   PromQL: sum(rate(http_requests_total{namespace="ninor", status=~"5.."}[5m])) / sum(rate(http_requests_total{namespace="ninor"}[5m]))
#
# Panel: p50/p95/p99 Latency
#   PromQL: histogram_quantile(0.50, rate(http_request_duration_seconds_bucket{namespace="ninor"}[5m]))
#   PromQL: histogram_quantile(0.95, ...)
#   PromQL: histogram_quantile(0.99, ...)
#
# Panel: Active Users
#   PromQL: sum(active_users_total{namespace="ninor"})
#
# Panel: Active Video Sessions
#   PromQL: sum(video_sessions_active{namespace="ninor"})
#
# Panel: Matches Per Minute
#   PromQL: rate(matches_total{namespace="ninor"}[5m])

## ── 3. Sentry (Error Tracking) ─────────────────────

# Backend Sentry setup (already in code):
# SENTRY_DSN=https://key@sentry.io/project
# SENTRY_ENVIRONMENT=production

# Add performance monitoring:
#   - Set SENTRY_TRACES_SAMPLE_RATE=0.2 in production
#   - Set SENTRY_TRACES_SAMPLE_RATE=1.0 in staging

# Key performance transactions to monitor:
#   - HTTP request handling
#   - WebSocket events
#   - Database queries
#   - ML moderation
#   - Matching algorithm

## ── 4. Loki (Log Aggregation) ──────────────────────

helm upgrade --install loki grafana/loki-stack \
  --namespace monitoring \
  --set loki.persistence.enabled=true \
  --set loki.persistence.size=50Gi \
  --set promtail.enabled=true

# Promtail automatically scrapes all container logs in the cluster.
# Logs are queryable in Grafana via the Loki data source.

# Log levels by environment:
#   production: info
#   staging:    debug
#   test:       debug

## ── 5. Uptime Monitoring ──────────────────────────

# Option A: Uptime Kuma (self-hosted)
helm upgrade --install uptime-kuma k8s-at-home/uptime-kuma \
  --namespace monitoring

# Monitors:
#   - https://ninor.app          (main site)
#   - https://api.ninor.app/health (API health)
#   - wss://ws.ninor.app        (WebSocket)
#   - DNS: ninor.app             (DNS resolution)
#   - Certificate expiry alert at 14 days

# Option B: Checkly / Better Uptime (SaaS)
#   - HTTP checks every 1 minute
#   - SSL certificate monitoring
#   - Playwright browser checks for critical flows (login, register)
#   - Status page: status.ninor.app

## ── 6. AlertManager Configuration ──────────────────

# Alert routing:
#   critical  → Slack #alerts-critical + PagerDuty (phone)
#   warning   → Slack #alerts-warnings (office hours)
#   info      → Slack #alerts-info

# PagerDuty integration:
#   receiver: "pagerduty-critical"
#   pagerduty_configs:
#     - routing_key: "CHANGEME"
#       severity: critical

## ── 7. Key Metrics to Watch ────────────────────────

# Health Metrics:
#   ☐ Backend pod uptime (target: >99.9%)
#   ☐ API response time p95 (<500ms target)
#   ☐ Error rate (<1% target)
#   ☐ Active users (concurrent)
#   ☐ Video session duration (median)
#   ☐ Match rate (matches per active user)

# Infrastructure:
#   ☐ CPU/Memory usage per pod
#   ☐ Database connections & slow queries
#   ☐ Redis memory & hit rate
#   ☐ Disk usage (logs, backups)
#   ☐ Network throughput
#   ☐ Certificate expiry

# Business:
#   ☐ Daily/Monthly active users
#   ☐ User registrations
#   ☐ Subscription conversions
#   ☐ Subscription churn rate
#   ☐ Moment uploads
#   ☐ Friend connections

## ── 8. Dashboard Links ─────────────────────────────

# Grafana:    https://grafana.ninor.app
# Sentry:     https://sentry.io/organizations/ninor
# Uptime Kuma: https://status.ninor.app
# AWS Console: https://console.aws.amazon.com
# PagerDuty:  https://ninor.pagerduty.com
