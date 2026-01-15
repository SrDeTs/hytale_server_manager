#!/bin/bash
#
# Hytale Server Manager - Start Script
#
# This script starts the application in the foreground.
# For production use, prefer the systemd service.
#

# Colors
CYAN='\033[0;36m'
NC='\033[0m'

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Determine the application directory
if [[ -f "$SCRIPT_DIR/dist/index.js" ]]; then
    APP_DIR="$SCRIPT_DIR"
elif [[ -f "$SCRIPT_DIR/../../packages/server/dist/index.js" ]]; then
    APP_DIR="$SCRIPT_DIR/../../packages/server"
elif [[ -f "/opt/hytale-manager/dist/index.js" ]]; then
    APP_DIR="/opt/hytale-manager"
else
    echo "Error: Cannot find application files"
    echo "Expected to find dist/index.js"
    exit 1
fi

cd "$APP_DIR"

# Set environment
export NODE_ENV=production
export HSM_BASE_PATH="$APP_DIR"

echo ""
echo -e "${CYAN}======================================${NC}"
echo -e "${CYAN}  Hytale Server Manager${NC}"
echo -e "${CYAN}======================================${NC}"
echo ""
echo "Starting application from: $APP_DIR"
echo "Press Ctrl+C to stop"
echo ""

# Start the application
node dist/index.js
EXIT_CODE=$?

# If exit code is 100, an update is in progress - exit silently
if [ $EXIT_CODE -eq 100 ]; then
    echo ""
    echo "Update in progress... This terminal will close."
    sleep 2
    exit 0
fi

# If we get here, the app stopped normally
echo ""
echo "Application stopped."
