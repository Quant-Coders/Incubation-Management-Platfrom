/**
 * Seed Script — Creates demo tenant, users, programs, and spaces
 * Run: npx tsx server/db/seed.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function seed() {
  console.log('🌱 Seeding IncuBase database...\n');

  // 1. Create demo tenant
  console.log('1️⃣  Creating demo tenant...');
  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .upsert({ 
      slug: 'demo-incubator',
      name: 'National Innovation Centre',
      plan: 'enterprise',
      settings: { 
        logo: '🏛️',
        description: 'India\'s premier startup incubation center',
        maxPrograms: 50
      }
    }, { onConflict: 'slug' })
    .select()
    .single();

  if (tenantErr) { console.error('❌ Tenant error:', tenantErr.message); return; }
  console.log(`   ✅ Tenant: ${tenant.name} (${tenant.id})\n`);

  // 2. Create auth users and profiles
  console.log('2️⃣  Creating demo users...');
  const demoUsers = [
    { email: 'admin@incubase.demo', password: 'Admin@123456', name: 'Rajesh Kumar', role: 'admin' },
    { email: 'facility@incubase.demo', password: 'Facility@123456', name: 'Priya Sharma', role: 'facility_manager' },
    { email: 'reviewer@incubase.demo', password: 'Reviewer@123456', name: 'Arun Patel', role: 'reviewer' },
    { email: 'mentor@incubase.demo', password: 'Mentor@123456', name: 'Dr. Meera Singh', role: 'mentor' },
    { email: 'startup@incubase.demo', password: 'Startup@123456', name: 'Vikram Reddy', role: 'startup' },
  ];

  const createdUsers: any[] = [];

  for (const user of demoUsers) {
    // Create auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        name: user.name,
        role: user.role,
        tenant_id: tenant.id,
      },
    });

    if (authErr) {
      if (authErr.message.includes('already been registered')) {
        // User exists, try to fetch their profile
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === user.email);
        if (existingUser) {
          createdUsers.push({ ...user, id: existingUser.id });
          console.log(`   ⚠️  ${user.role}: ${user.email} (already exists)`);
        }
        continue;
      }
      console.error(`   ❌ Failed to create ${user.role}: ${authErr.message}`);
      continue;
    }

    createdUsers.push({ ...user, id: authData.user.id });
    console.log(`   ✅ ${user.role}: ${user.email}`);
  }

  console.log('');

  // 3. Create demo startups
  console.log('3️⃣  Creating demo startups...');
  const startupUser = createdUsers.find(u => u.role === 'startup');
  
  const demoStartups = [
    {
      tenant_id: tenant.id,
      user_id: startupUser?.id,
      company_name: 'HealthAI Solutions',
      sector: 'HealthTech',
      description: 'AI-powered diagnostic platform for rural healthcare centers, enabling early detection of diseases using smartphone cameras.',
      stage: 'mvp',
      team_size: 5,
      website: 'https://healthai.demo',
    },
    {
      tenant_id: tenant.id,
      user_id: startupUser?.id,
      company_name: 'AgriDrone Tech',
      sector: 'AgriTech',
      description: 'Precision agriculture drone system with AI-based crop health analysis and automated pesticide spraying.',
      stage: 'growth',
      team_size: 8,
      website: 'https://agridrone.demo',
    },
    {
      tenant_id: tenant.id,
      user_id: startupUser?.id,
      company_name: 'EduBridge',
      sector: 'EdTech',
      description: 'Personalized AI tutoring platform for rural students, supporting 12 Indian languages with offline-first architecture.',
      stage: 'idea',
      team_size: 3,
      website: 'https://edubridge.demo',
    },
  ];

  if (startupUser?.id) {
    for (const startup of demoStartups) {
      const { data, error } = await supabase
        .from('startups')
        .upsert(startup, { onConflict: 'user_id' })
        .select()
        .single();
      
      if (error && !error.message.includes('duplicate')) {
        console.error(`   ❌ ${startup.company_name}: ${error.message}`);
      } else {
        console.log(`   ✅ ${startup.company_name} (${startup.sector})`);
      }
    }
  }
  console.log('');

  // 4. Create demo programs
  console.log('4️⃣  Creating demo programs...');
  const adminUser = createdUsers.find(u => u.role === 'admin');

  const demoPrograms = [
    {
      tenant_id: tenant.id,
      created_by: adminUser?.id,
      title: 'Deep Tech Accelerator 2026',
      description: 'A 6-month intensive program for deep tech startups in AI, IoT, Robotics, and Blockchain. Includes ₹25L equity-free grant, mentorship from 50+ industry leaders, and access to cloud credits.',
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
      evaluation_config: {
        rounds: 2,
        criteria: ['Innovation', 'Market Potential', 'Team Capability', 'Feasibility', 'Scalability']
      }
    },
    {
      tenant_id: tenant.id,
      created_by: adminUser?.id,
      title: 'Women Founders Program',
      description: 'A dedicated 4-month incubation program for women-led startups across all sectors. Offers ₹10L grant, co-working space, and mentorship.',
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
      created_by: adminUser?.id,
      title: 'Climate Tech Cohort 3',
      description: 'Third cohort of our flagship climate technology program. Focus on renewable energy, carbon capture, and sustainable agriculture solutions.',
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

  if (adminUser?.id) {
    for (const program of demoPrograms) {
      const { data, error } = await supabase
        .from('programs')
        .insert(program)
        .select()
        .single();

      if (error) {
        console.error(`   ❌ ${program.title}: ${error.message}`);
      } else {
        console.log(`   ✅ ${program.title} [${program.status}]`);
      }
    }
  }
  console.log('');

  // 5. Create demo spaces
  console.log('5️⃣  Creating demo spaces...');
  const floors = ['Ground Floor', '1st Floor', '2nd Floor'];
  const spaces: any[] = [];

  // Seats
  for (let f = 0; f < 3; f++) {
    for (let s = 1; s <= 20; s++) {
      spaces.push({
        tenant_id: tenant.id,
        name: `Seat ${floors[f][0]}${String(s).padStart(2, '0')}`,
        type: 'seat',
        floor: floors[f],
        building: 'Main Building',
        capacity: 1,
        status: Math.random() > 0.3 ? 'occupied' : 'available',
        amenities: ['Power Outlet', 'Wi-Fi', 'Monitor'],
      });
    }
  }

  // Cabins
  for (let c = 1; c <= 8; c++) {
    spaces.push({
      tenant_id: tenant.id,
      name: `Cabin C-${String(c).padStart(2, '0')}`,
      type: 'cabin',
      floor: c <= 4 ? '1st Floor' : '2nd Floor',
      building: 'Main Building',
      capacity: c <= 4 ? 4 : 6,
      status: Math.random() > 0.4 ? 'occupied' : 'available',
      amenities: ['Power Outlets', 'Wi-Fi', 'Whiteboard', 'AC', 'Door Lock'],
    });
  }

  // Meeting rooms
  for (let m = 1; m <= 4; m++) {
    spaces.push({
      tenant_id: tenant.id,
      name: `Meeting Room M-${String(m).padStart(2, '0')}`,
      type: 'meeting_room',
      floor: m <= 2 ? 'Ground Floor' : '1st Floor',
      building: 'Main Building',
      capacity: m <= 2 ? 8 : 12,
      status: 'available',
      amenities: ['Projector', 'Whiteboard', 'Video Conferencing', 'AC', 'Wi-Fi'],
    });
  }

  const { error: spacesErr } = await supabase.from('spaces').insert(spaces);
  if (spacesErr) {
    console.error(`   ❌ Spaces: ${spacesErr.message}`);
  } else {
    console.log(`   ✅ Created ${spaces.length} spaces (60 seats + 8 cabins + 4 meeting rooms)`);
  }
  console.log('');

  // Summary
  console.log('═'.repeat(50));
  console.log('🎉 Seeding complete!\n');
  console.log('Demo login credentials:');
  console.log('─'.repeat(50));
  for (const user of demoUsers) {
    console.log(`  ${user.role.padEnd(20)} ${user.email.padEnd(30)} ${user.password}`);
  }
  console.log('─'.repeat(50));
  console.log('\nStart the app with:');
  console.log('  Terminal 1: npm run dev');
  console.log('  Terminal 2: npm run dev:server');
}

seed().catch(console.error);
