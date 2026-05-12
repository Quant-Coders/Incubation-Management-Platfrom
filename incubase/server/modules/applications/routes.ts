/**
 * Module 2: Startup Application & Evaluation Routes (DPR §5.2)
 */
import { Router, Response } from 'express';
import { TenantRequest } from '../../middleware/tenant';
import { requireRole } from '../../middleware/auth';
import { supabaseAdmin } from '../../db/client';
import { summarizeApplication } from '../../agents/summarizer';
import { prescreenApplication } from '../../agents/prescreener';

export const applicationRoutes = Router();

// GET /api/applications — List applications (filtered by role)
applicationRoutes.get('/', async (req: TenantRequest, res: Response) => {
  let query = supabaseAdmin
    .from('applications')
    .select('*, startups(company_name), programs(title)')
    .eq('tenant_id', req.tenant!.id)
    .order('submitted_at', { ascending: false });

  // Startups only see their own applications
  if (req.user!.role === 'startup') {
    const { data: startup } = await supabaseAdmin
      .from('startups').select('id').eq('user_id', req.user!.id).single();
    if (startup) query = query.eq('startup_id', startup.id);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ applications: data });
});

// POST /api/applications — Submit application (startup only)
applicationRoutes.post('/', requireRole('startup'), async (req: TenantRequest, res: Response) => {
  const { program_id, form_data } = req.body;

  // Get or create startup profile
  let { data: startup } = await supabaseAdmin
    .from('startups').select('id').eq('user_id', req.user!.id).single();

  if (!startup) {
    const { data: newStartup, error: startupErr } = await supabaseAdmin
      .from('startups')
      .insert({ tenant_id: req.tenant!.id, user_id: req.user!.id, company_name: req.body.company_name || 'My Startup' })
      .select().single();
    if (startupErr) return res.status(400).json({ error: startupErr.message });
    startup = newStartup;
  }

  const { data, error } = await supabaseAdmin
    .from('applications')
    .insert({
      tenant_id: req.tenant!.id,
      startup_id: startup!.id,
      program_id,
      form_data: form_data || {},
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    })
    .select().single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ application: data });
});

// POST /api/applications/:id/summarize — AI summarization (admin/reviewer)
applicationRoutes.post('/:id/summarize', requireRole('admin', 'reviewer'), async (req: TenantRequest, res: Response) => {
  const { data: app } = await supabaseAdmin
    .from('applications')
    .select('*, startups(company_name)')
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenant!.id)
    .single();

  if (!app) return res.status(404).json({ error: 'Application not found' });

  const appText = JSON.stringify(app.form_data, null, 2);
  const summary = await summarizeApplication(appText);

  if (!summary) return res.status(500).json({ error: 'AI summarization failed' });

  // Save AI summary
  await supabaseAdmin.from('ai_summaries').insert({
    tenant_id: req.tenant!.id,
    application_id: app.id,
    agent_type: 'summarizer',
    summary: summary.executive_summary,
    structured_data: summary,
    confidence: summary.confidence,
  });

  res.json({ summary });
});

// POST /api/applications/:id/evaluate — Submit evaluation (reviewer only)
applicationRoutes.post('/:id/evaluate', requireRole('reviewer'), async (req: TenantRequest, res: Response) => {
  const { scores, comments, round } = req.body;

  // Calculate weighted total
  const { data: criteria } = await supabaseAdmin
    .from('evaluation_criteria')
    .select('id, weight, max_score')
    .eq('tenant_id', req.tenant!.id);

  let weightedTotal = 0;
  if (criteria && scores) {
    for (const c of criteria) {
      const score = scores[c.id] || 0;
      weightedTotal += (score / c.max_score) * c.weight;
    }
  }

  const { data, error } = await supabaseAdmin
    .from('evaluations')
    .insert({
      tenant_id: req.tenant!.id,
      application_id: req.params.id,
      reviewer_id: req.user!.id,
      round: round || 1,
      scores,
      comments,
      weighted_total: weightedTotal,
      submitted_at: new Date().toISOString(),
    })
    .select().single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ evaluation: data });
});
