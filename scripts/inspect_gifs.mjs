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

const gifFiles = [
  'titan-400-xt-labs-c3672627.gif',
  'salbumed-4-human-labs-991c383a.gif',
  'proviron-25-para-pharma-96f2a296.gif',
  'letromed-2-5-human-labs-3e4638f4.gif',
  'ciamed-20-human-labs-3c3ddf71.gif'
];

async function run() {
  const outDir = path.join(projectRoot, 'temp_inspect_small');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  for (const f of gifFiles) {
    const { data, error } = await supabase.storage.from('media').download('products/' + f);
    if (data) {
      fs.writeFileSync(path.join(outDir, f), Buffer.from(await data.arrayBuffer()));
      console.log('Saved', f);
    } else {
      console.error('Error downloading', f, error);
    }
  }
}
run().catch(console.error);
