const url = 'https://qffchgiekowtbaofprzn.supabase.co/storage/v1/object/public/media/products/aromasin-aaster-health-and-sports-solutions-d7eef5b6.jpg';
console.time('HEAD');
try {
  const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
  console.log('Status:', res.status);
  console.log('Content-Length:', res.headers.get('content-length'));
  console.log('Content-Type:', res.headers.get('content-type'));
} catch (err) {
  console.error('HEAD error:', err);
}
console.timeEnd('HEAD');
