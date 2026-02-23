// Delete the manually-added CNAME so Pages can own it cleanly
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '.env.local');
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const TOKEN   = process.env.CF_API_TOKEN;
const ZONE_ID = '7c364da7a538bd6e42b417869c40240a';
// Current CNAME ID (clearpathedgroup.com → clearpath-site-edc.pages.dev)
const CNAME_ID = 'e573e9ee7e72138f796a4826ead7e552';

async function cf(method, endpoint, body) {
  const opts = {
    method,
    headers: {
      Authorization: 'Bearer ' + TOKEN,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch('https://api.cloudflare.com/client/v4' + endpoint, opts);
  return res.json();
}

const del = await cf('DELETE', '/zones/' + ZONE_ID + '/dns_records/' + CNAME_ID);
console.log('Delete result:', JSON.stringify(del, null, 2));

const list = await cf('GET', '/zones/' + ZONE_ID + '/dns_records?type=CNAME&name=clearpathedgroup.com');
console.log('\nRemaining CNAMEs for clearpathedgroup.com:', list.result?.length ?? 0);
for (const r of list.result || []) {
  console.log(' ', r.id, r.name, '->', r.content);
}

if (del.success) {
  console.log('\n✅ CNAME deleted. Now do this in the Cloudflare dashboard:');
} else {
  console.log('\n⚠️  Delete failed — see error above. Try manually via dashboard:');
}
console.log('  1. dash.cloudflare.com → Workers & Pages → clearpath-site → Custom domains');
console.log('  2. Find clearpathedgroup.com → 3-dot menu → Remove domain');
console.log('  3. "Set up a custom domain" → clearpathedgroup.com → Activate domain');
console.log('  Cloudflare will auto-create the CNAME and issue the SSL cert (~2 min)');
