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
}
export interface StoragePreset {
  id: string;
  label: string;
  sizeGb: number;
  description?: string;
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

export const PERF: Record<string, PerfPreset> = {
  micro: { id: 'micro', label: 'Micro', instanceType: 't3.micro', vcpu: 2, ramGb: 1, hourlyUsd: 0.0136, description: 'Tests légers, scripts, apprentissage.' },
  eco: { id: 'eco', label: 'Eco', instanceType: 't3.small', vcpu: 2, ramGb: 2, hourlyUsd: 0.027, description: 'Petits services, environnements de dev.' },
  std: { id: 'std', label: 'Standard', instanceType: 't3.medium', vcpu: 2, ramGb: 4, hourlyUsd: 0.054, description: 'Polyvalent — bon défaut pour la plupart des cours.', recommended: true },
  perf: { id: 'perf', label: 'Performance', instanceType: 't3.large', vcpu: 2, ramGb: 8, hourlyUsd: 0.107, description: 'Compilation, conteneurs, charges moyennes.' },
  pro: { id: 'pro', label: 'Pro', instanceType: 't3.xlarge', vcpu: 4, ramGb: 16, hourlyUsd: 0.214, description: 'Bases de données, builds lourds, multitâche.' },
  max: { id: 'max', label: 'Max', instanceType: 't3.2xlarge', vcpu: 8, ramGb: 32, hourlyUsd: 0.4288, description: 'Data, ML léger, environnements exigeants.' },
};

export const STORAGE: Record<string, StoragePreset> = {
  s20: { id: 's20', label: '20 Go SSD', sizeGb: 20, description: 'Suffisant pour un OS Linux + outils.' },
  s50: { id: 's50', label: '50 Go SSD', sizeGb: 50, description: 'Confortable, recommandé par défaut.' },
  s100: { id: 's100', label: '100 Go SSD', sizeGb: 100, description: 'Projets avec données / conteneurs.' },
  s250: { id: 's250', label: '250 Go SSD', sizeGb: 250, description: 'Gros jeux de données, médias.' },
  s500: { id: 's500', label: '500 Go SSD', sizeGb: 500, description: 'Stockage important, archives.' },
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
