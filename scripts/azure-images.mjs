// Verify the Marketplace image references used in src/presets.ts still resolve in
// the region (mirrors the former aws-amis.mjs). Prints the latest version for each.
// Reads creds from env (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET,
// AZURE_SUBSCRIPTION_ID, AZURE_LOCATION). Run: node scripts/azure-images.mjs

const tenant = need('AZURE_TENANT_ID'), clientId = need('AZURE_CLIENT_ID'), clientSecret = need('AZURE_CLIENT_SECRET');
const sub = need('AZURE_SUBSCRIPTION_ID');
const loc = process.env.AZURE_LOCATION || 'switzerlandnorth';
function need(k) { const v = process.env[k]; if (!v) { console.error(`Missing env ${k}`); process.exit(1); } return v; }

// Keep in sync with OS[].image in src/presets.ts.
const IMAGES = [
  { os: 'ubuntu2404', publisher: 'Canonical', offer: 'ubuntu-24_04-lts', sku: 'server' },
  { os: 'debian12', publisher: 'Debian', offer: 'debian-12', sku: '12-gen2' },
  { os: 'azurelinux3', publisher: 'MicrosoftCBLMariner', offer: 'azure-linux-3', sku: 'azure-linux-3-gen2' },
  { os: 'windows2022', publisher: 'MicrosoftWindowsServer', offer: 'WindowsServer', sku: '2022-datacenter-azure-edition' },
];

const tok = await (async () => {
  const r = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret, scope: 'https://management.azure.com/.default' }) });
  const j = await r.json(); if (!j.access_token) throw new Error('auth failed'); return j.access_token;
})();

for (const im of IMAGES) {
  const url = `https://management.azure.com/subscriptions/${sub}/providers/Microsoft.Compute/locations/${loc}/publishers/${im.publisher}/artifacttypes/vmimage/offers/${im.offer}/skus/${im.sku}/versions?api-version=2024-07-01`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${tok}` } });
  const j = await r.json();
  const versions = Array.isArray(j) ? j.map((v) => v.name) : [];
  const latest = versions.length ? versions[versions.length - 1] : 'NONE';
  console.log(`${im.os.padEnd(14)} ${im.publisher}:${im.offer}:${im.sku} -> ${r.ok ? 'OK latest ' + latest : 'ERR ' + r.status}`);
}
