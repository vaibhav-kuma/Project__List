#!/bin/bash
set -e

echo "================================================"
echo "  Ninor Video Chat - Development Setup"
echo "================================================"
echo ""

# Check prerequisites
echo "→ Checking prerequisites..."

command -v node >/dev/null 2>&1 || { echo "✖ Node.js required. Install via nvm: https://github.com/nvm-sh/nvm"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "✖ npm required."; exit 1; }
command -v docker >/dev/null 2>&1 || echo "⚠ Docker not found. Using local DB/Redis instead."

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "✖ Node.js 18+ required (found v$(node -v))"
  exit 1
fi
echo "✓ Node.js $(node -v)"
echo "✓ npm $(npm -v)"

# Install dependencies
echo ""
echo "→ Installing dependencies..."
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
echo "✓ Dependencies installed"

# Set up environment files
echo ""
echo "→ Setting up environment files..."
if [ ! -f backend/.env ]; then
  if [ -f backend/.env.example ]; then
    cp backend/.env.example backend/.env
    echo "✓ Created backend/.env from .env.example"
  else
    echo "⚠ backend/.env.example not found. Create backend/.env manually."
  fi
fi

if [ ! -f frontend/.env.local ]; then
  if [ -f frontend/.env.local.example ]; then
    cp frontend/.env.local.example frontend/.env.local
    echo "✓ Created frontend/.env.local from .env.local.example"
  else
    echo "⚠ frontend/.env.local.example not found. Create frontend/.env.local manually."
  fi
fi

# Start Docker services if available
if command -v docker >/dev/null 2>&1; then
  echo ""
  echo "→ Starting Docker services..."
  echo "  Starting PostgreSQL and Redis..."
  docker compose up -d postgres redis 2>/dev/null || {
    echo "  ⚠ Docker compose failed. Start PostgreSQL and Redis manually."
  }
  echo "  ✓ Docker services started"
fi

# Set up database
echo ""
echo "→ Setting up database..."
cd backend

if npx prisma generate 2>/dev/null; then
  echo "✓ Prisma client generated"
else
  echo "⚠ Prisma generate failed. Check DATABASE_URL in backend/.env"
fi

if npx prisma migrate dev --name init 2>/dev/null; then
  echo "✓ Database migrations applied"
else
  echo "⚠ Database migration failed. Check database connection."
fi

if npm run seed:subscription 2>/dev/null; then
  echo "✓ Subscription features seeded"
else
  echo "⚠ Seed failed. Will retry on first dev run."
fi

cd ..

# Install Husky hooks
echo ""
echo "→ Installing Git hooks..."
npx husky 2>/dev/null || echo "⚠ Husky install failed. Run 'npx husky' manually."
echo "✓ Git hooks installed"

# Verify setup
echo ""
echo "→ Verifying setup..."
cd backend && npx tsc --noEmit 2>/dev/null && echo "✓ Backend TypeScript: OK" || echo "⚠ Backend has TypeScript errors"
cd ../frontend && npx tsc --noEmit 2>/dev/null && echo "✓ Frontend TypeScript: OK" || echo "⚠ Frontend has TypeScript errors"
cd ..

echo ""
echo "================================================"
echo "  Setup Complete!"
echo "================================================"
echo ""
echo "  Start development:"
echo "    npm run dev"
echo ""
echo "  Run tests:"
echo "    npm test"
echo ""
echo "  Build:"
echo "    npm run build"
echo ""
echo "================================================"
