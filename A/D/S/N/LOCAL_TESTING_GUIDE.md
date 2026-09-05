# 🧪 LOCAL DOCKER TEST GUIDE
**Before Deploying to Production - Test Everything Locally**

---

## 📋 What We're Testing

This guide helps you verify that your Auto-Apply AI application works correctly by:
- ✅ Building Docker images locally
- ✅ Running frontend and backend containers
- ✅ Testing API endpoints
- ✅ Verifying database operations
- ✅ Ensuring frontend and backend communicate

---

## 🚀 QUICK START (5 minutes)

### For Windows Users

1. **Open PowerShell** (as Administrator)
2. **Navigate to project**
   ```bash
   cd F:\Resume\ninor_project\A\D\S\N
   ```

3. **Run test script**
   ```bash
   .\test-local.bat
   ```

4. **Wait for completion** - Script will:
   - Check Docker installation ✅
   - Build Docker images 🔨
   - Start containers 🚀
   - Verify services 🔍
   - Show access URLs 🌐

### For Linux/WSL Users

1. **Open Terminal**
2. **Navigate to project**
   ```bash
   cd ~/autoapply-ai
   ```

3. **Make script executable**
   ```bash
   chmod +x test-local.sh
   ```

4. **Run test script**
   ```bash
   ./test-local.sh
   ```

---

## 🔑 ADDING YOUR API KEYS (IMPORTANT)

Before testing with real API calls, update your `.env` file:

### Step 1: Open `backend/.env`

```powershell
# Windows - Open in VS Code
code backend\.env
```

```bash
# Linux - Open in text editor
nano backend/.env
```

### Step 2: Replace Placeholder Keys

**Find these lines:**
```env
OPENAI_API_KEY=YOUR-NEW-OPENAI-API-KEY-HERE
TINYFISH_API_KEY=YOUR-NEW-TINYFISH-API-KEY-HERE
```

**Replace with your actual keys:**
```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TINYFISH_API_KEY=sk-tinyfish-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 3: Save and Restart

```bash
# Stop containers
docker-compose down

# Start with new keys
docker-compose up -d

# Verify
curl http://localhost:8000/health
```

---

## 💻 ACCESS YOUR APPLICATION

Once the test script completes, access:

### Frontend
```
http://localhost:3000
```
- **Onboarding:** Create user profile
- **Dashboard:** View job search status
- **Job Cards:** Browse job postings
- **Agent:** See AI activities in real-time

### Backend API
```
http://localhost:8000/docs
```
- Interactive API documentation
- Test endpoints directly
- See request/response formats

### Health Check
```bash
curl http://localhost:8000/health
```
Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-03-29T12:00:00.000000+00:00",
  "active_tasks": 0,
  "active_ws_connections": 0
}
```

---

## 🧪 MANUAL TESTING COMMANDS

### Test Backend

**Health Check:**
```bash
curl http://localhost:8000/health
```

**API Documentation:**
```bash
curl http://localhost:8000/docs
```

**Create User:**
```bash
curl -X POST http://localhost:8000/api/onboard \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Test User",
    "email": "test@example.com",
    "phone": "555-1234",
    "resume": "resume content here"
  }'
```

### Test Frontend

**Check if running:**
```bash
curl http://localhost:3000
```

**View logs:**
```bash
docker-compose logs -f frontend
```

### Test Database

**Access directly:**
```bash
docker-compose exec backend sqlite3 /app/data/app.db
```

**Check database file:**
```bash
# Windows
dir backend/data/

# Linux
ls -lh backend/data/
```

### Test Network Communication

**Frontend to Backend:**
```bash
# Inside frontend container
docker-compose exec frontend curl http://backend:8000/health
```

---

## 📊 MONITORING & DEBUGGING

### View All Logs

```bash
# All containers
docker-compose logs -f

# Just backend
docker-compose logs -f backend

# Just frontend  
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100
```

### Check Container Status

```bash
# List all containers
docker-compose ps

# Detailed status
docker ps -a

# Check resource usage
docker stats
```

### Check Ports

**Windows:**
```bash
netstat -ano | findstr :3000
netstat -ano | findstr :8000
```

**Linux:**
```bash
sudo ss -tulpn | grep -E ':3000|:8000'
```

### View Container Details

```bash
# Inspect backend
docker-compose exec backend /bin/bash

# Check environment
docker-compose exec backend env

# View logs in container
docker-compose exec backend tail -f /var/log/app.log
```

---

## ❌ TROUBLESHOOTING

### Issue: "Docker daemon is not running"

**Solution:**
```bash
# Windows - Start Docker Desktop
# or use WSL2 with Docker

# Linux
sudo systemctl start docker
sudo systemctl enable docker  # Auto-start on boot
```

### Issue: "Port 3000 or 8000 already in use"

**Find process using port:**
```bash
# Windows
netstat -ano | findstr :3000

# Linux
sudo ss -tulpn | grep :3000
```

**Kill process:**
```bash
# Windows
taskkill /PID <PID> /F

# Linux
sudo kill -9 <PID>
```

**Or use different ports:**
Edit `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Changed from 3000 to 3001
  - "8001:8000"  # Changed from 8000 to 8001
```

### Issue: "Build failed"

**Common causes:**
- Insufficient disk space
- Network issues downloading packages
- Outdated Docker version

**Solution:**
```bash
# Clean up and rebuild
docker-compose down --volumes
docker system prune -a
docker-compose build --no-cache
```

### Issue: "Frontend won't load"

**Check:**
```bash
# View logs
docker-compose logs -f frontend

# Check if process is running
docker-compose exec frontend ps aux

# Test connectivity
docker-compose exec frontend curl http://localhost:3000
```

### Issue: "Backend API not responding"

**Check:**
```bash
# View logs
docker-compose logs -f backend

# Check if running
docker-compose ps backend

# Test health
curl http://localhost:8000/health

# Check API keys (should be configured)
docker-compose exec backend env | grep OPENAI
```

### Issue: "Database connection failed"

**Check database file exists:**
```bash
# Windows
dir backend\data\

# Linux
ls -la backend/data/
```

**Recreate database:**
```bash
docker-compose down
rm backend/data/app.db
docker-compose up -d
```

---

## ✅ VALIDATION CHECKLIST

After running `test-local` script, verify:

- [ ] Docker build completed successfully
- [ ] Both containers are running (`docker-compose ps`)
- [ ] Frontend accessible at `http://localhost:3000`
- [ ] Backend API responds: `curl http://localhost:8000/health`
- [ ] API docs available at `http://localhost:8000/docs`
- [ ] No error messages in logs (`docker-compose logs`)
- [ ] Database file exists at `backend/data/app.db`
- [ ] Can create user via API
- [ ] Frontend can fetch data from backend

---

## 🎯 TEST SCENARIOS

### Scenario 1: User Onboarding
1. Open `http://localhost:3000`
2. Fill in registration form
3. Upload resume (if applicable)
4. Verify saved in database

### Scenario 2: API Testing
1. Open `http://localhost:8000/docs`
2. Try POST `/api/onboard` endpoint
3. Try GET requests
4. Verify responses

### Scenario 3: Real-time Updates
1. Open frontend
2. Start job search
3. Watch WebSocket connection in DevTools
4. Verify live updates flowing

### Scenario 4: Error Handling
1. Send invalid data to API
2. Check error responses
3. Verify frontend shows errors gracefully
4. Check logs for error messages

---

## 🔄 WORKFLOW FOR LOCAL TESTING

```
1. Update .env with real API keys
   ↓
2. Run: test-local.bat (or .sh)
   ↓
3. Wait for "LOCAL DEPLOYMENT SUCCESSFUL"
   ↓
4. Open http://localhost:3000
   ↓
5. Test feature you're working on
   ↓
6. Check logs: docker-compose logs -f
   ↓
7. Make code changes (if needed)
   ↓
8. Rebuild: docker-compose build
   ↓
9. Restart: docker-compose restart
   ↓
10. Test changes
   ↓
11. Ready for production
```

---

## 📤 WHEN READY FOR PRODUCTION

After successful local testing:

1. **Document findings**
   - What works
   - What needs fixes
   - Performance observations

2. **Update code if needed**
   - Fix any issues found
   - Retest locally

3. **Clean up**
   ```bash
   docker-compose down
   rm -rf backend/data/app.db  # Optional - fresh database
   ```

4. **Follow LIVE_SERVER_QUICK_START.md**
   - Set up production server
   - Deploy using docker-compose
   - Configure SSL/TLS
   - Set up monitoring

---

## 📚 USEFUL RESOURCES

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
- [WSL2 Setup Guide](https://docs.microsoft.com/en-us/windows/wsl/install)
- [OpenAI API Documentation](https://platform.openai.com/docs/)
- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

---

## ✨ SUCCESS INDICATORS

You'll know everything is working when:

✅ `test-local` script completes without errors  
✅ Both containers show "Up" status  
✅ Frontend loads in browser  
✅ API docs are accessible  
✅ Health endpoint returns status: "ok"  
✅ Can create users via API  
✅ Database file contains data  
✅ No errors in logs  
✅ Frontend↔Backend communication working  

---

**Next:** Follow [LIVE_SERVER_QUICK_START.md](LIVE_SERVER_QUICK_START.md) to deploy to production

**Last Updated:** March 29, 2026  
**Status:** Ready for Testing ✅
