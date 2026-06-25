import type { ImageRef } from './azure';

// A VM request is composed of three independent choices:
//   performance (Azure VM size) × storage (managed disk) × OS (Marketplace image).
// Prices are approximate pay-as-you-go rates for switzerlandnorth, USD.
// ⚠️ The subscription ("Azure for Students") caps the region at **6 vCPU total**
// and gives **0 quota to v5/v6 families** — so every size here is ≤ 4 vCPU and
// uses Bs / Dsv3 / Fsv2 / Esv3. The cost estimate + idle auto-stop keep spend low.

export interface PerfPreset {
  id: string;
  label: string;
  /** Azure VM size, e.g. Standard_B2s. */
  size: string;
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
  /** Azure managed-disk SKU. Default StandardSSD_LRS. */
  diskSku?: 'StandardSSD_LRS' | 'Standard_LRS' | 'Premium_LRS';
  /** $/GB-month for this SKU (overrides the global rate in cost estimates). */
  usdGbMonth?: number;
  description?: string;
  recommended?: boolean;
  hidden?: boolean;
}
export interface OsPreset {
  id: string;
  label: string;
  /** Distribution family — drives the icon/colour in the picker. */
  family: 'ubuntu' | 'debian' | 'azurelinux' | 'windows';
  /** Azure Marketplace image reference. */
  image: ImageRef;
  /** Admin user created by Azure at provisioning (SSH login, or RDP user on Windows). */
  sshUser: string;
  /** How the user connects to the machine. */
  connect: 'ssh' | 'rdp';
  description?: string;
  recommended?: boolean;
  /** Minimum root disk for this OS (the Marketplace image's own OS-disk size). */
  minStorageGb?: number;
  hidden?: boolean;
}

// Azure VM sizes, capped at 4 vCPU (6-core regional quota). ⚠️ The "Azure for
// Students" subscription BLOCKS the B-series, F-series and 1-vCPU SKUs everywhere
// (NotAvailableForSubscription) — only Dsv3 / Dasv4 / Esv3 (and similar) are
// deployable in switzerlandnorth. So the catalogue starts at 2 vCPU. Each visible
// entry has a DISTINCT size. Prices are approximate switzerlandnorth Linux rates
// (USD/h); Windows costs more (license) — the real figure comes from the Cost
// Management dashboard. Admin user for Linux is "azureuser", Windows "azureadmin".
export const PERF: Record<string, PerfPreset> = {
  micro: { id: 'micro', label: 'Éco (AMD)', size: 'Standard_D2as_v4', vcpu: 2, ramGb: 8, hourlyUsd: 0.086, description: 'Entrée de gamme AMD — 2 vCPU / 8 Go, bon rapport prix/perf.' },
  small: { id: 'small', label: 'Standard', size: 'Standard_D2s_v3', vcpu: 2, ramGb: 8, hourlyUsd: 0.096, description: '2 vCPU / 8 Go à performance constante — dev, la plupart des cours.', recommended: true },
  medium: { id: 'medium', label: 'Mémoire', size: 'Standard_E2s_v3', vcpu: 2, ramGb: 16, hourlyUsd: 0.126, description: 'Optimisé mémoire 2 vCPU / 16 Go (bases de données, cache).' },
  large: { id: 'large', label: 'Large', size: 'Standard_D4s_v3', vcpu: 4, ramGb: 16, hourlyUsd: 0.192, description: '4 vCPU / 16 Go — bureaux, applis plus lourdes.' },
  balanced: { id: 'balanced', label: 'Large (AMD)', size: 'Standard_D4as_v4', vcpu: 4, ramGb: 16, hourlyUsd: 0.172, description: '4 vCPU / 16 Go AMD — alternative économique.' },
  memory: { id: 'memory', label: 'Mémoire L', size: 'Standard_E4s_v3', vcpu: 4, ramGb: 32, hourlyUsd: 0.252, description: 'Optimisé mémoire 4 vCPU / 32 Go.' },
  // Masqué : pas de SKU compute-optimisé (Fsv2) disponible sur ce compte — remappé.
  compute: { id: 'compute', label: 'Compute', size: 'Standard_D2s_v3', vcpu: 2, ramGb: 8, hourlyUsd: 0.096, hidden: true },
};

// Azure managed disks: StandardSSD_LRS (general purpose, default), Standard_LRS
// (HDD, cheapest), Premium_LRS (high performance SSD). ⚠️ The disk is billed even
// when the VM is deallocated, and Azure rounds the size up to the next tier. The
// Marketplace OS-disk size is the floor (Linux ≈ 30 Go, Windows ≈ 128 Go).
export const STORAGE: Record<string, StoragePreset> = {
  s30: { id: 's30', label: '30 Go · SSD Standard', sizeGb: 30, diskSku: 'StandardSSD_LRS', usdGbMonth: 0.075, description: 'Confort — minimum Linux.', recommended: true },
  s50: { id: 's50', label: '50 Go · SSD Standard', sizeGb: 50, diskSku: 'StandardSSD_LRS', usdGbMonth: 0.075 },
  s100: { id: 's100', label: '100 Go · SSD Standard', sizeGb: 100, diskSku: 'StandardSSD_LRS', usdGbMonth: 0.075 },
  s128: { id: 's128', label: '128 Go · SSD Standard', sizeGb: 128, diskSku: 'StandardSSD_LRS', usdGbMonth: 0.075, description: 'Requis pour Windows.' },
  s200: { id: 's200', label: '200 Go · SSD Standard', sizeGb: 200, diskSku: 'StandardSSD_LRS', usdGbMonth: 0.075 },
  hdd32: { id: 'hdd32', label: '32 Go · HDD (éco)', sizeGb: 32, diskSku: 'Standard_LRS', usdGbMonth: 0.045, description: 'Disque magnétique économique (Linux).' },
  prem128: { id: 'prem128', label: '128 Go · SSD Premium (haute perf)', sizeGb: 128, diskSku: 'Premium_LRS', usdGbMonth: 0.135, description: 'SSD Premium à faible latence (Windows / I/O intensives).' },
  prem256: { id: 'prem256', label: '256 Go · SSD Premium (haute perf)', sizeGb: 256, diskSku: 'Premium_LRS', usdGbMonth: 0.135 },
};

// Azure Marketplace images verified in switzerlandnorth (scripts/azure-images.mjs).
// All Gen2 (hyperVGeneration V2) — compatible with the Bs/Dsv3/Fsv2/Esv3 sizes.
export const OS: Record<string, OsPreset> = {
  ubuntu2404: { id: 'ubuntu2404', label: 'Ubuntu 24.04 LTS', family: 'ubuntu', image: { publisher: 'Canonical', offer: 'ubuntu-24_04-lts', sku: 'server', version: 'latest' }, sshUser: 'azureuser', connect: 'ssh', description: 'La distribution Linux la plus répandue. Idéale pour débuter.', recommended: true, minStorageGb: 30 },
  debian12: { id: 'debian12', label: 'Debian 12 (Bookworm)', family: 'debian', image: { publisher: 'Debian', offer: 'debian-12', sku: '12-gen2', version: 'latest' }, sshUser: 'azureuser', connect: 'ssh', description: 'Stable et légère, la référence des serveurs.', minStorageGb: 30 },
  azurelinux3: { id: 'azurelinux3', label: 'Azure Linux 3', family: 'azurelinux', image: { publisher: 'MicrosoftCBLMariner', offer: 'azure-linux-3', sku: 'azure-linux-3-gen2', version: 'latest' }, sshUser: 'azureuser', connect: 'ssh', description: 'Distribution Linux de Microsoft (base RHEL, paquets tdnf), optimisée Azure.', minStorageGb: 30 },
  windows2022: { id: 'windows2022', label: 'Windows Server 2022', family: 'windows', image: { publisher: 'MicrosoftWindowsServer', offer: 'WindowsServer', sku: '2022-datacenter-azure-edition', version: 'latest' }, sshUser: 'azureadmin', connect: 'rdp', minStorageGb: 128, description: 'Édition serveur : rôles, services, Active Directory, IIS. Accès RDP.' },
  // « Poste de travail » : Windows Server 2022 avec expérience Bureau (GUI complet via RDP).
  // Azure ne propose Windows 11 qu'en SKU Enterprise (licence non éligible sur compte Students).
  windowsDesktop: { id: 'windowsDesktop', label: 'Windows · Poste de travail', family: 'windows', image: { publisher: 'MicrosoftWindowsServer', offer: 'WindowsServer', sku: '2022-datacenter-azure-edition', version: 'latest' }, sshUser: 'azureadmin', connect: 'rdp', minStorageGb: 128, description: 'Bureau Windows complet (Windows Server 2022, expérience Bureau) pour usage utilisateur. Accès RDP.' },
};

// Bundles d'outils par cours, préinstallés sur la VM au premier démarrage via
// cloud-init (Linux). MULTI-DISTRO : le header détecte apt / dnf / yum / tdnf
// (Ubuntu/Debian, Azure Linux) et expose `pm` qui installe chaque paquet
// individuellement, tolérant. Les gros outils cloud/devops passent par leurs
// installeurs officiels (binaires). Windows = Chocolatey (buildWindowsCourseInstall).
export interface CoursePreset {
  id: string;
  label: string;
  description: string;
  tools: string[];
  install: string;
}

export const COURSE_SCRIPT_HEADER = [
  '#!/bin/bash',
  'set -x',
  'if command -v apt-get >/dev/null 2>&1; then',
  '  export DEBIAN_FRONTEND=noninteractive; apt-get update -y || true',
  '  pm() { for p in "$@"; do apt-get install -y "$p" || true; done; }',
  'elif command -v tdnf >/dev/null 2>&1; then',
  '  pm() { for p in "$@"; do tdnf install -y "$p" || true; done; }',
  'elif command -v dnf >/dev/null 2>&1; then',
  '  dnf install -y dnf-plugins-core || true',
  '  pm() { for p in "$@"; do dnf install -y "$p" || true; done; }',
  'elif command -v yum >/dev/null 2>&1; then',
  '  pm() { for p in "$@"; do yum install -y "$p" || true; done; }',
  'else',
  '  pm() { :; }',
  'fi',
].join('\n');

// Cross-distro installers (apt, dnf & tdnf systems, x86_64).
const DOCKER = 'curl -fsSL https://get.docker.com | sh || true';
const KUBECTL = 'curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && install -m 0755 kubectl /usr/local/bin/kubectl || true';
const HELM = 'curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash || true';
const MINIKUBE = 'curl -Lo /usr/local/bin/minikube https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64 && chmod +x /usr/local/bin/minikube || true';
const TERRAFORM = 'pm unzip; curl -fsSL https://releases.hashicorp.com/terraform/1.9.8/terraform_1.9.8_linux_amd64.zip -o /tmp/tf.zip && unzip -o /tmp/tf.zip -d /usr/local/bin/ || true';
const AWSCLI = 'pm unzip; curl -s "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/aws.zip && unzip -q /tmp/aws.zip -d /tmp && /tmp/aws/install || true';
const GCLOUD = 'curl -sSL https://sdk.cloud.google.com | bash || true';
const NODE = 'if command -v apt-get >/dev/null 2>&1; then curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - && apt-get install -y nodejs; else curl -fsSL https://rpm.nodesource.com/setup_lts.x | bash - && (tdnf install -y nodejs || dnf install -y nodejs || yum install -y nodejs); fi || true';
const AZURE = 'if command -v apt-get >/dev/null 2>&1; then curl -sL https://aka.ms/InstallAzureCLIDeb | bash; else (tdnf install -y azure-cli || (rpm --import https://packages.microsoft.com/keys/microsoft.asc && dnf install -y https://packages.microsoft.com/config/rhel/9/packages-microsoft-prod.rpm && dnf install -y azure-cli)); fi || true';
const pip = (pkgs: string) => `python3 -m pip install --break-system-packages ${pkgs} 2>/dev/null || python3 -m pip install ${pkgs} || true`;

export const COURSES: Record<string, CoursePreset> = {
  cloud: {
    id: 'cloud',
    label: 'Cloud & DevOps',
    description: 'Azure CLI, AWS CLI, Google Cloud CLI, Terraform, kubectl, Docker, Helm, Ansible.',
    tools: ['Azure CLI', 'AWS CLI', 'gcloud', 'Terraform', 'kubectl', 'Docker', 'Helm', 'Ansible'],
    install: [
      'pm git curl unzip ca-certificates python3 python3-pip',
      DOCKER, AZURE, AWSCLI, GCLOUD, TERRAFORM, KUBECTL, HELM,
      `pm ansible; command -v ansible >/dev/null 2>&1 || ${pip('ansible')}`,
    ].join('\n'),
  },
  web: {
    id: 'web',
    label: 'Développement Web',
    description: 'Node.js LTS, npm, Git, Nginx, Python 3, build-essential.',
    tools: ['Node.js LTS', 'npm', 'Git', 'Nginx', 'Python 3', 'build-essential'],
    install: [
      'pm git nginx python3 python3-pip build-essential gcc gcc-c++ make',
      NODE,
    ].join('\n'),
  },
  data: {
    id: 'data',
    label: 'Data Science & IA',
    description: 'Python 3, Jupyter, NumPy, pandas, matplotlib, scikit-learn, R.',
    tools: ['Python 3', 'Jupyter', 'NumPy', 'pandas', 'matplotlib', 'scikit-learn', 'R'],
    install: [
      'pm python3 python3-pip python3-venv r-base R',
      pip('jupyter numpy pandas matplotlib scikit-learn seaborn'),
    ].join('\n'),
  },
  containers: {
    id: 'containers',
    label: 'Conteneurs & Kubernetes',
    description: 'Docker, kubectl, minikube, Helm, k9s.',
    tools: ['Docker', 'kubectl', 'minikube', 'Helm', 'k9s'],
    install: [DOCKER, KUBECTL, MINIKUBE, HELM].join('\n'),
  },
  cyber: {
    id: 'cyber',
    label: 'Cybersécurité',
    description: 'nmap, tshark, hydra, john, tcpdump, nikto, net-tools, whois, dnsutils.',
    tools: ['nmap', 'tshark', 'hydra', 'john', 'tcpdump', 'nikto', 'net-tools', 'whois'],
    install: ['pm nmap tshark wireshark-cli hydra john tcpdump nikto net-tools whois dnsutils bind-utils'].join('\n'),
  },
  db: {
    id: 'db',
    label: 'Bases de données',
    description: 'PostgreSQL, MariaDB (MySQL), Redis, SQLite.',
    tools: ['PostgreSQL', 'MariaDB', 'Redis', 'SQLite'],
    install: ['pm postgresql postgresql-server mariadb-server mariadb redis redis-server sqlite sqlite3'].join('\n'),
  },
  sysadmin: {
    id: 'sysadmin',
    label: 'Système & Réseau',
    description: 'net-tools, tcpdump, nmap, htop, tmux, rsync, iperf3, traceroute, vim.',
    tools: ['net-tools', 'tcpdump', 'nmap', 'htop', 'tmux', 'rsync', 'iperf3', 'traceroute'],
    install: ['pm net-tools tcpdump nmap htop tmux rsync openssh-client openssh-clients iperf3 traceroute vim'].join('\n'),
  },
  cpp: {
    id: 'cpp',
    label: 'Programmation C / C++',
    description: 'gcc, g++, gdb, make, cmake, valgrind, build-essential.',
    tools: ['gcc', 'g++', 'gdb', 'make', 'cmake', 'valgrind'],
    install: ['pm build-essential gcc gcc-c++ make gdb cmake valgrind'].join('\n'),
  },
  java: {
    id: 'java',
    label: 'Java',
    description: 'OpenJDK 17, Maven, Gradle.',
    tools: ['OpenJDK 17', 'Maven', 'Gradle'],
    install: ['pm openjdk-17-jdk java-17-openjdk java-17-openjdk-devel maven gradle'].join('\n'),
  },
  python: {
    id: 'python',
    label: 'Python',
    description: 'Python 3, pip, venv, pipx, IPython, Jupyter.',
    tools: ['Python 3', 'pip', 'venv', 'pipx', 'IPython', 'Jupyter'],
    install: [
      'pm python3 python3-pip python3-venv pipx',
      pip('ipython jupyter'),
    ].join('\n'),
  },
};

export const isValidCourse = (id: string) => id === '' || Object.prototype.hasOwnProperty.call(COURSES, id);

// The `course` field holds a comma-separated list of course ids (multi-select).
// '' = none. Order preserved, blanks dropped.
export function parseCourses(csv: string | null | undefined): string[] {
  return (csv ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}
export const isValidCourses = (csv: string) =>
  parseCourses(csv).every((id) => Object.prototype.hasOwnProperty.call(COURSES, id));

// cloud-init customData installing the selected courses' tools (Linux only).
// undefined if none. Several courses → one header + their install blocks concatenated.
export function buildCourseUserData(courseCsv: string | null | undefined): string | undefined {
  const ids = parseCourses(courseCsv).filter((id) => COURSES[id]);
  if (!ids.length) return undefined;
  const install = ids.map((id) => COURSES[id].install).join('\n');
  return `${COURSE_SCRIPT_HEADER}\n${install}\n`;
}

// Windows (Chocolatey) package mapping per course — best effort equivalents.
const COURSE_WIN: Record<string, string> = {
  cloud: 'git azure-cli awscli gcloudsdk terraform kubernetes-cli kubernetes-helm docker-cli docker-engine',
  web: 'git nodejs-lts nginx python',
  data: 'python r.project',
  containers: 'docker-cli docker-engine kubernetes-cli minikube kubernetes-helm',
  cyber: 'nmap wireshark',
  db: 'postgresql sqlite',
  sysadmin: 'nmap wireshark putty sysinternals',
  cpp: 'mingw cmake',
  java: 'temurin17 maven gradle',
  python: 'python',
};

// PowerShell that installs Chocolatey then the selected courses' tools (Windows).
// undefined if none. Several courses → union of their package lists (deduped).
export function buildWindowsCourseInstall(courseCsv: string | null | undefined): string | undefined {
  const ids = parseCourses(courseCsv).filter((id) => COURSE_WIN[id]);
  if (!ids.length) return undefined;
  const pkgs = [...new Set(ids.flatMap((id) => COURSE_WIN[id].split(/\s+/)).filter(Boolean))].join(' ');
  return [
    'Set-ExecutionPolicy Bypass -Scope Process -Force',
    '[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072',
    "iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))",
    `choco install -y --no-progress ${pkgs}`,
  ].join('\n');
}

export const STORAGE_USD_GB_MONTH = 0.075; // StandardSSD_LRS, switzerlandnorth (approx)
const HOURS_PER_MONTH = 730;

export const isValidPerf = (id: string) => Object.prototype.hasOwnProperty.call(PERF, id);
export const isValidStorage = (id: string) => Object.prototype.hasOwnProperty.call(STORAGE, id);
export const isValidOs = (id: string) => Object.prototype.hasOwnProperty.call(OS, id);

// Approximate monthly cost if the VM runs 24/7.
export function estimateMonthlyUsd(perfId: string, storageId: string): number {
  const p = PERF[perfId];
  const s = STORAGE[storageId];
  if (!p || !s) return 0;
  return p.hourlyUsd * HOURS_PER_MONTH + s.sizeGb * (s.usdGbMonth ?? STORAGE_USD_GB_MONTH);
}
