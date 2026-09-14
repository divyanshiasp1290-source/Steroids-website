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

// Realistic price points strictly >= 15
const PRICE_TIERS = [
  15, 18, 20, 22, 25, 28, 30, 32, 35, 38, 42, 45, 48, 52, 55, 58, 62, 65, 68, 72, 75, 78, 82, 85, 88, 92, 95
];

function getRandomPrice() {
  const p = PRICE_TIERS[Math.floor(Math.random() * PRICE_TIERS.length)];
  return Math.max(15, p);
}

function getRandomComparePrice(price) {
  if (Math.random() > 0.4) {
    const markup = 1.15 + Math.random() * 0.15;
    return Math.round(price * markup);
  }
  return null;
}

async function main() {
  console.log('===========================================================');
  console.log('  UPDATING ALL PRODUCTS WITH PRICE < 15 TO BE >= 15        ');
  console.log('===========================================================');

  // Fetch all products where price < 15 or price is null
  const { data: below15, error: fetchErr } = await supabase
    .from('products')
    .select('id, name, slug, price, compare_at_price, currency')
    .or('price.lt.15,price.is.null');

  if (fetchErr) {
    console.error('Error fetching products < 15:', fetchErr);
    return;
  }

  console.log(`Found ${below15.length} products with price < 15 or null.\n`);

  if (below15.length === 0) {
    console.log('All products already have price >= 15!');
    return;
  }

  let updatedCount = 0;
  const CHUNK_SIZE = 25;

  for (let i = 0; i < below15.length; i += CHUNK_SIZE) {
    const chunk = below15.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map(async (prod) => {
        const newPrice = getRandomPrice();
        const newComparePrice = getRandomComparePrice(newPrice);
        const currency = prod.currency || 'GBP';

        const { error: upErr } = await supabase
          .from('products')
          .update({
            price: newPrice,
            compare_at_price: newComparePrice,
            currency,
            updated_at: new Date().toISOString(),
          })
          .eq('id', prod.id);

        if (upErr) {
          console.error(`Error updating product ${prod.id} (${prod.name}):`, upErr.message);
        } else {
          updatedCount++;
        }
      })
    );
    console.log(`Updated ${Math.min(i + CHUNK_SIZE, below15.length)} / ${below15.length} products...`);
  }

  console.log(`\nSuccessfully updated ${updatedCount} products to price >= 15!\n`);

  // Verification: Count any product with price < 15 in the entire catalog
  console.log('--- RUNNING FULL CATALOG VERIFICATION ---');
  const { data: remainingBelow15, count: countBelow15, error: verErr } = await supabase
    .from('products')
    .select('id, name, price', { count: 'exact' })
    .or('price.lt.15,price.is.null')
    .limit(10);

  if (verErr) console.error('Verification error:', verErr);

  console.log(`Products in catalog with price < 15: ${countBelow15 ?? remainingBelow15?.length ?? 0}`);

  // Also find absolute minimum price across all 7,190 products
  const { data: allSorted, error: sortErr } = await supabase
    .from('products')
    .select('id, name, price')
    .order('price', { ascending: true })
    .limit(5);

  if (sortErr) console.error('Sort error:', sortErr);
  else {
    console.log('\nLowest 5 priced products in entire catalog:');
    for (const p of allSorted) {
      console.log(`- "${p.name}": £${p.price}`);
    }
  }
}

main().catch(console.error);
