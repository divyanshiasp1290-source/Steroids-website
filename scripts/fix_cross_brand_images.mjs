import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const execFileAsync = promisify(execFile);
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

const targetProducts = [
  { slug: 'tren-a-100-odin-pharmaceuticals', query: 'Odin Pharma Tren A 100 10ml box vial' },
  { slug: 'pharmacom-pharmaoxy-50-oxymetholone-10ml-vial-50mgml', query: 'Pharmacom Labs PharmaOxy 50 10ml vial box' },
];

async function searchBing(query) {
  try {
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2`;
    const { stdout } = await execFileAsync(
      'curl.exe',
      ['-s', '-L', '--max-time', '10', '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', url],
      { encoding: 'utf8', maxBuffer: 15 * 1024 * 1024 }
    );

    const matches = [...stdout.matchAll(/m=["'](\{[^"']+\})["']/g)];
    const results = [];
    for (const m of matches) {
      try {
        const decoded = m[1].replace(/&quot;/g, '"');
        const data = JSON.parse(decoded);
        if (data.murl) {
          results.push(data.murl);
        }
      } catch {}
    }
    return results;
  } catch {
    return [];
  }
}

async function downloadImage(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      Accept: 'image/*',
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 8000) throw new Error(`Too small (${buf.length} bytes)`);
  return buf;
}

async function fix() {
  for (const item of targetProducts) {
    console.log(`\n=== Processing: ${item.slug} ===`);
    const { data: prods } = await supabase.from('products').select('*').eq('slug', item.slug);
    if (!prods || prods.length === 0) {
      console.log(`Product not found: ${item.slug}`);
      continue;
    }
    const prod = prods[0];
    console.log(`Found DB Product: ${prod.name} (id: ${prod.id})`);

    const urls = await searchBing(item.query);
    console.log(`Found ${urls.length} search results for query "${item.query}"`);

    let uploaded = false;
    for (const imgUrl of urls.slice(0, 10)) {
      try {
        console.log(`Attempting download: ${imgUrl}`);
        const buf = await downloadImage(imgUrl);
        const hash = crypto.createHash('md5').update(buf).digest('hex').slice(0, 8);
        const ext = imgUrl.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
        const validExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
        const storagePath = `products/${item.slug}-${hash}.${validExt}`;
        const mimeType = validExt === 'png' ? 'image/png' : validExt === 'webp' ? 'image/webp' : 'image/jpeg';

        console.log(`Uploading ${buf.length} bytes to ${storagePath}...`);
        const { error: upErr } = await supabase.storage.from('media').upload(storagePath, buf, {
          contentType: mimeType,
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
          .eq('id', prod.id);

        if (dbErr) throw dbErr;

        console.log(`SUCCESS: ${prod.name} updated!`);
        uploaded = true;
        break;
      } catch (err) {
        console.log(`  Failed candidate: ${err.message}`);
      }
    }
    if (!uploaded) {
      console.warn(`WARNING: Could not find working image for ${item.slug}`);
    }
  }
}

fix().catch(console.error);
