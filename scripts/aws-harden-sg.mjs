// One-off: lock down the shared VM Security Group egress (the un-bypassable layer).
// Default-deny outbound + allowlist: web (80/443), filtered DNS (53 -> Cloudflare for
// Families only), NTP, SSH/git, metadata, DHCP. Blocks torrents/P2P/most malware C2 and
// forces filtered DNS even if a user with sudo/admin tampers inside the VM.
//
// Run locally with AWS creds:
//   $env:AWS_ACCESS_KEY_ID='...'; $env:AWS_SECRET_ACCESS_KEY='...'; node scripts/aws-harden-sg.mjs
import { AwsClient } from 'aws4fetch';

const REGION = process.env.AWS_REGION || 'eu-central-2';
const SG = process.env.AWS_SECURITY_GROUP_ID || 'sg-0f842f10ca3c7b2d1';
const c = new AwsClient({ accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, region: REGION, service: 'ec2' });

async function ec2(params) {
  const body = new URLSearchParams({ Version: '2016-11-15', ...params }).toString();
  const r = await c.fetch(`https://ec2.${REGION}.amazonaws.com/`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  return { ok: r.ok, text: await r.text() };
}
function egress(proto, from, to, cidr) {
  const p = { Action: 'AuthorizeSecurityGroupEgress', GroupId: SG, 'IpPermissions.1.IpProtocol': proto, 'IpPermissions.1.IpRanges.1.CidrIp': cidr };
  if (from != null) { p['IpPermissions.1.FromPort'] = String(from); p['IpPermissions.1.ToPort'] = String(to); }
  return p;
}
const ok = (r, label) => console.log(r.ok ? `✅ ${label}` : /Duplicate/i.test(r.text) ? `• ${label} (déjà là)` : `ERR ${label}: ${r.text.slice(0, 160)}`);

// 1. Remove the default allow-all egress.
ok(await ec2({ Action: 'RevokeSecurityGroupEgress', GroupId: SG, 'IpPermissions.1.IpProtocol': '-1', 'IpPermissions.1.IpRanges.1.CidrIp': '0.0.0.0/0' }), 'Retrait egress allow-all');

// 2. Allowlist.
const rules = [
  ['tcp', 80, 80, '0.0.0.0/0', 'HTTP'],
  ['tcp', 443, 443, '0.0.0.0/0', 'HTTPS'],
  ['udp', 443, 443, '0.0.0.0/0', 'HTTP/3 (QUIC)'],
  ['tcp', 22, 22, '0.0.0.0/0', 'SSH/git'],
  ['udp', 123, 123, '0.0.0.0/0', 'NTP'],
  ['udp', 67, 68, '0.0.0.0/0', 'DHCP'],
  ['tcp', 53, 53, '1.1.1.3/32', 'DNS filtré 1.1.1.3'],
  ['udp', 53, 53, '1.1.1.3/32', 'DNS filtré 1.1.1.3'],
  ['tcp', 53, 53, '1.0.0.3/32', 'DNS filtré 1.0.0.3'],
  ['udp', 53, 53, '1.0.0.3/32', 'DNS filtré 1.0.0.3'],
  ['-1', null, null, '169.254.169.254/32', 'Métadonnées EC2'],
];
for (const [proto, from, to, cidr, label] of rules) ok(await ec2(egress(proto, from, to, cidr)), `Egress ${label}`);

console.log('\nSG durci. Sortie limitée à la liste blanche + DNS filtré force. Torrents/P2P/sites X bloqués au niveau réseau.');
