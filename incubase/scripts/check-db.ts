import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const sb = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🔗 Connecting to:', process.env.SUPABASE_URL);
  console.log('');

  const tables = ['tenants', 'users', 'programs', 'startups', 'applications', 'spaces', 'bookings', 'milestones', 'audit_logs', 'ai_summaries'];

  for (const table of tables) {
    const { data, error } = await sb.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`❌ ${table}: ${error.message}`);
    } else {
      console.log(`✅ ${table}: EXISTS`);
    }
  }

  console.log('\n🤖 Checking Gemini API key...');
  console.log('   Key starts with:', process.env.GEMINI_API_KEY?.slice(0, 10) + '...');
  console.log('\n✨ Database check complete!');
}

main().catch(console.error);
