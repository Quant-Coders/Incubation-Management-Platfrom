/**
 * Module 3: Incubation Lifecycle Management (DPR §5.3)
 *
 * Manages startup milestones, mentorship sessions, and progress tracking.
 */
import { Router, Response } from 'express';
import { TenantRequest } from '../../middleware/tenant';
import { requireRole } from '../../middleware/auth';
import { supabaseAdmin } from '../../db/client';

export const lifecycleRoutes = Router();

// ═══════════════════════════════════════════
// Startups
// ═══════════════════════════════════════════

lifecycleRoutes.get('/startups', async (req: TenantRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('startups')
    .select('*, applications(id, status, program_id, programs(title))')
    .eq('tenant_id', req.tenant!.id)
    .order('company_name');

  if (error) return res.status(500).json({ error: error.message });
  res.json({ startups: data });
});

lifecycleRoutes.get('/startups/:id', async (req: TenantRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('startups')
    .select('*')
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenant!.id)
    .single();

  if (error) return res.status(404).json({ error: 'Startup not found' });
  res.json({ startup: data });
});

// ═══════════════════════════════════════════
// Milestones
// ═══════════════════════════════════════════

lifecycleRoutes.get('/milestones/:startupId', async (req: TenantRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('milestones')
    .select('*')
    .eq('tenant_id', req.tenant!.id)
    .eq('startup_id', req.params.startupId)
    .order('due_date');

  if (error) return res.status(500).json({ error: error.message });
  res.json({ milestones: data });
});

lifecycleRoutes.post('/milestones', requireRole('admin', 'mentor'), async (req: TenantRequest, res: Response) => {
  const { startup_id, title, description, due_date, category } = req.body;

  const { data, error } = await supabaseAdmin
    .from('milestones')
    .insert({
      tenant_id: req.tenant!.id,
      startup_id,
      title,
      description,
      due_date,
      category: category || 'general',
      status: 'pending',
      progress: 0,
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  await supabaseAdmin.from('audit_logs').insert({
    tenant_id: req.tenant!.id,
    user_id: req.user!.id,
    action: 'milestone_created',
    entity_type: 'milestone',
    entity_id: data.id,
    metadata: { startup_id, title },
  });

  res.status(201).json({ milestone: data });
});

lifecycleRoutes.patch('/milestones/:id', requireRole('admin', 'mentor', 'startup'), async (req: TenantRequest, res: Response) => {
  const { status, progress, notes } = req.body;
  const updates: any = {};
  if (status) updates.status = status;
  if (progress !== undefined) updates.progress = progress;
  if (notes) updates.notes = notes;
  if (status === 'completed') updates.completed_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('milestones')
    .update(updates)
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenant!.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ milestone: data });
});

lifecycleRoutes.delete('/milestones/:id', requireRole('admin'), async (req: TenantRequest, res: Response) => {
  const { error } = await supabaseAdmin
    .from('milestones')
    .delete()
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenant!.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Milestone deleted' });
});

// ═══════════════════════════════════════════
// Mentorship Sessions
// ═══════════════════════════════════════════

lifecycleRoutes.get('/mentorship/:startupId', async (req: TenantRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('mentorship_sessions')
    .select('*, users!mentor_id(name, email)')
    .eq('tenant_id', req.tenant!.id)
    .eq('startup_id', req.params.startupId)
    .order('session_date', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ sessions: data });
});

lifecycleRoutes.post('/mentorship', requireRole('admin', 'mentor'), async (req: TenantRequest, res: Response) => {
  const { startup_id, mentor_id, session_date, duration_minutes, topic, notes, rating } = req.body;

  const { data, error } = await supabaseAdmin
    .from('mentorship_sessions')
    .insert({
      tenant_id: req.tenant!.id,
      startup_id,
      mentor_id: mentor_id || req.user!.id,
      session_date,
      duration_minutes: duration_minutes || 60,
      topic,
      notes,
      rating,
      status: 'completed',
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  await supabaseAdmin.from('audit_logs').insert({
    tenant_id: req.tenant!.id,
    user_id: req.user!.id,
    action: 'mentorship_logged',
    entity_type: 'mentorship_session',
    entity_id: data.id,
    metadata: { startup_id, topic },
  });

  res.status(201).json({ session: data });
});

lifecycleRoutes.patch('/mentorship/:id', requireRole('admin', 'mentor'), async (req: TenantRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('mentorship_sessions')
    .update(req.body)
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenant!.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ session: data });
});

// ═══════════════════════════════════════════
// Dashboard stats for lifecycle
// ═══════════════════════════════════════════

lifecycleRoutes.get('/stats', async (req: TenantRequest, res: Response) => {
  const tenantId = req.tenant!.id;

  const [startupsRes, milestonesRes, sessionsRes] = await Promise.all([
    supabaseAdmin.from('startups').select('id', { count: 'exact' }).eq('tenant_id', tenantId),
    supabaseAdmin.from('milestones').select('id, status').eq('tenant_id', tenantId),
    supabaseAdmin.from('mentorship_sessions').select('id', { count: 'exact' }).eq('tenant_id', tenantId),
  ]);

  const milestones = milestonesRes.data || [];
  const completed = milestones.filter((m) => m.status === 'completed').length;
  const completionRate = milestones.length > 0 ? Math.round((completed / milestones.length) * 100) : 0;

  res.json({
    total_startups: startupsRes.count || 0,
    total_milestones: milestones.length,
    completed_milestones: completed,
    milestone_completion_rate: completionRate,
    total_sessions: sessionsRes.count || 0,
  });
});
