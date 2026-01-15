/*
  Warnings:

  - You are about to drop the column `filePath` on the `Mod` table. All the data in the column will be lost.
  - You are about to drop the column `fileSize` on the `Mod` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "ModFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModFile_modId_fkey" FOREIGN KEY ("modId") REFERENCES "Mod" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HostMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cpuUsage" REAL NOT NULL,
    "cpuCores" INTEGER NOT NULL,
    "memoryUsage" REAL NOT NULL,
    "memoryUsedGB" REAL NOT NULL,
    "memoryTotalGB" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "ServerNetwork" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "networkType" TEXT NOT NULL DEFAULT 'logical',
    "proxyServerId" TEXT,
    "proxyConfig" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "bulkActionsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServerNetwork_proxyServerId_fkey" FOREIGN KEY ("proxyServerId") REFERENCES "Server" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServerNetworkMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "networkId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServerNetworkMember_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "ServerNetwork" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServerNetworkMember_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NetworkBackup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "networkId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "NetworkBackup_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "ServerNetwork" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GlobalSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "encrypted" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actionCategory" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "resourceName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'success',
    "errorMessage" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "hytale_downloader_state" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "binaryVersion" TEXT,
    "binaryPath" TEXT,
    "lastBinaryCheck" DATETIME,
    "isAuthenticated" BOOLEAN NOT NULL DEFAULT false,
    "accountEmail" TEXT,
    "authenticatedAt" DATETIME,
    "autoRefreshEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoRefreshInterval" INTEGER NOT NULL DEFAULT 1800,
    "lastAutoRefresh" DATETIME,
    "cachedVersion" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AutomationRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "triggerType" TEXT NOT NULL,
    "triggerConfig" TEXT NOT NULL,
    "conditions" TEXT,
    "actions" TEXT NOT NULL,
    "backupLimit" INTEGER NOT NULL DEFAULT 10,
    "lastTriggered" DATETIME,
    "lastStatus" TEXT,
    "lastError" TEXT,
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AutomationRule_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AutomationRule" ("actions", "conditions", "createdAt", "description", "enabled", "executionCount", "id", "lastError", "lastStatus", "lastTriggered", "name", "serverId", "triggerConfig", "triggerType", "updatedAt") SELECT "actions", "conditions", "createdAt", "description", "enabled", "executionCount", "id", "lastError", "lastStatus", "lastTriggered", "name", "serverId", "triggerConfig", "triggerType", "updatedAt" FROM "AutomationRule";
DROP TABLE "AutomationRule";
ALTER TABLE "new_AutomationRule" RENAME TO "AutomationRule";
CREATE INDEX "AutomationRule_serverId_idx" ON "AutomationRule"("serverId");
CREATE INDEX "AutomationRule_enabled_idx" ON "AutomationRule"("enabled");
CREATE INDEX "AutomationRule_triggerType_idx" ON "AutomationRule"("triggerType");
CREATE TABLE "new_Backup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
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
INSERT INTO "new_Backup" ("completedAt", "createdAt", "description", "error", "filePath", "fileSize", "id", "name", "remotePath", "serverId", "status", "storageType") SELECT "completedAt", "createdAt", "description", "error", "filePath", "fileSize", "id", "name", "remotePath", "serverId", "status", "storageType" FROM "Backup";
DROP TABLE "Backup";
ALTER TABLE "new_Backup" RENAME TO "Backup";
CREATE INDEX "Backup_serverId_idx" ON "Backup"("serverId");
CREATE INDEX "Backup_createdAt_idx" ON "Backup"("createdAt");
CREATE INDEX "Backup_networkBackupId_idx" ON "Backup"("networkBackupId");
CREATE INDEX "Backup_automationRuleId_idx" ON "Backup"("automationRuleId");
CREATE INDEX "Backup_scheduledTaskId_idx" ON "Backup"("scheduledTaskId");
CREATE TABLE "new_Mod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL DEFAULT 'modtale',
    "projectId" TEXT NOT NULL,
    "projectTitle" TEXT NOT NULL,
    "projectIconUrl" TEXT,
    "versionId" TEXT NOT NULL,
    "versionName" TEXT NOT NULL,
    "classification" TEXT NOT NULL,
    "archiveSize" INTEGER NOT NULL DEFAULT 0,
    "fileHash" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "installedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Mod_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Mod" ("classification", "enabled", "fileHash", "id", "installedAt", "projectIconUrl", "projectId", "projectTitle", "providerId", "serverId", "updatedAt", "versionId", "versionName") SELECT "classification", "enabled", "fileHash", "id", "installedAt", "projectIconUrl", "projectId", "projectTitle", "providerId", "serverId", "updatedAt", "versionId", "versionName" FROM "Mod";
DROP TABLE "Mod";
ALTER TABLE "new_Mod" RENAME TO "Mod";
CREATE INDEX "Mod_serverId_idx" ON "Mod"("serverId");
CREATE INDEX "Mod_projectId_idx" ON "Mod"("projectId");
CREATE INDEX "Mod_providerId_idx" ON "Mod"("providerId");
CREATE TABLE "new_ScheduledTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "cronExpression" TEXT NOT NULL,
    "taskData" TEXT,
    "backupLimit" INTEGER NOT NULL DEFAULT 10,
    "lastRun" DATETIME,
    "nextRun" DATETIME,
    "lastStatus" TEXT,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScheduledTask_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ScheduledTask" ("createdAt", "cronExpression", "enabled", "id", "lastError", "lastRun", "lastStatus", "name", "nextRun", "serverId", "taskData", "type", "updatedAt") SELECT "createdAt", "cronExpression", "enabled", "id", "lastError", "lastRun", "lastStatus", "name", "nextRun", "serverId", "taskData", "type", "updatedAt" FROM "ScheduledTask";
DROP TABLE "ScheduledTask";
ALTER TABLE "new_ScheduledTask" RENAME TO "ScheduledTask";
CREATE INDEX "ScheduledTask_serverId_idx" ON "ScheduledTask"("serverId");
CREATE INDEX "ScheduledTask_enabled_idx" ON "ScheduledTask"("enabled");
CREATE TABLE "new_Server" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "version" TEXT NOT NULL,
    "maxPlayers" INTEGER NOT NULL,
    "gameMode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'stopped',
    "pid" INTEGER,
    "startedAt" DATETIME,
    "rconPort" INTEGER,
    "rconPassword" TEXT,
    "logFilePath" TEXT,
    "serverPath" TEXT NOT NULL,
    "worldPath" TEXT NOT NULL,
    "backupPath" TEXT,
    "backupType" TEXT NOT NULL DEFAULT 'local',
    "backupExclusions" TEXT,
    "adapterType" TEXT NOT NULL DEFAULT 'java',
    "adapterConfig" TEXT,
    "jvmArgs" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Server" ("adapterConfig", "adapterType", "address", "backupPath", "backupType", "createdAt", "gameMode", "id", "maxPlayers", "name", "port", "serverPath", "status", "updatedAt", "version", "worldPath") SELECT "adapterConfig", "adapterType", "address", "backupPath", "backupType", "createdAt", "gameMode", "id", "maxPlayers", "name", "port", "serverPath", "status", "updatedAt", "version", "worldPath" FROM "Server";
DROP TABLE "Server";
ALTER TABLE "new_Server" RENAME TO "Server";
CREATE UNIQUE INDEX "Server_name_key" ON "Server"("name");
CREATE INDEX "Server_status_idx" ON "Server"("status");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "refreshToken" TEXT,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastLoginAt" DATETIME
);
INSERT INTO "new_User" ("createdAt", "email", "id", "lastLoginAt", "passwordHash", "refreshToken", "role", "updatedAt", "username") SELECT "createdAt", "email", "id", "lastLoginAt", "passwordHash", "refreshToken", "role", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_username_idx" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ModFile_modId_idx" ON "ModFile"("modId");

-- CreateIndex
CREATE INDEX "HostMetric_timestamp_idx" ON "HostMetric"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "ServerNetwork_name_key" ON "ServerNetwork"("name");

-- CreateIndex
CREATE INDEX "ServerNetwork_networkType_idx" ON "ServerNetwork"("networkType");

-- CreateIndex
CREATE INDEX "ServerNetwork_sortOrder_idx" ON "ServerNetwork"("sortOrder");

-- CreateIndex
CREATE INDEX "ServerNetworkMember_networkId_idx" ON "ServerNetworkMember"("networkId");

-- CreateIndex
CREATE INDEX "ServerNetworkMember_serverId_idx" ON "ServerNetworkMember"("serverId");

-- CreateIndex
CREATE UNIQUE INDEX "ServerNetworkMember_networkId_serverId_key" ON "ServerNetworkMember"("networkId", "serverId");

-- CreateIndex
CREATE INDEX "NetworkBackup_networkId_idx" ON "NetworkBackup"("networkId");

-- CreateIndex
CREATE INDEX "NetworkBackup_createdAt_idx" ON "NetworkBackup"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE INDEX "Permission_category_idx" ON "Permission"("category");

-- CreateIndex
CREATE INDEX "RolePermission_role_idx" ON "RolePermission"("role");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_role_permissionId_key" ON "RolePermission"("role", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalSetting_key_key" ON "GlobalSetting"("key");

-- CreateIndex
CREATE INDEX "GlobalSetting_category_idx" ON "GlobalSetting"("category");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");

-- CreateIndex
CREATE INDEX "ActivityLog_actionCategory_idx" ON "ActivityLog"("actionCategory");

-- CreateIndex
CREATE INDEX "ActivityLog_resourceType_resourceId_idx" ON "ActivityLog"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "ActivityLog_timestamp_idx" ON "ActivityLog"("timestamp");
