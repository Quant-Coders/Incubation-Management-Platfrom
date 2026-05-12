/**
 * Fix seed — Creates startups and programs that failed in initial seed
 * Run: npx tsx scripts/fix-seed.ts
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function main() {
  console.log('🔧 Fixing seed data...\n');

  // Get tenant
  const { data: tenant } = await supabase.from('tenants').select('*').eq('slug', 'demo-incubator').single();
  if (!tenant) { console.error('❌ Tenant not found'); return; }
  console.log(`Tenant: ${tenant.name} (${tenant.id})`);

  // Get users from the users table (not auth)
  const { data: users, error: usersErr } = await supabase.from('users').select('*').eq('tenant_id', tenant.id);
  if (usersErr) { console.error('❌ Users error:', usersErr.message); return; }
  console.log(`Found ${users?.length || 0} users\n`);

  if (!users || users.length === 0) {
    console.log('No users in the users table. The auth trigger may not have fired.');
    console.log('Let me check auth users...');
    
    const { data: authData } = await supabase.auth.admin.listUsers();
    console.log(`Auth users: ${authData?.users?.length || 0}`);
    
    if (authData?.users) {
      for (const au of authData.users) {
        const tenantId = au.user_metadata?.tenant_id;
        const role = au.user_metadata?.role || 'startup';
        const name = au.user_metadata?.name || au.email?.split('@')[0] || 'User';
        
        if (tenantId) {
          const { error } = await supabase.from('users').upsert({
            id: au.id,
            tenant_id: tenantId,
            email: au.email!,
            name: name,
            role: role,
          }, { onConflict: 'id' });
          
          if (error) {
            console.log(`  ❌ ${au.email}: ${error.message}`);
          } else {
            console.log(`  ✅ Inserted user profile: ${au.email} (${role})`);
          }
        }
      }
    }
    
    // Re-fetch
    const { data: users2 } = await supabase.from('users').select('*').eq('tenant_id', tenant.id);
    if (!users2 || users2.length === 0) {
      console.error('Still no users. Aborting.');
      return;
    }
    
    // Continue with these users
    await createStartupsAndPrograms(tenant, users2);
  } else {
    await createStartupsAndPrograms(tenant, users);
  }
}

async function createStartupsAndPrograms(tenant: any, users: any[]) {
  const adminUser = users.find(u => u.role === 'admin');
  const startupUser = users.find(u => u.role === 'startup');

  console.log(`\nAdmin: ${adminUser?.email || 'NOT FOUND'}`);
  console.log(`Startup: ${startupUser?.email || 'NOT FOUND'}\n`);

  // Create startups
  console.log('3️⃣  Creating startups...');
  if (startupUser) {
    const startups = [
      {
        tenant_id: tenant.id,
        user_id: startupUser.id,
        company_name: 'HealthAI Solutions',
        sector: 'HealthTech',
        description: 'AI-powered diagnostic platform for rural healthcare centers.',
        stage: 'mvp',
        team_size: 5,
        website: 'https://healthai.demo',
      },
      {
        tenant_id: tenant.id,
        user_id: startupUser.id,
        company_name: 'AgriDrone Tech',
        sector: 'AgriTech',
        description: 'Precision agriculture drone system with AI crop health analysis.',
        stage: 'growth',
        team_size: 8,
        website: 'https://agridrone.demo',
      },
      {
        tenant_id: tenant.id,
        user_id: startupUser.id,
        company_name: 'EduBridge',
        sector: 'EdTech',
        description: 'Personalized AI tutoring for rural students in 12 Indian languages.',
        stage: 'idea',
        team_size: 3,
        website: 'https://edubridge.demo',
      },
    ];

    for (const s of startups) {
      const { data, error } = await supabase.from('startups').insert(s).select().single();
      if (error) {
        console.log(`  ❌ ${s.company_name}: ${error.message}`);
      } else {
        console.log(`  ✅ ${s.company_name} (${s.sector})`);
      }
    }
  }

  // Create programs
  console.log('\n4️⃣  Creating programs...');
  if (adminUser) {
    const programs = [
      {
        tenant_id: tenant.id,
        created_by: adminUser.id,
        title: 'Deep Tech Accelerator 2026',
        description: 'A 6-month intensive program for deep tech startups in AI, IoT, Robotics, and Blockchain. Includes ₹25L equity-free grant.',
        start_date: '2026-06-01',
        end_date: '2026-12-01',
        application_deadline: '2026-05-25',
        status: 'open',
        max_intake: 15,
        form_schema: [
          { id: 'problem', label: 'Problem Statement', type: 'textarea', required: true },
          { id: 'solution', label: 'Proposed Solution', type: 'textarea', required: true },
          { id: 'traction', label: 'Traction & Metrics', type: 'textarea', required: false },
          { id: 'team', label: 'Team Background', type: 'textarea', required: true },
          { id: 'funding', label: 'Funding Raised (₹)', type: 'number', required: false },
        ],
        evaluation_config: { rounds: 2, criteria: ['Innovation', 'Market Potential', 'Team Capability', 'Feasibility', 'Scalability'] }
      },
      {
        tenant_id: tenant.id,
        created_by: adminUser.id,
        title: 'Women Founders Program',
        description: 'A 4-month incubation program for women-led startups. Offers ₹10L grant, co-working space, and mentorship.',
        start_date: '2026-07-01',
        end_date: '2026-11-01',
        application_deadline: '2026-06-15',
        status: 'open',
        max_intake: 20,
        form_schema: [
          { id: 'problem', label: 'Problem Statement', type: 'textarea', required: true },
          { id: 'solution', label: 'Proposed Solution', type: 'textarea', required: true },
          { id: 'impact', label: 'Social Impact', type: 'textarea', required: true },
          { id: 'team', label: 'Team Background', type: 'textarea', required: true },
        ],
        evaluation_config: { rounds: 1, criteria: ['Innovation', 'Impact', 'Team', 'Feasibility'] }
      },
      {
        tenant_id: tenant.id,
        created_by: adminUser.id,
        title: 'Climate Tech Cohort 3',
        description: 'Third cohort of our flagship climate tech program. Focus on renewable energy, carbon capture, and sustainable agriculture.',
        start_date: '2026-03-01',
        end_date: '2026-08-31',
        application_deadline: '2026-02-15',
        status: 'active',
        max_intake: 10,
        form_schema: [
          { id: 'problem', label: 'Climate Problem', type: 'textarea', required: true },
          { id: 'solution', label: 'Green Solution', type: 'textarea', required: true },
          { id: 'team', label: 'Team', type: 'textarea', required: true },
        ],
        evaluation_config: { rounds: 2, criteria: ['Innovation', 'Climate Impact', 'Scalability', 'Team'] }
      },
    ];

    for (const p of programs) {
      const { data, error } = await supabase.from('programs').insert(p).select().single();
      if (error) {
        console.log(`  ❌ ${p.title}: ${error.message}`);
      } else {
        console.log(`  ✅ ${p.title} [${p.status}]`);
      }
    }
  }

  // Create evaluation criteria for programs
  console.log('\n5️⃣  Creating evaluation criteria...');
  const { data: allPrograms } = await supabase.from('programs').select('id, title, evaluation_config').eq('tenant_id', tenant.id);
  
  if (allPrograms) {
    for (const prog of allPrograms) {
      const criteriaNames = (prog.evaluation_config as any)?.criteria || [];
      const weight = criteriaNames.length > 0 ? (100 / criteriaNames.length) : 100;
      
      for (let i = 0; i < criteriaNames.length; i++) {
        const { error } = await supabase.from('evaluation_criteria').insert({
          tenant_id: tenant.id,
          program_id: prog.id,
          name: criteriaNames[i],
          weight: parseFloat(weight.toFixed(2)),
          max_score: 10,
          sort_order: i,
        });
        if (error && !error.message.includes('duplicate')) {
          console.log(`  ❌ ${prog.title} / ${criteriaNames[i]}: ${error.message}`);
        }
      }
      console.log(`  ✅ ${prog.title}: ${criteriaNames.length} criteria`);
    }
  }

  console.log('\n✨ Seed fix complete!');
}

main().catch(console.error);
