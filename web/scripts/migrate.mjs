import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load env
const envContent = readFileSync('.env.local', 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([A-Z_]+)="(.*)"/);
  if (match) env[match[1]] = match[2];
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkColumn(table) {
  const { error } = await supabase.from(table).select('user_id').limit(0);
  return !error || error.code !== '42703';
}

async function run() {
  console.log('Checking user_id columns...');
  for (const table of ['collections', 'documents', 'query_traces']) {
    const exists = await checkColumn(table);
    console.log(`  ${table}.user_id: ${exists ? 'EXISTS' : 'MISSING'}`);
  }

  // Try to add user_id by inserting a test row with user_id
  // If the column doesn't exist, we need DDL which REST API can't do
  const colExists = await checkColumn('collections');
  if (!colExists) {
    console.log('\nuser_id columns are MISSING. REST API cannot run ALTER TABLE.');
    console.log('Attempting alternative: using Supabase Management API...');

    // Try management API
    const projectRef = 'evljxrlicctchscyfuan';
    const migrationSql = `
      ALTER TABLE collections ADD COLUMN IF NOT EXISTS user_id uuid;
      ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id uuid;
      ALTER TABLE query_traces ADD COLUMN IF NOT EXISTS user_id uuid;
      CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
      CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
      CREATE INDEX IF NOT EXISTS idx_query_traces_user_id ON query_traces(user_id);
    `;

    // Try using the database API endpoint
    const resp = await fetch(`https://${projectRef}.supabase.co/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    console.log('REST API status:', resp.status);

    console.log('\n--- MANUAL MIGRATION REQUIRED ---');
    console.log('Go to: https://supabase.com/dashboard/project/evljxrlicctchscyfuan/sql/new');
    console.log('And run this SQL:\n');
    console.log(migrationSql);
  } else {
    console.log('\nAll user_id columns exist. No migration needed.');
  }
}

run().catch(console.error);
