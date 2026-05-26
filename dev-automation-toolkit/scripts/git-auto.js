#!/usr/bin/env node

/**
 * 🔄 Git Auto-Commit - Smart git workflow automation
 * 
 * Features:
 * - Auto-detect changes and stage them
 * - Generate conventional commit messages
 * - Push to remote
 * - Create PR if on feature branch
 * 
 * Usage: node git-auto.js [options]
 *   --push     Auto-push after commit
 *   --pr       Create pull request
 *   --message  Custom commit message
 */

const { execSync } = require('child_process');

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    return e.stdout?.trim() || '';
  }
}

function runOrThrow(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'inherit' });
  } catch (e) {
    console.error(`❌ Command failed: ${cmd}`);
    process.exit(1);
  }
}

// Parse args
const args = process.argv.slice(2);
const shouldPush = args.includes('--push');
const shouldPR = args.includes('--pr');
const msgIdx = args.indexOf('--message');
const customMessage = msgIdx >= 0 ? args[msgIdx + 1] : null;

// Check if git repo
try {
  run('git rev-parse --is-inside-work-tree');
} catch {
  console.error('❌ Not a git repository');
  process.exit(1);
}

// Get status
const status = run('git status --porcelain');
if (!status) {
  console.log('✅ Nothing to commit. Working tree clean.');
  process.exit(0);
}

// Analyze changes
const lines = status.split('\n').filter(Boolean);
const added = lines.filter(l => l.startsWith('A') || l.startsWith('??'));
const modified = lines.filter(l => l.startsWith(' M') || l.startsWith('M'));
const deleted = lines.filter(l => l.startsWith(' D') || l.startsWith('D'));
const renamed = lines.filter(l => l.startsWith('R'));

// Generate commit message
let message = customMessage;
if (!message) {
  const parts = [];
  if (added.length > 0) parts.push(`add ${added.length} file(s)`);
  if (modified.length > 0) parts.push(`update ${modified.length} file(s)`);
  if (deleted.length > 0) parts.push(`remove ${deleted.length} file(s)`);
  if (renamed.length > 0) parts.push(`rename ${renamed.length} file(s)`);

  const prefix = added.length > modified.length && added.length > deleted.length ? 'feat'
    : deleted.length > 0 ? 'refactor'
    : 'fix';

  message = `${prefix}: ${parts.join(', ')}`;
}

// Show what we're doing
console.log(`\n📦 Staging ${lines.length} change(s)...`);
console.log(`💬 Commit message: "${message}"\n`);

// Stage all
runOrThrow('git add -A');

// Commit
runOrThrow(`git commit -m "${message}"`);

// Push
if (shouldPush) {
  const branch = run('git branch --show-current');
  console.log(`\n🚀 Pushing to origin/${branch}...`);
  runOrThrow(`git push origin ${branch}`);
}

// Create PR
if (shouldPR) {
  const branch = run('git branch --show-current');
  if (branch === 'main' || branch === 'master') {
    console.log('⚠️ Cannot create PR from main/master branch');
  } else {
    console.log(`\n🔀 Creating PR for ${branch}...`);
    try {
      runOrThrow(`gh pr create --fill --base main --head ${branch}`);
    } catch {
      console.log('⚠️ GitHub CLI not installed or PR creation failed');
    }
  }
}

console.log('\n✅ Done!');
