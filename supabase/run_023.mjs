import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_REF = 'kvxecksvkimcgwhxxyhw'
const SERVICE_KEY = process.env.SERVICE_KEY

// Try Management API with sb_secret token
async function runViaManagementAPI(sql, token) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql }),
    }
  )
  return res
}

// Try project pg endpoint
async function runViaProjectPG(sql) {
  const res = await fetch(
    `https://${PROJECT_REF}.supabase.co/pg/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  )
  return res
}

const sql = readFileSync(join(__dirname, 'migrations', '023_checkin_unique_constraint.sql'), 'utf-8')
console.log('Running migration 023: Add unique check-in constraint...')
console.log('SQL:', sql.trim())

// Try Management API
const PAT = process.env.SB_PAT
if (PAT) {
  const res = await runViaManagementAPI(sql, PAT)
  if (res.ok) {
    console.log('✓ Applied via Management API')
    process.exit(0)
  }
  console.log(`Management API: ${res.status} ${await res.text()}`)
}

// Try project pg endpoint
const res2 = await runViaProjectPG(sql)
if (res2.ok) {
  console.log('✓ Applied via pg endpoint')
  process.exit(0)
}
console.log(`PG endpoint: ${res2.status} ${await res2.text()}`)

console.log('\n⚠️  Cannot apply automatically. Run this in your Supabase SQL Editor:')
console.log()
console.log(sql)
