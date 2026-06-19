// Lists EC2 instance types eligible for the AWS Free Tier in the region.
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

// DescribeInstanceTypes with the free-tier-eligible filter (paginated).
let token = '';
const out = [];
do {
  const params = {
    Action: 'DescribeInstanceTypes',
    'Filter.1.Name': 'free-tier-eligible',
    'Filter.1.Value.1': 'true',
    MaxResults: '100',
  };
  if (token) params.NextToken = token;
  const r = await ec2(params);
  if (!r.ok) { console.error(r.text.slice(0, 400)); process.exit(1); }
  // each <item> has <instanceType>, <vCpuInfo><defaultVCpus>, <memoryInfo><sizeInMiB>
  const items = [...r.text.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  for (const it of items) {
    const type = it.match(/<instanceType>([^<]+)</)?.[1];
    const vcpu = it.match(/<defaultVCpus>([^<]+)</)?.[1];
    const mib = it.match(/<sizeInMiB>([^<]+)</)?.[1];
    if (type) out.push({ type, vcpu, gb: mib ? (Number(mib) / 1024).toFixed(1) : '?' });
  }
  token = r.text.match(/<nextToken>([^<]+)</)?.[1] ?? '';
} while (token);

out.sort((a, b) => a.type.localeCompare(b.type));
console.log(`Free-tier-eligible instance types in ${region}:`);
for (const o of out) console.log(`  ${o.type.padEnd(14)} ${o.vcpu} vCPU / ${o.gb} GiB`);
console.log(`(${out.length} total)`);
