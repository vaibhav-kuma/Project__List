# AutoApply AI - Job Application Automation

A fully autonomous job application system powered by GPT-4 and browser automation. Fill in your profile once, and let the AI agent search, score, and apply to jobs 24/7.

## 🚀 Features

- **Resume Upload**: Upload .pdf or .docx files - automatically parsed by GPT-4
- **Job Search**: Autonomous search across job boards (Indeed, LinkedIn, etc.)
- **AI Scoring**: GPT-4 evaluates job relevance (0-100 score)
- **Auto-Application**: Fills forms and applies to qualified jobs
- **Real-time Monitoring**: Live dashboard showing agent activity
- **Application History**: Track all applications with detailed breakdown
- **Data Export**: CSV export for further analysis

## 📋 Prerequisites

- **Node.js 20+** (for frontend)
- **Python 3.11+** (for backend)
- **OpenAI API Key** (GPT-4 access)
- **Docker & Docker Compose** (for containerized deployment)
- **Browser with Selenium support** (for automation)

## 🏗️ Project Structure

```
.
├── backend/                    # FastAPI backend
│   ├── main.py                 # Entry point
│   ├── config.py               # Configuration
│   ├── api/routes.py           # API endpoints
│   ├── agents/                 # Job search & application agents
│   ├── services/               # External service clients
│   ├── models/                 # Data models
│   ├── database/               # Database setup
│   └── requirements.txt
│
├── frontend/                   # Next.js React frontend
│   ├── src/app/                # Pages (onboard, agent, dashboard)
│   ├── src/components/         # React components
│   ├── package.json
│   └── tsconfig.json
│
├── docker-compose.yml          # Docker Compose configuration
├── Dockerfile.backend
├── Dockerfile.frontend
└── README.md
```

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

1. **Clone & Setup**
   ```bash
   cd project/A/D/S/N
   cp backend/.env.example backend/.env
   # Edit backend/.env with your OpenAI API key
   ```

2. **Build & Run**
   ```bash
   docker-compose up --build
   ```

3. **Access**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Option 2: Local Development

**Backend Setup:**
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your OpenAI API key
python main.py
```

Access at: http://localhost:8000

**Frontend Setup:**
```bash
cd frontend
npm install
npm run dev
```

Access at: http://localhost:3000

## 📚 API Endpoints

### Authentication & Onboarding
- **POST** `/api/onboard` - Create user profile with resume

### Agent Operations
- **WebSocket** `/ws/{user_id}` - Real-time agent activity stream
- **POST** `/api/apply/{user_id}` - Start autonomous job application
- **POST** `/api/search/{user_id}` - Search for jobs

### User Data
- **GET** `/api/applications/{user_id}` - Retrieve application history
- **GET** `/api/stats/{user_id}` - Get user statistics

## 🎯 Workflow

1. **Onboard** - Visit `/onboard`, fill personal info, upload resume, save job preferences
2. **Agent Runs** - Navigate to `/agent` to start autonomous job applications
3. **Monitor** - Live activity feed shows agent searching, scoring, and applying
4. **Review** - Visit `/dashboard` to see all applications with details
5. **Export** - Export data to CSV for analysis

## 🔧 Configuration

### Environment Variables

**Backend (`backend/.env`):**
- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `OPENAI_MODEL` - Model to use (default: gpt-4)
- `DATABASE_URL` - Database path (default: sqlite:///./jobs.db)
- `FRONTEND_URL` - Frontend URL (default: http://localhost:3000)

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📦 Dependencies

**Backend:**
- FastAPI - Web framework
- SQLAlchemy - ORM
- OpenAI - GPT-4 API
- Playwright/Selenium - Browser automation
- websockets - Real-time updates

**Frontend:**
- Next.js 16 - React framework
- TypeScript - Type safety
- Tailwind CSS - Styling
- lucide-react - Icons

## 🐛 Troubleshooting

### Backend won't start
- Check if port 8000 is available
- Verify `OPENAI_API_KEY` is set
- Check logs: `docker-compose logs backend`

### Frontend can't connect to API
- Ensure backend is running (check port 8000)
- Verify `NEXT_PUBLIC_API_URL` in `.env.local`
- Check CORS settings in backend

### Database errors
- Delete `backend/jobs.db` and restart
- Check file permissions on database directory

## 📊 Monitoring

### Backend Logs
```bash
docker-compose logs -f backend
```

### Frontend Logs
```bash
docker-compose logs -f frontend
```

### Health Checks
- Backend: http://localhost:8000/health
- Frontend: http://localhost:3000 (loads successfully)

## 🚀 Deployment

### Production Deployment

1. **Update Configuration**
   - Set `DEBUG=false`
   - Update `FRONTEND_URL` and `BACKEND_URL`
   - Use environment-specific secrets

2. **Build Images**
   ```bash
   docker-compose build
   ```

3. **Deploy to Cloud**
   - Vercel (frontend)
   - Railway/Render (backend)
   - AWS/GCP/Azure (full stack)

4. **Database Setup**
   - Use PostgreSQL instead of SQLite
   - Update `DATABASE_URL`

## 📝 License

MIT License - Feel free to use this project!

## 💡 Tips

- Start with max 5-10 applications per run to test
- Monitor the agent dashboard during first runs
- Exported CSV can be used for follow-ups
- GPT-4 scoring helps avoid irrelevant applications
- Check application history for patterns

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section
2. Review application logs
3. Refer to API documentation at `/docs`

---

**Made with ❤️ for job seekers**
