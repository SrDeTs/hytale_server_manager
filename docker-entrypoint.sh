#!/bin/sh
set -e

echo "======================================"
echo "  Hytale Server Manager - Docker"
echo "======================================"

# Ensure data directories exist with correct permissions
mkdir -p /app/data/db /app/data/servers /app/data/backups /app/data/logs /app/data/certs

# Generate secrets if not provided
if [ -z "$JWT_SECRET" ]; then
    echo "Warning: JWT_SECRET not set, generating random value..."
    export JWT_SECRET=$(head -c 64 /dev/urandom | base64 | tr -d '\n' | head -c 128)
fi

if [ -z "$JWT_REFRESH_SECRET" ]; then
    echo "Warning: JWT_REFRESH_SECRET not set, generating random value..."
    export JWT_REFRESH_SECRET=$(head -c 64 /dev/urandom | base64 | tr -d '\n' | head -c 128)
fi

if [ -z "$SETTINGS_ENCRYPTION_KEY" ]; then
    echo "Warning: SETTINGS_ENCRYPTION_KEY not set, generating random value..."
    export SETTINGS_ENCRYPTION_KEY=$(head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n' | head -c 32)
fi

# Run Prisma database setup (creates/updates schema)
echo "Setting up database..."
npx prisma db push --skip-generate

echo "Database ready."
echo "Starting Hytale Server Manager..."

# Execute the main command
exec "$@"
