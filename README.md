# Hytale Server Manager

A web-based management dashboard for Hytale game servers. Built with React, TypeScript, and Node.js.

## Features

- **Server Management** - Control multiple servers with real-time metrics and live console
- **Mod Manager** - Browse and install mods from Modtale with dependency resolution
- **Modpack System** - One-click installation of pre-configured mod collections
- **Backup Management** - Automated scheduling with restore capabilities
- **Role-Based Access** - Fine-grained permissions for admin, moderator, and viewer roles

## Project Structure

```
├── packages/    # Monorepo packages
│   ├── frontend/ # React frontend application
│   ├── server/   # Node.js backend API
│   └── website/  # Documentation website (Astro)
└── scripts/     # Installation and deployment scripts
```

## Tech Stack

**Frontend:** React 18, TypeScript, Tailwind CSS, Zustand, Vite
**Backend:** Node.js, Express, Prisma, SQLite, Socket.IO

## Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Git

## Quick Start

```powershell
# Clone the repository
git clone https://github.com/nebula-codes/hytale_server_manager.git
cd hytale_server_manager

# Run initial setup (Windows)
.\scripts\windows\setup.ps1

# Run development servers (both)
pnpm dev

# Or run them separately:
# pnpm -C packages/frontend dev
# pnpm -C packages/server dev
```

If PowerShell blocks the script due to execution policy, run:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Linux setup:

```bash
bash ./scripts/linux/setup.sh
```

The setup script:
- copies `packages/frontend/.env.example` and `packages/server/.env.example` if needed
- prompts for `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `SETTINGS_ENCRYPTION_KEY` (blank = auto-generate)
- installs dependencies and runs database migrations

## Configuration

The server requires these environment variables in `packages/server/.env`:

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret key for JWT tokens (required) |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens (required) |
| `SETTINGS_ENCRYPTION_KEY` | 32-character key for encrypting sensitive settings (required) |
| `DATABASE_URL` | SQLite database path (default: `file:./data/hytalepanel.db`) |

## Login / Admin Credentials

If you don't have an admin user yet, run the reset script to create or reset it:

```powershell
node packages/server/reset-admin.js
```

This creates (or resets) the `admin` user with password `Admin123!@#` by default.
You can pass a custom password:

```powershell
node packages/server/reset-admin.js MyNewPassword123!
```

## License

MIT License - see [LICENSE](LICENSE) for details.

---

This is an unofficial fan project and is not affiliated with Hytale or Hypixel Studios.
