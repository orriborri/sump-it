# Nix-based MCP Server Setup for Sump It

This project now uses Nix to manage MCP (Model Context Protocol) servers for Amazon Q CLI, providing a reproducible and isolated development environment.

## 🎯 What's Configured

### MCP Servers
- **aws-frontend** - AWS service integration and recommendations
- **github** - GitHub repository operations and management
- **filesystem** - Local file system operations (scoped to project)
- **postgres** - PostgreSQL database operations
- **sqlite** - SQLite test database operations

### Development Tools
- Node.js 20 with pnpm
- PostgreSQL client tools
- SQLite
- Python 3 with pip and uvx
- AWS CLI v2
- Standard development utilities (git, curl, jq)

## 🚀 Quick Start

### 1. Enter the Nix Environment
```bash
# If using direnv (recommended)
direnv allow

# Or manually enter the Nix shell
nix develop
```

### 2. Run Initial Setup
```bash
# Run the automated setup script
./nix-mcp-setup.sh
```

### 3. Configure Your Tokens
```bash
# Edit the environment file with your actual tokens
nano .env.mcp.local
```

Required tokens:
- `GITHUB_TOKEN` - GitHub Personal Access Token
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)

### 4. Test the Setup
```bash
# Test MCP servers
test-mcp-servers

# List configured servers
q mcp list

# Start Amazon Q chat with MCP servers
q chat
```

## 🔧 Available Commands

When in the Nix shell, you have access to these custom commands:

- `install-mcp-servers` - Install MCP server dependencies
- `setup-mcp-env` - Setup MCP environment variables
- `test-mcp-servers` - Test MCP server installations
- `nix-mcp-setup.sh` - Complete MCP setup automation

## 📁 File Structure

```
.
├── flake.nix              # Nix flake configuration
├── flake.lock             # Nix flake lock file
├── .envrc                 # direnv configuration
├── .env.mcp               # MCP environment template
├── .env.mcp.local         # Your actual tokens (gitignored)
├── nix-mcp-setup.sh       # Automated setup script
├── .amazonq/
│   └── mcp.json          # Q CLI MCP configuration
└── .vscode/
    ├── mcp.json          # VS Code MCP configuration
    └── MCP_README.md     # VS Code MCP documentation
```

## 🔒 Security Features

- **Environment isolation** - All dependencies managed by Nix
- **Token security** - Sensitive data in gitignored files
- **Reproducible builds** - Exact dependency versions locked
- **Scoped access** - Filesystem server limited to project directory

## 🛠️ Customization

### Adding New MCP Servers

1. **Update flake.nix** - Add new dependencies if needed
2. **Modify nix-mcp-setup.sh** - Add new server configuration
3. **Update environment** - Add required environment variables

### Changing Node.js Version

Edit `flake.nix` and change `nodejs_20` to your preferred version:
```nix
nodejs_22  # or nodejs_18, etc.
```

### Adding Development Tools

Add tools to the `dev-tools` list in `flake.nix`:
```nix
dev-tools = with pkgs; [
  # existing tools...
  your-new-tool
];
```

## 🐛 Troubleshooting

### MCP Servers Not Loading
```bash
# Check if you're in the Nix shell
echo $IN_NIX_SHELL

# Reload the environment
direnv reload

# Re-run setup
./nix-mcp-setup.sh
```

### Missing Dependencies
```bash
# Update flake
nix flake update

# Rebuild environment
direnv reload
```

### Token Issues
```bash
# Check environment variables
echo $GITHUB_TOKEN
echo $DATABASE_URL

# Reload environment
source .env.mcp.local
```

### Database Connection Issues
```bash
# Test PostgreSQL connection
psql $DATABASE_URL -c "SELECT 1;"

# Check if PostgreSQL is running
systemctl status postgresql
# or
docker ps | grep postgres
```

## 🔄 Updates and Maintenance

### Update Nix Dependencies
```bash
nix flake update
direnv reload
```

### Update MCP Servers
```bash
# NPM-based servers update automatically
# For uvx-based servers:
uvx upgrade mcp-server-postgres
uvx upgrade awslabs.frontend-mcp-server
```

### Regenerate Configuration
```bash
./nix-mcp-setup.sh
```

## 💡 Tips

- **Use direnv** - Automatically loads the environment when you `cd` into the project
- **Commit flake.lock** - Ensures reproducible builds across machines
- **Keep tokens secure** - Never commit `.env.mcp.local`
- **Test regularly** - Run `test-mcp-servers` after changes
- **Update dependencies** - Run `nix flake update` periodically

## 🤝 Integration with Amazon Q

The MCP servers are automatically available when using Amazon Q CLI:

```bash
# Start a chat session with MCP servers loaded
q chat

# Example queries you can now make:
# "Show me the database schema for the brews table"
# "List the recent commits in this repository"  
# "What files are in the app/brew directory?"
# "Help me deploy this to AWS"
```

## 📚 Further Reading

- [Nix Flakes Documentation](https://nixos.wiki/wiki/Flakes)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Amazon Q CLI MCP Guide](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/command-line-mcp-security.html)
- [direnv Documentation](https://direnv.net/)
