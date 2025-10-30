#!/usr/bin/env node

/**
 * LLM Doctor CLI Entry Point
 * Allows running via npx llm-doctor
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse CLI arguments
const args = process.argv.slice(2);

// Determine if we're running from source or built version
const distPath = join(__dirname, '..', 'dist', 'server.js');
const srcPath = join(__dirname, '..', 'src', 'server.ts');

let command, commandArgs;

if (existsSync(distPath)) {
  // Built version - run compiled JS directly
  command = 'node';
  commandArgs = [distPath, ...args];
} else if (existsSync(srcPath)) {
  // Development version - use tsx
  command = 'npx';
  commandArgs = ['tsx', srcPath, ...args];
} else {
  console.error('Error: Could not find LLM Doctor server files');
  process.exit(1);
}

// Start the server
const child = spawn(command, commandArgs, {
  stdio: 'inherit',
  shell: true
});

child.on('error', (error) => {
  console.error('Failed to start LLM Doctor:', error.message);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
