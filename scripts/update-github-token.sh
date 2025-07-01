#!/usr/bin/env bash
# Update GitHub token for MCP servers
set -euo pipefail

echo "🔐 GitHub Token Update for MCP Servers"
echo "======================================"
echo ""
echo "⚠️  SECURITY NOTICE:"
echo "Your previous GitHub token was exposed in the configuration file."
echo "Please generate a new token for security."
echo ""
echo "📋 Steps to generate a new token:"
echo "1. Go to: https://github.com/settings/tokens"
echo "2. Click 'Generate new token (classic)'"
echo "3. Select these scopes:"
echo "   - repo (Full control of private repositories)"
echo "   - read:org (Read org and team membership)"
echo "   - read:user (Read user profile data)"
echo "4. Copy the generated token"
echo ""

read -p "Enter your new GitHub token: " -s NEW_TOKEN
echo ""

if [ -z "$NEW_TOKEN" ]; then
    echo "❌ No token provided. Exiting."
    exit 1
fi

# Update .env.mcp.local
if [ -f .env.mcp.local ]; then
    # Create backup
    cp .env.mcp.local .env.mcp.local.backup
    
    # Update token
    sed -i "s/GITHUB_TOKEN=.*/GITHUB_TOKEN=$NEW_TOKEN/" .env.mcp.local
    
    echo "✅ Token updated in .env.mcp.local"
    echo "📁 Backup saved as .env.mcp.local.backup"
else
    echo "❌ .env.mcp.local not found. Please run setup first."
    exit 1
fi

# Test the new token
echo ""
echo "🧪 Testing new token..."
if command -v curl &> /dev/null; then
    if curl -s -H "Authorization: token $NEW_TOKEN" https://api.github.com/user > /dev/null; then
        echo "✅ Token is valid!"
    else
        echo "❌ Token validation failed. Please check your token."
        exit 1
    fi
else
    echo "⚠️  curl not found, skipping token validation"
fi

# Reload environment if using direnv
if command -v direnv &> /dev/null && [ -f .envrc ]; then
    echo ""
    echo "🔄 Reloading environment..."
    direnv reload
fi

echo ""
echo "🎉 GitHub token updated successfully!"
echo ""
echo "💡 Next steps:"
echo "1. Test MCP servers: test-mcp-servers"
echo "2. Start Amazon Q: q chat"
echo "3. Try: 'Show me recent commits in this repository'"
