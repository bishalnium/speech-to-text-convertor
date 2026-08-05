/**
 * Build script that injects environment variables into angular.json
 * before running the Angular build. Works both locally (.env.local) and on Cloudflare Pages.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

// Load .env.local if present
if (existsSync('.env.local')) {
  const envConfig = readFileSync('.env.local', 'utf-8');
  envConfig.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

const angularJsonPath = './angular.json';
const angularJson = readFileSync(angularJsonPath, 'utf-8');

const complexKey = process.env.GROQ_API_KEY_COMPLEX || '';
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Replace placeholders with actual quoted values
const updated = angularJson
  .replace('"GROQ_API_KEY_COMPLEX_PLACEHOLDER"', `"\\"${complexKey}\\""`)
  .replace('"SUPABASE_URL_PLACEHOLDER"', `"\\"${supabaseUrl}\\""`)
  .replace('"SUPABASE_ANON_KEY_PLACEHOLDER"', `"\\"${supabaseAnonKey}\\""`);

// Write the updated angular.json
writeFileSync(angularJsonPath, updated, 'utf-8');
console.log('✓ Environment variables (Groq & Supabase) injected into angular.json');

// Run the Angular build
try {
  execSync('npx ng build', { stdio: 'inherit' });
} finally {
  // Restore original angular.json
  writeFileSync(angularJsonPath, angularJson, 'utf-8');
  console.log('✓ angular.json restored to original');
}
