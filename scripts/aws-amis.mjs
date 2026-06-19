import { AwsClient } from 'aws4fetch';

const region = process.env.AWS_REGION || 'eu-central-2';
const ec2c = new AwsClient({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region,
  service: 'ec2',
});
async function ec2(params) {
  const body = new URLSearchParams({ Version: '2016-11-15', ...params }).toString();
  const r = await ec2c.fetch(`https://ec2.${region}.amazonaws.com/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  return { ok: r.ok, text: await r.text() };
}
const all = (t, tag) => [...t.matchAll(new RegExp(`<${tag}>([^<]+)</${tag}>`, 'g'))].map((m) => m[1]);

async function latest(owner, namePattern, arch = 'x86_64') {
  const r = await ec2({
    Action: 'DescribeImages',
    'Owner.1': owner,
    'Filter.1.Name': 'name',
    'Filter.1.Value.1': namePattern,
    'Filter.2.Name': 'state',
    'Filter.2.Value.1': 'available',
    'Filter.3.Name': 'architecture',
    'Filter.3.Value.1': arch,
  });
  if (!r.ok) return 'ERR ' + (r.text.match(/<Message>([^<]+)/)?.[1] ?? '');
  const ids = all(r.text, 'imageId');
  const dates = all(r.text, 'creationDate');
  if (!ids.length) return '(none found)';
  const z = ids.map((id, i) => ({ id, date: dates[i] })).sort((a, b) => (a.date < b.date ? 1 : -1));
  return `${z[0]?.id}  (${z[0]?.date})`;
}

// AMI owners (AWS account IDs of the official publishers).
const OWNERS = {
  canonical: '099720109477',
  debian: '136693071363',
  amazon: 'amazon',
  fedora: '125523088429',
  rocky: '792107900819',
  alma: '764336703387',
};

console.log('== AMI discovery (region', region, ') ==');
console.log('ubuntu-24.04 ', await latest(OWNERS.canonical, 'ubuntu/images/hvm-ssd*/ubuntu-noble-24.04-amd64-server-*'));
console.log('ubuntu-22.04 ', await latest(OWNERS.canonical, 'ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*'));
console.log('debian-12    ', await latest(OWNERS.debian, 'debian-12-amd64-*'));
console.log('al2023       ', await latest(OWNERS.amazon, 'al2023-ami-2023.*-kernel-6.1-x86_64'));
console.log('fedora-42    ', await latest(OWNERS.fedora, 'Fedora-Cloud-Base-*42*x86_64*'));
console.log('fedora-41    ', await latest(OWNERS.fedora, 'Fedora-Cloud-Base-*41*x86_64*'));
console.log('rocky-9      ', await latest(OWNERS.rocky, 'Rocky-9-EC2-Base-*x86_64*'));
console.log('alma-9       ', await latest(OWNERS.alma, 'AlmaLinux OS 9*x86_64*'));
console.log('windows-2025 ', await latest(OWNERS.amazon, 'Windows_Server-2025-English-Full-Base-*'));
console.log('windows-2022 ', await latest(OWNERS.amazon, 'Windows_Server-2022-English-Full-Base-*'));
console.log('windows-2019 ', await latest(OWNERS.amazon, 'Windows_Server-2019-English-Full-Base-*'));
// Note: EC2 ne propose pas de Windows 10/11 client (licence/Dedicated Host). Les éditions
// "Full Base" embarquent déjà l'expérience Bureau (desktop GUI accessible en RDP).

// Inspect the shared security group ingress (which ports are open?).
const sg = process.env.AWS_SECURITY_GROUP_ID;
if (sg) {
  console.log('\n== Security group', sg, 'ingress ==');
  const r = await ec2({ Action: 'DescribeSecurityGroups', 'GroupId.1': sg });
  if (!r.ok) console.log('ERR ' + (r.text.match(/<Message>([^<]+)/)?.[1] ?? r.text.slice(0, 200)));
  else {
    const perms = [...r.text.matchAll(/<item>\s*<ipProtocol>([^<]+)<\/ipProtocol>(?:[\s\S]*?<fromPort>([^<]+)<\/fromPort>)?(?:[\s\S]*?<toPort>([^<]+)<\/toPort>)?[\s\S]*?<\/item>/g)];
    if (!perms.length) console.log(r.text.slice(0, 400));
    for (const m of perms) console.log(`  proto=${m[1]} ports=${m[2] ?? '*'}-${m[3] ?? '*'}`);
  }
}
