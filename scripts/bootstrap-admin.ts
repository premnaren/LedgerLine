#!/usr/bin/env tsx
import path from 'path';
import { spawn } from 'child_process';

const targetScript = path.join(__dirname, '../apps/api/scripts/bootstrap-admin.ts');
const args = process.argv.slice(2);

const child = spawn('npx', ['tsx', targetScript, ...args], {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

