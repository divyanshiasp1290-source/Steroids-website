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
  // Let's find products around Provispec
  const { data: provispec } = await supabase.from('products').select('*').ilike('name', '%Provispec%');
  console.log('Provispec:', provispec);

  if (provispec && provispec[0]) {
    const p = provispec[0];
    // Find other products with similar created_at or category_id
    const { data: similar } = await supabase
      .from('products')
      .select('id, name, slug, price, images')
      .eq('category_id', p.category_id)
      .limit(20);
    console.log(`\nProducts in same category (${p.category_id}):`);
    for (const s of similar) {
      console.log(`- ${s.name} | ${s.slug} | ${s.images?.[0]}`);
    }
  }
}

main().catch(console.error);
