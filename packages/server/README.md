# Hytale Server Manager - Backend

Backend API for the Hytale Server Manager application.

## Features

- **Server Management**: Start, stop, restart, and monitor game servers
- **Real-time Updates**: WebSocket support for live metrics and logs
- **Mod Management**: Install, uninstall, enable/disable mods
- **Player Management**: View players, kick, ban, whitelist
- **Console Access**: Send commands and stream logs in real-time
- **Adapter Pattern**: Easily swap between mock and real server implementations

## Tech Stack

- **Node.js** + **Express.js** + **TypeScript**
- **Prisma ORM** (SQLite for dev, PostgreSQL for prod)
- **Socket.IO** for real-time communication
- **Winston** for logging

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm

### Installation

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma:generate

# Run database migrations
pnpm prisma:migrate
```

Create a `.env` file with required values (JWT secrets and encryption key) before starting the server:

```bash
cp .env.example .env
```

### Development

```bash
# Start development server with hot reload
pnpm dev
```

The server will start on `http://localhost:3001`.

### Production

```bash
# Build the project
pnpm build

# Start production server
pnpm start
```

## API Endpoints

### Servers

- `GET /api/servers` - Get all servers
- `GET /api/servers/:id` - Get a single server
- `POST /api/servers` - Create a new server
- `PATCH /api/servers/:id` - Update a server
- `DELETE /api/servers/:id` - Delete a server

### Server Lifecycle

- `POST /api/servers/:id/start` - Start a server
- `POST /api/servers/:id/stop` - Stop a server
- `POST /api/servers/:id/restart` - Restart a server
- `POST /api/servers/:id/kill` - Force kill a server

### Server Status

- `GET /api/servers/:id/status` - Get server status
- `GET /api/servers/:id/metrics` - Get server metrics
- `GET /api/servers/:id/config` - Get server configuration

### Console

- `POST /api/servers/:id/console/command` - Send a command
- `GET /api/servers/:id/console/logs` - Get historical logs

### Mods

- `GET /api/servers/:id/mods` - Get all mods
- `POST /api/servers/:id/mods` - Install a mod
- `DELETE /api/servers/:serverId/mods/:modId` - Uninstall a mod
- `PATCH /api/servers/:serverId/mods/:modId/enable` - Enable a mod
- `PATCH /api/servers/:serverId/mods/:modId/disable` - Disable a mod

### Players

- `GET /api/servers/:id/players` - Get all players
- `POST /api/servers/:serverId/players/:uuid/kick` - Kick a player
- `POST /api/servers/:serverId/players/:uuid/ban` - Ban a player
- `POST /api/servers/:serverId/players/:uuid/unban` - Unban a player

## WebSocket Events

### Server Events (`/servers` namespace)

**Client → Server:**
- `subscribe` - Subscribe to a server's updates
  ```typescript
  { serverId: string }
  ```
- `unsubscribe` - Unsubscribe from a server's updates
  ```typescript
  { serverId: string }
  ```

**Server → Client:**
- `server:status` - Server status update
  ```typescript
  { serverId: string, status: ServerStatus }
  ```
- `server:metrics` - Server metrics update
  ```typescript
  { serverId: string, metrics: ServerMetrics }
  ```

### Console Events (`/console` namespace)

**Client → Server:**
- `subscribe` - Subscribe to console logs
  ```typescript
  { serverId: string }
  ```
- `command` - Send a command
  ```typescript
  { serverId: string, command: string }
  ```
- `unsubscribe` - Unsubscribe from console logs
  ```typescript
  { serverId: string }
  ```

**Server → Client:**
- `logs:history` - Historical logs on subscribe
  ```typescript
  { serverId: string, logs: LogEntry[] }
  ```
- `log` - Real-time log entry
  ```typescript
  { serverId: string, log: LogEntry }
  ```
- `commandResponse` - Response to a command
  ```typescript
  { serverId: string, command: string, response: CommandResponse }
  ```

## Architecture

### Adapter Pattern

The backend uses an adapter pattern to abstract server implementations:

- **IServerAdapter**: Interface defining all server operations
- **MockServerAdapter**: Simulates a server for development
- **HytaleServerAdapter**: (Future) Real Hytale server implementation

This allows the entire system to work with mock servers today and seamlessly switch to real Hytale servers when available.

### Services Layer

- **ServerService**: Server lifecycle and management
- **ConsoleService**: Console commands and log streaming
- **ModService**: Mod installation and management
- **PlayerService**: Player management and moderation

## Database Schema

See `prisma/schema.prisma` for the complete database schema.

Key models:
- `Server` - Game server instances
- `Mod` - Installed mods
- `Player` - Player data and statistics
- `Backup` - Server backups
- `ScheduledTask` - Automated tasks
- `ConsoleLog` - Server logs

## Testing

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

## Database Management

```bash
# Open Prisma Studio (GUI for database)
pnpm prisma:studio

# Create a new migration
pnpm prisma:migrate

# Generate Prisma client after schema changes
pnpm prisma:generate
```

## Environment Variables

See `.env.example` for all available environment variables.

## License

MIT
