// Cloudflare Pages Direct Upload — clearpath-site deployer
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// Load .env.local automatically
const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

const ACCOUNT_ID = process.env.CF_ACCOUNT_ID || '05ff8f94d82a54168e183bd8e0614b70';
const PROJECT    = 'cpeg-site';
const TOKEN      = process.env.CF_API_TOKEN;
const SITE_DIR   = path.join(path.dirname(fileURLToPath(import.meta.url)), 'clearpath-site');

if (!TOKEN) { console.error('Set CF_API_TOKEN env var'); process.exit(1); }

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.xml':  'application/xml',
  '.txt':  'text/plain',
  '.jpeg': 'image/jpeg',
  '.jpg':  'image/jpeg',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

function sha256hex(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function walkDir(dir, base = dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkDir(full, base));
    else files.push({ full, rel: '/' + path.relative(base, full).replace(/\\/g, '/') });
  }
  return files;
}

async function deploy() {
  console.log('Reading', SITE_DIR);
  const files = walkDir(SITE_DIR);
  console.log(`${files.length} files found`);

  // Build manifest (path -> hex hash) and file list
  const manifest = {};
  const fileData  = [];

  for (const { full, rel } of files) {
    const buf  = fs.readFileSync(full);
    const hash = sha256hex(buf);
    manifest[rel] = hash;
    fileData.push({ rel, buf, hash, ext: path.extname(full).toLowerCase() });
  }

  // Build multipart body: manifest JSON + each file keyed by hash
  const form = new FormData();
  form.append('manifest', JSON.stringify(manifest));

  for (const f of fileData) {
    const mime = MIME[f.ext] || 'application/octet-stream';
    form.append(f.hash, new Blob([f.buf], { type: mime }), path.basename(f.rel));
  }

  console.log('Uploading to Cloudflare Pages...');
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}/deployments`,
    {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${TOKEN}` },
      body:    form,
    }
  );

  const data = await res.json();

  if (data?.result?.id) {
    console.log('\n✅ Deployed!');
    console.log('   ID  :', data.result.id);
    console.log('   URL :', data.result.url);
    console.log('   Live: https://cpeg-site.pages.dev  |  https://clearpathedgroup.com');
  } else {
    console.error('\n❌ Failed:', JSON.stringify(data?.errors || data, null, 2));
  }
}

deploy().catch(e => { console.error(e); process.exit(1); });
