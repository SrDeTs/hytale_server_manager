-- Change fileSize columns from Int to BigInt to support files > 2GB
-- Note: SQLite INTEGER already supports 64-bit values, this change is primarily
-- for the Prisma client type mapping (Int -> BigInt maps to JavaScript bigint)

-- For SQLite, no actual column alteration is needed since INTEGER is already 64-bit
-- The change is in the Prisma schema which affects the generated client types

-- Placeholder statement to satisfy Prisma migration requirements
SELECT 1;
