// A VM request is composed of three independent choices:
//   performance (instance type) × storage (disk) × OS (AMI).
// Prices are approximate on-demand rates for eu-central-2 (Zurich), USD.

export interface PerfPreset {
  id: string;
  label: string;
  instanceType: string;
  vcpu: number;
  ramGb: number;
  hourlyUsd: number;
  description?: string;
  recommended?: boolean;
  /** Kept for resolving existing requests but hidden from the picker. */
  hidden?: boolean;
}
export interface StoragePreset {
  id: string;
  label: string;
  sizeGb: number;
  description?: string;
  recommended?: boolean;
  hidden?: boolean;
}
export interface OsPreset {
  id: string;
  label: string;
  /** Distribution family — drives the icon/colour in the picker. */
  family: 'ubuntu' | 'debian' | 'amazon' | 'rocky' | 'alma' | 'windows';
  ami: string;
  /** Login user for SSH. For Windows this is the RDP user (Administrator). */
  sshUser: string;
  /** How the user connects to the machine. */
  connect: 'ssh' | 'rdp';
  description?: string;
  recommended?: boolean;
  /** Minimum root disk for this OS (Windows needs ≥ 30 Go). */
  minStorageGb?: number;
  /** Kept for resolving existing requests but hidden from the picker. */
  hidden?: boolean;
}

// Free-Tier only: the AWS account is restricted to free-tier-eligible instance
// types (verified via scripts/aws-freetier.mjs). x86_64 only (our AMIs are x86_64,
// so the t4g/ARM free types are excluded). Legacy ids are kept hidden and remapped
// to a free-tier type so existing requests still provision.
export const PERF: Record<string, PerfPreset> = {
  micro: { id: 'micro', label: 'Micro', instanceType: 't3.micro', vcpu: 2, ramGb: 1, hourlyUsd: 0.0136, description: 'Free Tier — tests légers, scripts, apprentissage.' },
  small: { id: 'small', label: 'Small', instanceType: 't3.small', vcpu: 2, ramGb: 2, hourlyUsd: 0.0272, description: 'Free Tier — petits services, dev, la plupart des cours.', recommended: true },
  flex: { id: 'flex', label: 'Flex', instanceType: 'c7i-flex.large', vcpu: 2, ramGb: 4, hourlyUsd: 0.0907, description: 'Free Tier — 4 Go, plus confortable (Windows, conteneurs).' },
  // Legacy (hidden) — remappés vers un type Free Tier pour les demandes existantes.
  eco: { id: 'eco', label: 'Eco', instanceType: 't3.small', vcpu: 2, ramGb: 2, hourlyUsd: 0.0272, hidden: true },
  std: { id: 'std', label: 'Standard', instanceType: 't3.small', vcpu: 2, ramGb: 2, hourlyUsd: 0.0272, hidden: true },
  perf: { id: 'perf', label: 'Performance', instanceType: 'c7i-flex.large', vcpu: 2, ramGb: 4, hourlyUsd: 0.0907, hidden: true },
  pro: { id: 'pro', label: 'Pro', instanceType: 'c7i-flex.large', vcpu: 2, ramGb: 4, hourlyUsd: 0.0907, hidden: true },
  max: { id: 'max', label: 'Max', instanceType: 'c7i-flex.large', vcpu: 2, ramGb: 4, hourlyUsd: 0.0907, hidden: true },
};

// Free-Tier EBS = 30 Go. On reste ≤ 30 Go ; les tailles supérieures (payantes) sont
// conservées masquées pour résoudre les demandes existantes.
export const STORAGE: Record<string, StoragePreset> = {
  s20: { id: 's20', label: '20 Go SSD', sizeGb: 20, description: 'Free Tier — suffisant pour un OS Linux + outils.' },
  s30: { id: 's30', label: '30 Go SSD', sizeGb: 30, description: 'Free Tier — maximum gratuit, requis pour Windows.', recommended: true },
  s50: { id: 's50', label: '50 Go SSD', sizeGb: 50, hidden: true },
  s100: { id: 's100', label: '100 Go SSD', sizeGb: 100, hidden: true },
  s250: { id: 's250', label: '250 Go SSD', sizeGb: 250, hidden: true },
  s500: { id: 's500', label: '500 Go SSD', sizeGb: 500, hidden: true },
};

// All AMIs are concrete eu-central-2 IDs verified via DescribeImages
// (scripts/aws-amis.mjs). Run that script to refresh them when they age out.
export const OS: Record<string, OsPreset> = {
  ubuntu2404: { id: 'ubuntu2404', label: 'Ubuntu 24.04 LTS', family: 'ubuntu', ami: 'ami-06d105ac7e7acb6bf', sshUser: 'ubuntu', connect: 'ssh', description: 'La distribution Linux la plus répandue. Idéale pour débuter.', recommended: true },
  debian12: { id: 'debian12', label: 'Debian 12 (Bookworm)', family: 'debian', ami: 'ami-09632a90fa7faa421', sshUser: 'admin', connect: 'ssh', description: 'Stable et légère, la référence des serveurs.' },
  al2023: { id: 'al2023', label: 'Amazon Linux 2023', family: 'amazon', ami: 'ami-0255eb7098bd657ae', sshUser: 'ec2-user', connect: 'ssh', description: 'Optimisée pour AWS, base RHEL, support long terme.' },
  rocky9: { id: 'rocky9', label: 'Rocky Linux 9', family: 'rocky', ami: 'ami-03326408f81d44297', sshUser: 'rocky', connect: 'ssh', description: 'Compatible RHEL, parfaite pour l’entreprise (dnf/yum).' },
  alma9: { id: 'alma9', label: 'AlmaLinux 9', family: 'alma', ami: 'ami-03668eab0636b8430', sshUser: 'ec2-user', connect: 'ssh', description: 'Clone RHEL communautaire, stable et pérenne.' },
  windows2022: { id: 'windows2022', label: 'Windows Server 2022', family: 'windows', ami: 'ami-0cbe390e7c8ac76e2', sshUser: 'Administrator', connect: 'rdp', minStorageGb: 30, description: 'Édition serveur : rôles, services, Active Directory, IIS. Accès RDP.' },
  // « Poste de travail » : Windows Server 2025 avec expérience Bureau (GUI complet via RDP).
  // EC2 ne propose pas de Windows 10/11 client (licence) ; le Full Base = bureau Windows utilisable.
  windowsDesktop: { id: 'windowsDesktop', label: 'Windows · Poste de travail', family: 'windows', ami: 'ami-09b747e7c8f4d2cd6', sshUser: 'Administrator', connect: 'rdp', minStorageGb: 30, description: 'Bureau Windows complet (Windows Server 2025, expérience Bureau) pour usage utilisateur. Accès RDP.' },
  // Hidden: kept so existing requests still resolve, removed from the picker
  // (Ubuntu 24.04 is the single Ubuntu choice now).
  ubuntu2204: { id: 'ubuntu2204', label: 'Ubuntu 22.04 LTS', family: 'ubuntu', ami: 'ami-0fd7f34c2a7d8427b', sshUser: 'ubuntu', connect: 'ssh', hidden: true },
};

export const STORAGE_USD_GB_MONTH = 0.0952; // gp3, eu-central-2 (approx)
const HOURS_PER_MONTH = 730;

export const isValidPerf = (id: string) => Object.prototype.hasOwnProperty.call(PERF, id);
export const isValidStorage = (id: string) => Object.prototype.hasOwnProperty.call(STORAGE, id);
export const isValidOs = (id: string) => Object.prototype.hasOwnProperty.call(OS, id);

// Approximate monthly cost if the VM runs 24/7.
export function estimateMonthlyUsd(perfId: string, storageId: string): number {
  const p = PERF[perfId];
  const s = STORAGE[storageId];
  if (!p || !s) return 0;
  return p.hourlyUsd * HOURS_PER_MONTH + s.sizeGb * STORAGE_USD_GB_MONTH;
}
