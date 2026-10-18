#!/bin/bash

# Coffee Brewer Consolidated - Simple Setup Script
# For environments without Docker Compose

set -e

echo "🚀 Setting up Coffee Brewer Consolidated Application (Simple Mode)"
echo "================================================================"

# Check for required tools
echo "🔧 Checking for required tools..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed."; exit 1; }
command -v cargo >/dev/null 2>&1 || { echo "⚠️  Rust/Cargo not found. Backend will need Rust installed."; }

# Create environment file
echo "📝 Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from .env.example"
    echo "   Note: You may need to adjust DATABASE_URL for your setup"
else
    echo "ℹ️  .env file already exists"
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
if [ ! -d node_modules ]; then
    npm install
    echo "✅ Frontend dependencies installed"
else
    echo "ℹ️  Frontend dependencies already installed"
fi
cd ..

# Check backend dependencies
echo "🦀 Checking backend dependencies..."
cd backend
if [ -f Cargo.toml ]; then
    echo "✅ Rust backend detected"
    echo "   To build: cargo build"
    echo "   To run: cargo run"
else
    echo "❌ Backend Cargo.toml not found"
fi
cd ..

echo ""
echo "================================================================"
echo "✅ Simple setup complete!"
echo ""
echo "📋 Manual Setup Required:"
echo ""
echo "1. 🗄️  Database Setup:"
echo "   You need a PostgreSQL database running"
echo "   Update DATABASE_URL in .env file"
echo "   Example: postgresql://username:password@localhost:5432/coffee_brewer"
echo ""
echo "2. 🦀 Backend Setup:"
echo "   cd backend"
echo "   cargo build  # Build the Rust backend"
echo "   cargo run    # Start the backend server"
echo ""
echo "3. 🌐 Frontend Setup:"
echo "   cd frontend"
echo "   npm run dev  # Start the Next.js development server"
echo ""
echo "4. 📊 Database Initialization:"
echo "   The backend will create tables on first run"
echo "   Check logs for migration output"
echo ""
echo "🎯 Access Points (when running):"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:3001"
echo "   - API Health: http://localhost:3001/health"
echo ""
echo "🔧 Matt Pocock Skills:"
echo "   Skills are installed in .agents/ and .claude/"
echo "   Available for AI agents to use during development"
echo ""
echo "📚 Documentation:"
echo "   - CLAUDE.md: Project context for AI agents"
echo "   - GLOSSARY.md: Coffee brewing domain terms"
echo "   - README.md: Complete project overview"
echo ""
echo "☕ Happy brewing!"