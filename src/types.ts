export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;

  // Public config (wrangler.jsonc vars)
  ALLOWED_EMAIL_DOMAINS: string; // comma-separated, e.g. "satom.ch,git.swiss"
  ADMIN_EMAILS: string; // comma-separated
  ENTRA_TENANT_ID: string;
  ENTRA_CLIENT_ID: string;

  // Azure (Resource Manager) — compute layer
  AZURE_TENANT_ID: string;
  AZURE_CLIENT_ID: string;
  AZURE_SUBSCRIPTION_ID: string;
  AZURE_LOCATION: string; // e.g. "switzerlandnorth"
  AZURE_RESOURCE_GROUP: string; // shared RG holding all portal VMs
  AZURE_SUBNET_ID: string; // full ARM resource id of the shared subnet
  AZURE_NSG_ID?: string; // optional full resource id of the shared NSG (else applied on the subnet)

  APP_URL: string;
  GRAFANA_URL?: string; // optional: link shown in the admin Monitoring tab
  MAIL_ENABLED: string; // "true" | "false"
  SCHEDULED_STOP: string; // "true" | "false" — stop running VMs at 19:00 UTC
  IDLE_STOP?: string; // "true" | "false" — auto-stop VMs idle (low CPU) for IDLE_STOP_HOURS
  IDLE_STOP_HOURS?: string; // hours of idle before auto-stop (default 3)
  HARDENING?: string; // "true" | "false" — in-VM hardening (DNS filter, P2P block, hostname lock)
  SENTRY_DSN?: string; // optional error reporting
  EMAILJS_PUBLIC_KEY: string;
  EMAILJS_SERVICE_ID: string;
  EMAILJS_TEMPLATE_ID: string;

  // Secrets (wrangler secret put ...)
  ENTRA_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  AZURE_CLIENT_SECRET: string; // service-principal secret for ARM auth
  EMAILJS_PRIVATE_KEY: string;
  CRON_SECRET?: string; // shared token for the external cron driver (POST /api/internal/cron)
  GRAFANA_TOKEN?: string; // bearer token for the /api/monitoring/* endpoints (Grafana)
}

export interface SessionUser {
  email: string;
  name: string;
  role: 'member' | 'formateur' | 'admin';
}

export interface VmRequestRow {
  id: number;
  user_email: string;
  name: string | null;
  purpose: string;
  preset: string; // performance preset id (eco/std/perf/pro)
  storage: string | null;
  os: string | null;
  region: string;
  status: string;
  course: string | null;
  course_ready_at: string | null;
  group_id: string | null;
  group_name: string | null;
  snapshot_on_delete: number;
  admin_note: string | null;
  decided_by: string | null;
  created_at: string;
  decided_at: string | null;
  start_date: string | null;
  end_date: string | null;
  expired_at: string | null;
  ext_requested_end: string | null;
  ext_requested_at: string | null;
  // auto start/stop schedule (Europe/Zurich)
  schedule_enabled?: number;
  schedule_start?: string | null;
  schedule_stop?: string | null;
  schedule_days?: string | null;
  // joined from vms (nullable)
  public_ip?: string | null;
  ssh_key_name?: string | null;
  ssh_user?: string | null;
}
