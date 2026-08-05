/**
 * Build script that injects environment variables into angular.json
 * before running the Angular build. Works both locally (.env.local) and on Cloudflare Pages.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

// Function to clean environment variable string (strips \r, \n, trailing quotes & whitespace)
const clean = (val) => {
  if (!val) return '';
  let str = val.replace(/[\r\n]/g, '').trim();
  // Strip outer quotes if accidentally included in environment variable settings
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1);
  }
  return str.trim();
};

// Load .env.local if present locally
if (existsSync('.env.local')) {
  const envConfig = readFileSync('.env.local', 'utf-8');
  envConfig.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = clean(valueParts.join('='));
      }
    }
  });
}

const angularJsonPath = './angular.json';
const angularJson = readFileSync(angularJsonPath, 'utf-8');

const complexKey = clean(process.env.GROQ_API_KEY_COMPLEX);
const supabaseUrl = clean(process.env.SUPABASE_URL);
const supabaseAnonKey = clean(process.env.SUPABASE_ANON_KEY);

// Safely format as JSON string literal for angular.json define
const formatDefine = (val) => JSON.stringify(JSON.stringify(val));

const updated = angularJson
  .replace('"GROQ_API_KEY_COMPLEX_PLACEHOLDER"', formatDefine(complexKey))
  .replace('"SUPABASE_URL_PLACEHOLDER"', formatDefine(supabaseUrl))
  .replace('"SUPABASE_ANON_KEY_PLACEHOLDER"', formatDefine(supabaseAnonKey));

// Write the updated angular.json
writeFileSync(angularJsonPath, updated, 'utf-8');
console.log('✓ Environment variables (Groq & Supabase) injected cleanly into angular.json');

// Run the Angular build
try {
  execSync('npx ng build', { stdio: 'inherit' });
} finally {
  // Restore original angular.json
  writeFileSync(angularJsonPath, angularJson, 'utf-8');
  console.log('✓ angular.json restored to original');
}
