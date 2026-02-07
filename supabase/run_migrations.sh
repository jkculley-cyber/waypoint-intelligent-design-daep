#!/bin/bash
# Run SQL migrations against Supabase via the Management API
# Usage: bash run_migrations.sh

SUPABASE_URL="https://bbmolhntcrtcwouqoyse.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJibW9saG50Y3J0Y3dvdXFveXNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDQzMTE3MCwiZXhwIjoyMDg2MDA3MTcwfQ.SEh9VDe4s_m1VL71CmLxLnempk12EDwwHSSpiFB7BF8"

run_sql() {
  local file="$1"
  local name="$2"
  echo "Running $name..."

  # Read file and escape for JSON
  local sql=$(cat "$file")

  # Use the pg_query endpoint via service role
  local response=$(curl -s -w "\n%{http_code}" -X POST \
    "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": $(echo "$sql" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')}")

  local http_code=$(echo "$response" | tail -1)
  local body=$(echo "$response" | head -n -1)

  if [ "$http_code" = "200" ] || [ "$http_code" = "204" ]; then
    echo "  ✓ $name completed successfully"
  else
    echo "  ✗ $name failed (HTTP $http_code)"
    echo "  Response: $body"
    return 1
  fi
}

echo "Starting IDS database migrations..."
echo ""
