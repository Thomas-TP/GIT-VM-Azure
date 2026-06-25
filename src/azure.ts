import type { Env } from './types';

// Azure Resource Manager (ARM) client. Replaces the AWS EC2 layer.
// Auth = OAuth2 client-credentials (service principal) -> Bearer token for
// management.azure.com. No SDK: plain fetch + JSON. The exported function names
// mirror the former aws.ts so the reconciler (src/index.ts) is untouched; the
// `instanceId` here is the **Azure VM resource name** (stored in the legacy
// `aws_instance_id` column — kept opaque per the additive-migrations rule).

const ARM = 'https://management.azure.com';
const API_COMPUTE = '2024-07-01';
const API_NETWORK = '2023-11-01';
const API_METRICS = '2023-10-01';
const API_COST = '2023-11-01';

// ---- Auth (token cached per isolate) -----------------------------------
let tokenCache: { token: string; exp: number } | null = null;
async function token(env: Env): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.exp > now + 60_000) return tokenCache.token;
  const res = await fetch(`https://login.microsoftonline.com/${env.AZURE_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.AZURE_CLIENT_ID,
      client_secret: env.AZURE_CLIENT_SECRET,
      scope: 'https://management.azure.com/.default',
    }),
  });
  const j = (await res.json()) as any;
  if (!res.ok || !j.access_token) throw new Error(`Azure token failed: ${j.error ?? res.status} ${j.error_description ?? ''}`);
  tokenCache = { token: j.access_token, exp: now + (j.expires_in ?? 3600) * 1000 };
  return j.access_token;
}

function rgBase(env: Env): string {
  return `/subscriptions/${env.AZURE_SUBSCRIPTION_ID}/resourceGroups/${env.AZURE_RESOURCE_GROUP}`;
}

interface ArmOpts {
  method?: string;
  api: string;
  body?: unknown;
  query?: Record<string, string>;
}

// Single ARM request. Throws on failure with the HTTP status embedded so callers
// can branch on `(404)` etc. 200/201/202 are all treated as success.
async function arm(env: Env, path: string, opts: ArmOpts): Promise<{ status: number; json: any }> {
  const t = await token(env);
  const url = new URL(path.startsWith('http') ? path : ARM + path);
  url.searchParams.set('api-version', opts.api);
  for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    method: opts.method ?? 'GET',
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok && res.status !== 202) {
    const msg = json?.error?.message ?? json?.message ?? text.slice(0, 300) ?? String(res.status);
    const op = url.pathname.split('/').slice(-2).join('/');
    throw new Error(`Azure ${opts.method ?? 'GET'} ${op} failed (${res.status}): ${msg}`);
  }
  return { status: res.status, json };
}

// Poll a resource until provisioningState = Succeeded (bounded). Used for the
// public IP + NIC so the VM create can safely reference them.
async function waitProvisioned(env: Env, path: string, api: string, tries = 20): Promise<void> {
  for (let i = 0; i < tries; i++) {
    const r = await arm(env, path, { api }).catch(() => null);
    const st = r?.json?.properties?.provisioningState;
    if (st === 'Succeeded') return;
    if (st === 'Failed') throw new Error(`provisioning failed for ${path.split('/').pop()}`);
    await new Promise((res) => setTimeout(res, 1500));
  }
}

// ---- SSH key pairs ------------------------------------------------------
// Azure has no per-VM key store like EC2; we use the sshPublicKeys resource +
// its generateKeyPair action, which returns BOTH halves (RSA, PEM private key +
// OpenSSH public key). Mirrors createKeyPair/deleteKeyPair from aws.ts but also
// surfaces the public key (the caller embeds it in the VM's osProfile).
export interface KeyPair {
  keyName: string;
  privateKey: string;
  publicKey: string;
}

export async function createKeyPair(env: Env, requestId: number, _keyType: 'ed25519' | 'rsa' = 'rsa'): Promise<KeyPair> {
  const keyName = `gitvm-req-${requestId}`;
  const path = `${rgBase(env)}/providers/Microsoft.Compute/sshPublicKeys/${keyName}`;
  // Idempotent re-provision: drop any leftover, recreate, then generate.
  await arm(env, path, { method: 'DELETE', api: API_COMPUTE }).catch(() => {});
  await arm(env, path, { method: 'PUT', api: API_COMPUTE, body: { location: env.AZURE_LOCATION } });
  const gen = await arm(env, `${path}/generateKeyPair`, { method: 'POST', api: API_COMPUTE });
  const privateKey = gen.json?.privateKey;
  const publicKey = gen.json?.publicKey;
  if (!privateKey || !publicKey) throw new Error('generateKeyPair: missing key material');
  return { keyName, privateKey, publicKey };
}

export async function deleteKeyPair(env: Env, keyName: string): Promise<void> {
  await arm(env, `${rgBase(env)}/providers/Microsoft.Compute/sshPublicKeys/${keyName}`, { method: 'DELETE', api: API_COMPUTE }).catch(() => {});
}

// ---- Launch -------------------------------------------------------------
export interface ImageRef {
  publisher: string;
  offer: string;
  sku: string;
  version: string;
}

export interface LaunchParams {
  requestId: number;
  /** VM resource name (stored as aws_instance_id). */
  vmName: string;
  /** OS-level hostname (Linux ≤ 63, Windows ≤ 15). */
  computerName: string;
  /** Azure VM size, e.g. Standard_B2s. */
  size: string;
  /** Marketplace image for a fresh install. Omit when attaching a restored disk. */
  image?: ImageRef;
  /** Managed-disk id to attach as the OS disk (restore from snapshot). */
  attachOsDiskId?: string;
  sizeGb: number;
  /** Managed-disk SKU: StandardSSD_LRS | Standard_LRS | Premium_LRS. */
  diskSku: string;
  os: 'linux' | 'windows';
  adminUsername: string;
  /** Windows: admin password. */
  adminPassword?: string;
  /** Linux: OpenSSH public key embedded in authorized_keys. */
  sshPublicKey?: string;
  /** Linux: cloud-init script (raw text; base64-encoded here). */
  customData?: string;
  /** Friendly name -> Name tag. */
  nameTag?: string | null;
}

export interface LaunchResult {
  instanceId: string;
}

// Create public IP + NIC + VM. NIC/IP/OS-disk carry deleteOption=Delete so a VM
// delete cascades (see terminateInstance). The VM PUT is async; the reconciler
// promotes provisioning -> active once it reports running + a public IP.
export async function launchInstance(env: Env, p: LaunchParams): Promise<LaunchResult> {
  if (!env.AZURE_SUBNET_ID) throw new Error('Azure network config missing (subnet)');
  const loc = env.AZURE_LOCATION;
  const tags: Record<string, string> = {
    'managed-by': 'git-vm-portal',
    'request-id': String(p.requestId),
    Name: (p.nameTag && p.nameTag.trim() ? p.nameTag.trim() : p.vmName).slice(0, 255),
  };
  const ipPath = `${rgBase(env)}/providers/Microsoft.Network/publicIPAddresses/${p.vmName}-ip`;
  const nicPath = `${rgBase(env)}/providers/Microsoft.Network/networkInterfaces/${p.vmName}-nic`;

  // 1. Public IP (Standard SKU, static).
  await arm(env, ipPath, {
    method: 'PUT',
    api: API_NETWORK,
    body: { location: loc, sku: { name: 'Standard' }, properties: { publicIPAllocationMethod: 'Static', publicIPAddressVersion: 'IPv4' }, tags },
  });
  await waitProvisioned(env, ipPath, API_NETWORK);

  // 2. NIC (subnet + public IP; NSG attached here if not on the subnet).
  const nicProps: any = {
    ipConfigurations: [
      {
        name: 'ipconfig1',
        properties: {
          subnet: { id: env.AZURE_SUBNET_ID },
          publicIPAddress: { id: ipPath, properties: { deleteOption: 'Delete' } },
          privateIPAllocationMethod: 'Dynamic',
        },
      },
    ],
  };
  if (env.AZURE_NSG_ID) nicProps.networkSecurityGroup = { id: env.AZURE_NSG_ID };
  await arm(env, nicPath, { method: 'PUT', api: API_NETWORK, body: { location: loc, properties: nicProps, tags } });
  await waitProvisioned(env, nicPath, API_NETWORK);

  // 3. VM.
  const osDisk: any = {
    name: `${p.vmName}-osdisk`,
    createOption: p.attachOsDiskId ? 'Attach' : 'FromImage',
    deleteOption: 'Delete',
    managedDisk: { storageAccountType: p.diskSku, ...(p.attachOsDiskId ? { id: p.attachOsDiskId } : {}) },
  };
  if (p.attachOsDiskId) osDisk.osType = p.os === 'windows' ? 'Windows' : 'Linux';
  else osDisk.diskSizeGB = p.sizeGb;

  const storageProfile: any = { osDisk };
  if (!p.attachOsDiskId && p.image) storageProfile.imageReference = p.image;

  const vmBody: any = {
    location: loc,
    tags,
    properties: {
      hardwareProfile: { vmSize: p.size },
      storageProfile,
      networkProfile: { networkInterfaces: [{ id: nicPath, properties: { primary: true, deleteOption: 'Delete' } }] },
    },
  };

  // A fresh install needs an osProfile (credentials + cloud-init). An attached
  // (restored) disk already carries its OS/users, so Azure forbids an osProfile.
  if (!p.attachOsDiskId) {
    const osProfile: any = { computerName: p.computerName, adminUsername: p.adminUsername };
    if (p.os === 'windows') {
      osProfile.adminPassword = p.adminPassword;
      osProfile.windowsConfiguration = { provisionVMAgent: true, enableAutomaticUpdates: true };
    } else {
      osProfile.linuxConfiguration = {
        disablePasswordAuthentication: true,
        ssh: { publicKeys: [{ path: `/home/${p.adminUsername}/.ssh/authorized_keys`, keyData: p.sshPublicKey }] },
      };
      if (p.customData) osProfile.customData = btoa(unescape(encodeURIComponent(p.customData)));
    }
    vmBody.properties.osProfile = osProfile;
  }

  try {
    await arm(env, `${rgBase(env)}/providers/Microsoft.Compute/virtualMachines/${p.vmName}`, { method: 'PUT', api: API_COMPUTE, body: vmBody });
  } catch (e) {
    // The VM create failed (e.g. SKU capacity / quota) but the public IP + NIC were
    // already created. Clean them up so they don't leak — the subscription caps the
    // number of public IPs, and a retry would otherwise pile up orphans.
    await arm(env, nicPath, { method: 'DELETE', api: API_NETWORK }).catch(() => {});
    await arm(env, ipPath, { method: 'DELETE', api: API_NETWORK }).catch(() => {});
    throw e;
  }
  return { instanceId: p.vmName };
}

// ---- State --------------------------------------------------------------
export interface InstanceStatus {
  state: string;
  publicIp?: string;
  launchTime?: string;
}

// Map Azure PowerState/* codes to the legacy AWS-style states the reconciler
// expects (running | pending | stopping | stopped | terminated).
function mapPower(code?: string): string {
  switch ((code ?? '').replace('PowerState/', '')) {
    case 'running':
      return 'running';
    case 'starting':
      return 'pending';
    case 'stopping':
    case 'deallocating':
      return 'stopping';
    case 'stopped':
    case 'deallocated':
      return 'stopped';
    default:
      return 'pending';
  }
}

export async function describeInstance(env: Env, vmName: string): Promise<InstanceStatus> {
  let state = 'pending';
  try {
    const iv = await arm(env, `${rgBase(env)}/providers/Microsoft.Compute/virtualMachines/${vmName}/instanceView`, { api: API_COMPUTE });
    const statuses: any[] = iv.json?.statuses ?? [];
    state = mapPower(statuses.find((s) => String(s.code).startsWith('PowerState/'))?.code);
  } catch (e: any) {
    if (String(e.message).includes('(404)')) return { state: 'terminated' };
    throw e;
  }
  let publicIp: string | undefined;
  try {
    const ip = await arm(env, `${rgBase(env)}/providers/Microsoft.Network/publicIPAddresses/${vmName}-ip`, { api: API_NETWORK });
    publicIp = ip.json?.properties?.ipAddress || undefined;
  } catch {
    /* IP not ready yet */
  }
  return { state, publicIp };
}

// Delete the VM. NIC, public IP and OS disk cascade via deleteOption=Delete.
export async function terminateInstance(env: Env, vmName: string): Promise<void> {
  await arm(env, `${rgBase(env)}/providers/Microsoft.Compute/virtualMachines/${vmName}`, { method: 'DELETE', api: API_COMPUTE });
}

export async function startInstance(env: Env, vmName: string): Promise<void> {
  await arm(env, `${rgBase(env)}/providers/Microsoft.Compute/virtualMachines/${vmName}/start`, { method: 'POST', api: API_COMPUTE });
}

// Stop = **deallocate** (releases compute billing, like an EC2 stop).
export async function stopInstance(env: Env, vmName: string): Promise<void> {
  await arm(env, `${rgBase(env)}/providers/Microsoft.Compute/virtualMachines/${vmName}/deallocate`, { method: 'POST', api: API_COMPUTE });
}

export async function rebootInstance(env: Env, vmName: string): Promise<void> {
  await arm(env, `${rgBase(env)}/providers/Microsoft.Compute/virtualMachines/${vmName}/restart`, { method: 'POST', api: API_COMPUTE });
}

// Apply a first-boot PowerShell script to a Windows VM via the CustomScript
// extension (hardening + course tools). Linux uses cloud-init customData instead;
// Windows customData is not auto-executed, so the reconciler calls this once the
// VM is up. Idempotent on the extension name.
export async function applyWindowsScript(env: Env, vmName: string, script: string): Promise<void> {
  await arm(env, `${rgBase(env)}/providers/Microsoft.Compute/virtualMachines/${vmName}/extensions/gitvmSetup`, {
    method: 'PUT',
    api: API_COMPUTE,
    body: {
      location: env.AZURE_LOCATION,
      properties: {
        publisher: 'Microsoft.Compute',
        type: 'CustomScriptExtension',
        typeHandlerVersion: '1.10',
        autoUpgradeMinorVersion: true,
        protectedSettings: { commandToExecute: `powershell -ExecutionPolicy Bypass -EncodedCommand ${psEncoded(script)}` },
      },
    },
  });
}

// UTF-16LE + base64 for PowerShell -EncodedCommand (avoids quoting headaches).
function psEncoded(script: string): string {
  let bin = '';
  for (let i = 0; i < script.length; i++) {
    const c = script.charCodeAt(i);
    bin += String.fromCharCode(c & 0xff, (c >> 8) & 0xff);
  }
  return btoa(bin);
}

// ---- Snapshots (managed disk) ------------------------------------------
export interface RootVolume {
  volumeId?: string;
  rootDevice?: string;
  architecture?: string;
  sizeGb?: number;
}

// The VM's OS managed-disk id (+ size) — for snapshot and restore.
export async function describeRootVolume(env: Env, vmName: string): Promise<RootVolume> {
  const vm = await arm(env, `${rgBase(env)}/providers/Microsoft.Compute/virtualMachines/${vmName}`, { api: API_COMPUTE });
  const osDisk = vm.json?.properties?.storageProfile?.osDisk;
  return { volumeId: osDisk?.managedDisk?.id, rootDevice: osDisk?.name ?? null, architecture: 'x86_64', sizeGb: osDisk?.diskSizeGB };
}

export async function createSnapshot(env: Env, diskId: string, description: string): Promise<string> {
  const name = `gitvm-snap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  await arm(env, `${rgBase(env)}/providers/Microsoft.Compute/snapshots/${name}`, {
    method: 'PUT',
    api: API_COMPUTE,
    body: {
      location: env.AZURE_LOCATION,
      properties: { creationData: { createOption: 'Copy', sourceResourceId: diskId } },
      tags: { 'managed-by': 'git-vm-portal', description: description.slice(0, 255) },
    },
  });
  return name;
}

// state: pending | completed | error ; plus diskSizeGB when available.
export async function describeSnapshot(env: Env, name: string): Promise<{ state: string; sizeGb?: number }> {
  const s = await arm(env, `${rgBase(env)}/providers/Microsoft.Compute/snapshots/${name}`, { api: API_COMPUTE });
  const prov = s.json?.properties?.provisioningState;
  const state = prov === 'Succeeded' ? 'completed' : prov === 'Failed' ? 'error' : 'pending';
  return { state, sizeGb: s.json?.properties?.diskSizeGB };
}

export async function deleteSnapshot(env: Env, name: string): Promise<void> {
  await arm(env, `${rgBase(env)}/providers/Microsoft.Compute/snapshots/${name}`, { method: 'DELETE', api: API_COMPUTE }).catch(() => {});
}

// "Register image from snapshot" -> on Azure: create a managed disk copied from
// the snapshot and return its id; the caller attaches it as the VM's OS disk.
export async function registerImageFromSnapshot(env: Env, name: string, snapshotName: string, _rootDevice: string, _architecture: string): Promise<string> {
  const snapId = `${rgBase(env)}/providers/Microsoft.Compute/snapshots/${snapshotName}`;
  const diskName = `gitvm-restore-${name}-${Math.random().toString(36).slice(2, 6)}`.slice(0, 80);
  const r = await arm(env, `${rgBase(env)}/providers/Microsoft.Compute/disks/${diskName}`, {
    method: 'PUT',
    api: API_COMPUTE,
    body: {
      location: env.AZURE_LOCATION,
      properties: { creationData: { createOption: 'Copy', sourceResourceId: snapId } },
      tags: { 'managed-by': 'git-vm-portal' },
    },
  });
  await waitProvisioned(env, `${rgBase(env)}/providers/Microsoft.Compute/disks/${diskName}`, API_COMPUTE);
  return r.json?.id ?? `${rgBase(env)}/providers/Microsoft.Compute/disks/${diskName}`;
}

// ---- Metrics (idle auto-stop) ------------------------------------------
// Max "Percentage CPU" over the last `minutes` from Azure Monitor, plus the
// datapoint count (so the caller can require enough history). null = no data.
export async function maxCpuOverWindow(env: Env, vmName: string, minutes: number): Promise<{ max: number; datapoints: number } | null> {
  const vmId = `${rgBase(env)}/providers/Microsoft.Compute/virtualMachines/${vmName}`;
  const end = new Date();
  const start = new Date(end.getTime() - minutes * 60_000);
  const r = await arm(env, `${ARM}${vmId}/providers/microsoft.insights/metrics`, {
    api: API_METRICS,
    query: { metricnames: 'Percentage CPU', aggregation: 'Maximum', interval: 'PT5M', timespan: `${start.toISOString()}/${end.toISOString()}` },
  });
  const data: any[] = r.json?.value?.[0]?.timeseries?.[0]?.data ?? [];
  const vals = data.map((d) => d.maximum).filter((n) => typeof n === 'number');
  if (!vals.length) return null;
  return { max: Math.max(...vals), datapoints: vals.length };
}

// ---- Real spend (admin cost dashboard) ---------------------------------
// Azure Cost Management query (daily, grouped by service) for [start, end).
// Dates are YYYY-MM-DD; End is exclusive. Throws if the API is denied -> the
// dashboard falls back to estimate-only.
export async function costExplorer(
  env: Env,
  start: string,
  end: string
): Promise<{ daily: { date: string; amount: number }[]; total: number; byService: { service: string; amount: number }[] }> {
  const scope = `/subscriptions/${env.AZURE_SUBSCRIPTION_ID}`;
  const r = await arm(env, `${ARM}${scope}/providers/Microsoft.CostManagement/query`, {
    method: 'POST',
    api: API_COST,
    body: {
      type: 'ActualCost',
      timeframe: 'Custom',
      timePeriod: { from: `${start}T00:00:00Z`, to: `${end}T00:00:00Z` },
      dataset: {
        granularity: 'Daily',
        aggregation: { totalCost: { name: 'Cost', function: 'Sum' } },
        grouping: [{ type: 'Dimension', name: 'ServiceName' }],
      },
    },
  });
  const cols: string[] = (r.json?.properties?.columns ?? []).map((c: any) => c.name);
  const idx = (n: string) => cols.indexOf(n);
  const rows: any[] = r.json?.properties?.rows ?? [];
  const dailyMap: Record<string, number> = {};
  const svc: Record<string, number> = {};
  for (const row of rows) {
    const amt = Number(row[idx('Cost')]) || 0;
    const d = String(row[idx('UsageDate')]);
    const date = d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d;
    dailyMap[date] = (dailyMap[date] ?? 0) + amt;
    const k = (row[idx('ServiceName')] ?? 'Autre').toString().replace(/^Microsoft\.?/, '');
    svc[k] = (svc[k] ?? 0) + amt;
  }
  const daily = Object.entries(dailyMap).map(([date, amount]) => ({ date, amount })).sort((a, b) => a.date.localeCompare(b.date));
  const total = daily.reduce((a, d) => a + d.amount, 0);
  const byService = Object.entries(svc).map(([service, amount]) => ({ service, amount })).filter((s) => s.amount > 0.0001).sort((a, b) => b.amount - a.amount);
  return { daily, total, byService };
}

// ---- Reconciliation -----------------------------------------------------
// All portal-managed VMs in the resource group -> { vmName: state } (one call,
// instanceView expanded). Filtered by the managed-by tag.
export async function listManagedInstances(env: Env): Promise<Record<string, string>> {
  const r = await arm(env, `${rgBase(env)}/providers/Microsoft.Compute/virtualMachines`, { api: API_COMPUTE, query: { $expand: 'instanceView' } });
  const out: Record<string, string> = {};
  for (const vm of r.json?.value ?? []) {
    if (vm.tags?.['managed-by'] !== 'git-vm-portal') continue;
    const statuses: any[] = vm.properties?.instanceView?.statuses ?? [];
    out[vm.name] = mapPower(statuses.find((s) => String(s.code).startsWith('PowerState/'))?.code);
  }
  return out;
}
