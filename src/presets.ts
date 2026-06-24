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
  /** EBS SSD volume type. Default gp3. */
  volumeType?: 'gp3' | 'gp2' | 'io1' | 'io2';
  /** Provisioned IOPS (io1/io2 only). */
  iops?: number;
  /** $/Go-mois for this type (overrides the global gp3 rate in cost estimates). */
  usdGbMonth?: number;
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

// Catalogue d'instances x86_64 (nos AMIs sont x86_64), large mais raisonnable.
// Chaque entrée visible a un instanceType DISTINCT (pas de doublon). Prix on-demand
// approximatifs eu-central-2 (Zurich), USD/h. ⚠️ Compte plafonné à 50 $ : les gros
// types coûtent vite — l'estimation de coût + l'arrêt sur inactivité sont là pour ça.
// Les ids legacy (eco/std/perf/pro/max) restent masqués pour les demandes existantes.
export const PERF: Record<string, PerfPreset> = {
  micro: { id: 'micro', label: 'Micro', instanceType: 't3.micro', vcpu: 2, ramGb: 1, hourlyUsd: 0.0136, description: 'Tests légers, scripts, apprentissage.' },
  small: { id: 'small', label: 'Small', instanceType: 't3.small', vcpu: 2, ramGb: 2, hourlyUsd: 0.0272, description: 'Petits services, dev, la plupart des cours.', recommended: true },
  medium: { id: 'medium', label: 'Medium', instanceType: 't3.medium', vcpu: 2, ramGb: 4, hourlyUsd: 0.0544, description: 'Polyvalent — 4 Go, conteneurs, Windows léger.' },
  large: { id: 'large', label: 'Large', instanceType: 't3.large', vcpu: 2, ramGb: 8, hourlyUsd: 0.1088, description: 'Burstable 8 Go — bureaux, applis plus lourdes.' },
  xlarge: { id: 'xlarge', label: 'XLarge', instanceType: 't3.xlarge', vcpu: 4, ramGb: 16, hourlyUsd: 0.2176, description: 'Burstable 4 vCPU / 16 Go.' },
  xxlarge: { id: 'xxlarge', label: '2XLarge', instanceType: 't3.2xlarge', vcpu: 8, ramGb: 32, hourlyUsd: 0.4352, description: 'Burstable 8 vCPU / 32 Go.' },
  flex: { id: 'flex', label: 'Flex (compute éco)', instanceType: 'c7i-flex.large', vcpu: 2, ramGb: 4, hourlyUsd: 0.0857, description: 'Compute économique, bon rapport prix/perf.' },
  computeXl: { id: 'computeXl', label: 'Compute XL', instanceType: 'c7i.xlarge', vcpu: 4, ramGb: 8, hourlyUsd: 0.2042, description: 'Compute optimisé 4 vCPU / 8 Go (CPU intensif).' },
  compute2xl: { id: 'compute2xl', label: 'Compute 2XL', instanceType: 'c7i.2xlarge', vcpu: 8, ramGb: 16, hourlyUsd: 0.4084, description: 'Compute optimisé 8 vCPU / 16 Go.' },
  balancedL: { id: 'balancedL', label: 'Équilibré L', instanceType: 'm7i.large', vcpu: 2, ramGb: 8, hourlyUsd: 0.1232, description: 'Usage général dernière génération, 8 Go.' },
  balancedXl: { id: 'balancedXl', label: 'Équilibré XL', instanceType: 'm7i.xlarge', vcpu: 4, ramGb: 16, hourlyUsd: 0.2464, description: 'Usage général 4 vCPU / 16 Go.' },
  memoryL: { id: 'memoryL', label: 'Mémoire L', instanceType: 'r7i.large', vcpu: 2, ramGb: 16, hourlyUsd: 0.1596, description: 'Optimisé mémoire 16 Go (bases de données, cache).' },
  memoryXl: { id: 'memoryXl', label: 'Mémoire XL', instanceType: 'r7i.xlarge', vcpu: 4, ramGb: 32, hourlyUsd: 0.3192, description: 'Optimisé mémoire 4 vCPU / 32 Go.' },
  // Legacy (masqués) — remappés pour les demandes existantes.
  eco: { id: 'eco', label: 'Eco', instanceType: 't3.small', vcpu: 2, ramGb: 2, hourlyUsd: 0.0272, hidden: true },
  std: { id: 'std', label: 'Standard', instanceType: 't3.small', vcpu: 2, ramGb: 2, hourlyUsd: 0.0272, hidden: true },
  perf: { id: 'perf', label: 'Performance', instanceType: 'c7i-flex.large', vcpu: 2, ramGb: 4, hourlyUsd: 0.0857, hidden: true },
  pro: { id: 'pro', label: 'Pro', instanceType: 'c7i-flex.large', vcpu: 2, ramGb: 4, hourlyUsd: 0.0857, hidden: true },
  max: { id: 'max', label: 'Max', instanceType: 'c7i-flex.large', vcpu: 2, ramGb: 4, hourlyUsd: 0.0857, hidden: true },
};

// Tous les types de SSD EBS proposés : gp3 (usage général, défaut), gp2 (gén.
// précédente) et io2 (IOPS provisionnées, haute performance). HDD (st1/sc1) exclus.
// ⚠️ EBS est facturé même VM arrêtée — les gros disques pèsent sur le budget 50 $.
export const STORAGE: Record<string, StoragePreset> = {
  s8: { id: 's8', label: '8 Go · gp3 SSD', sizeGb: 8, volumeType: 'gp3', usdGbMonth: 0.0952, description: 'Minimal — Linux nu.' },
  s16: { id: 's16', label: '16 Go · gp3 SSD', sizeGb: 16, volumeType: 'gp3', usdGbMonth: 0.0952, description: 'Léger — OS + quelques outils.' },
  s20: { id: 's20', label: '20 Go · gp3 SSD', sizeGb: 20, volumeType: 'gp3', usdGbMonth: 0.0952, description: 'OS Linux + outils.' },
  s30: { id: 's30', label: '30 Go · gp3 SSD', sizeGb: 30, volumeType: 'gp3', usdGbMonth: 0.0952, description: 'Confort, requis pour Windows.', recommended: true },
  s50: { id: 's50', label: '50 Go · gp3 SSD', sizeGb: 50, volumeType: 'gp3', usdGbMonth: 0.0952 },
  s100: { id: 's100', label: '100 Go · gp3 SSD', sizeGb: 100, volumeType: 'gp3', usdGbMonth: 0.0952 },
  s200: { id: 's200', label: '200 Go · gp3 SSD', sizeGb: 200, volumeType: 'gp3', usdGbMonth: 0.0952 },
  s500: { id: 's500', label: '500 Go · gp3 SSD', sizeGb: 500, volumeType: 'gp3', usdGbMonth: 0.0952 },
  gp2_30: { id: 'gp2_30', label: '30 Go · gp2 SSD', sizeGb: 30, volumeType: 'gp2', usdGbMonth: 0.119, description: 'SSD usage général (génération précédente).' },
  gp2_100: { id: 'gp2_100', label: '100 Go · gp2 SSD', sizeGb: 100, volumeType: 'gp2', usdGbMonth: 0.119, description: 'gp2 — IOPS proportionnelles à la taille.' },
  io2_50: { id: 'io2_50', label: '50 Go · io2 SSD (haute perf)', sizeGb: 50, volumeType: 'io2', iops: 3000, usdGbMonth: 0.149, description: 'IOPS provisionnées (3 000) — bases de données exigeantes.' },
  io2_100: { id: 'io2_100', label: '100 Go · io2 SSD (haute perf)', sizeGb: 100, volumeType: 'io2', iops: 5000, usdGbMonth: 0.149, description: 'IOPS provisionnées (5 000) — charges I/O intensives.' },
  s250: { id: 's250', label: '250 Go · gp3 SSD', sizeGb: 250, volumeType: 'gp3', usdGbMonth: 0.0952, hidden: true },
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

// Bundles d'outils par cours, préinstallés sur la VM via cloud-init au premier
// démarrage. MULTI-DISTRO : le header détecte apt / dnf / yum (Ubuntu/Debian ET
// Amazon Linux / Rocky / Alma) et expose `pm` qui installe chaque paquet
// individuellement, tolérant (on passe les noms apt ET dnf, le mauvais est ignoré).
// Les gros outils cloud/devops passent par leurs installeurs officiels (binaires,
// distro-agnostiques). Windows = Chocolatey (buildWindowsCourseInstall).
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
  'elif command -v dnf >/dev/null 2>&1; then',
  '  dnf install -y dnf-plugins-core || true',
  '  pm() { for p in "$@"; do dnf install -y "$p" || true; done; }',
  'elif command -v yum >/dev/null 2>&1; then',
  '  pm() { for p in "$@"; do yum install -y "$p" || true; done; }',
  'else',
  '  pm() { :; }',
  'fi',
].join('\n');

// Cross-distro installers (apt & dnf systems, x86_64).
const DOCKER = 'curl -fsSL https://get.docker.com | sh || true';
const KUBECTL = 'curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && install -m 0755 kubectl /usr/local/bin/kubectl || true';
const HELM = 'curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash || true';
const MINIKUBE = 'curl -Lo /usr/local/bin/minikube https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64 && chmod +x /usr/local/bin/minikube || true';
const TERRAFORM = 'pm unzip; curl -fsSL https://releases.hashicorp.com/terraform/1.9.8/terraform_1.9.8_linux_amd64.zip -o /tmp/tf.zip && unzip -o /tmp/tf.zip -d /usr/local/bin/ || true';
const AWSCLI = 'pm unzip; curl -s "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/aws.zip && unzip -q /tmp/aws.zip -d /tmp && /tmp/aws/install || true';
const GCLOUD = 'curl -sSL https://sdk.cloud.google.com | bash || true';
const NODE = 'if command -v apt-get >/dev/null 2>&1; then curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - && apt-get install -y nodejs; else curl -fsSL https://rpm.nodesource.com/setup_lts.x | bash - && (dnf install -y nodejs || yum install -y nodejs); fi || true';
const AZURE = 'if command -v apt-get >/dev/null 2>&1; then curl -sL https://aka.ms/InstallAzureCLIDeb | bash; else rpm --import https://packages.microsoft.com/keys/microsoft.asc && dnf install -y https://packages.microsoft.com/config/rhel/9/packages-microsoft-prod.rpm && dnf install -y azure-cli; fi || true';
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

// cloud-init user-data installing a course's tools (Linux only). undefined if no course.
export function buildCourseUserData(courseId: string | null | undefined): string | undefined {
  if (!courseId) return undefined;
  const c = COURSES[courseId];
  if (!c) return undefined;
  return `${COURSE_SCRIPT_HEADER}\n${c.install}\n`;
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

// PowerShell that installs Chocolatey then the course's tools (Windows). undefined if none.
export function buildWindowsCourseInstall(courseId: string | null | undefined): string | undefined {
  const pkgs = courseId ? COURSE_WIN[courseId] : undefined;
  if (!pkgs) return undefined;
  return [
    "Set-ExecutionPolicy Bypass -Scope Process -Force",
    "[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072",
    "iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))",
    `choco install -y --no-progress ${pkgs}`,
  ].join('\n');
}

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
  return p.hourlyUsd * HOURS_PER_MONTH + s.sizeGb * (s.usdGbMonth ?? STORAGE_USD_GB_MONTH);
}
