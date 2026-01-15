-- AlterTable: Add providerId to Mod table
ALTER TABLE "Mod" ADD COLUMN "providerId" TEXT NOT NULL DEFAULT 'modtale';

-- CreateIndex
CREATE INDEX "Mod_providerId_idx" ON "Mod"("providerId");
