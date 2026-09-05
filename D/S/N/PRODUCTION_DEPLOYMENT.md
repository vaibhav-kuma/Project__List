# 🚀 PRODUCTION DEPLOYMENT GUIDE
**Auto-Apply AI - Complete Production Setup**

---

## 📋 Pre-Deployment Checklist

Before deploying to production, ensure these items are completed:

- [ ] All 12 code issues have been fixed
- [ ] Backend tests pass (6/6 ✅)
- [ ] API keys have been rotated (new keys generated)
- [ ] `.env` file configured with production credentials
- [ ] Git history cleaned (old .env removed)
- [ ] Docker and Docker Compose installed on server
- [ ] Firewall rules configured for ports 3000 & 8000
- [ ] SSL/TLS certificates obtained (for HTTPS)
- [ ] Backup strategy implemented
- [ ] Monitoring and logging configured

---

## 🖥️ DEPLOYMENT OPTIONS

### **OPTION 1: Docker Compose (Recommended for Quick Setup)**

**Best For:** Small to medium deployments, development servers, quick testing

#### Requirements:
- Docker installed
- Docker Compose installed
- 4GB RAM minimum
- 10GB disk space minimum

#### Steps:

```bash
# 1. Clone/download the project
cd /path/to/project

# 2. Configure environment
cp backend/.env.example backend/.env
# Edit backstep  backend/.env with production credentials

# 3. Update configuration for production
export BACKEND_PORT=8000
export FRONTEND_PORT=3000
export DEBUG=false
export LOG_LEVEL=INFO

# 4. Build images
docker-compose build --no-cache

# 5. Start services
docker-compose up -d

# 6. Verify deployment
docker-compose ps
curl http://localhost:8000/health
curl http://localhost:3000
```

#### Management Commands:

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart services
docker-compose restart

# Stop services
docker-compose down

# View status
docker-compose ps

# Update services (rebuild and restart)
docker-compose up -d --build
```

---

### **OPTION 2: Kubernetes (Enterprise Deployment)**

**Best For:** Large-scale deployments, high availability, auto-scaling

#### Prerequisites:
- Kubernetes cluster (EKS, GKE, AKS, or self-managed)
- kubectl CLI installed
- Helm installed (optional, for package management)

#### Basic Deployment:

```bash
# 1. Create namespace
kubectl create namespace autoapply

# 2. Create secrets for API keys
kubectl create secret generic api-keys \
  --from-literal=OPENAI_API_KEY=sk-proj-your-key \
  --from-literal=TINYFISH_API_KEY=sk-tinyfish-your-key \
  -n autoapply

# 3. Create ConfigMap for configuration
kubectl create configmap app-config \
  --from-literal=BACKEND_URL=http://backend:8000 \
  --from-literal=FRONTEND_URL=http://frontend:3000 \
  -n autoapply

# 4. Apply deployments
kubectl apply -f k8s/backend-deployment.yaml -n autoapply
kubectl apply -f k8s/frontend-deployment.yaml -n autoapply
kubectl apply -f k8s/services.yaml -n autoapply

# 5. Check status
kubectl get pods -n autoapply
kubectl get svc -n autoapply
```

---

### **OPTION 3: Linux Virtual Machine (Full Control)**

**Best For:** Dedicated servers, fine-grained control, custom configurations

#### System Requirements:
- Ubuntu 20.04+ or CentOS 8+
- 8GB+ RAM
- 50GB+ disk space
- SSH access

#### Installation Steps:

```bash
# 1. SSH into server
ssh deployer@your-server-ip

# 2. Install dependencies
sudo apt-get update
sudo apt-get install -y \
  curl \
  wget \
  git \
  docker.io \
  docker-compose

# 3. Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# 4. Clone project
git clone https://github.com/yourrepo/autoapply-ai.git
cd autoapply-ai

# 5. Configure environment
cp backend/.env.example backend/.env
# Edit with production credentials
nano backend/.env

# 6. Start services
docker-compose up -d

# 7. Set up monitoring
docker-compose logs -f  # Monitor logs
```

#### Auto-restart on server reboot:

```bash
# Enable Docker API to start on boot
sudo systemctl enable docker

# Add cron job for monitoring
(crontab -l 2>/dev/null; echo "*/5 * * * * /path/to/health-check.sh") | crontab -
```

---

### **OPTION 4: Cloud Platforms**

#### AWS ECS (Elastic Container Service)

```bash
# 1. Push images to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
docker tag autoapply-backend:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/autoapply-backend:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/autoapply-backend:latest

# 2. Create ECS task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# 3. Create ECS service
aws ecs create-service --cluster autoapply --service-name backend --task-definition autoapply-backend --desired-count 1
```

#### Google Cloud Run

```bash
# 1. Build and push to GCR
gcloud builds submit --tag gcr.io/YOUR_PROJECT/autoapply-backend

# 2. Deploy to Cloud Run
gcloud run deploy autoapply-backend \
  --image gcr.io/YOUR_PROJECT/autoapply-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### Heroku (Simplest Option)

```bash
# 1. Login to Heroku
heroku login

# 2. Create app
heroku create autoapply-ai

# 3. Set environment variables
heroku config:set OPENAI_API_KEY=your_key -a autoapply-ai
heroku config:set TINYFISH_API_KEY=your_key -a autoapply-ai

# 4. Deploy
git push heroku main
```

---

## 🔐 SECURITY CONFIGURATION

### SSL/TLS Setup (NGINX Reverse Proxy)

```nginx
# /etc/nginx/sites-available/autoapply

upstream backend {
    server localhost:8000;
}

upstream frontend {
    server localhost:3000;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /ws {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

#### Enable SSL with Let's Encrypt:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 📊 MONITORING & LOGGING

### Health Checks

```bash
# Backend health
curl http://localhost:8000/health

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2026-03-29T...",
#   "active_tasks": 0,
#   "active_ws_connections": 0
# }
```

### Log Management

```bash
# View real-time logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# View last N lines
docker-compose logs --tail=100

# Save logs to file
docker-compose logs > logs.txt
```

### Prometheus Monitoring (Optional)

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'autoapply-backend'
    static_configs:
      - targets: ['localhost:8000']
```

---

## 🔄 BACKUP & RECOVERY

### Database Backup

```bash
# Backup SQLite database
docker-compose exec backend cp /app/data/app.db /app/data/backup-$(date +%Y%m%d-%H%M%S).db

# Backup to host
docker-compose exec backend cat /app/data/app.db > backup.db

# Restore from backup
docker-compose exec backend cp /app/data/backup-DATE.db /app/data/app.db
docker-compose restart backend
```

### Automated Daily Backup

```bash
#!/bin/bash
# /home/deployer/backup.sh

BACKUP_DIR="/backups/autoapply"
mkdir -p $BACKUP_DIR

# Backup database
docker-compose exec -T backend cp /app/data/app.db /app/data/app.db.backup
docker ps -aq --filter "name=backend" | xargs docker cp /app/data/app.db.backup - > $BACKUP_DIR/app.db-$(date +%Y%m%d).db

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $(date)" >> $BACKUP_DIR/backup.log
```

Add to crontab:
```bash
crontab -e
# Add: 0 2 * * * /home/deployer/backup.sh
```

---

## ⚠️ TROUBLESHOOTING

### Port Already in Use

```bash
# Find process using port
lsof -i :8000
lsof -i :3000

# Kill process
kill -9 PID

# Or use different ports
BACKEND_PORT=8001 FRONTEND_PORT=3001 docker-compose up -d
```

### Database Lock

```bash
# Remove old database
docker-compose down
rm backend/data/app.db
docker-compose up -d
```

### API Key Invalid

```bash
# Verify API keys
cat backend/.env | grep API_KEY

# Update keys
nano backend/.env
docker-compose restart backend
```

### Container Won't Start

```bash
# Check logs
docker-compose logs backend

# Rebuild image
docker-compose rebuild backend
docker-compose up -d backend
```

---

## 📈 SCALING CONSIDERATIONS

### Horizontal Scaling

```yaml
# docker-compose.yml for multiple replicas
services:
  backend:
    deploy:
      replicas: 3
    environment:
      - INSTANCE_ID=1  # Change for each
```

### Load Balancing with HAProxy

```
# /etc/haproxy/haproxy.cfg
frontend autoapply
    bind *:80
    default_backend backends

backend backends
    balance roundrobin
    server backend1 localhost:8001 check
    server backend2 localhost:8002 check
    server backend3 localhost:8003 check
```

---

## 🎯 POST-DEPLOYMENT TASKS

1. **Configure DNS**
   - Set A record to server IP
   - Configure domain
   - Test SSL certificate

2. **Setup Monitoring**
   - Configure alerts
   - Set up log aggregation
   - Monitor performance metrics

3. **Performance Tuning**
   - Optimize database indexes
   - Configure caching
   - Tune resource limits

4. **Documentation**
   - Document custom configurations
   - Maintain runbook
   - Record credentials securely

5. **User Testing**
   - Smoke testing
   - User acceptance testing
   - Performance testing

---

## 🚨 EMERGENCY PROCEDURES

### Rollback Deployment

```bash
# If deployment fails, rollback to previous version
git checkout previous_version
docker-compose down
docker-compose build
docker-compose up -d
```

### Database Recovery

```bash
# Restore from backup
docker-compose down
rm backend/data/app.db
# Restore from backup file
docker-compose up -d backend
```

### Service Restart

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend
```

---

## 📞 SUPPORT & CONTACT

For production deployment support:
- Check logs: `docker-compose logs -f`
- Review documentation: See README.md
- Test endpoints: `curl http://localhost:8000/docs`
- Health check: `curl http://localhost:8000/health`

---

## ✅ DEPLOYMENT VERIFICATION CHECKLIST

After deployment, verify:

- [ ] Backend API responding (`GET /health` returns `status: ok`)
- [ ] Frontend page loads (3000+ is reachable)
- [ ] Database created and accessible
- [ ] Environment variables configured
- [ ] CORS working (frontend can call backend)
- [ ] WebSocket connections working
- [ ] Logs being generated correctly
- [ ] Backups can be created
- [ ] Health monitors are active
- [ ] SSL/TLS working (if applicable)

---

**🎉 If all items are checked, your deployment is complete and production-ready!**

*Last Updated: March 29, 2026*
