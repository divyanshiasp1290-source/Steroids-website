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
  // Check price <= 0 or null
  const { data: zeroOrNull, error: err1 } = await supabase
    .from('products')
    .select('id, name, slug, price, compare_at_price, currency')
    .or('price.eq.0,price.is.null,price.lt.0');

  if (err1) throw err1;

  // Also check products with 0 < price < 15
  const { data: below15, error: err2 } = await supabase
    .from('products')
    .select('id, name, slug, price, compare_at_price, currency')
    .gt('price', 0)
    .lt('price', 15);

  if (err2) throw err2;

  console.log(`Products with price <= 0 or null: ${zeroOrNull.length}`);
  console.log(`Products with 0 < price < 15:     ${below15.length}`);
  if (below15.length > 0) {
    console.log('\nSample below 15:');
    for (const p of below15.slice(0, 5)) {
      console.log(`- "${p.name}": £${p.price}`);
    }
  }
}

main().catch(console.error);
