/**
 * AI Agent Routes (DPR §6.0)
 *
 * Exposes all 5 AI agents via REST endpoints.
 * All routes require admin or reviewer role.
 * Human-in-the-loop: all results are recommendations only.
 */

import { Router, Response } from 'express';
import { TenantRequest } from '../../middleware/tenant';
import { requireRole } from '../../middleware/auth';
import { supabaseAdmin } from '../../db/client';
import { summarizeApplication } from '../../agents/summarizer';
import { prescreenApplication, generateShortlist, EvaluationCriterion } from '../../agents/prescreener';
import { matchMentorsForStartup, MentorProfile, StartupProfile } from '../../agents/mentorMatcher';
import { predictFacilityUsage } from '../../agents/facilityPredictor';
import { analyzeStartupProgress } from '../../agents/progressInsights';

export const aiRoutes = Router();

function sanitizeAIError(err: any): string {
  const msg = err?.message || 'AI agent failed. Please try again.';
  if (msg.includes('rate') || msg.includes('quota') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    return 'AI service is temporarily busy due to rate limits. Please wait a moment and try again.';
  }
  if (msg.includes('API key') || msg.includes('GEMINI_API_KEY')) {
    return 'AI service is not configured. Please contact your administrator.';
  }
  if (msg.length > 200) {
    return 'AI agent encountered an error. Please try again in a few seconds.';
  }
  return msg;
}

// ═══════════════════════════════════════════
// Agent 1: Application Summarizer (§6.1)
// ═══════════════════════════════════════════

aiRoutes.post('/summarize/:applicationId', requireRole('admin', 'reviewer'), async (req: TenantRequest, res: Response) => {
  try {
    const { applicationId } = req.params;

    const { data: app, error: appErr } = await supabaseAdmin
      .from('applications')
      .select('*, startups(company_name), programs(title, evaluation_config)')
      .eq('id', applicationId)
      .eq('tenant_id', req.tenant!.id)
      .single();

    if (appErr || !app) return res.status(404).json({ error: 'Application not found' });

    const appText = JSON.stringify(app.form_data, null, 2);
    const programCriteria = app.programs?.evaluation_config
      ? JSON.stringify(app.programs.evaluation_config)
      : undefined;

    const summary = await summarizeApplication(appText, programCriteria);

    if (!summary) return res.status(500).json({ error: 'AI summarization failed. Please try again.' });

    // Persist the summary
    await supabaseAdmin.from('ai_summaries').insert({
      tenant_id: req.tenant!.id,
      application_id: applicationId,
      agent_type: 'summarizer',
      summary: summary.executive_summary,
      structured_data: summary,
      confidence: summary.confidence,
    });

    // Log the action
    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: req.tenant!.id,
      user_id: req.user!.id,
      action: 'ai_summarize',
      entity_type: 'application',
      entity_id: applicationId,
      metadata: { confidence: summary.confidence, agent: 'summarizer' },
    });

    res.json({ summary, application_id: applicationId, startup_name: app.startups?.company_name });
  } catch (err: any) {
    console.error('[AI Summarize Error]', err.message);
    res.status(500).json({ error: sanitizeAIError(err) });
  }
});

// GET past summaries for an application
aiRoutes.get('/summaries/:applicationId', requireRole('admin', 'reviewer'), async (req: TenantRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('ai_summaries')
    .select('*')
    .eq('tenant_id', req.tenant!.id)
    .eq('application_id', req.params.applicationId)
    .eq('agent_type', 'summarizer')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ summaries: data });
});

// ═══════════════════════════════════════════
// Agent 2: Pre-screener & Shortlister (§6.2)
// ═══════════════════════════════════════════

aiRoutes.post('/prescreen/:applicationId', requireRole('admin', 'reviewer'), async (req: TenantRequest, res: Response) => {
  try {
    const { applicationId } = req.params;

    const { data: app, error: appErr } = await supabaseAdmin
      .from('applications')
      .select('*, startups(company_name), programs(id)')
      .eq('id', applicationId)
      .eq('tenant_id', req.tenant!.id)
      .single();

    if (appErr || !app) return res.status(404).json({ error: 'Application not found' });

    // Fetch evaluation criteria for the program
    const { data: criteria } = await supabaseAdmin
      .from('evaluation_criteria')
      .select('*')
      .eq('tenant_id', req.tenant!.id)
      .eq('program_id', app.programs?.id);

    const evalCriteria: EvaluationCriterion[] = (criteria || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      weight: c.weight,
      max_score: c.max_score,
    }));

    // Use default criteria if none defined
    const effectiveCriteria = evalCriteria.length > 0 ? evalCriteria : [
      { id: 'innovation', name: 'Innovation & Uniqueness', description: 'How novel is the solution?', weight: 25, max_score: 10 },
      { id: 'market', name: 'Market Potential', description: 'Size and accessibility of target market', weight: 25, max_score: 10 },
      { id: 'team', name: 'Team Capability', description: 'Relevant experience and skills', weight: 20, max_score: 10 },
      { id: 'feasibility', name: 'Technical Feasibility', description: 'Can it be built and scaled?', weight: 15, max_score: 10 },
      { id: 'impact', name: 'Social/Economic Impact', description: 'Positive impact on society', weight: 15, max_score: 10 },
    ];

    const appText = JSON.stringify(app.form_data, null, 2);
    const result = await prescreenApplication(
      applicationId,
      app.startups?.company_name || 'Unknown',
      appText,
      effectiveCriteria
    );

    if (!result) return res.status(500).json({ error: 'AI pre-screening failed. Please try again.' });

    // Persist
    await supabaseAdmin.from('ai_summaries').insert({
      tenant_id: req.tenant!.id,
      application_id: applicationId,
      agent_type: 'prescreener',
      summary: `Score: ${result.percentage}% — ${result.recommendation}`,
      structured_data: result,
      confidence: result.confidence,
    });

    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: req.tenant!.id,
      user_id: req.user!.id,
      action: 'ai_prescreen',
      entity_type: 'application',
      entity_id: applicationId,
      metadata: { percentage: result.percentage, recommendation: result.recommendation },
    });

    res.json({ result, application_id: applicationId });
  } catch (err: any) {
    console.error('[AI Prescreen Error]', err.message);
    res.status(500).json({ error: sanitizeAIError(err) });
  }
});

// POST batch shortlist for a program
aiRoutes.post('/shortlist/:programId', requireRole('admin'), async (req: TenantRequest, res: Response) => {
  try {
    const { programId } = req.params;

    const { data: apps } = await supabaseAdmin
      .from('applications')
      .select('*, startups(company_name)')
      .eq('tenant_id', req.tenant!.id)
      .eq('program_id', programId)
      .in('status', ['submitted', 'under_review']);

    if (!apps || apps.length === 0) return res.status(404).json({ error: 'No applications found for this program' });

    const { data: criteria } = await supabaseAdmin
      .from('evaluation_criteria')
      .select('*')
      .eq('tenant_id', req.tenant!.id)
      .eq('program_id', programId);

    const evalCriteria: EvaluationCriterion[] = (criteria || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      weight: c.weight,
      max_score: c.max_score,
    }));

    const effectiveCriteria = evalCriteria.length > 0 ? evalCriteria : [
      { id: 'innovation', name: 'Innovation & Uniqueness', description: 'How novel is the solution?', weight: 25, max_score: 10 },
      { id: 'market', name: 'Market Potential', description: 'Size and accessibility of target market', weight: 25, max_score: 10 },
      { id: 'team', name: 'Team Capability', description: 'Relevant experience and skills', weight: 20, max_score: 10 },
      { id: 'feasibility', name: 'Technical Feasibility', description: 'Can it be built and scaled?', weight: 15, max_score: 10 },
      { id: 'impact', name: 'Social/Economic Impact', description: 'Positive impact on society', weight: 15, max_score: 10 },
    ];

    const applicationData = apps.map((a: any) => ({
      id: a.id,
      startup_name: a.startups?.company_name || 'Unknown',
      text: JSON.stringify(a.form_data, null, 2),
    }));

    const shortlist = await generateShortlist(applicationData, effectiveCriteria);

    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: req.tenant!.id,
      user_id: req.user!.id,
      action: 'ai_shortlist',
      entity_type: 'program',
      entity_id: programId,
      metadata: { applications_screened: apps.length, shortlist_count: shortlist.length },
    });

    res.json({ shortlist, total_screened: apps.length });
  } catch (err: any) {
    console.error('[AI Shortlist Error]', err.message);
    res.status(500).json({ error: sanitizeAIError(err) });
  }
});

// ═══════════════════════════════════════════
// Agent 3: Mentor-Startup Matcher (§6.3)
// ═══════════════════════════════════════════

aiRoutes.post('/mentor-match/:startupId', requireRole('admin', 'reviewer'), async (req: TenantRequest, res: Response) => {
  try {
    const { startupId } = req.params;
    const { top_n = 5 } = req.body;

    // Get startup profile
    const { data: startup, error: startupErr } = await supabaseAdmin
      .from('startups')
      .select('*')
      .eq('id', startupId)
      .eq('tenant_id', req.tenant!.id)
      .single();

    if (startupErr || !startup) return res.status(404).json({ error: 'Startup not found' });

    // Get all mentors in this tenant
    const { data: mentorUsers } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('tenant_id', req.tenant!.id)
      .eq('role', 'mentor');

    if (!mentorUsers || mentorUsers.length === 0) {
      return res.status(404).json({ error: 'No mentors available in this organization' });
    }

    const mentorProfiles: MentorProfile[] = mentorUsers.map((m: any) => ({
      id: m.id,
      name: m.name,
      skills: m.metadata?.skills || ['business strategy', 'fundraising'],
      industries: m.metadata?.industries || ['technology'],
      experience_years: m.metadata?.experience_years || 5,
      availability: m.metadata?.availability || '2 sessions/month',
      bio: m.metadata?.bio || `${m.name} is a mentor at this incubator.`,
    }));

    const startupProfile: StartupProfile = {
      id: startup.id,
      company_name: startup.company_name,
      sector: startup.sector || 'technology',
      stage: startup.stage || 'idea',
      needs: startup.metadata?.needs || ['business strategy', 'technical guidance'],
      description: startup.description || startup.company_name,
    };

    const matches = await matchMentorsForStartup(startupProfile, mentorProfiles, top_n);

    await supabaseAdmin.from('ai_summaries').insert({
      tenant_id: req.tenant!.id,
      application_id: startupId,
      agent_type: 'mentor_matcher',
      summary: `Found ${matches.length} mentor matches for ${startup.company_name}`,
      structured_data: matches,
      confidence: matches.length > 0 ? matches[0].match_score / 100 : 0,
    });

    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: req.tenant!.id,
      user_id: req.user!.id,
      action: 'ai_mentor_match',
      entity_type: 'startup',
      entity_id: startupId,
      metadata: { matches_found: matches.length },
    });

    res.json({ matches, startup_name: startup.company_name });
  } catch (err: any) {
    console.error('[AI Mentor Match Error]', err.message);
    res.status(500).json({ error: sanitizeAIError(err) });
  }
});

// ═══════════════════════════════════════════
// Agent 4: Facility Predictor (§6.4)
// ═══════════════════════════════════════════

aiRoutes.post('/facility-predict', requireRole('admin', 'facility_manager'), async (req: TenantRequest, res: Response) => {
  try {
    const { forecast_period = 'next 7 days' } = req.body;

    // Get space inventory
    const { data: spaces } = await supabaseAdmin
      .from('spaces')
      .select('*')
      .eq('tenant_id', req.tenant!.id);

    if (!spaces || spaces.length === 0) return res.status(404).json({ error: 'No spaces configured' });

    // Get historical booking data (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('tenant_id', req.tenant!.id)
      .gte('start_time', thirtyDaysAgo)
      .order('start_time');

    // Get space allocations
    const { data: allocations } = await supabaseAdmin
      .from('space_allocations')
      .select('*')
      .eq('tenant_id', req.tenant!.id)
      .eq('status', 'active');

    const spaceInventory = spaces.map((s: any) =>
      `${s.name} (${s.type}, Floor: ${s.floor}, Status: ${s.status}, Capacity: ${s.capacity})`
    ).join('\n');

    const historicalData = [
      `Total spaces: ${spaces.length}`,
      `Currently occupied: ${spaces.filter((s: any) => s.status === 'occupied').length}`,
      `Active allocations: ${allocations?.length || 0}`,
      `Bookings in last 30 days: ${bookings?.length || 0}`,
      bookings && bookings.length > 0
        ? `Booking patterns:\n${bookings.slice(0, 50).map((b: any) => `  ${b.start_time} - ${b.end_time} (Space: ${b.space_id})`).join('\n')}`
        : 'No recent booking history available.',
    ].join('\n');

    const prediction = await predictFacilityUsage(historicalData, spaceInventory, forecast_period);

    if (!prediction) return res.status(500).json({ error: 'Facility prediction failed. Please try again.' });

    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: req.tenant!.id,
      user_id: req.user!.id,
      action: 'ai_facility_predict',
      entity_type: 'facility',
      entity_id: req.tenant!.id,
      metadata: { forecast_period, capacity_alert: prediction.capacity_alert },
    });

    res.json({ prediction, spaces_analyzed: spaces.length });
  } catch (err: any) {
    console.error('[AI Facility Predict Error]', err.message);
    res.status(500).json({ error: sanitizeAIError(err) });
  }
});

// ═══════════════════════════════════════════
// Agent 5: Progress Insights (§6.5)
// ═══════════════════════════════════════════

aiRoutes.post('/progress/:startupId', requireRole('admin', 'reviewer', 'mentor'), async (req: TenantRequest, res: Response) => {
  try {
    const { startupId } = req.params;

    const { data: startup } = await supabaseAdmin
      .from('startups')
      .select('*')
      .eq('id', startupId)
      .eq('tenant_id', req.tenant!.id)
      .single();

    if (!startup) return res.status(404).json({ error: 'Startup not found' });

    // Fetch milestones
    const { data: milestones } = await supabaseAdmin
      .from('milestones')
      .select('*')
      .eq('tenant_id', req.tenant!.id)
      .eq('startup_id', startupId)
      .order('due_date');

    // Fetch mentorship sessions
    const { data: sessions } = await supabaseAdmin
      .from('mentorship_sessions')
      .select('*, users!mentor_id(name)')
      .eq('tenant_id', req.tenant!.id)
      .eq('startup_id', startupId)
      .order('session_date', { ascending: false })
      .limit(20);

    const milestoneData = milestones && milestones.length > 0
      ? milestones.map((m: any) => `- ${m.title} (Status: ${m.status}, Due: ${m.due_date}, Progress: ${m.progress || 0}%)`).join('\n')
      : 'No milestones defined yet.';

    const mentorFeedback = sessions && sessions.length > 0
      ? sessions.map((s: any) => `- ${s.session_date} with ${s.users?.name || 'Unknown'}: ${s.notes || 'No notes'} (Rating: ${s.rating || 'N/A'})`).join('\n')
      : 'No mentorship sessions recorded yet.';

    const insight = await analyzeStartupProgress(
      startup.company_name,
      startupId,
      milestoneData,
      mentorFeedback
    );

    if (!insight) return res.status(500).json({ error: 'Progress analysis failed. Please try again.' });

    await supabaseAdmin.from('ai_summaries').insert({
      tenant_id: req.tenant!.id,
      application_id: startupId,
      agent_type: 'progress_insights',
      summary: `${startup.company_name}: ${insight.status} (${insight.milestone_completion_rate}% milestones complete)`,
      structured_data: insight,
      confidence: insight.confidence,
    });

    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: req.tenant!.id,
      user_id: req.user!.id,
      action: 'ai_progress_insight',
      entity_type: 'startup',
      entity_id: startupId,
      metadata: { status: insight.status, completion_rate: insight.milestone_completion_rate },
    });

    res.json({ insight, startup_name: startup.company_name });
  } catch (err: any) {
    console.error('[AI Progress Error]', err.message);
    res.status(500).json({ error: sanitizeAIError(err) });
  }
});

// ═══════════════════════════════════════════
// Batch: Analyze all startups in a program
// ═══════════════════════════════════════════

aiRoutes.post('/progress-batch/:programId', requireRole('admin'), async (req: TenantRequest, res: Response) => {
  try {
    const { programId } = req.params;

    const { data: apps } = await supabaseAdmin
      .from('applications')
      .select('startup_id, startups(id, company_name)')
      .eq('tenant_id', req.tenant!.id)
      .eq('program_id', programId)
      .eq('status', 'accepted');

    if (!apps || apps.length === 0) return res.status(404).json({ error: 'No accepted startups in this program' });

    const insights = [];
    for (const app of apps) {
      const startup = (app as any).startups;
      if (!startup) continue;

      const { data: milestones } = await supabaseAdmin
        .from('milestones')
        .select('*')
        .eq('tenant_id', req.tenant!.id)
        .eq('startup_id', startup.id);

      const { data: sessions } = await supabaseAdmin
        .from('mentorship_sessions')
        .select('*, users!mentor_id(name)')
        .eq('tenant_id', req.tenant!.id)
        .eq('startup_id', startup.id)
        .limit(10);

      const milestoneData = milestones && milestones.length > 0
        ? milestones.map((m: any) => `- ${m.title} (${m.status}, Due: ${m.due_date})`).join('\n')
        : 'No milestones.';

      const mentorFeedback = sessions && sessions.length > 0
        ? sessions.map((s: any) => `- ${s.session_date}: ${s.notes || 'No notes'}`).join('\n')
        : 'No sessions.';

      const insight = await analyzeStartupProgress(startup.company_name, startup.id, milestoneData, mentorFeedback);
      if (insight) insights.push(insight);
    }

    res.json({ insights, total_analyzed: insights.length });
  } catch (err: any) {
    console.error('[AI Progress Batch Error]', err.message);
    res.status(500).json({ error: sanitizeAIError(err) });
  }
});
