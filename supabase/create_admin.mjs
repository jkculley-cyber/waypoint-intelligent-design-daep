// Create admin user via Supabase Auth Admin API

const SUPABASE_URL = 'https://bbmolhntcrtcwouqoyse.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJibW9saG50Y3J0Y3dvdXFveXNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDQzMTE3MCwiZXhwIjoyMDg2MDA3MTcwfQ.SEh9VDe4s_m1VL71CmLxLnempk12EDwwHSSpiFB7BF8';

async function createAdmin() {
  console.log('Creating admin user...');

  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'admin@lonestar-isd.org',
      password: 'Password123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Admin User',
        role: 'admin',
        district_id: '11111111-1111-1111-1111-111111111111',
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Failed to create user:', data);
    process.exit(1);
  }

  console.log(`✓ Admin user created!`);
  console.log(`  ID: ${data.id}`);
  console.log(`  Email: ${data.email}`);
  console.log(`  Login: admin@lonestar-isd.org / Password123!`);

  return data.id;
}

createAdmin().then(userId => {
  console.log(`\nAdmin User ID: ${userId}`);
  console.log('Use this ID to update the seed data.');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
