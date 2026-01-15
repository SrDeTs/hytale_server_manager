#!/bin/bash
#
# Hytale Server Manager - Linux Installation Script
#
# This script installs and configures the Hytale Server Manager on Linux.
# It will:
# - Check for Node.js and install if needed
# - Set up the application directory
# - Install dependencies
# - Configure systemd service (optional)
# - Set up proper permissions
#
# Usage: sudo ./install.sh [OPTIONS]
#
# Options:
#   -p, --path PATH      Installation path (default: /opt/hytale-manager)
#   -u, --user USER      User to run the service (default: hytale)
#   -P, --port PORT      Application port (default: 3001)
#   -n, --no-service     Skip systemd service setup
#   -h, --help           Show this help message
#

set -e

# Default values
INSTALL_PATH="/opt/hytale-manager"
SERVICE_USER="hytale"
SERVICE_NAME="hytale-manager"
PORT=3001
SKIP_SERVICE=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Functions
print_status() { echo -e "${CYAN}[*]${NC} $1"; }
print_success() { echo -e "${GREEN}[+]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
print_error() { echo -e "${RED}[-]${NC} $1"; }

show_help() {
    echo "Hytale Server Manager - Linux Installation Script"
    echo ""
    echo "Usage: sudo $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -p, --path PATH      Installation path (default: /opt/hytale-manager)"
    echo "  -u, --user USER      User to run the service (default: hytale)"
    echo "  -P, --port PORT      Application port (default: 3001)"
    echo "  -n, --no-service     Skip systemd service setup"
    echo "  -h, --help           Show this help message"
    echo ""
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--path)
            INSTALL_PATH="$2"
            shift 2
            ;;
        -u|--user)
            SERVICE_USER="$2"
            shift 2
            ;;
        -P|--port)
            PORT="$2"
            shift 2
            ;;
        -n|--no-service)
            SKIP_SERVICE=true
            shift
            ;;
        -h|--help)
            show_help
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            ;;
    esac
done

echo ""
echo -e "${CYAN}======================================${NC}"
echo -e "${CYAN}  Hytale Server Manager Installer${NC}"
echo -e "${CYAN}======================================${NC}"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    print_error "This script must be run as root (sudo)"
    exit 1
fi

# Detect package manager
if command -v apt-get &> /dev/null; then
    PKG_MANAGER="apt"
    PKG_UPDATE="apt-get update"
    PKG_INSTALL="apt-get install -y"
elif command -v yum &> /dev/null; then
    PKG_MANAGER="yum"
    PKG_UPDATE="yum check-update || true"
    PKG_INSTALL="yum install -y"
elif command -v dnf &> /dev/null; then
    PKG_MANAGER="dnf"
    PKG_UPDATE="dnf check-update || true"
    PKG_INSTALL="dnf install -y"
elif command -v pacman &> /dev/null; then
    PKG_MANAGER="pacman"
    PKG_UPDATE="pacman -Sy"
    PKG_INSTALL="pacman -S --noconfirm"
else
    print_error "No supported package manager found (apt, yum, dnf, pacman)"
    exit 1
fi

print_status "Detected package manager: $PKG_MANAGER"

# Check for Node.js
print_status "Checking for Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js found: $NODE_VERSION"

    # Check version
    NODE_MAJOR=$(echo $NODE_VERSION | sed 's/v\([0-9]*\).*/\1/')
    if [[ $NODE_MAJOR -lt 18 ]]; then
        print_warning "Node.js 18+ is recommended. Current: $NODE_VERSION"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    print_warning "Node.js not found. Installing..."

    # Install Node.js based on distro
    case $PKG_MANAGER in
        apt)
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
            apt-get install -y nodejs
            ;;
        yum|dnf)
            curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
            $PKG_INSTALL nodejs
            ;;
        pacman)
            pacman -S --noconfirm nodejs npm
            ;;
    esac

    print_success "Node.js installed: $(node --version)"
fi

# Create service user
print_status "Setting up service user..."
if id "$SERVICE_USER" &>/dev/null; then
    print_success "User '$SERVICE_USER' already exists"
else
    useradd -r -s /bin/false -d "$INSTALL_PATH" "$SERVICE_USER"
    print_success "Created user: $SERVICE_USER"
fi

# Create installation directory
print_status "Creating installation directory: $INSTALL_PATH"
mkdir -p "$INSTALL_PATH"

# Check for existing installation
IS_UPGRADE=false
if [[ -f "$INSTALL_PATH/package.json" ]]; then
    IS_UPGRADE=true
    print_status "Existing installation detected - performing upgrade"

    # Backup config
    if [[ -f "$INSTALL_PATH/config.json" ]]; then
        cp "$INSTALL_PATH/config.json" "$INSTALL_PATH/config.json.backup"
        print_success "Backed up config.json"
    fi
fi

# Copy application files
print_status "Copying application files..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Copy server files
cp -r "$SOURCE_DIR/packages/server/"* "$INSTALL_PATH/" 2>/dev/null || true
mkdir -p "$INSTALL_PATH/public"
cp -r "$SOURCE_DIR/packages/frontend/dist/"* "$INSTALL_PATH/public/" 2>/dev/null || true

print_success "Files copied"

# Install dependencies
print_status "Installing dependencies..."
cd "$INSTALL_PATH"
npm install --omit=dev --silent
print_success "Dependencies installed"

# Setup .env file
print_status "Setting up environment configuration..."
if [[ ! -f "$INSTALL_PATH/.env" ]]; then
    if [[ -f "$INSTALL_PATH/.env.example" ]]; then
        cp "$INSTALL_PATH/.env.example" "$INSTALL_PATH/.env"
        print_success "Created .env from template"
    fi
fi

# Generate secrets if needed
if [[ -f "$INSTALL_PATH/.env" ]]; then
    print_status "Generating secrets if needed..."
    cd "$INSTALL_PATH"
    node -e "
const fs = require('fs');
const crypto = require('crypto');
let env = fs.readFileSync('.env', 'utf8');
let changed = false;
if (/^JWT_SECRET=$/m.test(env)) {
  env = env.replace(/^JWT_SECRET=$/m, 'JWT_SECRET=' + crypto.randomBytes(64).toString('hex'));
  changed = true;
}
if (/^JWT_REFRESH_SECRET=$/m.test(env)) {
  env = env.replace(/^JWT_REFRESH_SECRET=$/m, 'JWT_REFRESH_SECRET=' + crypto.randomBytes(64).toString('hex'));
  changed = true;
}
if (/^SETTINGS_ENCRYPTION_KEY=$/m.test(env)) {
  env = env.replace(/^SETTINGS_ENCRYPTION_KEY=$/m, 'SETTINGS_ENCRYPTION_KEY=' + crypto.randomBytes(16).toString('hex'));
  changed = true;
}
if (changed) {
  fs.writeFileSync('.env', env);
  console.log('Generated missing secrets');
} else {
  console.log('Secrets already configured');
}
"
    print_success "Environment configured"
fi

# Setup Prisma and run migrations
print_status "Setting up database..."
npx prisma generate 2>/dev/null || true
npx prisma migrate deploy 2>/dev/null || true
print_success "Database configured"

# Restore config if upgrade
if [[ "$IS_UPGRADE" == true ]] && [[ -f "$INSTALL_PATH/config.json.backup" ]]; then
    cp "$INSTALL_PATH/config.json.backup" "$INSTALL_PATH/config.json"
    print_success "Restored config.json"
fi

# Update port in config if specified
if [[ $PORT -ne 3001 ]] && [[ -f "$INSTALL_PATH/config.json" ]]; then
    if command -v jq &> /dev/null; then
        jq ".port = $PORT" "$INSTALL_PATH/config.json" > "$INSTALL_PATH/config.json.tmp"
        mv "$INSTALL_PATH/config.json.tmp" "$INSTALL_PATH/config.json"
        print_success "Updated port to $PORT"
    fi
fi

# Create data directories
print_status "Creating data directories..."
mkdir -p "$INSTALL_PATH/data"/{db,logs,servers,backups}
print_success "Data directories created"

# Set permissions
print_status "Setting permissions..."
chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_PATH"
chmod -R 755 "$INSTALL_PATH"
chmod 600 "$INSTALL_PATH/config.json" 2>/dev/null || true
print_success "Permissions set"

# Create management scripts
print_status "Creating management scripts..."

# start.sh
cat > "$INSTALL_PATH/start.sh" << 'SCRIPT'
#!/bin/bash
cd "$(dirname "$0")"
export NODE_ENV=production
export HSM_BASE_PATH="$(pwd)"
echo "Starting Hytale Server Manager..."
node dist/index.js
SCRIPT
chmod +x "$INSTALL_PATH/start.sh"

# stop.sh
cat > "$INSTALL_PATH/stop.sh" << 'SCRIPT'
#!/bin/bash
echo "Stopping Hytale Server Manager..."
pkill -f "node.*index.js" || true
echo "Stopped."
SCRIPT
chmod +x "$INSTALL_PATH/stop.sh"

print_success "Management scripts created"

# Install systemd service
if [[ "$SKIP_SERVICE" != true ]]; then
    print_status "Setting up systemd service..."

    cat > "/etc/systemd/system/$SERVICE_NAME.service" << EOF
[Unit]
Description=Hytale Server Manager
Documentation=https://github.com/nebula-codes/hytale_server_manager
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$INSTALL_PATH
Environment=NODE_ENV=production
Environment=HSM_BASE_PATH=$INSTALL_PATH
ExecStart=/usr/bin/node dist/index.js
ExecReload=/bin/kill -HUP \$MAINPID
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$INSTALL_PATH/data

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
    print_success "Systemd service installed: $SERVICE_NAME"

    # Start service
    print_status "Starting service..."
    systemctl start "$SERVICE_NAME"
    print_success "Service started"
fi

# Configure firewall if UFW is available
if command -v ufw &> /dev/null; then
    print_status "Configuring firewall (UFW)..."
    ufw allow "$PORT/tcp" comment "Hytale Server Manager" 2>/dev/null || true
    print_success "Firewall rule added for port $PORT"
fi

# Print summary
echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  Installation Complete!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "Installation Path: ${NC}$INSTALL_PATH"
echo -e "Web Interface:     ${NC}http://localhost:$PORT"
echo ""

if [[ "$SKIP_SERVICE" != true ]]; then
    echo -e "${YELLOW}Service Commands:${NC}"
    echo "  Start:   sudo systemctl start $SERVICE_NAME"
    echo "  Stop:    sudo systemctl stop $SERVICE_NAME"
    echo "  Restart: sudo systemctl restart $SERVICE_NAME"
    echo "  Status:  sudo systemctl status $SERVICE_NAME"
    echo "  Logs:    sudo journalctl -u $SERVICE_NAME -f"
else
    echo -e "${YELLOW}Manual Start:${NC}"
    echo "  Run: sudo -u $SERVICE_USER $INSTALL_PATH/start.sh"
fi

echo ""
echo -e "Configuration: ${NC}$INSTALL_PATH/config.json"
echo -e "Logs:          ${NC}$INSTALL_PATH/data/logs/"
echo ""
echo -e "${CYAN}First-time setup: Create an admin user at http://localhost:$PORT${NC}"
echo ""
