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
  console.log('Querying products with price <= 0 or null...');
  const { data: zeroOrNull, count, error } = await supabase
    .from('products')
    .select('id, name, slug, price, compare_at_price, category_id', { count: 'exact' })
    .or('price.eq.0,price.is.null,price.lt.0');

  if (error) {
    console.error('Query error:', error);
    return;
  }

  const { data: nonZero } = await supabase
    .from('products')
    .select('price')
    .gt('price', 0)
    .limit(1000);

  const prices = nonZero.map((d) => d.price).sort((a, b) => a - b);
  console.log('\nExisting Catalog Price Distribution:');
  console.log({
    count: prices.length,
    min: prices[0],
    max: prices[prices.length - 1],
    median: prices[Math.floor(prices.length / 2)],
    sample: prices.filter((_, i) => i % 50 === 0),
  });
}

main().catch(console.error);
