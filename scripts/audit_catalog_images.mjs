import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Read .env
const envPath = path.join(projectRoot, '.env');
const env = {};
if (fs.existsSync(envPath)) {
  const envLines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
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
}

const SUPABASE_URL = process.env.SUPABASE_URL || env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function audit() {
  console.log('===========================================================');
  console.log('  PRODUCT CATALOG IMAGE AUDIT & VALIDATION REPORT');
  console.log('===========================================================');

  let allProducts = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, slug, sku, images, is_featured, is_trending, is_best_seller, is_new_arrival')
      .range(from, from + pageSize - 1);
    if (error) {
      console.error('Error fetching products:', error);
      break;
    }
    allProducts.push(...(data || []));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  console.log(`Total Products in Database: ${allProducts.length}`);

  let supabaseStorageCount = 0;
  let defunctOldSiteCount = 0;
  let otherUrlCount = 0;
  let emptyImagesCount = 0;

  const urlProductMap = new Map(); // URL -> Set of product IDs
  const sampleSupabaseUrls = [];

  for (const p of allProducts) {
    const imgs = p.images;
    if (!Array.isArray(imgs) || imgs.length === 0) {
      emptyImagesCount++;
      continue;
    }

    let hasSupabase = false;
    let hasDefunct = false;

    for (const url of imgs) {
      if (typeof url !== 'string') continue;
      if (!urlProductMap.has(url)) {
        urlProductMap.set(url, new Set());
      }
      urlProductMap.get(url).add(p.id);

      if (url.includes('supabase.co')) {
        hasSupabase = true;
        if (sampleSupabaseUrls.length < 5) {
          sampleSupabaseUrls.push({ name: p.name, slug: p.slug, url });
        }
      } else if (url.includes('steroidsupplier.co.uk')) {
        hasDefunct = true;
      } else {
        otherUrlCount++;
      }
    }

    if (hasSupabase) supabaseStorageCount++;
    if (hasDefunct) defunctOldSiteCount++;
  }

  // Check for duplicate URLs across products
  const duplicates = [];
  for (const [url, productIds] of urlProductMap.entries()) {
    if (productIds.size > 1 && url.includes('supabase.co')) {
      duplicates.push({ url, count: productIds.size, productIds: Array.from(productIds) });
    }
  }

  console.log('\n--- Catalog Image Summary ---');
  console.log(`  Supabase Permanent Storage: ${supabaseStorageCount} products`);
  console.log(`  Defunct Old Site Images:   ${defunctOldSiteCount} products`);
  console.log(`  Empty/Missing Images:       ${emptyImagesCount} products`);
  console.log(`  Duplicate Supabase Images:  ${duplicates.length}`);

  console.log('\n--- Sample Supabase Permanent Image URLs ---');
  for (const sample of sampleSupabaseUrls) {
    console.log(`- Product: "${sample.name}"`);
    console.log(`  Storage URL: ${sample.url}`);
    try {
      const res = await fetch(sample.url, { method: 'HEAD' });
      console.log(`  HTTP Status: ${res.status} ${res.statusText} (${res.headers.get('content-type')}, ${res.headers.get('content-length')} bytes)`);
    } catch (e) {
      console.log(`  HTTP Check Failed: ${e.message}`);
    }
  }

  // Featured and showcase status
  const featured = allProducts.filter((p) => p.is_featured || p.is_trending || p.is_best_seller || p.is_new_arrival);
  console.log(`\n--- Showcase & Featured Products Status (${featured.length} products) ---`);
  for (const f of featured) {
    const isStored = f.images?.some((u) => u.includes('supabase.co'));
    console.log(`  [${isStored ? 'OK - Supabase Storage' : 'PENDING'}] ${f.name} (${f.slug})`);
    console.log(`    Images: ${JSON.stringify(f.images)}`);
  }
}

audit().catch(console.error);
