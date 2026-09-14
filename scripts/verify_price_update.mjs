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

async function verify() {
  const { count: zeroCount, error: err1 } = await supabase
    .from('products')
    .select('id', { count: 'exact' })
    .or('price.eq.0,price.is.null,price.lt.0')
    .limit(1);

  if (err1) console.error('Error 1:', err1);

  const { count: totalCount, error: err2 } = await supabase
    .from('products')
    .select('id', { count: 'exact' })
    .limit(1);

  if (err2) console.error('Error 2:', err2);

  const { data: sample, error: err3 } = await supabase
    .from('products')
    .select('id, name, slug, price, compare_at_price, currency, images')
    .ilike('name', '%Salbutagen%')
    .limit(3);

  if (err3) console.error('Error 3:', err3);

  console.log('--- DATABASE PRICE VERIFICATION ---');
  console.log(`Total Products in Catalog: ${totalCount}`);
  console.log(`Products with Price <= 0 or null: ${zeroCount}`);
  console.log('\nSample previously-zero product:');
  console.log(JSON.stringify(sample, null, 2));
}

verify().catch(console.error);
