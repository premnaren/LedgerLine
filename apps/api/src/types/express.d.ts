import { Role } from '@prisma/client';

export interface AuthUser {
  userId: string;
  role: Role;
  email?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      idempotencyKeyId?: string;
    }
  }
}
