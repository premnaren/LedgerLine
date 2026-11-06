import { IdempotencyStatus } from '@prisma/client';
import { prisma } from '../config/db';
import crypto from 'crypto';

export interface IdempotencyCheckResult {
  isNew: boolean;
  keyId?: string;
  status?: IdempotencyStatus;
  httpStatus?: number | null;
  responseBody?: any;
}

/**
 * Atomically claim or retrieve an idempotency key scoped to a specific user.
 * Uses INSERT ... ON CONFLICT ("userId", key) DO NOTHING to eliminate cross-tenant
 * cache poisoning and TOCTOU race windows.
 */
export async function claimIdempotencyKey(key: string, userId: string = 'system'): Promise<IdempotencyCheckResult> {
  const newId = crypto.randomUUID();

  // 1. Atomic INSERT with compound ON CONFLICT ("userId", key) DO NOTHING
  const affectedRows = await prisma.$executeRaw`
    INSERT INTO "IdempotencyKey" (id, "userId", key, status, "createdAt")
    VALUES (${newId}, ${userId}, ${key}, 'PROCESSING'::"IdempotencyStatus", NOW())
    ON CONFLICT ("userId", key) DO NOTHING
  `;

  if (affectedRows === 1) {
    // This request won the race
    return {
      isNew: true,
      keyId: newId,
      status: IdempotencyStatus.PROCESSING,
    };
  }

  // 2. Another request claimed or completed this key for this user. Fetch existing row.
  const existing = await prisma.idempotencyKey.findUnique({
    where: {
      userId_key: {
        userId,
        key,
      },
    },
  });

  if (!existing) {
    // Highly improbable fallback: key was deleted between insert and find
    return {
      isNew: false,
      status: IdempotencyStatus.FAILED,
      httpStatus: 500,
      responseBody: { error: 'Idempotency lookup failure' },
    };
  }

  return {
    isNew: false,
    keyId: existing.id,
    status: existing.status,
    httpStatus: existing.httpStatus,
    responseBody: existing.responseBody,
  };
}

export async function finalizeIdempotencyKey(
  id: string,
  status: IdempotencyStatus,
  httpStatus: number,
  responseBody: any
) {
  try {
    await prisma.idempotencyKey.update({
      where: { id },
      data: {
        status,
        httpStatus,
        responseBody: responseBody ?? null,
      },
    });
  } catch (err) {
    console.error(`Failed to finalize idempotency key ${id}:`, err);
  }
}

