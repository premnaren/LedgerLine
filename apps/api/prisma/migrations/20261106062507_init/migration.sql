-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'HOLDER', 'AUDITOR');

-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER_DEBIT', 'TRANSFER_CREDIT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('POSTED', 'REFUSED');

-- CreateEnum
CREATE TYPE "IdempotencyStatus" AS ENUM ('PROCESSING', 'COMPLETE', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "balancePence" BIGINT NOT NULL DEFAULT 0,
    "overdraftLimit" BIGINT NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountHolder" (
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,

    CONSTRAINT "AccountHolder_pkey" PRIMARY KEY ("userId","accountId")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "EntryType" NOT NULL,
    "status" "EntryStatus" NOT NULL DEFAULT 'POSTED',
    "amountPence" BIGINT NOT NULL,
    "debitAccountId" TEXT,
    "creditAccountId" TEXT,
    "initiatedById" TEXT NOT NULL,
    "idempotencyKeyId" TEXT,
    "runningBalance" BIGINT NOT NULL,
    "note" TEXT,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "status" "IdempotencyStatus" NOT NULL DEFAULT 'PROCESSING',
    "responseBody" JSONB,
    "httpStatus" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "LedgerEntry_debitAccountId_createdAt_idx" ON "LedgerEntry"("debitAccountId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "LedgerEntry_creditAccountId_createdAt_idx" ON "LedgerEntry"("creditAccountId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_key_key" ON "IdempotencyKey"("key");

-- AddForeignKey
ALTER TABLE "AccountHolder" ADD CONSTRAINT "AccountHolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountHolder" ADD CONSTRAINT "AccountHolder_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_debitAccountId_fkey" FOREIGN KEY ("debitAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_creditAccountId_fkey" FOREIGN KEY ("creditAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_idempotencyKeyId_fkey" FOREIGN KEY ("idempotencyKeyId") REFERENCES "IdempotencyKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
