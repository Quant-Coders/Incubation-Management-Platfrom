/**
 * Module 1: Program Management Routes (DPR §5.1)
 */
import { Router, Response } from 'express';
import { TenantRequest } from '../../middleware/tenant';
import { requireRole } from '../../middleware/auth';
import { supabaseAdmin } from '../../db/client';

export const programRoutes = Router();

// GET /api/programs — List all programs for tenant
programRoutes.get('/', async (req: TenantRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('programs')
    .select('*')
    .eq('tenant_id', req.tenant!.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ programs: data });
});

// GET /api/programs/:id — Get single program
programRoutes.get('/:id', async (req: TenantRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('programs')
    .select('*')
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenant!.id)
    .single();

  if (error) return res.status(404).json({ error: 'Program not found' });
  res.json({ program: data });
});

// POST /api/programs — Create program (admin only)
programRoutes.post('/', requireRole('admin'), async (req: TenantRequest, res: Response) => {
  const { title, description, start_date, end_date, application_deadline, form_schema, evaluation_config, max_intake } = req.body;

  const { data, error } = await supabaseAdmin
    .from('programs')
    .insert({
      tenant_id: req.tenant!.id,
      created_by: req.user!.id,
      title,
      description,
      start_date,
      end_date,
      application_deadline,
      form_schema: form_schema || [],
      evaluation_config: evaluation_config || {},
      max_intake,
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ program: data });
});

// PATCH /api/programs/:id — Update program (admin only)
programRoutes.patch('/:id', requireRole('admin'), async (req: TenantRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('programs')
    .update(req.body)
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenant!.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ program: data });
});

// DELETE /api/programs/:id — Archive program (admin only)
programRoutes.delete('/:id', requireRole('admin'), async (req: TenantRequest, res: Response) => {
  const { error } = await supabaseAdmin
    .from('programs')
    .update({ status: 'archived' })
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenant!.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Program archived' });
});
