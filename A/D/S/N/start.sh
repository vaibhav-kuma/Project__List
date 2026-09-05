#!/bin/bash

# AutoApply AI - Development Server Startup Script

echo "🚀 AutoApply AI - Starting Development Server"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed."
    exit 1
fi

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    echo "⚠️  backend/.env not found!"
    echo "Creating from template..."
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env"
    echo ""
    echo "⚠️  IMPORTANT: Edit backend/.env and add your OPENAI_API_KEY"
    exit 1
fi

echo "✅ Checking OpenAI API Key..."
if grep -q "sk-your-api-key-here" backend/.env; then
    echo "❌ Please update OPENAI_API_KEY in backend/.env"
    exit 1
fi

echo "✅ All checks passed!"
echo ""
echo "📦 Building Docker images..."
docker-compose build

echo ""
echo "🚀 Starting services..."
docker-compose up

echo ""
echo "✅ Services are running!"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
