#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Starting Mastra server in production mode...');
console.log(`📁 Working directory: ${process.cwd()}`);
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`🔗 HOST_URL: ${process.env.HOST_URL || 'not set'}`);

const mastraPath = path.join(__dirname, '.mastra', 'output', 'index.mjs');

const server = spawn('node', [mastraPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
  },
});

server.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code || 0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  server.kill('SIGINT');
});
