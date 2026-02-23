// Fix clearpathedgroup.com → Pages domain connection
// 1. Gets zone ID for clearpathedgroup.com
// 2. Deletes the manually-added CNAME (so Pages can re-own it)
// Run: node fix-domain.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local
const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

const TOKEN      = process.env.CF_API_TOKEN;
const ACCOUNT_ID = process.env.CF_ACCOUNT_ID || '05ff8f94d82a54168e183bd8e0614b70';
const CNAME_ID   = '4d8491521a11ef7f3d25d169e06ac42a'; // from dns2.json

async function cf(method, path, body) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function main() {
  console.log('Step 1: Finding zone ID for clearpathedgroup.com...');
  const zones = await cf('GET', '/zones?name=clearpathedgroup.com');

  if (!zones.success || zones.result.length === 0) {
    console.error('❌ Could not find zone:', JSON.stringify(zones));
    process.exit(1);
  }

  const zone = zones.result[0];
  console.log(`✅ Zone found: ${zone.name} (ID: ${zone.id})`);

  console.log('\nStep 2: Listing all DNS records for clearpathedgroup.com...');
  const dns = await cf('GET', `/zones/${zone.id}/dns_records?per_page=100`);
  if (dns.success) {
    console.log(`Found ${dns.result.length} DNS record(s):`);
    for (const r of dns.result) {
      console.log(`  [${r.id}] ${r.type} ${r.name} → ${r.content} (proxied: ${r.proxied})`);
    }
  }

  console.log(`\nStep 3: Deleting CNAME record ${CNAME_ID}...`);
  // Try to delete the known CNAME
  const del = await cf('DELETE', `/zones/${zone.id}/dns_records/${CNAME_ID}`);
  if (del.success) {
    console.log('✅ CNAME deleted successfully!');
  } else {
    console.log('⚠️  Delete returned:', JSON.stringify(del));
    // Maybe it was already deleted — list current records to confirm
  }

  console.log('\nStep 4: Verifying DNS records after delete...');
  const dns2 = await cf('GET', `/zones/${zone.id}/dns_records?per_page=100`);
  if (dns2.success) {
    console.log(`Remaining ${dns2.result.length} record(s):`);
    for (const r of dns2.result) {
      console.log(`  [${r.id}] ${r.type} ${r.name} → ${r.content}`);
    }
  }

  console.log('\n=== NEXT STEPS (do these manually in Cloudflare dashboard) ===');
  console.log('1. Go to: https://dash.cloudflare.com → Workers & Pages → clearpath-site');
  console.log('2. Click "Custom domains" tab');
  console.log('3. If clearpathedgroup.com is listed → click the 3-dot menu → Remove domain');
  console.log('4. Click "Set up a custom domain"');
  console.log('5. Enter: clearpathedgroup.com');
  console.log('6. Cloudflare will auto-configure DNS — click Activate domain');
  console.log('\nThe site should go live within ~2 minutes after that.\n');
}

main().catch(e => { console.error(e); process.exit(1); });
