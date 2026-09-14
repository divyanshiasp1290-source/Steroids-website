import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const envLines = fs.readFileSync(path.join(projectRoot, '.env'), 'utf8').split(/\r?\n/);
const env = {};
for (const line of envLines) {
  const idx = line.indexOf('=');
  if (idx !== -1 && !line.trim().startsWith('#')) {
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function scan() {
  const progPath = path.join(projectRoot, '.image-migration-progress.json');
  const prog = JSON.parse(fs.readFileSync(progPath, 'utf8'));

  console.log(`Checking ${Object.keys(prog.processed).length} processed items in progress file...`);

  const suspicious = [];
  for (const [id, item] of Object.entries(prog.processed)) {
    const name = item.name.toLowerCase();
    const url = (item.url || '').toLowerCase();
    if (
      url.includes('placeholder') ||
      url.includes('not-available') ||
      url.includes('not_available') ||
      url.includes('no-image') ||
      url.includes('default')
    ) {
      suspicious.push({ id, ...item });
    }
  }

  console.log(`Found ${suspicious.length} suspicious items by URL/name in progress file:`);
  for (const s of suspicious) {
    console.log(`- ${s.name} (${s.slug}): ${s.url}`);
  }
}

scan().catch(console.error);
