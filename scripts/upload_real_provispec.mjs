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

async function uploadRealProvispec() {
  console.log('Uploading real Provispec 25 packaging image...');
  const buffer = fs.readFileSync(path.join(projectRoot, 'provispec_real.jpg'));
  const hash = crypto.createHash('md5').update(buffer).digest('hex');

  const slug = 'provispec-25-mesterolone-spectrum-anabolika';
  const filename = `${slug}-${hash.slice(0, 8)}.jpg`;
  const storagePath = `products/${filename}`;

  const { error: upErr } = await supabase.storage
    .from('media')
    .upload(storagePath, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
      cacheControl: '31536000',
    });

  if (upErr) {
    console.error('Storage upload error:', upErr);
    process.exit(1);
  }

  const { data: pubData } = supabase.storage.from('media').getPublicUrl(storagePath);
  const publicUrl = pubData.publicUrl;
  console.log('Uploaded to:', publicUrl);

  const { data, error: dbErr } = await supabase
    .from('products')
    .update({ images: [publicUrl] })
    .eq('slug', slug)
    .select('id, name, slug, images');

  if (dbErr) {
    console.error('DB update error:', dbErr);
    process.exit(1);
  }

  console.log('DB updated:', data);

  // Update progress
  const progPath = path.join(projectRoot, '.image-migration-progress.json');
  if (fs.existsSync(progPath)) {
    const prog = JSON.parse(fs.readFileSync(progPath, 'utf8'));
    delete prog.usedHashes['c577e7b984603f4ef530ede8d9816e9e'];
    prog.usedHashes[hash] = data[0].id;
    prog.processed[data[0].id] = {
      name: data[0].name,
      slug: data[0].slug,
      url: publicUrl,
      hash,
      timestamp: new Date().toISOString(),
    };
    fs.writeFileSync(progPath, JSON.stringify(prog, null, 2), 'utf8');
    console.log('Progress checkpoint updated.');
  }
}

uploadRealProvispec().catch(console.error);
