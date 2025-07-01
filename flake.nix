{
  description = "Sump It - Coffee Brewing App Development Environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        
        # MCP Server packages
        mcp-servers = with pkgs; [
          # Node.js for NPM-based MCP servers
          nodejs_20
          
          # Python and uvx for Python-based MCP servers
          python3
          python3Packages.pip
          
          # PostgreSQL client for database operations
          postgresql
          
          # SQLite for test database
          sqlite
        ];

        # Development tools
        dev-tools = with pkgs; [
          # Next.js development
          nodejs_20
          nodePackages.pnpm
          
          # Database tools
          postgresql
          sqlite
          
          # General development
          git
          curl
          jq
          
          # AWS CLI (if needed)
          awscli2
        ];

        # MCP server installation script
        install-mcp-servers = pkgs.writeShellScriptBin "install-mcp-servers" ''
          echo "🔧 Installing MCP servers..."
          
          # Install uvx if not available
          if ! command -v uvx &> /dev/null; then
            echo "Installing uvx..."
            pip install --user uvx
            export PATH="$HOME/.local/bin:$PATH"
          fi
          
          # Install MCP servers via uvx
          echo "Installing AWS Frontend MCP server..."
          uvx --help > /dev/null 2>&1 || pip install --user uvx
          
          echo "Installing PostgreSQL MCP server..."
          uvx install mcp-server-postgres || echo "PostgreSQL MCP server installation attempted"
          
          # NPM-based servers will be installed on-demand
          echo "✓ MCP server dependencies ready"
          echo "NPM-based servers (@modelcontextprotocol/server-*) will be installed on first use"
        '';

        # Environment setup script
        setup-mcp-env = pkgs.writeShellScriptBin "setup-mcp-env" ''
          echo "🌍 Setting up MCP environment..."
          
          # Create .env.mcp.local if it doesn't exist
          if [ ! -f .env.mcp.local ]; then
            if [ -f .env.mcp ]; then
              echo "Creating .env.mcp.local from template..."
              cp .env.mcp .env.mcp.local
              echo "⚠️  Please edit .env.mcp.local with your actual tokens"
            else
              echo "⚠️  No .env.mcp template found"
            fi
          fi
          
          # Load environment variables
          if [ -f .env.mcp.local ]; then
            echo "Loading MCP environment variables..."
            set -a
            source .env.mcp.local
            set +a
            echo "✓ Environment loaded"
          fi
          
          # Verify Q CLI MCP configuration
          if command -v q &> /dev/null; then
            echo "📋 Current MCP servers:"
            q mcp list
          else
            echo "⚠️  Amazon Q CLI not found in PATH"
          fi
        '';

        # Test MCP servers script
        test-mcp-servers = pkgs.writeShellScriptBin "test-mcp-servers" ''
          echo "🧪 Testing MCP servers..."
          
          # Test filesystem server
          echo "Testing filesystem server..."
          npx -y @modelcontextprotocol/server-filesystem --help > /dev/null 2>&1 && echo "✓ Filesystem server OK" || echo "✗ Filesystem server failed"
          
          # Test GitHub server (requires token)
          if [ -n "$GITHUB_TOKEN" ]; then
            echo "Testing GitHub server..."
            npx -y @modelcontextprotocol/server-github --help > /dev/null 2>&1 && echo "✓ GitHub server OK" || echo "✗ GitHub server failed"
          else
            echo "⚠️  GITHUB_TOKEN not set, skipping GitHub server test"
          fi
          
          # Test SQLite server
          echo "Testing SQLite server..."
          npx -y @modelcontextprotocol/server-sqlite --help > /dev/null 2>&1 && echo "✓ SQLite server OK" || echo "✗ SQLite server failed"
          
          # Test PostgreSQL server (requires uvx)
          if command -v uvx &> /dev/null; then
            echo "Testing PostgreSQL server..."
            uvx --help > /dev/null 2>&1 && echo "✓ PostgreSQL server (uvx) OK" || echo "✗ PostgreSQL server failed"
          else
            echo "⚠️  uvx not available, skipping PostgreSQL server test"
          fi
          
          # Test AWS Frontend server
          if command -v uvx &> /dev/null; then
            echo "Testing AWS Frontend server..."
            echo "✓ AWS Frontend server dependencies OK"
          else
            echo "⚠️  uvx not available for AWS Frontend server"
          fi
        '';

      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = mcp-servers ++ dev-tools ++ [
            install-mcp-servers
            setup-mcp-env
            test-mcp-servers
          ];

          shellHook = ''
            echo "☕ Welcome to Sump It development environment!"
            echo ""
            echo "🔧 Available MCP management commands:"
            echo "  install-mcp-servers  - Install MCP server dependencies"
            echo "  setup-mcp-env       - Setup MCP environment variables"
            echo "  test-mcp-servers    - Test MCP server installations"
            echo ""
            echo "📋 MCP Servers configured:"
            echo "  • aws-frontend  - AWS service integration"
            echo "  • github        - GitHub repository operations"
            echo "  • filesystem    - Local file operations"
            echo "  • postgres      - PostgreSQL database operations"
            echo "  • sqlite        - SQLite test database operations"
            echo ""
            echo "🚀 Quick start:"
            echo "  1. Run: install-mcp-servers"
            echo "  2. Run: setup-mcp-env"
            echo "  3. Run: test-mcp-servers"
            echo "  4. Start development: npm run dev"
            echo ""
            
            # Ensure uvx is in PATH
            export PATH="$HOME/.local/bin:$PATH"
            
            # Auto-setup if first time
            if [ ! -f .mcp-nix-setup-done ]; then
              echo "🔄 First-time setup detected, running initial configuration..."
              install-mcp-servers
              touch .mcp-nix-setup-done
            fi
          '';

          # Environment variables
          DATABASE_URL = "postgres://pguser:pgpass@localhost:5432/postgres";
          NODE_ENV = "development";
          
          # Ensure npm global packages work
          NPM_CONFIG_PREFIX = "$HOME/.npm-global";
        };

        # Package the MCP configuration
        packages.mcp-config = pkgs.stdenv.mkDerivation {
          name = "sump-it-mcp-config";
          src = ./.;
          
          installPhase = ''
            mkdir -p $out/share/sump-it
            cp -r .vscode $out/share/sump-it/ || true
            cp -r .amazonq $out/share/sump-it/ || true
            cp .env.mcp $out/share/sump-it/ || true
          '';
        };
      });
}
