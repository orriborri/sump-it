#!/usr/bin/env bash
# Nix-based MCP setup for Amazon Q CLI
set -euo pipefail

echo "🔧 Setting up MCP servers with Nix..."

# Ensure we're in a Nix shell
if [ -z "${IN_NIX_SHELL:-}" ]; then
    echo "⚠️  Not in a Nix shell. Run 'direnv allow' or 'nix develop' first."
    exit 1
fi

# Create MCP environment file if it doesn't exist
if [ ! -f .env.mcp.local ]; then
    echo "📝 Creating .env.mcp.local from template..."
    if [ -f .env.mcp ]; then
        cp .env.mcp .env.mcp.local
        echo "✓ Created .env.mcp.local - please edit with your actual tokens"
    else
        echo "⚠️  No .env.mcp template found"
    fi
fi

# Load environment variables
if [ -f .env.mcp.local ]; then
    echo "🌍 Loading MCP environment variables..."
    set -a
    source .env.mcp.local
    set +a
fi

# Install uvx if not available
if ! command -v uvx &> /dev/null; then
    echo "📦 Installing uvx..."
    pip install --user uvx
    export PATH="$HOME/.local/bin:$PATH"
fi

# Configure Q CLI MCP servers (remove existing first)
echo "🔄 Configuring Q CLI MCP servers..."

# Remove existing servers (ignore errors)
q mcp remove --name aws-frontend --scope workspace 2>/dev/null || true
q mcp remove --name github --scope workspace 2>/dev/null || true
q mcp remove --name filesystem --scope workspace 2>/dev/null || true
q mcp remove --name postgres --scope workspace 2>/dev/null || true
q mcp remove --name sqlite --scope workspace 2>/dev/null || true

# Add servers with Nix-managed dependencies
echo "➕ Adding MCP servers..."

q mcp add --name "aws-frontend" \
    --command "uvx" \
    --args "awslabs.frontend-mcp-server@latest" \
    --scope workspace

q mcp add --name "github" \
    --command "npx" \
    --args "-y,@modelcontextprotocol/server-github" \
    --env "GITHUB_PERSONAL_ACCESS_TOKEN=\${GITHUB_TOKEN}" \
    --scope workspace

q mcp add --name "filesystem" \
    --command "npx" \
    --args "-y,@modelcontextprotocol/server-filesystem,$(pwd)" \
    --scope workspace

q mcp add --name "postgres" \
    --command "uvx" \
    --args "mcp-server-postgres" \
    --env "DATABASE_URL=\${DATABASE_URL}" \
    --scope workspace

q mcp add --name "sqlite" \
    --command "npx" \
    --args "-y,@modelcontextprotocol/server-sqlite,$(pwd)/test.db" \
    --scope workspace

echo "✅ MCP servers configured successfully!"
echo ""
echo "📋 Configured servers:"
q mcp list

echo ""
echo "🧪 Testing server availability..."
test-mcp-servers

echo ""
echo "🎉 Nix-based MCP setup complete!"
echo ""
echo "💡 Tips:"
echo "  • Environment is automatically loaded via direnv"
echo "  • All dependencies are managed by Nix"
echo "  • Run 'q chat' to start using MCP servers"
echo "  • Edit .env.mcp.local to update tokens"
