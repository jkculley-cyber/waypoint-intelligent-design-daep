import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const client = new pg.Client({
  host: 'db.bbmolhntcrtcwouqoyse.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'CVw&-%.iE/6F84T',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  statement_timeout: 60000,
});

// Skip 001 since it already ran successfully
const migrations = [
  { file: '002_rls_policies.sql', name: '002: RLS Policies' },
  { file: '003_triggers_and_functions.sql', name: '003: Triggers & Functions' },
  { file: '004_seed_offense_codes.sql', name: '004: Seed Offense Codes' },
  { file: '005_seed_interventions.sql', name: '005: Seed Interventions' },
  { file: '006_align_schema_with_frontend.sql', name: '006: Align Schema with Frontend' },
  { file: '007_demo_seed_data.sql', name: '007: Demo Seed Data' },
];

async function run() {
  console.log('Connecting to Supabase Postgres...');
  await client.connect();
  console.log('Connected!\n');

  for (const migration of migrations) {
    const filePath = join(__dirname, 'migrations', migration.file);
    console.log(`Running ${migration.name}...`);

    try {
      const sql = readFileSync(filePath, 'utf-8');
      await client.query(sql);
      console.log(`  ✓ ${migration.name} completed\n`);
    } catch (err) {
      console.error(`  ✗ ${migration.name} FAILED`);
      console.error(`    Error: ${err.message}\n`);

      // Non-fatal errors - continue
      if (err.message.includes('already exists') ||
          err.message.includes('duplicate key')) {
        console.log('    (Already exists — continuing)\n');
        continue;
      }

      console.error('    Stopping migrations due to error.');
      await client.end();
      process.exit(1);
    }
  }

  // Verify tables
  console.log('Verifying tables...');
  const { rows } = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  console.log(`\n✓ ${rows.length} tables in public schema:`);
  rows.forEach(r => console.log(`  - ${r.table_name}`));

  // Count seed data
  const counts = await Promise.all([
    client.query('SELECT COUNT(*) as c FROM students'),
    client.query('SELECT COUNT(*) as c FROM incidents'),
    client.query('SELECT COUNT(*) as c FROM offense_codes'),
    client.query('SELECT COUNT(*) as c FROM interventions'),
    client.query('SELECT COUNT(*) as c FROM alerts'),
    client.query('SELECT COUNT(*) as c FROM transition_plans'),
    client.query('SELECT COUNT(*) as c FROM discipline_matrix'),
  ]);

  console.log('\nSeed data counts:');
  console.log(`  Students: ${counts[0].rows[0].c}`);
  console.log(`  Incidents: ${counts[1].rows[0].c}`);
  console.log(`  Offense Codes: ${counts[2].rows[0].c}`);
  console.log(`  Interventions: ${counts[3].rows[0].c}`);
  console.log(`  Alerts: ${counts[4].rows[0].c}`);
  console.log(`  Transition Plans: ${counts[5].rows[0].c}`);
  console.log(`  Matrix Rules: ${counts[6].rows[0].c}`);

  await client.end();
  console.log('\n🎉 All migrations completed successfully!');
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
