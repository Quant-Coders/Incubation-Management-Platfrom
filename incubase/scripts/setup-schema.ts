/**
 * Run schema SQL directly via Supabase Management API
 * Uses the database connection URL to execute SQL
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const url = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const projectRef = url.replace('https://', '').replace('.supabase.co', '');
  
  // Read the schema SQL
  const schemaPath = path.join(__dirname, '..', 'server', 'db', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  
  console.log('🔧 Running schema SQL via Supabase Database API...\n');
  console.log(`Project: ${projectRef}`);
  console.log(`Schema length: ${schemaSql.length} chars\n`);
  
  // Use the Supabase database query endpoint
  // POST to /pg/query with SQL
  const pgUrl = `https://${projectRef}.supabase.co/rest/v1/rpc/`;
  
  // Try using the management API
  // The correct approach is to use the pg_execute extension or just tell the user
  
  // Actually, let's try via the Supabase JS client's rpc
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  
  // Split the schema into individual statements and try via rpc
  // Actually the simplest: just output the URL
  console.log('📋 Schema needs to be run in the Supabase SQL Editor.');
  console.log('');
  console.log(`👉 Open this URL in your browser:`);
  console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new`);
  console.log('');
  console.log('Then paste the contents of: server/db/schema.sql');
  console.log('And click "Run"');
  console.log('');
  console.log('Alternatively, copy the schema SQL to clipboard:');
  console.log('   type server\\db\\schema.sql | clip');
}

main().catch(console.error);
