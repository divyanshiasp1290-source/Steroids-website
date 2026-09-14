import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const execFileAsync = promisify(execFile);
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

async function main() {
  const query = 'odin anabolics tren a 100 OR odin pharmaceuticals trenbolone acetate';
  const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2`;
  const { stdout } = await execFileAsync(
    'curl.exe',
    ['-s', '-L', '--max-time', '10', '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', url],
    { encoding: 'utf8', maxBuffer: 15 * 1024 * 1024 }
  );

  const matches = [...stdout.matchAll(/m=["'](\{[^"']+\})["']/g)];
  console.log(`Found ${matches.length} matches`);
  for (const m of matches) {
    try {
      const decoded = m[1].replace(/&quot;/g, '"');
      const data = JSON.parse(decoded);
      if (data.murl) {
        console.log('Candidate URL:', data.murl, '| Title:', data.t);
      }
    } catch {}
  }
}

main().catch(console.error);
