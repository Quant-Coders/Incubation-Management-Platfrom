/** Module 4: Co-Working Space Allocation (DPR §5.4) — stub */
import { Router, Response } from 'express';
import { TenantRequest } from '../../middleware/tenant';
import { requireRole } from '../../middleware/auth';
import { supabaseAdmin } from '../../db/client';
export const facilityRoutes = Router();

facilityRoutes.get('/spaces', async (req: TenantRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('spaces').select('*').eq('tenant_id', req.tenant!.id).order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ spaces: data });
});

facilityRoutes.post('/spaces', requireRole('admin', 'facility_manager'), async (req: TenantRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('spaces').insert({ ...req.body, tenant_id: req.tenant!.id }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ space: data });
});

facilityRoutes.post('/allocate', requireRole('facility_manager'), async (req: TenantRequest, res: Response) => {
  const { space_id, startup_id, start_date, end_date } = req.body;
  const { data, error } = await supabaseAdmin
    .from('space_allocations')
    .insert({ tenant_id: req.tenant!.id, space_id, startup_id, allocated_by: req.user!.id, start_date, end_date })
    .select().single();
  if (error) return res.status(400).json({ error: error.message });
  // Update space status
  await supabaseAdmin.from('spaces').update({ status: 'occupied' }).eq('id', space_id);
  res.status(201).json({ allocation: data });
});
