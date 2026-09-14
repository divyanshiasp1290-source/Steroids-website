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

const { data } = await supabase.from('products').select('images').limit(20);
console.log('Testing 20 fetches...');
const t0 = Date.now();
const results = await Promise.all(
  data.map(async (p, idx) => {
    const u = p.images[0];
    const s0 = Date.now();
    try {
      const res = await fetch(u, { method: 'HEAD', signal: AbortSignal.timeout(4000) });
      return { idx, status: res.status, time: Date.now() - s0, size: res.headers.get('content-length') };
    } catch (e) {
      return { idx, error: e.message, time: Date.now() - s0 };
    }
  })
);
console.log('Total time:', Date.now() - t0, 'ms');
console.log('Results sample:', results.slice(0, 5));
