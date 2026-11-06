-- AlterTable
ALTER TABLE "IdempotencyKey" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'system';

-- DropIndex
DROP INDEX IF EXISTS "IdempotencyKey_key_key";

-- CreateIndex
CREATE INDEX "IdempotencyKey_userId_idx" ON "IdempotencyKey"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_userId_key_key" ON "IdempotencyKey"("userId", "key");
