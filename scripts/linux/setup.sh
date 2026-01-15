#!/bin/bash
#
# Hytale Server Manager - Setup Script
# Bootstraps env files, secrets, dependencies, and DB migrations.
#

set -euo pipefail

fail() {
  echo "ERROR: $1" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "$2"
}

log_step() {
  echo ""
  echo "==> $1"
}

escape_sed() {
  echo "$1" | sed -e 's/[\/&]/\\&/g'
}

get_env_value() {
  local key="$1"
  if grep -q "^${key}=" "$SERVER_ENV"; then
    grep "^${key}=" "$SERVER_ENV" | head -n 1 | cut -d= -f2-
  else
    echo ""
  fi
}

set_env_value() {
  local key="$1"
  local value="$2"
  local escaped_value
  escaped_value="$(escape_sed "$value")"
  if grep -q "^${key}=" "$SERVER_ENV"; then
    sed -i "s|^${key}=.*|${key}=${escaped_value}|" "$SERVER_ENV"
  else
    echo "${key}=${value}" >> "$SERVER_ENV"
  fi
}

prompt_for_secret() {
  local key="$1"
  local bytes="$2"
  local existing="$3"
  local input_value

  if [ -n "$existing" ]; then
    read -r -p "${key} already set. Overwrite? [y/N]: " overwrite
    case "$overwrite" in
      [yY]|[yY][eE][sS]) ;;
      *) echo "$existing"; return ;;
    esac
  fi

  read -r -p "Enter ${key} (leave blank to auto-generate): " input_value
  if [ -z "$input_value" ]; then
    input_value="$(node -e "process.stdout.write(require('crypto').randomBytes(${bytes}).toString('hex'))")"
  fi
  echo "$input_value"
}

trap 'fail "Setup failed. Check the error above."' ERR

log_step "Validating prerequisites..."
require_cmd node "Node.js is required. Install from https://nodejs.org/"
require_cmd pnpm "pnpm is required. Install with: npm install -g pnpm"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

FRONTEND_ENV_EXAMPLE="$ROOT_DIR/packages/frontend/.env.example"
FRONTEND_ENV="$ROOT_DIR/packages/frontend/.env"
SERVER_ENV_EXAMPLE="$ROOT_DIR/packages/server/.env.example"
SERVER_ENV="$ROOT_DIR/packages/server/.env"

log_step "Preparing environment files..."
if [ ! -f "$FRONTEND_ENV" ]; then
  [ -f "$FRONTEND_ENV_EXAMPLE" ] || fail "Missing env template: $FRONTEND_ENV_EXAMPLE"
  cp "$FRONTEND_ENV_EXAMPLE" "$FRONTEND_ENV"
  echo "Created $FRONTEND_ENV"
else
  echo "Found $FRONTEND_ENV"
fi

if [ ! -f "$SERVER_ENV" ]; then
  [ -f "$SERVER_ENV_EXAMPLE" ] || fail "Missing env template: $SERVER_ENV_EXAMPLE"
  cp "$SERVER_ENV_EXAMPLE" "$SERVER_ENV"
  echo "Created $SERVER_ENV"
else
  echo "Found $SERVER_ENV"
fi

log_step "Configuring server secrets..."
jwt_secret="$(prompt_for_secret "JWT_SECRET" 64 "$(get_env_value "JWT_SECRET")")"
set_env_value "JWT_SECRET" "$jwt_secret"

jwt_refresh="$(prompt_for_secret "JWT_REFRESH_SECRET" 64 "$(get_env_value "JWT_REFRESH_SECRET")")"
set_env_value "JWT_REFRESH_SECRET" "$jwt_refresh"

encryption_key="$(prompt_for_secret "SETTINGS_ENCRYPTION_KEY" 32 "$(get_env_value "SETTINGS_ENCRYPTION_KEY")")"
set_env_value "SETTINGS_ENCRYPTION_KEY" "$encryption_key"

echo "Server secrets updated"

log_step "Installing workspace dependencies..."
cd "$ROOT_DIR"
pnpm install

log_step "Running database migrations..."
pnpm -C "$ROOT_DIR/packages/server" prisma:migrate

echo ""
echo "Setup complete."
