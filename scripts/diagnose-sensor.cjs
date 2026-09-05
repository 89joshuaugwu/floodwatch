// Read-only diagnostics: the API probe intentionally sends an invalid reading.
const fs = require('node:fs');
const path = require('node:path');
const { loadEnvConfig } = require('@next/env');

const root = path.resolve(__dirname, '..');
loadEnvConfig(root);
const sketch = fs.readFileSync(path.join(root, 'wokwi/sketch.ino'), 'utf8');
const endpoint = sketch.match(/const char\* API_ENDPOINT = "([^"]+)"/)?.[1];
const sketchKey = sketch.match(/const char\* DEVICE_API_KEY = "([^"]+)"/)?.[1];
const stationId = endpoint && new URL(endpoint).pathname.split('/')[3];

async function probe(label, url, options = {}) {
  try {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(20000) });
    const body = await response.text();
    let data;
    try { data = JSON.parse(body); } catch { data = null; }
    console.log(`${label}: HTTP ${response.status}`);
    if (data?.error) console.log(JSON.stringify(data.error));
    return data;
  } catch (error) {
    console.log(`${label}: ${error.cause?.code || error.name}: ${error.message}`);
    return null;
  }
}

async function main() {
  if (!endpoint || !stationId) throw new Error('Sketch endpoint is missing.');
  console.log(`Station: ${stationId}`);
  console.log(`API: ${endpoint}`);
  console.log(`Sketch key matches .env.local: ${sketchKey === process.env.DEVICE_API_KEY}`);
  console.log(`Browser/Admin Firebase projects match: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === process.env.FIREBASE_ADMIN_PROJECT_ID}`);

  const base = process.argv[2] || new URL(endpoint).origin;
  await probe('Website', `${base}/stations`);
  await probe('Device key check (expected 400, no reading saved)', `${base}/api/sensors/${stationId}/reading`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Device-Key': sketchKey },
    body: JSON.stringify({ waterLevel: -1, rainfall: 0 }),
  });

  const publicBase = `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents`;
  const station = await probe('Public station access', `${publicBase}/stations/${stationId}`);
  if (station?.fields) {
    console.log(`Station name: ${station.fields.name?.stringValue}`);
    console.log(`Thresholds: ${JSON.stringify(station.fields.thresholds?.mapValue?.fields)}`);
  }
  const readings = await probe('Public latest reading access', `${publicBase}/stations/${stationId}:runQuery`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'readings' }], orderBy: [{ field: { fieldPath: 'timestamp' }, direction: 'DESCENDING' }], limit: 1 } }),
  });
  if (Array.isArray(readings)) {
    const fields = readings.find(item => item.document)?.document.fields;
    console.log(fields ? `Latest reading: ${JSON.stringify(fields)}` : 'No readings saved for this station.');
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
