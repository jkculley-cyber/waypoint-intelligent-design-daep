// Full setup: create new Pages project, deploy files, add custom domain
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dir = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local
for (const line of fs.readFileSync(path.join(__dir, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const TOKEN      = process.env.CF_API_TOKEN;
const ACCOUNT_ID = process.env.CF_ACCOUNT_ID || '05ff8f94d82a54168e183bd8e0614b70';
const PROJECT    = 'cpeg-site';
const DOMAIN     = 'clearpathedgroup.com';
const SITE_DIR   = path.join(__dir, 'clearpath-site');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.xml':  'application/xml',
  '.txt':  'text/plain',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
};

async function cf(method, endpoint, body, isForm) {
  const headers = { Authorization: 'Bearer ' + TOKEN };
  if (!isForm) headers['Content-Type'] = 'application/json';
  const res = await fetch('https://api.cloudflare.com/client/v4' + endpoint, {
    method,
    headers,
    body: isForm ? body : (body ? JSON.stringify(body) : undefined),
  });
  return res.json();
}

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

async function main() {
  // Step 1: Verify token works
  console.log('Step 1: Verifying token...');
  const verify = await cf('GET', '/accounts/' + ACCOUNT_ID + '/pages/projects');
  if (!verify.success) {
    console.error('❌ Token invalid or missing Pages permission:', JSON.stringify(verify.errors));
    process.exit(1);
  }
  const existing = verify.result.find(p => p.name === PROJECT);
  console.log(`✅ Token works. Found ${verify.result.length} existing project(s).`);
  if (existing) console.log(`   Project "${PROJECT}" already exists — will deploy to it.`);

  // Step 2: Create project if needed
  if (!existing) {
    console.log(`\nStep 2: Creating Pages project "${PROJECT}"...`);
    const create = await cf('POST', '/accounts/' + ACCOUNT_ID + '/pages/projects', {
      name: PROJECT,
      production_branch: 'main',
    });
    if (!create.success) {
      console.error('❌ Create failed:', JSON.stringify(create.errors));
      process.exit(1);
    }
    console.log(`✅ Project created: ${create.result.subdomain}`);
  } else {
    console.log('\nStep 2: Skipped — project already exists.');
  }

  // Step 3: Deploy files
  console.log('\nStep 3: Deploying files from clearpath-site/...');
  const files = walkDir(SITE_DIR);
  console.log(`   ${files.length} files found`);

  const manifest = {};
  const fileData = [];
  for (const { full, rel } of files) {
    const buf  = fs.readFileSync(full);
    const hash = sha256hex(buf);
    manifest[rel] = hash;
    fileData.push({ rel, buf, hash, ext: path.extname(full).toLowerCase() });
  }

  const form = new FormData();
  form.append('manifest', JSON.stringify(manifest));
  for (const f of fileData) {
    const mime = MIME[f.ext] || 'application/octet-stream';
    form.append(f.hash, new Blob([f.buf], { type: mime }), path.basename(f.rel));
  }

  const deploy = await cf('POST',
    '/accounts/' + ACCOUNT_ID + '/pages/projects/' + PROJECT + '/deployments',
    form, true
  );

  if (!deploy?.result?.id) {
    console.error('❌ Deploy failed:', JSON.stringify(deploy?.errors || deploy));
    process.exit(1);
  }
  console.log(`✅ Deployed! ID: ${deploy.result.id}`);
  console.log(`   Pages URL: https://${deploy.result.url || PROJECT + '.pages.dev'}`);

  // Step 4: Add custom domain
  console.log(`\nStep 4: Adding custom domain "${DOMAIN}"...`);
  const domAdd = await cf('POST',
    '/accounts/' + ACCOUNT_ID + '/pages/projects/' + PROJECT + '/domains',
    { name: DOMAIN }
  );

  if (domAdd.success) {
    console.log(`✅ Domain added! Status: ${domAdd.result?.status}`);
  } else {
    const errCode = domAdd.errors?.[0]?.code;
    const errMsg  = domAdd.errors?.[0]?.message;
    if (errCode === 8000013 || errMsg?.includes('already')) {
      console.log('   Domain already attached — that is fine.');
    } else {
      console.error('❌ Domain add failed:', JSON.stringify(domAdd.errors));
    }
  }

  // Step 5: Show final status
  console.log('\n=== SUMMARY ===');
  console.log(`Pages project : ${PROJECT}`);
  console.log(`Pages URL     : https://${PROJECT}.pages.dev`);
  console.log(`Custom domain : https://${DOMAIN}`);
  console.log('\nCloudflare will issue the SSL cert and activate the domain in ~2 minutes.');
  console.log('Refresh the Custom domains tab in the Pages dashboard to watch it go Active.');
}

main().catch(e => { console.error(e); process.exit(1); });
