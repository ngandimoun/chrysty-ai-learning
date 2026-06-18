import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lines = readFileSync(resolve(root, '.env.local'), 'utf8').split('\n');
const extra = {
  MOONSHOT_BASE_URL: 'https://api.moonshot.ai/v1',
  KIMI_MODEL_LEARN: 'kimi-k2.6',
  KIMI_MODEL_THINK: 'kimi-k2.6',
  KIMI_MODEL_PRACTICE: 'kimi-k2.6',
  KIMI_MODEL_PRACTICE_CODE: 'kimi-k2.7-code',
  KIMI_FORMULAS_LEARN: 'web-search,fetch',
  KIMI_FORMULAS_THINK: 'web-search,rethink',
  KIMI_FORMULAS_GENERATE: 'web-search',
  KIMI_MAX_TOOL_ROUNDS: '5',
};

const vars = { ...extra };
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
  const idx = trimmed.indexOf('=');
  const key = trimmed.slice(0, idx).trim();
  const value = trimmed.slice(idx + 1).trim();
  if (value) vars[key] = value;
}

const environments = ['production', 'preview', 'development'];

for (const [key, value] of Object.entries(vars)) {
  for (const envName of environments) {
    console.log(`Setting ${key} (${envName})...`);
    try {
      const escaped = value.replace(/"/g, '\\"');
      execSync(
        `npx vercel@latest env add ${key} ${envName} --value "${escaped}" --yes --force`,
        { cwd: root, stdio: 'inherit', shell: true },
      );
    } catch {
      console.warn(`Skipped or failed: ${key} (${envName})`);
    }
  }
}
