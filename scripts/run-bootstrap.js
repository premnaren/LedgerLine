const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const rootDir = path.join(__dirname, '..');
const apiDir = path.join(rootDir, 'apps', 'api');
const isWin = process.platform === 'win32';

const localTsxBin = path.join(apiDir, 'node_modules', '.bin', isWin ? 'tsx.cmd' : 'tsx');
const scriptPath = path.join(apiDir, 'scripts', 'bootstrap-admin.ts');
const userArgs = process.argv.slice(2);

let executable = isWin ? 'npx.cmd' : 'npx';
let runArgs = ['tsx', scriptPath, ...userArgs];

if (fs.existsSync(localTsxBin)) {
  executable = localTsxBin;
  runArgs = [scriptPath, ...userArgs];
}

const child = spawn(executable, runArgs, {
  cwd: apiDir,
  stdio: 'inherit',
  shell: isWin && !executable.endsWith('.cmd'),
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
