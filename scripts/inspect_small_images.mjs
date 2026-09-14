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

async function main() {
  console.log('Listing products in media/products under 8000 bytes...');
  const smallObjects = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase.storage.from('media').list('products', {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;
    for (const o of data) {
      const sz = o.metadata?.size || 0;
      if (sz > 0 && sz < 8000) {
        smallObjects.push(o);
      }
    }
    if (data.length < limit) break;
    offset += limit;
  }

  console.log(`Found ${smallObjects.length} objects under 8000 bytes.`);

  // Sort by size ascending
  smallObjects.sort((a, b) => (a.metadata?.size || 0) - (b.metadata?.size || 0));

  console.log('\nSmallest 30 objects:');
  for (const o of smallObjects.slice(0, 30)) {
    console.log(`- [${o.metadata?.size}b] ${o.name}`);
  }

  const inspectDir = path.join(projectRoot, 'temp_inspect_small');
  if (!fs.existsSync(inspectDir)) fs.mkdirSync(inspectDir, { recursive: true });

  console.log(`\nDownloading smallest 30 files to ${inspectDir} for verification...`);
  for (const o of smallObjects.slice(0, 30)) {
    const { data: blob, error } = await supabase.storage.from('media').download(`products/${o.name}`);
    if (error) {
      console.warn(`Failed to download ${o.name}:`, error.message);
      continue;
    }
    const buf = Buffer.from(await blob.arrayBuffer());
    fs.writeFileSync(path.join(inspectDir, o.name), buf);
  }
  console.log('Downloaded sample files. Ready for inspection.');
}

main().catch(console.error);
