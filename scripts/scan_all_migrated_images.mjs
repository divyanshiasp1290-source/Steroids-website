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

async function scanAllMigrated() {
  console.log('Fetching all migrated products from Supabase...');
  let allProducts = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, slug, images')
      .range(from, from + 999);
    if (error) throw error;
    allProducts.push(...(data || []));
    if (data.length < 1000) break;
    from += 1000;
  }

  const migrated = allProducts.filter((p) =>
    (p.images || []).some((u) => typeof u === 'string' && u.includes('supabase.co'))
  );

  console.log(`Total products in catalog: ${allProducts.length}`);
  console.log(`Total migrated products:   ${migrated.length}`);

  // Known placeholder hashes or patterns to detect
  const placeholderHashes = [
    'c577e7b984603f4ef530ede8d9816e9e', // provispec placeholder png
    '79d50c8581f6a76c30632f05c43c4230', // proviron odin placeholder jpg
    'a0acd949c0bde7e0511fd53513f4cce6',
  ];

  const foundPlaceholders = [];

  // Check URL signatures
  for (const p of migrated) {
    const url = p.images[0];
    for (const h of placeholderHashes) {
      if (url.includes(h.slice(0, 8))) {
        foundPlaceholders.push({ product: p, reason: `Matches known placeholder hash ${h.slice(0, 8)}` });
      }
    }
  }

  console.log(`\nDirect hash check: ${foundPlaceholders.length} known placeholder hashes found.`);

  // Now let's check all images for suspicious filenames or small sizes
  const checked = [];
  let processed = 0;

  // Let's check with concurrency of 60 HTTP HEAD requests
  const CONCURRENCY = 60;
  for (let i = 0; i < migrated.length; i += CONCURRENCY) {
    const chunk = migrated.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (p) => {
        const url = p.images[0];
        try {
          const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
          const len = parseInt(res.headers.get('content-length') || '0', 10);
          const type = res.headers.get('content-type') || '';
          if (len < 12000) {
            checked.push({ p, len, type, url });
          }
        } catch (err) {
          // If HEAD failed, record error
          checked.push({ p, len: -1, type: 'ERROR: ' + err.message, url });
        }
      })
    );
    processed += chunk.length;
    if (processed % 600 === 0 || processed === migrated.length) {
      console.log(`Checked headers for ${processed} / ${migrated.length} images... (found ${checked.length} < 12KB)`);
    }
  }

  console.log(`\nFound ${checked.length} images smaller than 10 KB (potential placeholders or low-res icons):`);
  for (const c of checked) {
    console.log(`- [${c.len} bytes] ${c.p.name} (${c.p.slug})\n  URL: ${c.url}`);
  }

  return checked;
}

scanAllMigrated().catch(console.error);
