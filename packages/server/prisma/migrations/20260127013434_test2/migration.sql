/*
  Warnings:

  - You are about to alter the column `fileSize` on the `Backup` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `fileSize` on the `ModFile` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Backup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filePath" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "totalFiles" INTEGER,
    "backedUpFiles" INTEGER,
    "skippedFiles" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "storageType" TEXT NOT NULL DEFAULT 'local',
    "remotePath" TEXT,
    "networkBackupId" TEXT,
    "automationRuleId" TEXT,
    "scheduledTaskId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "Backup_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Backup_networkBackupId_fkey" FOREIGN KEY ("networkBackupId") REFERENCES "NetworkBackup" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Backup_automationRuleId_fkey" FOREIGN KEY ("automationRuleId") REFERENCES "AutomationRule" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Backup_scheduledTaskId_fkey" FOREIGN KEY ("scheduledTaskId") REFERENCES "ScheduledTask" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Backup" ("automationRuleId", "backedUpFiles", "completedAt", "createdAt", "description", "error", "filePath", "fileSize", "id", "name", "networkBackupId", "remotePath", "scheduledTaskId", "serverId", "skippedFiles", "status", "storageType", "totalFiles") SELECT "automationRuleId", "backedUpFiles", "completedAt", "createdAt", "description", "error", "filePath", "fileSize", "id", "name", "networkBackupId", "remotePath", "scheduledTaskId", "serverId", "skippedFiles", "status", "storageType", "totalFiles" FROM "Backup";
DROP TABLE "Backup";
ALTER TABLE "new_Backup" RENAME TO "Backup";
CREATE INDEX "Backup_serverId_idx" ON "Backup"("serverId");
CREATE INDEX "Backup_createdAt_idx" ON "Backup"("createdAt");
CREATE INDEX "Backup_networkBackupId_idx" ON "Backup"("networkBackupId");
CREATE INDEX "Backup_automationRuleId_idx" ON "Backup"("automationRuleId");
CREATE INDEX "Backup_scheduledTaskId_idx" ON "Backup"("scheduledTaskId");
CREATE TABLE "new_ModFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "fileType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModFile_modId_fkey" FOREIGN KEY ("modId") REFERENCES "Mod" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ModFile" ("createdAt", "fileName", "filePath", "fileSize", "fileType", "id", "modId") SELECT "createdAt", "fileName", "filePath", "fileSize", "fileType", "id", "modId" FROM "ModFile";
DROP TABLE "ModFile";
ALTER TABLE "new_ModFile" RENAME TO "ModFile";
CREATE INDEX "ModFile_modId_idx" ON "ModFile"("modId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
