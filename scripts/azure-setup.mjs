// One-off: provision the shared Azure network for the portal — resource group,
// VNet + subnet, and an NSG with inbound SSH (22) + RDP (3389). Prints the
// SUBNET_ID and NSG_ID to paste into wrangler.jsonc (AZURE_SUBNET_ID / AZURE_NSG_ID).
//
// Reads the service-principal creds from the environment (never hard-coded):
//   AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_SUBSCRIPTION_ID
//   AZURE_LOCATION (default switzerlandnorth), AZURE_RESOURCE_GROUP (default git-vm-portal)
// Run: node scripts/azure-setup.mjs

const tenant = need('AZURE_TENANT_ID');
const clientId = need('AZURE_CLIENT_ID');
const clientSecret = need('AZURE_CLIENT_SECRET');
const sub = need('AZURE_SUBSCRIPTION_ID');
const loc = process.env.AZURE_LOCATION || 'switzerlandnorth';
const rg = process.env.AZURE_RESOURCE_GROUP || 'git-vm-portal';

function need(k) {
  const v = process.env[k];
  if (!v) {
    console.error(`Missing env ${k}`);
    process.exit(1);
  }
  return v;
}

const ARM = 'https://management.azure.com';
let token;
async function auth() {
  const r = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret, scope: 'https://management.azure.com/.default' }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('auth failed: ' + JSON.stringify(j));
  token = j.access_token;
}
async function arm(method, path, api, body) {
  const url = `${ARM}${path}?api-version=${api}`;
  const r = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text();
  const j = t ? JSON.parse(t) : null;
  if (!r.ok && r.status !== 202) throw new Error(`${method} ${path} -> ${r.status} ${j?.error?.message ?? t}`);
  return j;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await auth();

// Register the resource providers we use (idempotent).
for (const ns of ['Microsoft.Network', 'Microsoft.Compute', 'microsoft.insights', 'Microsoft.CostManagement']) {
  await arm('POST', `/subscriptions/${sub}/providers/${ns}/register`, '2021-04-01').catch(() => {});
}
for (let i = 0; i < 30; i++) {
  const s = (await arm('GET', `/subscriptions/${sub}/providers/Microsoft.Network`, '2021-04-01')).registrationState;
  if (s === 'Registered') break;
  await sleep(5000);
}

const base = `/subscriptions/${sub}/resourceGroups/${rg}`;
await arm('PUT', base, '2021-04-01', { location: loc });
console.log('RG ok:', rg);

const nsg = await arm('PUT', `${base}/providers/Microsoft.Network/networkSecurityGroups/${rg}-nsg`, '2023-11-01', {
  location: loc,
  properties: {
    securityRules: [
      { name: 'AllowSSH', properties: { priority: 1000, direction: 'Inbound', access: 'Allow', protocol: 'Tcp', sourcePortRange: '*', destinationPortRange: '22', sourceAddressPrefix: 'Internet', destinationAddressPrefix: '*' } },
      { name: 'AllowRDP', properties: { priority: 1010, direction: 'Inbound', access: 'Allow', protocol: 'Tcp', sourcePortRange: '*', destinationPortRange: '3389', sourceAddressPrefix: 'Internet', destinationAddressPrefix: '*' } },
    ],
  },
});

await arm('PUT', `${base}/providers/Microsoft.Network/virtualNetworks/${rg}-vnet`, '2023-11-01', {
  location: loc,
  properties: { addressSpace: { addressPrefixes: ['10.10.0.0/16'] }, subnets: [{ name: 'default', properties: { addressPrefix: '10.10.0.0/24' } }] },
});
await sleep(8000);
const subnet = await arm('GET', `${base}/providers/Microsoft.Network/virtualNetworks/${rg}-vnet/subnets/default`, '2023-11-01');

console.log('\nPaste into wrangler.jsonc vars:');
console.log('AZURE_NSG_ID   =', nsg.id);
console.log('AZURE_SUBNET_ID=', subnet.id);
