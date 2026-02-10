import pg from 'pg';

const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;
if (!DB_PASSWORD) {
  console.error('Missing SUPABASE_DB_PASSWORD environment variable.');
  process.exit(1);
}

const client = new pg.Client({
  host: process.env.SUPABASE_DB_HOST || 'db.kvxecksvkimcgwhxxyhw.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await client.connect();
  console.log('Connected');

  // Sync parent_profile_id to match parent_user_id where set
  const { rowCount } = await client.query(`
    UPDATE students
    SET parent_profile_id = parent_user_id
    WHERE parent_user_id IS NOT NULL
      AND (parent_profile_id IS NULL OR parent_profile_id != parent_user_id)
  `);
  console.log(`Updated parent_profile_id on ${rowCount} students`);

  // Update RLS policies to also check parent_user_id
  // Drop and recreate the parent policies

  // Students
  await client.query(`DROP POLICY IF EXISTS "Parents can view their own children" ON students`);
  await client.query(`
    CREATE POLICY "Parents can view their own children"
    ON students FOR SELECT
    USING (parent_profile_id = auth.uid() OR parent_user_id = auth.uid())
  `);
  console.log('Updated students RLS policy');

  // Incidents
  await client.query(`DROP POLICY IF EXISTS "Parents can view their children's incidents" ON incidents`);
  await client.query(`
    CREATE POLICY "Parents can view their children's incidents"
    ON incidents FOR SELECT
    USING (
      student_id IN (
        SELECT id FROM students
        WHERE parent_profile_id = auth.uid() OR parent_user_id = auth.uid()
      )
    )
  `);
  console.log('Updated incidents RLS policy');

  // Transition Plans
  await client.query(`DROP POLICY IF EXISTS "Parents can view their children's plans" ON transition_plans`);
  await client.query(`
    CREATE POLICY "Parents can view their children's plans"
    ON transition_plans FOR SELECT
    USING (
      student_id IN (
        SELECT id FROM students
        WHERE parent_profile_id = auth.uid() OR parent_user_id = auth.uid()
      )
    )
  `);
  console.log('Updated transition_plans RLS policy');

  // Daily Behavior Tracking
  await client.query(`DROP POLICY IF EXISTS "Parents can view their children's tracking" ON daily_behavior_tracking`);
  await client.query(`
    CREATE POLICY "Parents can view their children's tracking"
    ON daily_behavior_tracking FOR SELECT
    USING (
      student_id IN (
        SELECT id FROM students
        WHERE parent_profile_id = auth.uid() OR parent_user_id = auth.uid()
      )
    )
  `);
  console.log('Updated daily_behavior_tracking RLS policy');

  // Verify
  const { rows } = await client.query(`
    SELECT id, first_name, last_name, parent_user_id, parent_profile_id
    FROM students
    WHERE parent_user_id IS NOT NULL
  `);
  console.log('\nStudents linked to parent:');
  rows.forEach(r => console.log(`  ${r.first_name} ${r.last_name} - user_id: ${r.parent_user_id}, profile_id: ${r.parent_profile_id}`));

  await client.end();
  console.log('\nDone! Parent portal should now work correctly.');
}

run().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
