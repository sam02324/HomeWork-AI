import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';

const args = new Set(process.argv.slice(2));
const repositoryOnly = args.has('--repository-only');
const productionMode = args.has('--production');
const root = process.cwd();

const failures = [];
const warnings = [];
const passes = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function pass(message) {
  passes.push(message);
}

function git(argsList) {
  const result = spawnSync('git', argsList, {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  });

  if (result.status !== 0) {
    fail(`Git audit command failed: git ${argsList.join(' ')}`);
    return '';
  }

  return result.stdout;
}

function trackedFiles() {
  return git(['ls-files', '-z']).split('\0').filter(Boolean);
}

function readableTrackedFiles(files) {
  return files.filter((file) => {
    if (file === 'package-lock.json' || file === '.env.example') return false;
    try {
      return statSync(resolve(root, file)).size <= 2 * 1024 * 1024;
    } catch {
      return false;
    }
  });
}

function auditRepository() {
  const files = trackedFiles();
  const sensitiveNames = files.filter((file) =>
    /(^|\/)(\.env(?:\..+)?|keys\.txt|google-credentials\.json)$/i.test(file) &&
    file !== '.env.example'
  );

  if (sensitiveNames.length > 0) {
    fail(`Sensitive local files are tracked: ${sensitiveNames.join(', ')}`);
  } else {
    pass('No local environment, key, or Google credential file is tracked.');
  }

  const credentialPatterns = [
    ['Anthropic/OpenAI-style secret', /\bsk-[A-Za-z0-9_-]{20,}\b/g],
    ['Sentry auth token', /\bsntrys_[A-Za-z0-9_=.-]{20,}\b/g],
    ['Google API key', /\bAIza[0-9A-Za-z_-]{20,}\b/g],
    ['GitHub token', /\bgh[pousr]_[0-9A-Za-z]{20,}\b/g],
    ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/g],
  ];

  const credentialHits = [];
  const providerHits = [];
  const publicSecretHits = [];
  const hardcodedStorageHits = [];

  for (const file of readableTrackedFiles(files)) {
    const content = readFileSync(resolve(root, file), 'utf8');

    for (const [label, pattern] of credentialPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(content)) credentialHits.push(`${file} (${label})`);
    }

    const isApplicationFile = file.startsWith('src/') || [
      'package.json',
      'next.config.ts',
    ].includes(file);
    if (isApplicationFile && /xiaomimimo|mimo-v2\.5/i.test(content)) providerHits.push(file);
    if (/NEXT_PUBLIC_(?:ANTHROPIC|DATABASE|R2_SECRET|SENTRY_AUTH|CLERK_SECRET|GOOGLE_OAUTH_CLIENT_SECRET)/.test(content)) {
      publicSecretHits.push(file);
    }
    if (file.startsWith('src/') && /https:\/\/pub-[a-z0-9]+\.r2\.dev/i.test(content)) {
      hardcodedStorageHits.push(file);
    }
  }

  const exampleEnvironmentPath = resolve(root, '.env.example');
  if (files.includes('.env.example') && /xiaomimimo|mimo-v2\.5/i.test(readFileSync(exampleEnvironmentPath, 'utf8'))) {
    providerHits.push('.env.example');
  }

  if (credentialHits.length > 0) fail(`Credential-like values found in: ${[...new Set(credentialHits)].join(', ')}`);
  else pass('No credential pattern was found in tracked source files.');

  if (providerHits.length > 0) fail(`Removed MiMo provider references remain in: ${[...new Set(providerHits)].join(', ')}`);
  else pass('No MiMo provider reference remains in tracked application files.');

  if (publicSecretHits.length > 0) fail(`Secret-looking NEXT_PUBLIC variables found in: ${[...new Set(publicSecretHits)].join(', ')}`);
  else pass('No server secret is exposed through a NEXT_PUBLIC variable name.');

  if (hardcodedStorageHits.length > 0) fail(`Hardcoded R2 public hosts found in: ${[...new Set(hardcodedStorageHits)].join(', ')}`);
  else pass('No hardcoded R2 public host remains in application source.');
}

function loadLocalEnvironment() {
  for (const filename of ['.env.local', '.env']) {
    const path = resolve(root, filename);
    if (existsSync(path)) loadEnv({ path, override: false, quiet: true });
  }
}

function isPlaceholder(value) {
  return /(?:xxxxx|your-|example\.com|ep-xxx|public-key@o0)/i.test(value);
}

function auditEnvironment() {
  loadLocalEnvironment();

  const required = [
    'DATABASE_URL',
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'CLERK_WEBHOOK_SECRET',
    'GOOGLE_OAUTH_CLIENT_ID',
    'GOOGLE_OAUTH_CLIENT_SECRET',
    'TOKEN_ENCRYPTION_KEY',
    'ANTHROPIC_API_KEY',
    'ANTHROPIC_MODEL',
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
    'NEXT_PUBLIC_SENTRY_DSN',
    'SENTRY_DSN',
    'SENTRY_ORG',
    'SENTRY_PROJECT',
    'SENTRY_AUTH_TOKEN',
    'SENTRY_ENVIRONMENT',
  ];

  for (const key of required) {
    const value = process.env[key]?.trim();
    if (!value) fail(`${key} is missing.`);
    else if (isPlaceholder(value)) fail(`${key} still contains a placeholder value.`);
  }

  const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY ?? '';
  if (encryptionKey && !/^[0-9a-f]{64}$/i.test(encryptionKey)) {
    fail('TOKEN_ENCRYPTION_KEY must be exactly 64 hexadecimal characters.');
  }

  const appUrlValue = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrlValue) {
    try {
      const appUrl = new URL(appUrlValue);
      if (productionMode && appUrl.protocol !== 'https:') {
        fail('NEXT_PUBLIC_APP_URL must use HTTPS for a production launch.');
      }
      if (appUrl.pathname !== '/' || appUrl.search || appUrl.hash) {
        fail('NEXT_PUBLIC_APP_URL must be an origin without a path, query, or fragment.');
      }
    } catch {
      fail('NEXT_PUBLIC_APP_URL must be a valid absolute URL.');
    }
  }

  const publicUrlValue = process.env.R2_PUBLIC_URL;
  if (publicUrlValue) {
    try {
      if (new URL(publicUrlValue).protocol !== 'https:') fail('R2_PUBLIC_URL must use HTTPS.');
    } catch {
      fail('R2_PUBLIC_URL must be a valid absolute URL.');
    }
    warn('R2_PUBLIC_URL is transitional legacy metadata; remove it after historical file references are migrated.');
  }

  if ((process.env.ANTHROPIC_MODEL ?? '').toLowerCase().includes('mimo')) {
    fail('ANTHROPIC_MODEL points to MiMo instead of an Anthropic model.');
  }

  if (failures.length === 0) pass('The local production environment contract is complete.');
}

function printResults() {
  console.log('GradeAI launch audit');
  console.log('====================');
  for (const message of passes) console.log(`PASS  ${message}`);
  for (const message of warnings) console.log(`WARN  ${message}`);
  for (const message of failures) console.log(`FAIL  ${message}`);
  console.log('--------------------');
  console.log(`${passes.length} passed, ${warnings.length} warnings, ${failures.length} failed`);
}

auditRepository();
if (!repositoryOnly) auditEnvironment();
printResults();

if (failures.length > 0) process.exitCode = 1;
