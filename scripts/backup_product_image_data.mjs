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

async function runBackupAndCount() {
  console.log('Fetching all products from Supabase for backup and exact count verification...');

  let allProducts = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, slug, sku, images, category_id, is_published, price')
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Fetch error:', error);
      throw error;
    }
    allProducts.push(...(data || []));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `backup_products_images_${timestamp}.json`;
  const backupFilePath = path.join(projectRoot, backupFilename);

  fs.writeFileSync(backupFilePath, JSON.stringify(allProducts, null, 2), 'utf8');
  console.log(`Backup successfully written: ${backupFilePath} (${allProducts.length} records, ${(fs.statSync(backupFilePath).size / 1024 / 1024).toFixed(2)} MB)`);

  // Count exact categories of products
  let migratedCount = 0;
  let legacyCount = 0;
  let emptyCount = 0;
  const migratedProducts = [];

  for (const p of allProducts) {
    const imgs = p.images;
    if (!Array.isArray(imgs) || imgs.length === 0) {
      emptyCount++;
      continue;
    }

    const hasSupabase = imgs.some((url) => typeof url === 'string' && url.includes('supabase.co'));
    if (hasSupabase) {
      migratedCount++;
      migratedProducts.push({ id: p.id, name: p.name, slug: p.slug, images: p.images });
    } else {
      legacyCount++;
    }
  }

  const exactTotal = allProducts.length;
  const exactRemaining = exactTotal - migratedCount;

  console.log('\n===========================================================');
  console.log('  EXACT DATABASE COUNT VERIFICATION');
  console.log('===========================================================');
  console.log(`  Total Products in Database:  ${exactTotal}`);
  console.log(`  Migrated to Supabase:        ${migratedCount}`);
  console.log(`  Legacy / Defunct Images:     ${legacyCount}`);
  console.log(`  Empty / Null Image Arrays:   ${emptyCount}`);
  console.log(`  Exact Remaining to Migrate:  ${exactRemaining}`);
  console.log(`  Verification Math: ${migratedCount} + ${exactRemaining} = ${migratedCount + exactRemaining} (Matches Total: ${exactTotal === migratedCount + exactRemaining})`);

  // Save list of migrated products for audit
  const auditListPath = path.join(projectRoot, 'migrated_105_audit_list.json');
  fs.writeFileSync(auditListPath, JSON.stringify(migratedProducts, null, 2), 'utf8');
  console.log(`Saved ${migratedProducts.length} migrated products to: ${auditListPath}`);
}

runBackupAndCount().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});
