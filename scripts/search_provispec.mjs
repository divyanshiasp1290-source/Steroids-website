async function searchDDG(query) {
  const tokenUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&iax=images&ia=images`;
  const tokenRes = await fetch(tokenUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  const tokenText = await tokenRes.text();
  const vqdMatch = tokenText.match(/vqd=["']([^"']+)["']/i) || tokenText.match(/vqd=([0-9-]+)&/i);
  if (!vqdMatch) return [];
  const vqd = vqdMatch[1];
  const apiUrl = `https://duckduckgo.com/i.js?l=wt-wt&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,&p=1`;
  const apiRes = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Referer: 'https://duckduckgo.com/',
    },
  });
  const apiJson = await apiRes.json();
  return apiJson.results || [];
}

async function run() {
  const queries = ['Provispec Spectrum', 'Spectrum Anabolika Provispec', 'Provispec Mesterolone'];
  for (const q of queries) {
    console.log(`\nDDG Query: "${q}"`);
    const results = await searchDDG(q);
    console.log(`Found ${results.length} results:`);
    for (let i = 0; i < Math.min(5, results.length); i++) {
      console.log(`[${i}] "${results[i].title}"\n  ${results[i].image}`);
    }
  }
}

run();
