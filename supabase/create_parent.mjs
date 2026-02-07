import pg from 'pg';

const SUPABASE_URL = 'https://bbmolhntcrtcwouqoyse.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJibW9saG50Y3J0Y3dvdXFveXNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDQzMTE3MCwiZXhwIjoyMDg2MDA3MTcwfQ.SEh9VDe4s_m1VL71CmLxLnempk12EDwwHSSpiFB7BF8';
const DISTRICT_ID = '11111111-1111-1111-1111-111111111111';
const HS = 'aaaa0001-0001-0001-0001-000000000001';

async function run() {
  // Step 1: Create parent auth user
  console.log('Creating parent auth user...');
  const createRes = await fetch(SUPABASE_URL + '/auth/v1/admin/users', {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': 'Bearer ' + SERVICE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'parent@lonestar-isd.org',
      password: 'Password123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Maria Johnson',
        district_id: DISTRICT_ID,
        role: 'parent',
      },
    }),
  });

  const parentUser = await createRes.json();
  let parentId;

  if (parentUser.id) {
    parentId = parentUser.id;
    console.log('Parent user created:', parentId);
  } else {
    console.error('Create user response:', JSON.stringify(parentUser));
    // If user already exists, try listing to find them
    console.log('Attempting to find existing parent user...');
    const listRes = await fetch(SUPABASE_URL + '/auth/v1/admin/users?page=1&per_page=50', {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': 'Bearer ' + SERVICE_KEY,
      },
    });
    const listData = await listRes.json();
    const users = listData.users || listData;
    const existing = users.find(u => u.email === 'parent@lonestar-isd.org');
    if (existing) {
      parentId = existing.id;
      console.log('Found existing parent user:', parentId);
    } else {
      console.error('Could not find or create parent user');
      process.exit(1);
    }
  }

  // Step 2: Create parent profile and link students in DB
  const client = new pg.Client({
    host: 'db.bbmolhntcrtcwouqoyse.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'CVw&-%.iE/6F84T',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  await client.connect();
  console.log('Connected to DB');

  // Create profile
  await client.query(
    `INSERT INTO profiles (id, district_id, email, full_name, role)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role`,
    [parentId, DISTRICT_ID, 'parent@lonestar-isd.org', 'Maria Johnson', 'parent']
  );
  console.log('Parent profile created');

  // Create campus assignment
  await client.query(
    `INSERT INTO profile_campus_assignments (profile_id, campus_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [parentId, HS]
  );
  console.log('Campus assignment created');

  // Step 3: Link Marcus Johnson (LS-10001) and Sofia Garcia (LS-10002) to this parent
  const { rows: students } = await client.query(
    `SELECT id, first_name, last_name FROM students WHERE student_id_number IN ('LS-10001', 'LS-10002')`
  );

  for (const s of students) {
    await client.query('UPDATE students SET parent_user_id = $1 WHERE id = $2', [parentId, s.id]);
    console.log(`  Linked ${s.first_name} ${s.last_name} to parent`);
  }

  await client.end();
  console.log('\nDone! Parent login: parent@lonestar-isd.org / Password123!');
}

run().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
