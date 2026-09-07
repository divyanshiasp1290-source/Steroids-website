import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const envPath = path.join(repoRoot, '.env');

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const cleaned = line.trim();
    if (!cleaned || cleaned.startsWith('#') || !cleaned.includes('=')) continue;
    const idx = cleaned.indexOf('=');
    const key = cleaned.slice(0, idx).trim();
    let value = cleaned.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment or .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storage: undefined,
  },
});

const SOURCE_BASE = 'https://steroidsupplier.co.uk';
const SHOP_URL = `${SOURCE_BASE}/shop/`;
const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9',
};

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120);
}

function generateImportSku(sourceUrl) {
  const sourceId = crypto.createHash('sha256').update(sourceUrl).digest('hex').slice(0, 12).toUpperCase();
  return `IMP-${sourceId}`;
}

function isValidSku(value) {
  const normalized = normalizeWhitespace(value);
  return Boolean(normalized) && !/^n\/?a$/i.test(normalized);
}

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\u00A0/g, ' ')
    .trim();
}

function stripHtml(value) {
  return normalizeWhitespace(
    String(value || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&#039;/gi, "'")
      .replace(/&quot;/gi, '"')
      .replace(/\s+/g, ' '),
  );
}

function normalizeCategoryName(name) {
  return normalizeWhitespace(name)
    .replace(/\s*[-–—:]\s*$/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function getTextFromUrlMatch(html, regex) {
  const match = html.match(regex);
  if (!match) return '';
  return stripHtml(match[1] || match[0]);
}

async function fetchHtml(url) {
  const response = await fetch(url, { headers: REQUEST_HEADERS });
  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function getUniqueUrls(hrefs) {
  const output = new Set();
  for (const item of hrefs) {
    if (!item) continue;
    try {
      const resolved = new URL(item, SOURCE_BASE).href;
      output.add(resolved);
    } catch {
      // ignore invalid urls
    }
  }
  return [...output];
}

async function listProductUrls() {
  const seen = new Set();
  let page = 1;
  let emptyPages = 0;

  // The source exposes 51 paginated pages, but its pagination links are
  // inconsistent. Continue until an empty page instead of trusting "next".
  while (page <= 1000 && emptyPages < 2) {
    const url = page === 1 ? SHOP_URL : `${SOURCE_BASE}/shop/page/${page}/`;
    console.log(`Scanning shop page ${page}: ${url}`);
    let html;
    try {
      html = await fetchHtml(url);
    } catch (error) {
      if (page > 1 && /404/.test(error instanceof Error ? error.message : String(error))) {
        break;
      }
      throw error;
    }
    const hrefs = [...html.matchAll(/href=(['"])(.*?)\1/g)].map((match) => match[2]);
    const pageProducts = getUniqueUrls(hrefs)
      .filter((href) => href.includes('/product/'))
      .filter((href) => !href.includes('/product-category/'))
      .filter((href) => !href.includes('/tag/'))
      .filter((href) => !href.includes('/shop/page/'))
      .filter((href) => !href.includes('/checkout/'))
      .filter((href) => !href.includes('/cart/'))
      .map((href) => {
        const normalized = new URL(href);
        normalized.search = '';
        normalized.hash = '';
        normalized.pathname = normalized.pathname.replace(/\/+$/, '') + '/';
        return normalized.href;
      });

    if (pageProducts.length === 0) {
      emptyPages += 1;
    } else {
      emptyPages = 0;
    }

    for (const href of pageProducts) seen.add(href);
    page += 1;
  }

  const ordered = [...seen].sort((a, b) => a.localeCompare(b));
  console.log(`Discovered ${ordered.length} unique product URLs.`);
  return ordered;
}

function extractImageUrls(markup) {
  const html = markup;
  const matches = [...html.matchAll(/(?:data-lazy-src|data-src|data-large_image|srcset|src)=(["'])(.*?)\1/gi)]
    .map((match) => match[2])
    .map((value) => value.trim())
    .filter(Boolean);

  const urls = matches.flatMap((value) => {
    if (value.includes(',')) {
      return value
        .split(',')
        .map((part) => part.trim().split(' ')[0])
        .filter((part) => /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(part));
    }
    return [value];
  });

  const filtered = [...new Set(urls)]
    .filter((url) => /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url))
    .filter((url) => url.includes('/wp-content/uploads/'))
    .filter((url) => !url.includes('jquery') && !url.includes('woocommerce') && !url.includes('logo'))
    .filter((url) => !/\d+x\d+\.(jpg|jpeg|png|webp|gif)$/i.test(url) || !url.includes('/wp-content/uploads/'));

  const mainImage = getTextFromUrlMatch(html, /<meta property="og:image" content="([^"]+)"/i);
  return filtered.length ? filtered : [mainImage].filter(Boolean);
}

function extractProductImages(html) {
  const galleryMarkup = [...html.matchAll(
    /<[^>]+class=["'][^"']*woocommerce-product-gallery__image[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/gi,
  )].map((match) => match[1]).join('\n');
  const galleryImages = extractImageUrls(galleryMarkup);
  const mainImage = getTextFromUrlMatch(html, /<meta property="og:image" content="([^"]+)"/i);
  return [...new Set([...galleryImages, mainImage].filter(Boolean))].slice(0, 1);
}

function extractPrice(html) {
  const explicit = html.match(/<meta itemprop="price" content="([^"]+)"/i)?.[1]
    || html.match(/<meta property="product:price:amount" content="([^"]+)"/i)?.[1]
    || html.match(/(?:£|€|\$)\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i)?.[1];

  if (explicit) {
    const parsed = Number(String(explicit).replace(/,/g, '').trim());
    if (!Number.isNaN(parsed)) return parsed;
  }

  const generic = [...html.matchAll(/(?:£|€|\$)\s*([0-9][0-9,]*(?:\.\d{1,2})?)/gi)]
    .map((match) => Number(String(match[1]).replace(/,/g, '')))
    .find((value) => Number.isFinite(value) && value > 0);

  return generic ?? 0;
}

function extractPrimaryCategory(html) {
  const breadcrumbMatch = html.match(/class="posted_in"[^>]*>([\s\S]*?)<\/span>/i);
  if (breadcrumbMatch) {
    const labels = [...breadcrumbMatch[1].matchAll(/>\s*([^<>]+?)\s*<\//g)]
      .map((match) => stripHtml(match[1]))
      .map((value) => value.replace(/^Categories\s*:/i, '').trim())
      .filter(Boolean);
    const preferred = labels.find((label) => !/^(mix|uk warehouse|shop)$/i.test(label));
    if (preferred) return preferred;
  }

  const breadcrumbLinks = [...html.matchAll(/product-category\/([^"'\/]+)\//gi)]
    .map((match) => match[1])
    .map((value) => value.replace(/[-_]+/g, ' '));
  return breadcrumbLinks[0] ? breadcrumbLinks[0].replace(/\b\w/g, (char) => char.toUpperCase()) : 'Uncategorized';
}

function extractSku(html) {
  const sku = getTextFromUrlMatch(html, /(?:sku|SKU)[^>]*>\s*([^<]+)</i)
    || getTextFromUrlMatch(html, /(?:data-product_sku|product_sku)["']?\s*[:=]\s*["']([^"']+)/i)
    || getTextFromUrlMatch(html, /<span class="sku"[^>]*>([^<]+)<\/span>/i);
  const normalized = normalizeWhitespace(sku).replace(/^sku\s*:\s*$/i, '');
  return normalized || null;
}

function extractStock(html) {
  const stockText = stripHtml(html);
  const outOfStock = /out of stock|sold out/i.test(stockText);
  if (outOfStock) return 0;
  const explicit = html.match(/\b(stock|availability)\b[^\d]{0,20}(\d+)/i)?.[2];
  if (explicit) return Number(explicit);
  return 99;
}

function extractDescription(html) {
  const metaDescription = getTextFromUrlMatch(html, /<meta name="description" content="([^"]+)"/i)
    || getTextFromUrlMatch(html, /<meta property="og:description" content="([^"]+)"/i)
    || '';
  if (metaDescription) return metaDescription;

  const shortText = getTextFromUrlMatch(html, /<div[^>]*class="[^"]*woocommerce-product-details__short-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
    || getTextFromUrlMatch(html, /<div[^>]*class="[^"]*summary entry-summary[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
    || '';
  if (shortText) return stripHtml(shortText).slice(0, 1000);

  return 'Premium steroid product supplied for performance and recovery support.';
}

function extractTitle(html, fallbackSlug) {
  const direct = getTextFromUrlMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (direct) return direct;
  const ogTitle = getTextFromUrlMatch(html, /<meta property="og:title" content="([^"]+)"/i);
  if (ogTitle) return ogTitle.replace(/\s*[-|].*$/i, '').trim();
  return fallbackSlug.replace(/[-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name');

  if (error) throw error;
  return data ?? [];
}

async function ensureCategory(name) {
  const safeName = normalizeWhitespace(name || 'Uncategorized') || 'Uncategorized';
  const canonical = safeName
    .replace(/&/g, 'and')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!canonical) return null;

  const existing = await getCategories();
  const targetKey = normalizeCategoryName(canonical);
  const matched = existing.find((item) => {
    const itemKey = normalizeCategoryName(item.name || item.slug || '');
    return itemKey === targetKey || itemKey.includes(targetKey) || targetKey.includes(itemKey);
  });

  if (matched) return matched.id;

  const slug = slugify(canonical);
  const { data, error } = await supabase
    .from('categories')
    .insert({
      name: canonical,
      slug,
      description: `Imported category for ${canonical}.`,
      is_visible: true,
      sort_order: existing.length + 1,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

async function upsertProduct(product) {
  const slug = slugify(product.slug || product.name);
  const { data: existingRows, error: existingError } = await supabase
    .from('products')
    .select('id')
    .eq('slug', slug)
    .limit(1);

  if (existingError) throw existingError;

  if (existingRows && existingRows.length > 0) {
    return { id: existingRows[0].id, inserted: false };
  }

  const sourceUrl = product.source_url;
  let sku = isValidSku(product.sku) ? normalizeWhitespace(product.sku) : generateImportSku(sourceUrl);
  const { data: skuRows, error: skuError } = await supabase
    .from('products')
    .select('id, slug')
    .eq('sku', sku)
    .limit(1);

  if (skuError) throw skuError;
  if (skuRows && skuRows.length > 0) {
    sku = generateImportSku(sourceUrl);
  }

  const categoryId = product.category_id ? await ensureCategory(product.category_id) : null;

  const payload = {
    name: product.name,
    slug,
    sku,
    category_id: categoryId,
    short_description: product.short_description || null,
    description: product.description || null,
    price: Number(product.price) || 0,
    compare_at_price: product.compare_at_price != null ? Number(product.compare_at_price) : null,
    stock: Number(product.stock) || 0,
    low_stock_threshold: 5,
    currency: 'GBP',
    seo_title: product.seo_title || product.name,
    meta_description: product.meta_description || product.short_description || null,
    images: (product.images || []).filter(Boolean).slice(0, 1),
    is_published: true,
    is_featured: false,
    is_trending: false,
    is_best_seller: false,
    is_new_arrival: false,
    rating: null,
    review_count: 0,
  };

  const { data, error } = await supabase.from('products').insert(payload).select('id').single();
  if (error) throw error;
  return { id: data.id, inserted: true };
}

async function parseProductPage(url) {
  const html = await fetchHtml(url);
  const slugFromUrl = (url.split('/product/')[1] || '').replace(/\/+$/, '');
  const fallbackSlug = slugFromUrl || 'product';
  const title = extractTitle(html, fallbackSlug);
  const description = extractDescription(html);
  const price = extractPrice(html);
  const images = extractProductImages(html).slice(0, 10);
  const categoryName = extractPrimaryCategory(html);
  const sku = extractSku(html);
  const stock = extractStock(html);

  return {
    name: title || 'Imported Product',
    slug: slugify(fallbackSlug),
    sku: sku || null,
    source_url: url,
    category_id: categoryName,
    short_description: description.slice(0, 220),
    description,
    price,
    compare_at_price: price > 0 ? Number((price * 1.15).toFixed(2)) : null,
    stock,
    images,
    seo_title: title,
    meta_description: description.slice(0, 160),
  };
}

async function deleteNonReferenceProducts() {
  const reportPath = path.join(repoRoot, 'non-reference-products.json');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const ids = report.map((product) => product.id);
  const uniqueIds = new Set(ids);

  if (ids.length !== 195 || uniqueIds.size !== 195 || ids.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) {
    throw new Error(`Refusing to delete: expected 195 unique product UUIDs, found ${ids.length}.`);
  }

  const { data: matches, error: matchError } = await supabase
    .from('products')
    .select('id')
    .in('id', ids);
  if (matchError) throw matchError;
  if ((matches ?? []).length !== ids.length) {
    throw new Error(`Refusing to delete: ${matches?.length ?? 0} of ${ids.length} report IDs exist in Supabase.`);
  }

  const { error: deleteError } = await supabase.from('products').delete().in('id', ids);
  if (deleteError) throw deleteError;

  const { data: remaining, error: remainingError } = await supabase
    .from('products')
    .select('id')
    .in('id', ids);
  if (remainingError) throw remainingError;
  if ((remaining ?? []).length !== 0) {
    throw new Error(`Delete verification failed: ${remaining.length} report products remain.`);
  }

  const { count, error: countError } = await supabase.from('products').select('id', { count: 'exact', head: true });
  if (countError) throw countError;
  console.log('------ Permanent deletion summary ------');
  console.log(`Deleted by exact ID: ${ids.length}`);
  console.log(`Deleted IDs remaining: ${remaining?.length ?? 0}`);
  console.log(`Final Supabase/Admin product count: ${count}`);
  if (count !== 7190) {
    throw new Error(`Final product count is ${count}; expected exactly 7190.`);
  }
}

async function main() {
  if (process.env.IMPORT_DELETE_NON_REFERENCE === '1') {
    await deleteNonReferenceProducts();
    return;
  }

  const productUrls = await listProductUrls();
  if (process.env.IMPORT_DISCOVERY_ONLY === '1') {
    console.log(`Discovery-only complete: ${productUrls.length} unique product URLs.`);
    return;
  }

  const existingProducts = new Map();
  const existingPageSize = 500;
  for (let from = 0; ; from += existingPageSize) {
    const { data: existingRows, error: existingError } = await supabase
      .from('products')
      .select('id, name, slug')
      .range(from, from + existingPageSize - 1);
    if (existingError) throw existingError;
    for (const row of existingRows ?? []) {
      if (row.slug) existingProducts.set(row.slug, row);
    }
    if (!existingRows || existingRows.length < existingPageSize) break;
  }
  const existingSlugs = new Set(existingProducts.keys());
  const sourceSlugs = new Set(productUrls.map((url) => slugify((url.split('/product/')[1] || '').replace(/\/+$/, ''))));

  if (process.env.IMPORT_REPORT_NON_REFERENCE_ONLY === '1') {
    const nonReferenceProducts = [...existingProducts.values()]
      .filter((product) => !sourceSlugs.has(product.slug))
      .sort((a, b) => String(a.slug).localeCompare(String(b.slug)));
    console.log('------ Non-reference products ------');
    console.log(`Reference products: ${productUrls.length}`);
    console.log(`Products in database: ${existingProducts.size}`);
    console.log(`Non-reference products: ${nonReferenceProducts.length}`);
    for (const product of nonReferenceProducts) {
      console.log(`${product.id}\t${product.slug}\t${product.name}`);
    }
    const reportPath = path.join(repoRoot, 'non-reference-products.json');
    fs.writeFileSync(reportPath, `${JSON.stringify(nonReferenceProducts, null, 2)}\n`);
    console.log(`Detailed report written to ${reportPath}`);
    return;
  }

  const pendingUrls = productUrls.filter((url) => {
    const sourceSlug = slugify((url.split('/product/')[1] || '').replace(/\/+$/, ''));
    return !existingSlugs.has(sourceSlug);
  });
  const urlsToProcess = pendingUrls;
  let created = 0;
  const skipped = productUrls.length - pendingUrls.length;
  let failed = 0;

  console.log(`Database reconciliation: ${skipped} already present, ${pendingUrls.length} missing, processing ${urlsToProcess.length}.`);

  for (const url of urlsToProcess) {
    try {
      const product = await parseProductPage(url);
      const result = await upsertProduct(product);
      if (result.inserted) created += 1;
      console.log(`[import] ${product.name} (${product.slug}) - price £${Number(product.price).toFixed(2)}`);
    } catch (error) {
      failed += 1;
      console.error(`[import:failed] ${url}:`, error instanceof Error ? error.message : error);
    }
  }

  const { count, error: countError } = await supabase.from('products').select('id', { count: 'exact', head: true });
  if (countError) throw countError;

  const finalSlugs = new Set();
  for (let from = 0; ; from += existingPageSize) {
    const { data: finalRows, error: finalError } = await supabase
      .from('products')
      .select('slug')
      .range(from, from + existingPageSize - 1);
    if (finalError) throw finalError;
    for (const row of finalRows ?? []) {
      if (row.slug) finalSlugs.add(row.slug);
    }
    if (!finalRows || finalRows.length < existingPageSize) break;
  }
  const missingUrls = productUrls.filter((url) => {
    const sourceSlug = slugify((url.split('/product/')[1] || '').replace(/\/+$/, ''));
    return !finalSlugs.has(sourceSlug);
  });

  console.log('------ Import summary ------');
  console.log(`Products discovered: ${productUrls.length}`);
  console.log(`Inserted: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Missing after import: ${missingUrls.length}`);
  if (missingUrls.length > 0) {
    console.log(`Missing source URLs: ${missingUrls.join(', ')}`);
  }
  console.log(`Total in database: ${count}`);

  const { count: publishedCount, error: publishError } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true);
  if (publishError) throw publishError;
  console.log(`Published products visible to /shop/: ${publishedCount ?? 0}`);
}

main().catch((error) => {
  console.error('Import failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
