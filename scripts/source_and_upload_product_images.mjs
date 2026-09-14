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

// Read .env
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
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Command-line args
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const dryRun = !apply || args.includes('--dry-run');

const limitArg = args.find((a) => a.startsWith('--limit='))?.split('=')[1];
const limit = limitArg !== undefined ? parseInt(limitArg, 10) : 500; // Default 500 per batch

const concurrencyArg = args.find((a) => a.startsWith('--concurrency='))?.split('=')[1];
const concurrency = concurrencyArg ? Math.max(1, parseInt(concurrencyArg, 10)) : 10; // Default concurrency 10

const featuredOnly = args.includes('--featured-only');
const showHelp = args.includes('--help') || args.includes('-h');

if (showHelp) {
  console.log(`
Usage:
  node scripts/source_and_upload_product_images.mjs [options]

Options:
  --apply             Execute uploads and update Supabase database.
  --dry-run           Search and test downloads without modifying DB/Storage (default).
  --limit=<n>         Process at most <n> products (default: 500). Pass 0 for unlimited.
  --concurrency=<n>   Concurrent worker count (default: 10).
  --featured-only     Process only featured, trending, best seller, and new arrival products.
`);
  process.exit(0);
}

// Progress checkpointing
const PROGRESS_FILE = path.join(projectRoot, '.image-migration-progress.json');
let progress = { processed: {}, failed: {}, usedHashes: {} };
if (fs.existsSync(PROGRESS_FILE)) {
  try {
    progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    progress.processed = progress.processed || {};
    progress.failed = progress.failed || {};
    progress.usedHashes = progress.usedHashes || {};
  } catch {
    progress = { processed: {}, failed: {}, usedHashes: {} };
  }
}

// Concurrency-safe hash reservation to guarantee 0 duplicate image assignments
const reservedHashes = new Set();

function tryReserveHash(hash, productId) {
  if (progress.usedHashes[hash] && progress.usedHashes[hash] !== productId) {
    return false; // Already assigned to another product
  }
  if (reservedHashes.has(hash)) {
    return false; // Currently being used by an active concurrent worker
  }
  reservedHashes.add(hash);
  return true;
}

function releaseHash(hash) {
  reservedHashes.delete(hash);
}

function commitHash(hash, productId) {
  progress.usedHashes[hash] = productId;
  reservedHashes.delete(hash);
}

// Serialized atomic progress file saver to prevent race conditions during parallel saves
let saveQueue = Promise.resolve();

function saveProgress() {
  saveQueue = saveQueue.then(async () => {
    try {
      const tmp = PROGRESS_FILE + '.tmp';
      await fs.promises.writeFile(tmp, JSON.stringify(progress, null, 2), 'utf8');
      await fs.promises.rename(tmp, PROGRESS_FILE);
    } catch {
      // Ignore transient file lock contention on Windows
    }
  });
  return saveQueue;
}

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
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanSearchTerm(name) {
  return decodeHtml(name)
    .replace(/\b(\d+)\s*x\s*(\d+)/gi, '$1x$2')
    .replace(/[\(\)\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getImageType(buffer) {
  if (!buffer || buffer.length < 12) return null;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: '.jpg', mime: 'image/jpeg' };
  }
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { ext: '.png', mime: 'image/png' };
  }
  // WEBP: RIFF ... WEBP
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return { ext: '.webp', mime: 'image/webp' };
  }
  // GIF: GIF87a or GIF89a
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return { ext: '.gif', mime: 'image/gif' };
  }
  return null;
}

// Global search throttle to respect search-engine and image-host rate limits
let searchThrottlePromise = Promise.resolve();
const SEARCH_INTERVAL_MS = 60; // 60ms minimum spacing between outbound search queries

function throttleSearch() {
  const next = searchThrottlePromise.then(async () => {
    await new Promise((r) => setTimeout(r, SEARCH_INTERVAL_MS));
  });
  searchThrottlePromise = next;
  return searchThrottlePromise;
}

async function searchBing(query) {
  await throttleSearch();
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
          results.push({
            image: data.murl,
            title: data.desc || data.t || '',
            source: data.purl || '',
          });
        }
      } catch {}
    }
    return results;
  } catch {
    return [];
  }
}

async function searchDDG(query) {
  await throttleSearch();
  try {
    const tokenUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&iax=images&ia=images`;
    const tokenRes = await fetch(tokenUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(8000),
    });
    const tokenText = await tokenRes.text();
    const vqdMatch = tokenText.match(/vqd=["']([^"']+)["']/i) || tokenText.match(/vqd=([0-9-]+)&/i);
    if (!vqdMatch) return [];
    const vqd = vqdMatch[1];

    const apiUrl = `https://duckduckgo.com/i.js?l=wt-wt&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,&p=1`;
    const apiRes = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://duckduckgo.com/',
      },
      signal: AbortSignal.timeout(8000),
    });
    const apiJson = await apiRes.json();
    return (apiJson.results || []).map((r) => ({
      title: r.title,
      image: r.image,
      source: r.url,
    }));
  } catch {
    return [];
  }
}

// Download image buffer asynchronously with retry handling for transient network issues
async function downloadImageBuffer(url) {
  if (!url || typeof url !== 'string') return null;
  if (url.includes('steroidsupplier.co.uk')) return null;

  // Attempt 1: Direct curl with browser headers
  try {
    const { stdout } = await execFileAsync(
      'curl.exe',
      ['-s', '-L', '--max-time', '10', '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', '-e', 'https://google.com', url],
      { encoding: 'buffer', maxBuffer: 15 * 1024 * 1024 }
    );
    if (stdout && stdout.length > 5000) {
      const type = getImageType(stdout);
      if (type) return { buffer: stdout, type };
    }
  } catch {}

  // Attempt 2: Via image cache proxy fallback
  try {
    const proxyUrl = `https://external-content.duckduckgo.com/iu/?u=${encodeURIComponent(url)}&f=1&nofb=1`;
    const { stdout } = await execFileAsync(
      'curl.exe',
      ['-s', '-L', '--max-time', '10', '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', proxyUrl],
      { encoding: 'buffer', maxBuffer: 15 * 1024 * 1024 }
    );
    if (stdout && stdout.length > 5000) {
      const type = getImageType(stdout);
      if (type) return { buffer: stdout, type };
    }
  } catch {}

  return null;
}

async function downloadImageWithRetry(url, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await downloadImageBuffer(url);
    if (res) return res;
    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  return null;
}

async function fetchProductsToProcess() {
  console.log('Fetching products from Supabase...');
  let products = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    let query = supabase
      .from('products')
      .select('id, name, slug, sku, images, is_featured, is_trending, is_best_seller, is_new_arrival')
      .order('is_featured', { ascending: false })
      .order('is_trending', { ascending: false })
      .order('is_best_seller', { ascending: false })
      .order('is_new_arrival', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);

    if (featuredOnly) {
      query = query.or('is_featured.eq.true,is_trending.eq.true,is_best_seller.eq.true,is_new_arrival.eq.true');
    }

    const { data, error } = await query;
    if (error) throw error;
    products.push(...(data || []));
    if (data.length < pageSize || featuredOnly) break;
    from += pageSize;
  }

  // Synchronize progress and usedHashes with database ground truth (self-healing checkpoint)
  let restoredFromDb = 0;
  for (const p of products) {
    const imgs = p.images || [];
    const supaImg = imgs.find((u) => typeof u === 'string' && u.includes('supabase.co'));
    if (supaImg) {
      const match = supaImg.match(/-([a-f0-9]{8})\.(jpg|jpeg|png|webp)/i);
      const hash = match ? match[1] : supaImg;
      if (!progress.processed[p.id]) {
        progress.processed[p.id] = {
          name: cleanSearchTerm(p.name),
          slug: p.slug,
          url: supaImg,
          hash,
          timestamp: new Date().toISOString(),
        };
        restoredFromDb++;
      }
      progress.usedHashes[hash] = p.id;
    }
  }

  if (restoredFromDb > 0) {
    console.log(`Synced ${restoredFromDb} previously migrated products from Supabase DB.`);
    await saveProgress();
  }

  // Filter out products already successfully migrated to Supabase storage
  const needingWork = products.filter((p) => {
    const currentImgs = p.images || [];
    const hasSupabaseImg = currentImgs.some((u) => typeof u === 'string' && u.includes('supabase.co'));
    return !hasSupabaseImg && !progress.processed[p.id];
  });

  console.log(`Total Products: ${products.length} (Needing new image: ${needingWork.length})`);
  if (limit && limit > 0) {
    return needingWork.slice(0, limit);
  }
  return needingWork;
}

// Progress metrics for real-time terminal display
let completedCount = 0;
let successCount = 0;
let failedCount = 0;
let skippedCount = 0;
let startTime = 0;
let totalToProcess = 0;

function logProgress(workerId, statusTag, productName, extraInfo = '') {
  const elapsedSec = Math.max((Date.now() - startTime) / 1000, 0.1);
  const speed = (completedCount / elapsedSec).toFixed(2);
  const remaining = totalToProcess - completedCount;
  const etaSec = Number(speed) > 0 ? Math.round(remaining / Number(speed)) : 0;
  const etaStr = etaSec >= 60 ? `${Math.floor(etaSec / 60)}m ${etaSec % 60}s` : `${etaSec}s`;
  const pct = ((completedCount / totalToProcess) * 100).toFixed(1);

  console.log(
    `[${completedCount}/${totalToProcess} (${pct}%)] | OK: ${successCount} | Failed: ${failedCount} | ${speed} prod/s | ETA: ${etaStr} | [W${workerId}] ${statusTag} "${productName.slice(0, 32)}" ${extraInfo}`
  );
}

// Core worker logic to process an individual product
async function processProduct(p, workerId) {
  const cleanName = cleanSearchTerm(p.name);

  // Requirement 6 & 7: Do not reprocess products that already have verified permanent Supabase images
  if (progress.processed[p.id]) {
    completedCount++;
    skippedCount++;
    logProgress(workerId, '[SKIPPED]', cleanName, '(already processed)');
    return;
  }

  const currentImgs = p.images || [];
  const alreadyHasVerified = currentImgs.some((u) => typeof u === 'string' && u.includes('supabase.co'));
  if (alreadyHasVerified) {
    progress.processed[p.id] = {
      name: cleanName,
      slug: p.slug,
      url: currentImgs[0],
      timestamp: new Date().toISOString(),
    };
    await saveProgress();
    completedCount++;
    skippedCount++;
    logProgress(workerId, '[SKIPPED]', cleanName, '(already in Supabase Storage)');
    return;
  }

  const queries = [
    cleanName,
    `${cleanName} packaging`,
    `${cleanName} buy`,
  ];

  let downloaded = null;
  let chosenResult = null;
  let reservedHashKey = null;

  try {
    for (const q of queries) {
      let results = await searchBing(q);
      if (results.length === 0) {
        results = await searchDDG(q);
      }
      if (results.length === 0) continue;

      for (const res of results) {
        if (!res.image) continue;
        const lowerTitle = (res.title || '').toLowerCase();
        const lowerUrl = (res.image || '').toLowerCase();
        if (
          lowerTitle.includes('logo') ||
          lowerTitle.includes('icon') ||
          lowerTitle.includes('placeholder') ||
          lowerTitle.includes('avatar') ||
          lowerTitle.includes('vector') ||
          lowerTitle.includes('not available') ||
          lowerTitle.includes('not-available') ||
          lowerTitle.includes('no image') ||
          lowerTitle.includes('no-image') ||
          lowerTitle.includes('coming soon') ||
          lowerUrl.includes('placeholder') ||
          lowerUrl.includes('no-image') ||
          lowerUrl.includes('not-available') ||
          lowerUrl.includes('not_available') ||
          lowerUrl.includes('coming-soon') ||
          lowerUrl.includes('default_image') ||
          lowerUrl.includes('lx11ylddxegielajaciw')
        ) {
          continue;
        }

        const dl = await downloadImageWithRetry(res.image);
        if (dl) {
          const hash = crypto.createHash('md5').update(dl.buffer).digest('hex');

          // Concurrency-safe hash reservation to guarantee uniqueness
          if (!tryReserveHash(hash, p.id)) {
            continue; // Collides with existing or concurrent in-flight image
          }

          reservedHashKey = hash;
          downloaded = { ...dl, hash };
          chosenResult = res;
          break;
        }
      }

      if (downloaded) break;
    }

    if (!downloaded) {
      completedCount++;
      failedCount++;
      progress.failed[p.id] = { name: cleanName, reason: 'No valid/unique packaging image found' };
      await saveProgress();
      logProgress(workerId, '[FAILED]', cleanName, '-> No valid image found');
      return;
    }

    const { buffer, type, hash } = downloaded;
    const filename = `${p.slug}-${hash.slice(0, 8)}${type.ext}`;
    const storagePath = `products/${filename}`;

    if (dryRun) {
      releaseHash(hash);
      completedCount++;
      successCount++;
      logProgress(workerId, '[DRY-RUN]', cleanName, `-> Would upload (${(buffer.length / 1024).toFixed(1)} KB)`);
      return;
    }

    // Live Supabase upload
    const { error: upErr } = await supabase.storage
      .from('media')
      .upload(storagePath, buffer, {
        contentType: type.mime,
        upsert: true,
        cacheControl: '31536000',
      });

    if (upErr) {
      releaseHash(hash);
      completedCount++;
      failedCount++;
      console.error(`  [W${workerId}] Storage upload error for ${p.slug}:`, upErr.message);
      progress.failed[p.id] = { name: cleanName, reason: `Upload error: ${upErr.message}` };
      await saveProgress();
      logProgress(workerId, '[FAILED]', cleanName, `-> Upload error: ${upErr.message}`);
      return;
    }

    const { data: pubData } = supabase.storage.from('media').getPublicUrl(storagePath);
    const publicUrl = pubData.publicUrl;

    // Live Supabase DB record update
    const { error: dbErr } = await supabase
      .from('products')
      .update({ images: [publicUrl] })
      .eq('id', p.id);

    if (dbErr) {
      releaseHash(hash);
      completedCount++;
      failedCount++;
      console.error(`  [W${workerId}] DB update error for ${p.slug}:`, dbErr.message);
      progress.failed[p.id] = { name: cleanName, reason: `DB error: ${dbErr.message}` };
      await saveProgress();
      logProgress(workerId, '[FAILED]', cleanName, `-> DB error: ${dbErr.message}`);
      return;
    }

    // Successfully committed
    commitHash(hash, p.id);
    progress.processed[p.id] = {
      name: cleanName,
      slug: p.slug,
      url: publicUrl,
      hash,
      timestamp: new Date().toISOString(),
    };
    delete progress.failed[p.id];
    await saveProgress();

    completedCount++;
    successCount++;
    logProgress(workerId, '[OK]', cleanName, `-> ${(buffer.length / 1024).toFixed(1)} KB | ${publicUrl.split('/').pop()}`);
  } catch (err) {
    if (reservedHashKey) releaseHash(reservedHashKey);
    completedCount++;
    failedCount++;
    progress.failed[p.id] = { name: cleanName, reason: `Worker error: ${err.message}` };
    await saveProgress();
    logProgress(workerId, '[ERROR]', cleanName, `-> ${err.message}`);
  }
}

// Controlled parallel worker pool
async function runConcurrentPool(items, concurrencyLimit) {
  let currentIndex = 0;
  const total = items.length;

  async function worker(workerId) {
    while (true) {
      const idx = currentIndex++;
      if (idx >= total) break;
      const product = items[idx];
      await processProduct(product, workerId);
    }
  }

  const workerPromises = [];
  const activeWorkers = Math.min(concurrencyLimit, total);
  for (let w = 1; w <= activeWorkers; w++) {
    workerPromises.push(worker(w));
  }
  await Promise.all(workerPromises);
}

async function main() {
  console.log('===========================================================');
  console.log('  OPTIMIZED PARALLEL PRODUCT IMAGE MIGRATION PIPELINE');
  console.log('===========================================================');
  console.log(`Mode:        ${dryRun ? 'DRY-RUN (no storage writes or DB updates)' : 'APPLY (live updates)'}`);
  console.log(`Batch Limit: ${limit > 0 ? `${limit} products` : 'Unlimited'}`);
  console.log(`Concurrency: ${concurrency} parallel workers`);
  if (featuredOnly) console.log('Scope:       Featured / Trending / Best Sellers / New Arrivals only');

  const products = await fetchProductsToProcess();
  totalToProcess = products.length;
  if (totalToProcess === 0) {
    console.log('\nAll products in scope already have verified Supabase images. Nothing to process.');
    return;
  }

  console.log(`\nStarting parallel migration for ${totalToProcess} products using ${Math.min(concurrency, totalToProcess)} concurrent workers...\n`);
  startTime = Date.now();

  await runConcurrentPool(products, concurrency);

  const totalTimeSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const avgSpeed = (completedCount / Math.max(Number(totalTimeSec), 0.1)).toFixed(2);

  console.log('\n===========================================================');
  console.log('  PARALLEL MIGRATION BATCH COMPLETE');
  console.log('===========================================================');
  console.log(`  Total Processed:        ${completedCount} / ${totalToProcess}`);
  console.log(`  Successfully Migrated:  ${successCount}`);
  console.log(`  Failures:               ${failedCount}`);
  console.log(`  Skipped (Already Done): ${skippedCount}`);
  console.log(`  Total Time:             ${totalTimeSec} seconds`);
  console.log(`  Average Throughput:     ${avgSpeed} products/second`);
  console.log(`  Progress File Saved:    ${PROGRESS_FILE}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
