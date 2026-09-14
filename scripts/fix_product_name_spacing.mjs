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
  console.log('Searching for products with unspaced plus in name...');
  let from = 0;
  const limit = 1000;
  let fixedCount = 0;

  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name')
      .ilike('name', '%+%')
      .range(from, from + limit - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const p of data) {
      if (/([a-zA-Z0-9])\+([a-zA-Z0-9])/.test(p.name)) {
        const fixedName = p.name.replace(/([a-zA-Z0-9])\+([a-zA-Z0-9])/g, '$1 + $2');
        console.log(`Fixing: "${p.name}" -> "${fixedName}"`);
        const { error: upErr } = await supabase
          .from('products')
          .update({ name: fixedName })
          .eq('id', p.id);
        if (upErr) console.error('Error updating:', upErr);
        else fixedCount++;
      }
    }

    if (data.length < limit) break;
    from += limit;
  }

  console.log(`Total fixed products in database: ${fixedCount}`);
}

main().catch(console.error);
