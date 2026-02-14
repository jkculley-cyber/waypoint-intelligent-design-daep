// Create campus-scoped staff accounts for testing campus views
// Each account is assigned to a specific campus and role

import pg from 'pg';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kvxecksvkimcgwhxxyhw.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!SERVICE_KEY || !DB_PASSWORD) {
  console.error('Missing required environment variables:');
  console.error('  $env:SUPABASE_SERVICE_ROLE_KEY="your-key"');
  console.error('  $env:SUPABASE_DB_PASSWORD="your-password"');
  process.exit(1);
}

const DISTRICT_ID = '11111111-1111-1111-1111-111111111111';
const HS   = 'aaaa0001-0001-0001-0001-000000000001';
const MS   = 'aaaa0001-0001-0001-0001-000000000002';
const EL   = 'aaaa0001-0001-0001-0001-000000000003';
const DAEP = 'aaaa0001-0001-0001-0001-000000000004';

const STAFF_ACCOUNTS = [
  {
    email: 'hs-ap@lonestar-isd.org',
    full_name: 'Sarah Mitchell',
    role: 'ap',
    campus_id: HS,
    campus_label: 'High School',
  },
  {
    email: 'ms-counselor@lonestar-isd.org',
    full_name: 'James Rivera',
    role: 'counselor',
    campus_id: MS,
    campus_label: 'Middle School',
  },
  {
    email: 'el-teacher@lonestar-isd.org',
    full_name: 'Patricia Chen',
    role: 'teacher',
    campus_id: EL,
    campus_label: 'Elementary',
  },
  {
    email: 'daep-staff@lonestar-isd.org',
    full_name: 'Robert Washington',
    role: 'ap',
    campus_id: DAEP,
    campus_label: 'DAEP (district-wide)',
  },
  {
    email: 'hs-principal@lonestar-isd.org',
    full_name: 'Dr. Angela Brooks',
    role: 'principal',
    campus_id: HS,
    campus_label: 'High School',
  },
  {
    email: 'sped-coord@lonestar-isd.org',
    full_name: 'Maria Santos',
    role: 'sped_coordinator',
    campus_id: MS,
    campus_label: 'Middle School',
  },
];

const PASSWORD = 'Password123!';

async function createAuthUser(account) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: account.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: account.full_name,
        role: account.role,
        district_id: DISTRICT_ID,
      },
    }),
  });

  const data = await res.json();

  if (data.id) return data.id;

  // User might already exist — try to find them
  if (data.msg?.includes('already') || data.message?.includes('already')) {
    const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=100`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
    });
    const listData = await listRes.json();
    const users = listData.users || listData;
    const existing = users.find(u => u.email === account.email);
    if (existing) return existing.id;
  }

  throw new Error(`Failed to create/find user ${account.email}: ${JSON.stringify(data)}`);
}

async function run() {
  console.log('Creating campus staff accounts...\n');

  const client = new pg.Client({
    host: process.env.SUPABASE_DB_HOST || 'db.kvxecksvkimcgwhxxyhw.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  await client.connect();

  for (const account of STAFF_ACCOUNTS) {
    try {
      // 1. Create auth user
      const userId = await createAuthUser(account);

      // 2. Create/update profile
      await client.query(
        `INSERT INTO profiles (id, district_id, email, full_name, role)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, full_name = EXCLUDED.full_name`,
        [userId, DISTRICT_ID, account.email, account.full_name, account.role]
      );

      // 3. Create campus assignment
      await client.query(
        `INSERT INTO profile_campus_assignments (profile_id, campus_id, is_primary)
         VALUES ($1, $2, true)
         ON CONFLICT DO NOTHING`,
        [userId, account.campus_id]
      );

      console.log(`  ✓ ${account.role.toUpperCase().padEnd(18)} ${account.email.padEnd(35)} → ${account.campus_label}`);
    } catch (err) {
      console.error(`  ✗ ${account.email}: ${err.message}`);
    }
  }

  await client.end();

  console.log('\n========================================');
  console.log('  ALL TEST ACCOUNTS (Password: Password123!)');
  console.log('========================================\n');
  console.log('  DISTRICT-WIDE ACCESS:');
  console.log('  admin@lonestar-isd.org          Admin (all campuses)');
  console.log('  daep-staff@lonestar-isd.org     AP at DAEP (all campuses)');
  console.log('');
  console.log('  CAMPUS-SCOPED ACCESS:');
  console.log('  hs-principal@lonestar-isd.org   Principal → High School only');
  console.log('  hs-ap@lonestar-isd.org          AP → High School only');
  console.log('  ms-counselor@lonestar-isd.org   Counselor → Middle School only');
  console.log('  el-teacher@lonestar-isd.org     Teacher → Elementary only');
  console.log('  sped-coord@lonestar-isd.org     SPED Coordinator → Middle School only');
  console.log('');
  console.log('  PARENT ACCESS:');
  console.log('  parent@lonestar-isd.org         Parent (Marcus & Sofia)');
  console.log('');
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
