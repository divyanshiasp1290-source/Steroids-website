import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
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

async function uploadOdin() {
  const filePath = path.join(projectRoot, 'temp_inspect_cross', 'odin_tren_real.webp');
  const buf = fs.readFileSync(filePath);
  const hash = crypto.createHash('md5').update(buf).digest('hex').slice(0, 8);
  const storagePath = `products/tren-a-100-odin-pharmaceuticals-${hash}.webp`;

  console.log(`Uploading ${buf.length} bytes to ${storagePath}...`);
  const { error: upErr } = await supabase.storage.from('media').upload(storagePath, buf, {
    contentType: 'image/webp',
    upsert: true,
  });
  if (upErr) throw upErr;

  const publicUrl = `${env.SUPABASE_URL}/storage/v1/object/public/media/${storagePath}`;
  console.log(`Uploaded! Updating DB with: ${publicUrl}`);

  const { error: dbErr } = await supabase
    .from('products')
    .update({
      images: [publicUrl],
      updated_at: new Date().toISOString(),
    })
    .eq('slug', 'tren-a-100-odin-pharmaceuticals');

  if (dbErr) throw dbErr;
  console.log('SUCCESS: tren-a-100-odin-pharmaceuticals updated in DB!');
}

uploadOdin().catch(console.error);
