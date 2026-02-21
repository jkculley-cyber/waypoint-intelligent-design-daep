import pg from 'pg'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const password = process.env.SUPABASE_DB_PASSWORD
const host = process.env.SUPABASE_DB_HOST || 'db.kvxecksvkimcgwhxxyhw.supabase.co'

if (!password) { console.error('SUPABASE_DB_PASSWORD required'); process.exit(1) }

const client = new pg.Client({
  host, port: 5432, database: 'postgres', user: 'postgres', password,
  ssl: { rejectUnauthorized: false },
})

const sql = readFileSync(join(__dirname, 'migrations', '031_scope_storage_by_district.sql'), 'utf-8')

await client.connect()
console.log('Connected.')
console.log('Applying 031_scope_storage_by_district.sql...')
await client.query(sql)
await client.end()
console.log('✓ Migration 031 applied.')
