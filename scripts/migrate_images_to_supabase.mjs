import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Read .env from project root
const envPath = path.join(projectRoot, '.env');
const env = {};
if (fs.existsSync(envPath)) {
  const envLines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
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
}

const SUPABASE_URL = process.env.SUPABASE_URL || env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Parse command line arguments
const args = process.argv.slice(2);
const dirArg = args.find((a) => a.startsWith('--dir='))?.split('=')[1];
const apply = args.includes('--apply');
const dryRun = !apply || args.includes('--dry-run');

const VALID_IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.avif']);

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
};

function normalizeName(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function extractFilenameFromUrl(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/');
    return parts[parts.length - 1] || '';
  } catch {
    const parts = String(url).split('/');
    return parts[parts.length - 1] || '';
  }
}

function findImageFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  function traverse(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (VALID_IMAGE_EXTS.has(ext)) {
          results.push({
            fullPath,
            fileName: entry.name,
            ext,
            baseName: path.basename(entry.name, ext),
          });
        }
      }
    }
  }

  traverse(dir);
  return results;
}

async function fetchAllProducts() {
  console.log('Fetching all products from Supabase...');
  const products = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, slug, sku, images')
      .range(from, from + pageSize - 1);

    if (error) throw error;
    products.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  console.log(`Loaded ${products.length} products from database.`);
  return products;
}

async function ensureStorageBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const mediaBucket = buckets?.find((b) => b.name === 'media');
  if (!mediaBucket) {
    console.log('Creating public storage bucket "media"...');
    const { error } = await supabase.storage.createBucket('media', { public: true });
    if (error) console.warn('Could not create bucket (may already exist):', error.message);
  }
}

async function main() {
  console.log('====================================================');
  console.log('  SUPABASE PRODUCT IMAGE MIGRATION TOOL');
  console.log('====================================================');
  console.log(`Mode: ${dryRun ? 'DRY-RUN (no files uploaded, no DB changes)' : 'APPLY (uploading & updating DB)'}`);

  if (!dirArg) {
    console.log('\nUsage:');
    console.log('  node scripts/migrate_images_to_supabase.mjs --dir=<folder-with-images> [--apply]');
    console.log('\nOptions:');
    console.log('  --dir=<path>   Directory containing image files to match and import.');
    console.log('  --apply        Perform uploads to Supabase Storage and update database records.');
    console.log('  --dry-run      Test matching without modifying database or storage (default).\n');
    console.log('Example:');
    console.log('  node scripts/migrate_images_to_supabase.mjs --dir=./backup_images');
    console.log('  node scripts/migrate_images_to_supabase.mjs --dir=./backup_images --apply');
    return;
  }

  const targetDir = path.resolve(projectRoot, dirArg);
  if (!fs.existsSync(targetDir)) {
    console.error(`Error: Directory does not exist: ${targetDir}`);
    process.exit(1);
  }

  console.log(`Scanning directory: ${targetDir}`);
  const localFiles = findImageFiles(targetDir);
  console.log(`Found ${localFiles.length} image files locally.\n`);

  if (localFiles.length === 0) {
    console.log('No image files found in specified directory.');
    return;
  }

  await ensureStorageBucket();
  const products = await fetchAllProducts();

  // Index products for efficient matching
  const bySourceFilename = new Map(); // exact original URL filename -> product
  const bySlug = new Map();           // product slug -> product
  const byNormalizedSlug = new Map(); // normalized slug -> product
  const bySku = new Map();            // product sku -> product

  for (const p of products) {
    if (p.slug) {
      bySlug.set(p.slug.toLowerCase(), p);
      byNormalizedSlug.set(normalizeName(p.slug), p);
    }
    if (p.sku) {
      bySku.set(p.sku.toLowerCase(), p);
    }
    if (Array.isArray(p.images)) {
      for (const imgUrl of p.images) {
        const fn = extractFilenameFromUrl(imgUrl).toLowerCase();
        if (fn) bySourceFilename.set(fn, p);
      }
    }
  }

  const matches = [];
  const unmatched = [];

  for (const file of localFiles) {
    const fnLower = file.fileName.toLowerCase();
    const baseLower = file.baseName.toLowerCase();
    const normalizedBase = normalizeName(file.baseName);

    let matchedProduct = null;
    let matchType = null;

    if (bySourceFilename.has(fnLower)) {
      matchedProduct = bySourceFilename.get(fnLower);
      matchType = 'original-url-filename';
    } else if (bySlug.has(baseLower)) {
      matchedProduct = bySlug.get(baseLower);
      matchType = 'slug';
    } else if (byNormalizedSlug.has(normalizedBase)) {
      matchedProduct = byNormalizedSlug.get(normalizedBase);
      matchType = 'normalized-slug';
    } else if (bySku.has(baseLower)) {
      matchedProduct = bySku.get(baseLower);
      matchType = 'sku';
    }

    if (matchedProduct) {
      matches.push({ file, product: matchedProduct, matchType });
    } else {
      unmatched.push(file);
    }
  }

  console.log(`\nMatch Results:`);
  console.log(`  Matched:   ${matches.length} files -> products`);
  console.log(`  Unmatched: ${unmatched.length} files\n`);

  if (dryRun) {
    console.log('Sample Matches (First 10):');
    for (const m of matches.slice(0, 10)) {
      console.log(`  [${m.matchType}] ${m.file.fileName} -> ${m.product.name} (${m.product.slug})`);
    }
    console.log('\nRun with "--apply" to execute upload to Supabase Storage and update products.');
    return;
  }

  // Apply mode: upload and update
  console.log('Uploading images to Supabase Storage and updating products...\n');
  let uploadedCount = 0;
  let updatedDbCount = 0;
  let failedCount = 0;

  for (let i = 0; i < matches.length; i++) {
    const { file, product } = matches[i];
    const storagePath = `products/${product.slug}-${file.fileName}`;
    const contentType = MIME_TYPES[file.ext] || 'application/octet-stream';

    try {
      const fileBuffer = fs.readFileSync(file.fullPath);
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(storagePath, fileBuffer, {
          contentType,
          upsert: true,
          cacheControl: '31536000',
        });

      if (uploadError) {
        console.error(`Upload failed for ${file.fileName}:`, uploadError.message);
        failedCount++;
        continue;
      }
      uploadedCount++;

      const { data: publicData } = supabase.storage.from('media').getPublicUrl(storagePath);
      const publicUrl = publicData.publicUrl;

      // Update product images array
      const currentImages = Array.isArray(product.images) ? [...product.images] : [];
      const updatedImages = [
        publicUrl,
        ...currentImages.filter((u) => u !== publicUrl && !u.includes(file.fileName)),
      ];

      const { error: updateError } = await supabase
        .from('products')
        .update({ images: updatedImages })
        .eq('id', product.id);

      if (updateError) {
        console.error(`Database update failed for ${product.slug}:`, updateError.message);
        failedCount++;
      } else {
        updatedDbCount++;
      }

      if ((i + 1) % 25 === 0 || i === matches.length - 1) {
        console.log(`Progress: ${i + 1}/${matches.length} processed (${updatedDbCount} products updated)`);
      }
    } catch (err) {
      console.error(`Error processing ${file.fileName}:`, err.message);
      failedCount++;
    }
  }

  console.log('\n====================================================');
  console.log('  MIGRATION COMPLETED');
  console.log('====================================================');
  console.log(`  Uploaded to Storage: ${uploadedCount}`);
  console.log(`  Products Updated:    ${updatedDbCount}`);
  console.log(`  Failures:            ${failedCount}`);
}

main().catch((err) => {
  console.error('Fatal error in migration tool:', err);
  process.exit(1);
});
