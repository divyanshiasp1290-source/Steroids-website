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
  console.log('Fetching all storage objects from media/products...');
  const allObjects = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase.storage.from('media').list('products', {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;
    allObjects.push(...data);
    console.log(`Fetched ${allObjects.length} objects (offset ${offset})...`);
    if (data.length < limit) break;
    offset += limit;
  }

  console.log(`\nTotal objects in media/products: ${allObjects.length}`);

  // Size distribution
  const under5k = allObjects.filter((o) => (o.metadata?.size || 0) < 5000);
  const under8k = allObjects.filter((o) => (o.metadata?.size || 0) >= 5000 && (o.metadata?.size || 0) < 8000);
  const under10k = allObjects.filter((o) => (o.metadata?.size || 0) >= 8000 && (o.metadata?.size || 0) < 10000);

  console.log(`\nSize analysis:`);
  console.log(`  < 5,000 bytes (High suspicion for placeholders): ${under5k.length}`);
  console.log(`  5,000 - 8,000 bytes: ${under8k.length}`);
  console.log(`  8,000 - 10,000 bytes: ${under10k.length}`);

  if (under5k.length > 0) {
    console.log('\n--- Objects < 5KB ---');
    for (const o of under5k) {
      console.log(`  ${o.name} (${o.metadata?.size} bytes, eTag: ${o.metadata?.eTag})`);
    }
  }

  // Check for duplicate eTags
  const etagMap = new Map();
  for (const o of allObjects) {
    const etag = o.metadata?.eTag?.replace(/"/g, '') || '';
    if (!etag) continue;
    if (!etagMap.has(etag)) {
      etagMap.set(etag, []);
    }
    etagMap.get(etag).push(o);
  }

  const dupEtags = [...etagMap.entries()].filter(([etag, list]) => list.length > 1);
  console.log(`\nDuplicate eTags across bucket: ${dupEtags.length}`);
  for (const [etag, list] of dupEtags.slice(0, 10)) {
    console.log(`  eTag ${etag} shared by ${list.length} files:`);
    for (const f of list.slice(0, 3)) {
      console.log(`    - ${f.name} (${f.metadata?.size} bytes)`);
    }
  }

  // Save report to JSON
  fs.writeFileSync(
    path.join(projectRoot, 'storage_audit_summary.json'),
    JSON.stringify(
      {
        totalObjects: allObjects.length,
        under5kCount: under5k.length,
        under5k: under5k.map((o) => ({ name: o.name, size: o.metadata?.size, eTag: o.metadata?.eTag })),
        dupEtagsCount: dupEtags.length,
        dupEtags: dupEtags.map(([etag, list]) => ({ etag, count: list.length, files: list.map((f) => f.name) })),
      },
      null,
      2
    )
  );
}

main().catch(console.error);
