#!/usr/bin/env tsx
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

// Load environment from api/.env or root .env
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const prisma = new PrismaClient();

// Parse CLI flags or fallback to environment variables
function parseArgs() {
  const args = process.argv.slice(2);
  const flags: Record<string, string> = {};

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, val] = arg.slice(2).split('=');
      flags[key] = val || 'true';
    }
  }

  return {
    email: (flags.email || process.env.ADMIN_EMAIL || 'admin@ledgerline.dev').trim().toLowerCase(),
    password: flags.password || process.env.ADMIN_PASSWORD || 'Admin1234!',
    accountName: flags.account || process.env.ADMIN_ACCOUNT_NAME || 'Admin Operating Ledger',
  };
}

async function bootstrapAdmin() {
  const { email, password, accountName } = parseArgs();

  console.log('====================================================');
  console.log('   LedgerLine First-Admin Bootstrap Engine          ');
  console.log('====================================================');
  console.log(`Target Admin Email: ${email}`);

  try {
    // 1. Verify Database Connectivity
    await prisma.$queryRaw`SELECT 1`;
    console.log('[1/4] PostgreSQL connection verified successfully.');

    // 2. Check for existing administrator
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        accounts: {
          include: {
            account: true,
          },
        },
      },
    });

    if (existingUser) {
      console.log(`[2/4] User "${email}" already exists (ID: ${existingUser.id}).`);

      if (existingUser.role !== Role.ADMIN) {
        console.log(`[2/4] Elevating user role from "${existingUser.role}" to "ADMIN"...`);
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { role: Role.ADMIN },
        });
        console.log('[2/4] Role elevated to ADMIN.');
      } else {
        console.log('[2/4] User already has ADMIN role.');
      }

      // Check if account is linked
      if (existingUser.accounts.length === 0) {
        console.log('[3/4] Provisioning administrative operating account...');
        const newAccount = await prisma.account.create({
          data: {
            name: accountName,
            balancePence: 500000n, // ₹5,000.00 initial admin reserve
            overdraftLimit: 0n,
            version: 0,
            holders: {
              create: {
                userId: existingUser.id,
              },
            },
          },
        });
        console.log(`[3/4] Created account "${newAccount.name}" (ID: ${newAccount.id}).`);
      } else {
        console.log(`[3/4] Admin has ${existingUser.accounts.length} linked account(s).`);
      }

      console.log('[4/4] Bootstrap completed. Admin account is verified and ready.');
      console.log('====================================================');
      return;
    }

    // 3. Create fresh administrator
    console.log('[2/4] Creating new administrator credentials...');
    const passwordHash = await bcrypt.hash(password, 10);

    const adminUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: Role.ADMIN,
      },
    });
    console.log(`[2/4] Created ADMIN user (ID: ${adminUser.id}).`);

    // 4. Create primary administrative operating account
    console.log('[3/4] Provisioning primary administrative operating account...');
    const account = await prisma.account.create({
      data: {
        name: accountName,
        balancePence: 500000n, // ₹5,000.00
        overdraftLimit: 0n,
        version: 0,
        holders: {
          create: {
            userId: adminUser.id,
          },
        },
      },
    });
    console.log(`[3/4] Created account "${account.name}" (ID: ${account.id}).`);

    console.log('[4/4] First administrator bootstrap completed successfully.');
    console.log('====================================================');
    console.log('Credentials Summary:');
    console.log(`  Role:     ADMIN`);
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${password}`);
    console.log(`  Account:  ${account.name} (Balance: ₹5,000.00)`);
    console.log('====================================================');
  } catch (error: any) {
    console.error('[ERROR] Bootstrap failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

bootstrapAdmin();
