# Horizontal Scaling Configuration

## 1. Docker Compose (Production)

```yaml
# docker-compose.prod.yml
version: '3.8'

x-logging: &default-logging
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"

x-healthcheck: &healthcheck
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 40s

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ninor
      POSTGRES_USER: ninor
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ninor"]
      <<: *healthcheck
    logging: *default-logging
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2'
    networks:
      - backend

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 2gb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      <<: *healthcheck
    logging: *default-logging
    deploy:
      resources:
        limits:
          memory: 2.5G
          cpus: '1'
    networks:
      - backend

  pgpool:
    image: bitnami/pgpool:latest
    environment:
      PGPOOL_BACKEND_NODES: 0:postgres:5432
      PGPOOL_SR_CHECK_USER: ninor
      PGPOOL_SR_CHECK_PASSWORD: ${DB_PASSWORD}
      PGPOOL_ENABLE_LOAD_BALANCING: "yes"
      PGPOOL_POSTGRES_USERNAME: ninor
      PGPOOL_POSTGRES_PASSWORD: ${DB_PASSWORD}
      PGPOOL_ADMIN_USERNAME: admin
      PGPOOL_ADMIN_PASSWORD: admin
    ports:
      - "5432:5432"
    depends_on:
      postgres:
        condition: service_healthy
    logging: *default-logging
    networks:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: runner
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_URL: postgresql://ninor:${DB_PASSWORD}@pgpool:5432/ninor
      REDIS_URL: redis://redis:6379
      SENTRY_DSN: ${SENTRY_DSN}
      SENTRY_TRACES_SAMPLE_RATE: "0.1"
    ports:
      - "3001"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:3001/health"]
      <<: *healthcheck
    logging: *default-logging
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
          cpus: '1'
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first
      rollback_config:
        parallelism: 1
        delay: 10s
        order: stop-first
    networks:
      - backend
      - frontend

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: runner
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: https://api.ninor.app
      NEXT_PUBLIC_CDN_URL: https://cdn.ninor.app
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: ${VAPID_PUBLIC_KEY}
      NEXT_PUBLIC_TURN_URL: ${TURN_URL}
      NEXT_PUBLIC_TURN_USERNAME: ${TURN_USERNAME}
      NEXT_PUBLIC_TURN_CREDENTIAL: ${TURN_CREDENTIAL}
    ports:
      - "3000"
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:3000/health"]
      <<: *healthcheck
    logging: *default-logging
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 512M
          cpus: '1'
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first
    networks:
      - frontend

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl/certs:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
      - frontend
    logging: *default-logging
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 256M
          cpus: '0.5'
    networks:
      - frontend
      - backend

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
    logging: *default-logging
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD:-admin}
      GF_INSTALL_PLUGINS: grafana-piechart-panel
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
    ports:
      - "3002:3000"
    depends_on:
      - prometheus
    logging: *default-logging
    networks:
      - monitoring

  turn:
    image: coturn/coturn:latest
    command: >
      -n
      --lt-cred-mech
      --realm=ninor.app
      --user=${TURN_USERNAME}:${TURN_CREDENTIAL}
      --min-port=49152
      --max-port=65535
      --listening-port=3478
      --fingerprint
      --no-cli
      --verbose
    ports:
      - "3478:3478"
      - "3478:3478/udp"
      - "49152-65535:49152-65535/udp"
    logging: *default-logging
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.5'
    networks:
      - backend

volumes:
  postgres-data:
  redis-data:
  prometheus-data:
  grafana-data:

networks:
  frontend:
  backend:
  monitoring:
```

## 2. Kubernetes Deployment

```yaml
# k8s/backend-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ninor-backend
  labels:
    app: ninor-backend
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: ninor-backend
  template:
    metadata:
      labels:
        app: ninor-backend
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3001"
        prometheus.io/path: "/metrics"
    spec:
      containers:
        - name: backend
          image: ninor/backend:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 3001
              protocol: TCP
          env:
            - name: NODE_ENV
              value: "production"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: ninor-secrets
                  key: database-url
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: ninor-secrets
                  key: redis-url
            - name: SENTRY_DSN
              valueFrom:
                secretKeyRef:
                  name: ninor-secrets
                  key: sentry-dsn
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "1"
          livenessProbe:
            httpGet:
              path: /live
              port: 3001
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3001
            initialDelaySeconds: 10
            periodSeconds: 5
          startupProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 30
---
apiVersion: v1
kind: Service
metadata:
  name: ninor-backend
  labels:
    app: ninor-backend
spec:
  selector:
    app: ninor-backend
  ports:
    - port: 3001
      targetPort: 3001
      protocol: TCP
      name: http
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ninor-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ninor-backend
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

```yaml
# k8s/frontend-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ninor-frontend
  labels:
    app: ninor-frontend
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: ninor-frontend
  template:
    metadata:
      labels:
        app: ninor-frontend
    spec:
      containers:
        - name: frontend
          image: ninor/frontend:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: "production"
            - name: NEXT_PUBLIC_API_URL
              value: "https://api.ninor.app"
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "1"
          livenessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 30
          readinessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: ninor-frontend
  labels:
    app: ninor-frontend
spec:
  selector:
    app: ninor-frontend
  ports:
    - port: 3000
      targetPort: 3000
  type: ClusterIP
```

```yaml
# k8s/ingress.yml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ninor-ingress
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/proxy-body-size: "1m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "86400s"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "86400s"
    nginx.ingress.kubernetes.io/websocket-services: "ninor-backend"
    nginx.ingress.kubernetes.io/upstream-hash-by: "$http_x_forwarded_for"
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-origin: "https://ninor.app"
spec:
  tls:
    - hosts:
        - ninor.app
        - api.ninor.app
      secretName: ninor-tls
  rules:
    - host: ninor.app
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: ninor-frontend
                port:
                  number: 3000
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: ninor-backend
                port:
                  number: 3001
          - path: /socket.io
            pathType: Prefix
            backend:
              service:
                name: ninor-backend
                port:
                  number: 3001
    - host: api.ninor.app
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: ninor-backend
                port:
                  number: 3001
```

## 3. Database Scaling (pgBouncer)

```ini
# pgbouncer.ini
[databases]
ninor = host=postgres port=5432 dbname=ninor

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

# Connection pooling
pool_mode = transaction
default_pool_size = 50
max_client_conn = 500
max_db_connections = 50
idle_transaction_timeout = 60

# Connection limits per user
max_user_connections = 100

# Timeouts
server_idle_timeout = 300
server_lifetime = 3600
query_timeout = 30
query_wait_timeout = 10

# Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
stats_period = 60
verbose = 0
```

## 4. Redis Cluster Configuration

```conf
# redis/cluster.conf
port 6379
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000
appendonly yes
appendfsync everysec
save 900 1
save 300 10
save 60 10000
maxmemory 2gb
maxmemory-policy allkeys-lru
maxclients 10000
tcp-keepalive 300
tcp-backlog 511
timeout 0
```

## 5. Horizontal Scaling Strategy Summary

| Component | Strategy | Min Replicas | Max Replicas | Scaling Metric |
|-----------|----------|-------------|-------------|----------------|
| Backend API | Horizontal (stateless) | 3 | 10 | CPU > 70%, Memory > 80% |
| Frontend | Horizontal (stateless) | 2 | 5 | CPU > 70% |
| PostgreSQL | Vertical + Read replicas | 1 primary + 2 replicas | 1 + 5 | Connection pool > 80% |
| Redis | Cluster mode | 3 nodes | 6 nodes | Memory > 70% |
| TURN Server | Horizontal (stateless) | 2 | 10 | Active sessions > 1000 |
| Nginx | Horizontal (stateless) | 2 | 4 | Connections > 5000 |
