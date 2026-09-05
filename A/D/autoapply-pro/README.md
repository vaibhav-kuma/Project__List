# AutoApply Pro

Intelligent job application agent powered by TinyFish Web Agent API.

## Stack
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Queue**: BullMQ + Redis
- **AI**: TinyFish Web Agent API + OpenAI GPT-4o-mini
- **Auth**: NextAuth.js (Google OAuth)

## Setup

### 1. Prerequisites
- Node.js 18+
- PostgreSQL database
- Redis instance
- Google OAuth credentials
- OpenAI API key
- TinyFish API key

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
Copy `.env.local` and fill in your values:
```
DATABASE_URL=postgresql://user:password@localhost:5432/autoapply_pro
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
OPENAI_API_KEY=<from OpenAI>
TINYFISH_API_KEY=<from TinyFish>
REDIS_URL=redis://localhost:6379
```

### 4. Set up database
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Run development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth handler
│   │   ├── profile/              # Profile CRUD + resume upload
│   │   ├── jobs/                 # Job discovery queue
│   │   ├── applications/         # Application management
│   │   ├── cover-letter/         # AI cover letter generation
│   │   └── agent/stats/          # Dashboard statistics
│   ├── dashboard/                # Main dashboard
│   ├── jobs/                     # Job discovery & apply
│   ├── history/                  # Application history
│   └── settings/                 # Profile & preferences
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   └── dashboard/                # Feature components
└── lib/
    ├── prisma.ts                  # DB client
    ├── auth.ts                    # NextAuth config
    ├── tinyfish.ts                # TinyFish API client
    ├── cover-letter.ts            # OpenAI integration
    └── queue/workers.ts           # BullMQ workers
```

## Key Flows

### Job Discovery
1. User enters search query + location + source (LinkedIn/Indeed/Glassdoor)
2. POST `/api/jobs` enqueues a BullMQ discovery job
3. Worker calls TinyFish agent to scrape job listings
4. Results are deduplicated and saved to PostgreSQL

### Auto Apply
1. User clicks "Apply" on a saved job
2. POST `/api/applications` generates a cover letter via OpenAI
3. Application record created, job queued in BullMQ
4. Worker calls TinyFish agent to navigate and complete the application
5. Agent logs each step; status updated in real-time

### Cover Letter Generation
- GPT-4o-mini generates tailored cover letters
- Uses job description + user profile (skills, experience, headline)
- Max 3 paragraphs, concise and role-specific
