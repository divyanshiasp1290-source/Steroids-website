import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const envLines = fs.readFileSync('.env', 'utf8').split(/\r?\n/);
const env = {};
for (const l of envLines) {
  const idx = l.indexOf('=');
  if (idx !== -1 && !l.trim().startsWith('#')) {
    const key = l.slice(0, idx).trim();
    let val = l.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
}

const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function decodeHtml(value) {
  if (!value) return '';
  return String(value)
    .replace(/&#038;|&amp;/g, '&')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8217;/g, '’')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function fetchBatchFromApi(slugs) {
  const slugParam = slugs.join(',');
  const url = `https://steroidsupplier.co.uk/wp-json/wc/store/v1/products?per_page=100&slug=${encodeURIComponent(slugParam)}`;
  try {
    const stdout = execSync(`curl.exe -s -L "${url}"`, { maxBuffer: 20 * 1024 * 1024 }).toString();
    const data = JSON.parse(stdout);
    if (Array.isArray(data)) return data;
  } catch (e) {
    console.error(`Batch fetch error for slugs: ${e.message}`);
  }
  return [];
}

function fetchDirectProduct(slug) {
  try {
    const url = `https://steroidsupplier.co.uk/product/${slug}/`;
    const html = execSync(`curl.exe -s -L "${url}"`, { maxBuffer: 10 * 1024 * 1024 }).toString();
    const galleryFigures = [...html.matchAll(/class=["'][^"']*woocommerce-product-gallery__image[^"']*["'][\s\S]*?<\/div>/gi)];
    const images = [];
    for (const f of galleryFigures) {
      const large = f[0].match(/data-large_image=["']([^"']+)["']/i)?.[1]
        || f[0].match(/href=["']([^"']+\.(?:jpg|jpeg|png|webp|bmp))["']/i)?.[1]
        || f[0].match(/src=["']([^"']+\.(?:jpg|jpeg|png|webp|bmp))["']/i)?.[1];
      if (large && !large.includes('32x32') && !large.includes('100x100') && !large.includes('logo')) {
        const cleanUrl = large.replace(/-\d+x\d+(\.[a-zA-Z]+)$/, '$1');
        images.push(cleanUrl);
      }
    }
    if (images.length === 0) {
      const ogImage = html.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i)?.[1];
      if (ogImage) images.push(ogImage);
    }
    return [...new Set(images)];
  } catch (e) {
    return [];
  }
}

async function main() {
  console.log('Fetching all products from Supabase...');
  // Supabase default max rows is 1000, let's fetch in chunks if needed
  let allProducts = [];
  let from = 0;
  while (true) {
    const { data, error } = await client
      .from('products')
      .select('id, name, slug, images')
      .range(from, from + 999);
    if (error) {
      console.error('Fetch error:', error);
      break;
    }
    allProducts = allProducts.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }

  console.log(`Found ${allProducts.length} total products in database.`);

  const BATCH_SIZE = 35;
  let updatedCount = 0;
  let skippedCount = 0;
  let directFallbackCount = 0;

  for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
    const batch = allProducts.slice(i, i + BATCH_SIZE);
    const slugs = batch.map((p) => p.slug);
    console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allProducts.length / BATCH_SIZE)} (${batch.length} products)...`);

    const apiResults = fetchBatchFromApi(slugs);
    const apiMap = new Map();
    for (const item of apiResults) {
      apiMap.set(item.slug, item);
    }

    for (const p of batch) {
      const apiItem = apiMap.get(p.slug);
      let newImages = [];
      let newName = decodeHtml(p.name);

      if (apiItem && Array.isArray(apiItem.images) && apiItem.images.length > 0) {
        newImages = apiItem.images.map((img) => img.src).filter(Boolean);
        if (apiItem.name) {
          newName = decodeHtml(apiItem.name);
        }
      } else {
        // Fallback: direct scrape
        const directImages = fetchDirectProduct(p.slug);
        if (directImages.length > 0) {
          newImages = directImages;
          directFallbackCount++;
        }
      }

      if (newImages.length > 0) {
        const { error: updateError } = await client
          .from('products')
          .update({
            images: newImages,
            name: newName,
          })
          .eq('id', p.id);

        if (updateError) {
          console.error(`Failed to update ${p.slug}:`, updateError.message);
        } else {
          updatedCount++;
        }
      } else {
        skippedCount++;
        console.warn(`No images found for ${p.slug}`);
      }
    }

    console.log(`Progress: ${updatedCount} updated, ${skippedCount} skipped, ${directFallbackCount} fallback.`);
  }

  console.log('\n=== COMPLETED PRODUCT SYNC ===');
  console.log(`Total Products: ${allProducts.length}`);
  console.log(`Successfully Updated: ${updatedCount}`);
  console.log(`Skipped (no images found): ${skippedCount}`);
}

main().catch(console.error);
