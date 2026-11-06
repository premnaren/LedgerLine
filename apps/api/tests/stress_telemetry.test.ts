import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/index';

describe('Admin Concurrency Stress Simulator & Invariant Telemetry API', () => {
  let adminToken: string;
  let holderToken: string;

  beforeEach(async () => {
    const adminLogin = await request(app).post('/auth/login').send({
      email: 'admin@ledgerline.dev',
      password: 'Admin1234!',
    });
    adminToken = adminLogin.body.accessToken;

    const holderLogin = await request(app).post('/auth/login').send({
      email: 'holder@ledgerline.dev',
      password: 'Holder1234!',
    });
    holderToken = holderLogin.body.accessToken;
  });

  it('blocks non-ADMIN callers from executing stress simulation', async () => {
    const res = await request(app)
      .post('/admin/simulate-stress')
      .set('Authorization', `Bearer ${holderToken}`)
      .send({ concurrency: 5 });

    expect(res.status).toBe(403);
  });

  it('executes concurrent transfer stress test and returns real-time ACID invariants', async () => {
    const res = await request(app)
      .post('/admin/simulate-stress')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        concurrency: 10,
        amountPence: 100, // ₹1.00
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify telemetry payload
    const { telemetry, invariants, cryptographicProof } = res.body;
    expect(telemetry.concurrency).toBe(10);
    expect(telemetry.successful).toBe(10);
    expect(telemetry.failed).toBe(0);
    expect(telemetry.durationMs).toBeGreaterThan(0);
    expect(telemetry.transfersPerSecond).toBeGreaterThan(0);

    // Verify mathematical invariants
    expect(invariants.zeroSumPreserved).toBe(true);
    expect(invariants.conservationVerified).toBe(true);
    expect(BigInt(invariants.deltaFromPence) + BigInt(invariants.deltaToPence)).toBe(0n);

    // Verify cryptographic SHA-256 seal chain
    expect(cryptographicProof.chainVerified).toBe(true);
    expect(cryptographicProof.headHash).toHaveLength(64);
  });
});
