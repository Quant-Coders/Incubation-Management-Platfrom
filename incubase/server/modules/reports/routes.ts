/**
 * Module 6: Reporting (DPR §5.6)
 *
 * Generate custom reports for stakeholders across all modules.
 */
import { Router, Response } from 'express';
import { TenantRequest } from '../../middleware/tenant';
import { requireRole } from '../../middleware/auth';
import { supabaseAdmin } from '../../db/client';

export const reportRoutes = Router();

// ═══════════════════════════════════════════
// Executive Summary Report
// ═══════════════════════════════════════════

reportRoutes.get('/executive-summary', requireRole('admin'), async (req: TenantRequest, res: Response) => {
  const tenantId = req.tenant!.id;

  const [programsRes, appsRes, startupsRes, spacesRes, sessionsRes] = await Promise.all([
    supabaseAdmin.from('programs').select('id, status').eq('tenant_id', tenantId),
    supabaseAdmin.from('applications').select('id, status').eq('tenant_id', tenantId),
    supabaseAdmin.from('startups').select('id').eq('tenant_id', tenantId),
    supabaseAdmin.from('spaces').select('id, status').eq('tenant_id', tenantId),
    supabaseAdmin.from('mentorship_sessions').select('id').eq('tenant_id', tenantId),
  ]);

  const programs = programsRes.data || [];
  const applications = appsRes.data || [];
  const spaces = spacesRes.data || [];

  res.json({
    report_type: 'executive_summary',
    generated_at: new Date().toISOString(),
    data: {
      programs: {
        total: programs.length,
        active: programs.filter((p) => p.status === 'active').length,
        open: programs.filter((p) => p.status === 'open').length,
      },
      applications: {
        total: applications.length,
        submitted: applications.filter((a) => a.status === 'submitted').length,
        under_review: applications.filter((a) => a.status === 'under_review').length,
        accepted: applications.filter((a) => a.status === 'accepted').length,
        rejected: applications.filter((a) => a.status === 'rejected').length,
      },
      startups: {
        total: (startupsRes.data || []).length,
      },
      facilities: {
        total_spaces: spaces.length,
        occupied: spaces.filter((s) => s.status === 'occupied').length,
        available: spaces.filter((s) => s.status === 'available').length,
        occupancy_rate: spaces.length > 0 ? parseFloat((spaces.filter((s) => s.status === 'occupied').length / spaces.length * 100).toFixed(1)) : 0,
      },
      mentorship: {
        total_sessions: (sessionsRes.data || []).length,
      },
    },
  });
});

// ═══════════════════════════════════════════
// Application Funnel Report
// ═══════════════════════════════════════════

reportRoutes.get('/application-funnel', requireRole('admin', 'reviewer'), async (req: TenantRequest, res: Response) => {
  const tenantId = req.tenant!.id;
  const programId = req.query.program_id as string;

  let query = supabaseAdmin
    .from('applications')
    .select('id, status, program_id, programs(title)')
    .eq('tenant_id', tenantId);

  if (programId) query = query.eq('program_id', programId);

  const { data: apps } = await query;
  if (!apps) return res.json({ funnel: [] });

  const stages = ['submitted', 'under_review', 'shortlisted', 'interview', 'accepted', 'rejected', 'withdrawn'];
  const funnel = stages.map((stage) => ({
    stage,
    count: apps.filter((a) => a.status === stage).length,
    percentage: apps.length > 0 ? parseFloat((apps.filter((a) => a.status === stage).length / apps.length * 100).toFixed(1)) : 0,
  }));

  res.json({
    report_type: 'application_funnel',
    generated_at: new Date().toISOString(),
    total_applications: apps.length,
    funnel,
  });
});

// ═══════════════════════════════════════════
// Facility Utilization Report
// ═══════════════════════════════════════════

reportRoutes.get('/facility-utilization', requireRole('admin', 'facility_manager'), async (req: TenantRequest, res: Response) => {
  const tenantId = req.tenant!.id;

  const [spacesRes, allocationsRes, bookingsRes] = await Promise.all([
    supabaseAdmin.from('spaces').select('*').eq('tenant_id', tenantId),
    supabaseAdmin.from('space_allocations').select('*').eq('tenant_id', tenantId).eq('status', 'active'),
    supabaseAdmin.from('bookings').select('*').eq('tenant_id', tenantId).gte('start_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const spaces = spacesRes.data || [];
  const allocations = allocationsRes.data || [];
  const bookings = bookingsRes.data || [];

  const types = [...new Set(spaces.map((s) => s.type))];
  const byType = types.map((type) => {
    const typeSpaces = spaces.filter((s) => s.type === type);
    return {
      type,
      total: typeSpaces.length,
      occupied: typeSpaces.filter((s) => s.status === 'occupied').length,
      utilization: typeSpaces.length > 0 ? parseFloat((typeSpaces.filter((s) => s.status === 'occupied').length / typeSpaces.length * 100).toFixed(1)) : 0,
    };
  });

  res.json({
    report_type: 'facility_utilization',
    generated_at: new Date().toISOString(),
    data: {
      summary: {
        total_spaces: spaces.length,
        occupied: spaces.filter((s) => s.status === 'occupied').length,
        available: spaces.filter((s) => s.status === 'available').length,
        occupancy_rate: spaces.length > 0 ? parseFloat((spaces.filter((s) => s.status === 'occupied').length / spaces.length * 100).toFixed(1)) : 0,
      },
      by_type: byType,
      active_allocations: allocations.length,
      bookings_last_30_days: bookings.length,
    },
  });
});

// ═══════════════════════════════════════════
// Milestone Progress Report
// ═══════════════════════════════════════════

reportRoutes.get('/milestone-progress', requireRole('admin', 'mentor'), async (req: TenantRequest, res: Response) => {
  const tenantId = req.tenant!.id;

  const { data: milestones } = await supabaseAdmin
    .from('milestones')
    .select('*, startups(company_name)')
    .eq('tenant_id', tenantId);

  if (!milestones) return res.json({ report_type: 'milestone_progress', data: {} });

  const total = milestones.length;
  const completed = milestones.filter((m) => m.status === 'completed').length;
  const inProgress = milestones.filter((m) => m.status === 'in_progress').length;
  const overdue = milestones.filter((m) => m.status !== 'completed' && new Date(m.due_date) < new Date()).length;

  // Group by startup
  const startupMap: Record<string, { name: string; total: number; completed: number }> = {};
  for (const m of milestones) {
    const name = (m as any).startups?.company_name || 'Unknown';
    if (!startupMap[m.startup_id]) startupMap[m.startup_id] = { name, total: 0, completed: 0 };
    startupMap[m.startup_id].total++;
    if (m.status === 'completed') startupMap[m.startup_id].completed++;
  }

  const byStartup = Object.entries(startupMap).map(([id, data]) => ({
    startup_id: id,
    startup_name: data.name,
    total: data.total,
    completed: data.completed,
    completion_rate: data.total > 0 ? parseFloat((data.completed / data.total * 100).toFixed(1)) : 0,
  })).sort((a, b) => b.completion_rate - a.completion_rate);

  res.json({
    report_type: 'milestone_progress',
    generated_at: new Date().toISOString(),
    data: {
      summary: { total, completed, in_progress: inProgress, overdue, completion_rate: total > 0 ? parseFloat((completed / total * 100).toFixed(1)) : 0 },
      by_startup: byStartup,
    },
  });
});
