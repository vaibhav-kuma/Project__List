# 🌐 LIVE SERVER DEPLOYMENT - QUICK START GUIDE
**Deploy Your Auto-Apply AI Application in 10 Minutes**

---

## 📋 PREREQUISITES

Before you start, ensure you have:
- [ ] A Linux/Ubuntu server (20.04+) or Windows VPS
- [ ] SSH access to server
- [ ] Docker installed on server (`curl -fsSL https://get.docker.com | sh`)
- [ ] Docker Compose installed (`sudo pip install docker-compose`)
- [ ] Domain name (optional, but recommended)
- [ ] SSL certificate (optional, but recommended)
- [ ] New API keys generated (CRITICAL!)

---

## ⚡ QUICK DEPLOYMENT (10 minutes)

### Step 1: Rotate API Keys (2 minutes)

**⚠️ CRITICAL: Do this FIRST before deployment**

1. **Revoke old keys:**
   - OpenAI: https://platform.openai.com/api-keys → Delete old key
   - TinyFish: Your dashboard → Revoke old key

2. **Generate new keys:**
   - OpenAI: Create new API key (copy it)
   - TinyFish: Create new API key (copy it)

### Step 2: SSH to Server (1 minute)

```bash
ssh deployer@your-server-ip

# Example:
ssh deployer@192.168.1.100
# or
ssh deployer@your-domain.com
```

### Step 3: Clone Project (2 minutes)

```bash
# Clone repository
git clone https://github.com/your-username/autoapply-ai.git
cd autoapply-ai

# Option: If already cloned, just pull latest
git pull origin main

# List files to verify
ls -la
```

### Step 4: Configure & Deploy (3 minutes)

```bash
# Copy .env template
cp backend/.env.example backend/.env

# Edit with your NEW API keys
nano backend/.env

# Replace these lines:
# OPENAI_API_KEY=sk-your-new-openai-key-here
# TINYFISH_API_KEY=sk-tinyfish-your-new-key-here

# Save and exit: CTRL+X, then Y, then ENTER

# Start deployment
docker-compose up -d

# Verify running
docker-compose ps

# Check health
curl http://localhost:8000/health
```

### Step 5: Verify Deployment (2 minutes)

```bash
# Test backend
curl http://localhost:8000/health
# Expected: {"status":"ok",...}

# Test frontend
curl http://localhost:3000
# Expected: HTML content

# View logs
docker-compose logs -f &

# Wait a few seconds, then CTRL+C to stop
```

---

## 🎯 DEPLOYMENT COMPLETE ✅

Your application is now running live!

**Access it at:**
- **Frontend:** http://your-server-ip:3000
- **Backend API:** http://your-server-ip:8000
- **API Docs:** http://your-server-ip:8000/docs

---

## 🔒 ADDITIONAL SETUP (Optional but Recommended)

### Setup Domain Name + SSL

```bash
# 1. Point domain to your server IP
# (In your domain registrar DNS settings)
# A record → your-server-ip

# 2. Install Certbot
sudo apt-get update
sudo apt-get install -y certbot

# 3. Get free SSL certificate
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# 4. Update docker-compose.yml to use HTTPS
# (See PRODUCTION_DEPLOYMENT.md for nginx config)
```

### Setup Auto-Restart

```bash
# Enable Docker to start on boot
sudo systemctl enable docker

# Create monitoring script
cat > ~/health-check.sh << 'EOF'
#!/bin/bash
if ! curl -f http://localhost:8000/health > /dev/null; then
    docker-compose -f ~/autoapply-ai/docker-compose.yml restart
fi
EOF

chmod +x ~/health-check.sh

# Add to crontab (runs every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * ~/health-check.sh") | crontab -
```

### Backup Database

```bash
# Manual backup
docker-compose exec -T backend cp /app/data/app.db /tmp/app.db.backup
scp deployer@your-server:/tmp/app.db.backup ~/backups/

# Automated daily backup
cat > ~/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=$HOME/backups
mkdir -p $BACKUP_DIR
docker-compose -f ~/autoapply-ai/docker-compose.yml exec -T backend \
  cp /app/data/app.db $BACKUP_DIR/app.db-$(date +%Y%m%d-%H%M%S).db
# Keep only last 30 days
find $BACKUP_DIR -mtime +30 -delete
EOF

chmod +x ~/backup.sh
(crontab -l 2>/dev/null; echo "0 2 * * * ~/backup.sh") | crontab -
```

---

## 🛠️ COMMON OPERATIONS

### Managing Services

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Rebuild and restart
docker-compose up -d --build

# View status
docker-compose ps

# View logs
docker-compose logs -f backend  # Backend logs
docker-compose logs -f frontend # Frontend logs
docker-compose logs -f          # All logs
```

### Updating Code

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose up -d --build

# Check logs for errors
docker-compose logs -f
```

### Updating Configuration

```bash
# Edit .env
nano backend/.env

# Restart backend to apply changes
docker-compose restart backend

# Verify
curl http://localhost:8000/health
```

### Database Operations

```bash
# Backup database
docker-compose exec -T backend cp /app/data/app.db /tmp/app.db.backup-$(date +%Y%m%d).db

# Access database directly
docker-compose exec backend sqlite3 /app/data/app.db

# Restore from backup
docker-compose down
docker-compose exec backend cp /tmp/app.db.backup /app/data/app.db
docker-compose up -d
```

---

## 🚨 TROUBLESHOOTING

### Services Won't Start

```bash
# Check logs
docker-compose logs

# Check Docker daemon is running
sudo systemctl status docker

# Start Docker daemon
sudo systemctl start docker

# Rebuild images
docker-compose build --no-cache
```

### Port Already in Use

```bash
# Find process using port 8000
sudo ss -tulpn | grep 8000

# Kill process
sudo kill -9 <PID>

# Or use different ports in docker-compose.yml
```

### API Key Error

```bash
# Verify key is set
cat backend/.env | grep OPENAI_API_KEY

# Update key
nano backend/.env

# Restart
docker-compose restart backend

# Test
curl http://localhost:8000/health
```

### Can't Access Frontend/Backend

```bash
# Check if containers are running
docker-compose ps

# Check if ports are open
ss -tulpn

# Check firewall (if applicable)
sudo ufw status
sudo ufw allow 3000
sudo ufw allow 8000

# Test connectivity
curl http://localhost:8000/health
curl http://localhost:3000
```

### Database Issues

```bash
# Check database exists
ls -la backend/data/

# Remove corrupted database
docker-compose down
rm backend/data/app.db
docker-compose up -d

# Restore from backup
cp backup.db backend/data/app.db
docker-compose restart backend
```

---

## ✅ PRODUCTION CHECKLIST

Before going live, verify:

- [ ] API keys are rotated
- [ ] .env file has real credentials
- [ ] Backend health check passes
- [ ] Frontend loads in browser
- [ ] SSL certificate installed (if using domain)
- [ ] Firewall allows ports 3000 & 8000
- [ ] Backups are configured
- [ ] Auto-restart is enabled
- [ ] Monitoring/alerts configured
- [ ] Documentation updated

---

## 📊 MONITORING DASHBOARD

Create a simple monitoring script:

```bash
#!/bin/bash
# monitor.sh - Simple monitoring script

while true; do
  clear
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║           Auto-Apply AI - Live Monitoring                  ║"
  echo "║        $(date '+Created: %Y-%m-%d %H:%M:%S')                       ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
  
  echo "📊 Container Status:"
  docker-compose ps
  
  echo ""
  echo "🔍 Health Check:"
  curl -s http://localhost:8000/health | jq .
  
  echo ""
  echo "📈 Resource Usage:"
  docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
  
  echo ""
  echo "💾 Database Size:"
  du -h backend/data/app.db
  
  echo ""
  echo "🔄 Updating every 10 seconds (Ctrl+C to stop)..."
  sleep 10
done
```

Run it:
```bash
chmod +x monitor.sh
./monitor.sh
```

---

## 🎯 NEXT STEPS

1. ✅ **Deploy** - Follow quick start above
2. ✅ **Verify** - Test all access points
3. ✅ **Monitor** - Use monitoring commands
4. ✅ **Backup** - Set up automated backups
5. ✅ **Scale** - Add more resources if needed
6. ✅ **Document** - Keep deployment notes

---

## 📱 ACCESSING YOUR APP

### From Your Computer

```bash
# Test backend
curl http://your-server-ip:8000/health

# Open in browser
http://your-server-ip:3000
http://your-server-ip:8000/docs
```

### From Mobile

Access using your server's IP address or domain:
- App: `http://your-domain.com` or `http://your-ip:3000`
- API: `http://your-domain.com/api` or `http://your-ip:8000`

### APIs Available

- `GET /` - Root info
- `GET /health` - Health check
- `GET /docs` - Interactive API documentation
- `POST /api/onboard` - User onboarding
- `POST /api/apply/{user_id}` - Start job application
- `WS /ws/{user_id}` - WebSocket live updates

---

## 💰 COST OPTIMIZATION

### Resource Allocation

```yaml
# In docker-compose.yml, limit resources:
services:
  backend:
    deploy:
      limits:
        cpus: '1'
        memory: 2G
  frontend:
    deploy:
      limits:
        cpus: '0.5'
        memory: 1G
```

### Backup Strategy

- Daily incremental backups
- Weekly full backups
- Store backups off-site
- Test restore monthly

---

## 🚀 SCALING GUIDE

### Single Server (Current - up to 100 users)
```
✅ Simple setup
✅ Low cost
✅ Easy to manage
⚠️  Limited scalability
```

### Multiple Servers (100-1000 users)
```
✅ Load balancing (HAProxy/Nginx)
✅ Multiple backend instances
✅ Shared database optional
```

### Kubernetes (1000+ users)
```
✅ Automatic scaling
✅ High availability
✅ Enterprise features
⚠️  More complex setup
```

---

## 📞 QUICK REFERENCE

| Task | Command |
|------|---------|
| Start | `docker-compose up -d` |
| Stop | `docker-compose down` |
| Restart | `docker-compose restart` |
| Logs | `docker-compose logs -f` |
| Status | `docker-compose ps` |
| Health | `curl http://localhost:8000/health` |
| Update | `git pull && docker-compose up -d --build` |
| Backup | `docker-compose exec -T backend cp /app/data/app.db ~/backup.db` |

---

## 🎉 Success! You're Live!

Congratulations! Your Auto-Apply AI application is now running on a live server! 

### What's Next?

1. Monitor the application
2. Gather user feedback
3. Optimize based on usage
4. Plan for scaling
5. Keep backups updated

---

**Need Help?** 
- Check logs: `docker-compose logs -f`
- See PRODUCTION_DEPLOYMENT.md for advanced setup
- Review FINAL_DEPLOYMENT_REPORT.md for comprehensive info

**Last Updated:** March 29, 2026  
**Version:** 1.0.0 - Production Ready ✅
