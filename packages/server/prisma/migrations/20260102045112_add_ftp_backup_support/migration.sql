-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Backup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "storageType" TEXT NOT NULL DEFAULT 'local',
    "remotePath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "Backup_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Backup" ("completedAt", "createdAt", "description", "error", "filePath", "fileSize", "id", "name", "serverId", "status") SELECT "completedAt", "createdAt", "description", "error", "filePath", "fileSize", "id", "name", "serverId", "status" FROM "Backup";
DROP TABLE "Backup";
ALTER TABLE "new_Backup" RENAME TO "Backup";
CREATE INDEX "Backup_serverId_idx" ON "Backup"("serverId");
CREATE INDEX "Backup_createdAt_idx" ON "Backup"("createdAt");
CREATE TABLE "new_Server" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "version" TEXT NOT NULL,
    "maxPlayers" INTEGER NOT NULL,
    "gameMode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'stopped',
    "serverPath" TEXT NOT NULL,
    "worldPath" TEXT NOT NULL,
    "backupPath" TEXT,
    "backupType" TEXT NOT NULL DEFAULT 'local',
    "adapterType" TEXT NOT NULL DEFAULT 'mock',
    "adapterConfig" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Server" ("adapterConfig", "adapterType", "address", "createdAt", "gameMode", "id", "maxPlayers", "name", "port", "serverPath", "status", "updatedAt", "version", "worldPath") SELECT "adapterConfig", "adapterType", "address", "createdAt", "gameMode", "id", "maxPlayers", "name", "port", "serverPath", "status", "updatedAt", "version", "worldPath" FROM "Server";
DROP TABLE "Server";
ALTER TABLE "new_Server" RENAME TO "Server";
CREATE INDEX "Server_status_idx" ON "Server"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
