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
  22, 25, 28, 32, 35, 38, 42, 45, 48, 52, 55, 58, 62, 65, 68, 72, 75, 78, 82, 85, 88, 92, 95
];

function getRandomPrice() {
  const p = PRICE_TIERS[Math.floor(Math.random() * PRICE_TIERS.length)];
  return Math.max(15, p);
}

function getRandomComparePrice(price) {
  // ~60% chance of a discount / compare-at price
  if (Math.random() > 0.4) {
    const markup = 1.15 + Math.random() * 0.15; // 15% - 30% higher
    return Math.round(price * markup);
  }
  return null;
}

async function main() {
  console.log('===========================================================');
  console.log('  UPDATING ZERO-PRICE PRODUCTS WITH RANDOM PRICES (>= 15)  ');
  console.log('===========================================================');

  // Fetch all products with price <= 0 or null
  const { data: targetProducts, error: fetchErr } = await supabase
    .from('products')
    .select('id, name, slug, price, compare_at_price, currency')
    .or('price.eq.0,price.is.null,price.lt.0');

  if (fetchErr) {
    console.error('Error fetching target products:', fetchErr);
    return;
  }

  console.log(`Found ${targetProducts.length} products needing price update.\n`);

  if (targetProducts.length === 0) {
    console.log('No products found with price <= 0. All products already have valid prices.');
    return;
  }

  let updatedCount = 0;
  const updatedSample = [];

  // Update in chunks
  const CHUNK_SIZE = 25;
  for (let i = 0; i < targetProducts.length; i += CHUNK_SIZE) {
    const chunk = targetProducts.slice(i, i + CHUNK_SIZE);
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
          if (updatedSample.length < 15) {
            updatedSample.push({
              id: prod.id,
              name: prod.name,
              oldPrice: prod.price,
              newPrice,
              compareAt: newComparePrice,
              currency,
            });
          }
        }
      })
    );
    console.log(`Updated ${Math.min(i + CHUNK_SIZE, targetProducts.length)} / ${targetProducts.length} products...`);
  }

  console.log(`\nSuccessfully updated ${updatedCount} products!`);
  console.log('\n--- Sample of Updated Products ---');
  for (const s of updatedSample) {
    console.log(`- "${s.name}" | Old: ${s.oldPrice} | New: £${s.newPrice} (Compare: ${s.compareAt ? '£' + s.compareAt : 'None'})`);
  }

  // Verification check
  console.log('\n--- Running Verification Check ---');
  const { data: remainingZero, count: remainingCount } = await supabase
    .from('products')
    .select('id, name, price', { count: 'exact' })
    .or('price.eq.0,price.is.null,price.lt.0');

  console.log(`Remaining products with price <= 0 or null: ${remainingCount ?? remainingZero?.length ?? 0}`);

  const { data: allZeroCheck, count: totalBelow15 } = await supabase
    .from('products')
    .select('id, name, price', { count: 'exact' })
    .eq('price', 0);

  console.log(`Products with price exactly 0: ${totalBelow15 ?? allZeroCheck?.length ?? 0}`);
}

main().catch(console.error);
