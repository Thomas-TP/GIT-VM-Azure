// One-off: lock down the shared NSG **egress** to a default-deny allowlist — the
// strong, non-bypassable network layer of the hardening (mirrors the former
// aws-harden-sg.mjs). A sudo/admin user inside the VM cannot undo this.
//
// Allowlist: HTTP/HTTPS (80/443) to Internet, DNS (53) to Cloudflare for Families
// only (1.1.1.3 / 1.0.0.3 — forces filtered DNS), NTP (123), and the Azure platform
// (168.63.129.16 + AzureCloud service tag for the VM agent, extensions, metrics).
// Everything else outbound to the Internet is denied (blocks torrents/P2P/etc.).
//
// ⚠️ Run AFTER you've validated normal provisioning works. Reads creds from env
// (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_SUBSCRIPTION_ID,
// AZURE_LOCATION, AZURE_RESOURCE_GROUP). Run: node scripts/azure-harden-nsg.mjs

const tenant = need('AZURE_TENANT_ID'), clientId = need('AZURE_CLIENT_ID'), clientSecret = need('AZURE_CLIENT_SECRET');
const sub = need('AZURE_SUBSCRIPTION_ID');
const loc = process.env.AZURE_LOCATION || 'switzerlandnorth';
const rg = process.env.AZURE_RESOURCE_GROUP || 'git-vm-portal';
function need(k) { const v = process.env[k]; if (!v) { console.error(`Missing env ${k}`); process.exit(1); } return v; }

const ARM = 'https://management.azure.com';
const tok = await (async () => {
  const r = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret, scope: 'https://management.azure.com/.default' }) });
  const j = await r.json(); if (!j.access_token) throw new Error('auth failed'); return j.access_token;
})();
const path = `/subscriptions/${sub}/resourceGroups/${rg}/providers/Microsoft.Network/networkSecurityGroups/${rg}-nsg`;
const out = (name, priority, props) => ({ name, properties: { priority, direction: 'Outbound', access: 'Allow', sourcePortRange: '*', sourceAddressPrefix: '*', ...props } });

const rules = [
  // Inbound (keep SSH + RDP).
  { name: 'AllowSSH', properties: { priority: 1000, direction: 'Inbound', access: 'Allow', protocol: 'Tcp', sourcePortRange: '*', destinationPortRange: '22', sourceAddressPrefix: 'Internet', destinationAddressPrefix: '*' } },
  { name: 'AllowRDP', properties: { priority: 1010, direction: 'Inbound', access: 'Allow', protocol: 'Tcp', sourcePortRange: '*', destinationPortRange: '3389', sourceAddressPrefix: 'Internet', destinationAddressPrefix: '*' } },
  // Outbound allowlist.
  out('AllowWeb', 2000, { protocol: 'Tcp', destinationPortRanges: ['80', '443'], destinationAddressPrefix: 'Internet' }),
  out('AllowCloudflareDNS', 2010, { protocol: '*', destinationPortRange: '53', destinationAddressPrefixes: ['1.1.1.3/32', '1.0.0.3/32'] }),
  out('AllowNTP', 2020, { protocol: 'Udp', destinationPortRange: '123', destinationAddressPrefix: 'Internet' }),
  out('AllowAzurePlatform', 2030, { protocol: '*', destinationPortRange: '*', destinationAddressPrefix: '168.63.129.16/32' }),
  out('AllowAzureCloud', 2040, { protocol: 'Tcp', destinationPortRange: '443', destinationAddressPrefix: 'AzureCloud' }),
  // Default-deny the rest of the Internet (overrides Azure's AllowInternetOutBound).
  { name: 'DenyInternetOut', properties: { priority: 4000, direction: 'Outbound', access: 'Deny', protocol: '*', sourcePortRange: '*', destinationPortRange: '*', sourceAddressPrefix: '*', destinationAddressPrefix: 'Internet' } },
];

const r = await fetch(`${ARM}${path}?api-version=2023-11-01`, { method: 'PUT', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ location: loc, properties: { securityRules: rules } }) });
console.log(r.ok ? 'NSG egress hardened (default-deny + allowlist).' : 'ERROR ' + r.status + ' ' + (await r.text()).slice(0, 300));
