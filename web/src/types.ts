export type Role = 'member' | 'formateur' | 'admin';

export interface User {
  email: string;
  name: string;
  role: Role;
}

export interface PerfPreset {
  id: string;
  label: string;
  size: string; // Azure VM size, e.g. Standard_B2s
  vcpu: number;
  ramGb: number;
  hourlyUsd: number;
  description?: string;
  recommended?: boolean;
  hidden?: boolean;
}
export interface StoragePreset {
  id: string;
  label: string;
  sizeGb: number;
  diskSku?: 'StandardSSD_LRS' | 'Standard_LRS' | 'Premium_LRS';
  usdGbMonth?: number;
  description?: string;
  recommended?: boolean;
  hidden?: boolean;
}
export type OsFamily = 'ubuntu' | 'debian' | 'azurelinux' | 'windows';
export interface ImageRef {
  publisher: string;
  offer: string;
  sku: string;
  version: string;
}
export interface OsPreset {
  id: string;
  label: string;
  family: OsFamily;
  image: ImageRef;
  sshUser: string;
  connect: 'ssh' | 'rdp';
  description?: string;
  recommended?: boolean;
  minStorageGb?: number;
  hidden?: boolean;
}

export interface CoursePreset {
  id: string;
  label: string;
  description: string;
  tools: string[];
}
export interface PresetCatalog {
  perf: PerfPreset[];
  storage: StoragePreset[];
  os: OsPreset[];
  courses: CoursePreset[];
  storageUsdGbMonth: number;
  region: string;
  grafanaUrl?: string;
}

export type Status =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'provisioning'
  | 'active'
  | 'stopped'
  | 'failed'
  | 'terminated'
  | 'expired';

export interface AdminUser {
  email: string;
  name: string | null;
  role: Role;
  created_at: string;
}
export interface Comment {
  id: number;
  author: string;
  body: string;
  created_at: string;
}
export interface Metrics {
  total: number;
  successRate: number;
  failed: number;
  avgProvisionSeconds: number;
}
export interface CostData {
  real: { daily: { date: string; amount: number }[]; total: number; byService: { service: string; amount: number }[] } | null;
  estimated: {
    total: number; vmHours: number; active: number; terminated: number; count: number;
    perVm: { id: number; name: string | null; owner: string; os: string | null; hours: number; cost: number; active: boolean }[];
    byOs: { os: string; cost: number }[];
    byUser: { user: string; cost: number }[];
  };
  budget: number;
  forecast: number | null;
}
export interface AuditEntry {
  id: number;
  actor: string;
  action: string;
  target: string | null;
  detail: string | null;
  created_at: string;
}
export interface Notification {
  id: number;
  type: string;
  link: string | null;
  read: number;
  created_at: string;
}
export interface Snapshot {
  id: number;
  request_id: number | null;
  aws_snapshot_id: string | null;
  description: string | null;
  size_gb: number | null;
  status: string;
  ova_status: string | null;
  ova_url: string | null;
  os: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface VmRequest {
  id: number;
  user_email: string;
  name: string | null;
  purpose: string;
  preset: string; // performance preset id
  storage: string | null;
  os: string | null;
  region: string;
  status: Status;
  course?: string | null;
  course_ready_at?: string | null;
  group_id?: string | null;
  group_name?: string | null;
  snapshot_on_delete?: number;
  admin_note: string | null;
  decided_by: string | null;
  created_at: string;
  decided_at: string | null;
  start_date: string | null;
  end_date: string | null;
  expired_at: string | null;
  ext_requested_end?: string | null;
  ext_requested_at?: string | null;
  schedule_enabled?: number;
  schedule_start?: string | null;
  schedule_stop?: string | null;
  schedule_days?: string | null;
  schedule_paused?: number;
  public_ip?: string | null;
  ssh_key_name?: string | null;
  ssh_user?: string | null;
  aws_instance_id?: string | null;
  vm_state?: string | null;
  has_key?: number;
  connect_method?: string | null;
  has_password?: number;
}
