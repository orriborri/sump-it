#!/bin/bash

# Coffee Brewer Consolidation - Setup Script
# This script helps set up the consolidated coffee brewing application

set -e

echo "🚀 Setting up Coffee Brewer Consolidated Application"
echo "======================================================"

# Check for required tools
echo "🔧 Checking for required tools..."
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "⚠️  Node.js not found. Some features may require Node.js."; }

# Create environment file
echo "📝 Creating environment file..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from .env.example"
else
    echo "ℹ️  .env file already exists, skipping..."
fi

# Install Rust toolchain (if not present)
echo "🦀 Checking for Rust toolchain..."
if ! command -v rustc >/dev/null 2>&1; then
    echo "⚠️  Rust not found. Backend development requires Rust."
    echo "   Install with: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
fi

# Install Node.js dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
if [ ! -d node_modules ]; then
    npm install
    echo "✅ Frontend dependencies installed"
else
    echo "ℹ️  Frontend dependencies already installed, skipping..."
fi
cd ..

# Build and start Docker containers
echo "🐳 Starting Docker containers..."
docker-compose up -d

echo ""
echo "======================================================"
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "   1. Wait for containers to start (check with: docker-compose ps)"
echo "   2. Access the applications:"
echo "      - Frontend: http://localhost:3000"
echo "      - Backend API: http://localhost:3001"
echo "      - Backend Health: http://localhost:3001/health"
echo ""
echo "📚 Documentation:"
echo "   - README.md: Complete project overview"
echo "   - CONSOLIDATION_SUMMARY.md: What was consolidated and why"
echo ""
echo "🔧 Development commands:"
echo "   - Start/stop containers: docker-compose up -d / docker-compose down"
echo "   - View logs: docker-compose logs -f"
echo "   - Rebuild: docker-compose up -d --build"
echo ""
echo "🐞 Troubleshooting:"
echo "   - Check container status: docker-compose ps"
echo "   - View logs: docker-compose logs [service]"
echo "   - Rebuild a specific service: docker-compose up -d --build [service]"
echo ""
echo "☕ Happy brewing!"