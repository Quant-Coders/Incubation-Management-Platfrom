/**
 * Module 7: Security & Compliance (DPR §5.7)
 *
 * Audit logs, RBAC management, and compliance reporting.
 */
import { Router, Response } from 'express';
import { TenantRequest } from '../../middleware/tenant';
import { requireRole } from '../../middleware/auth';
import { supabaseAdmin } from '../../db/client';

export const complianceRoutes = Router();

// ═══════════════════════════════════════════
// Audit Logs
// ═══════════════════════════════════════════

complianceRoutes.get('/audit-logs', requireRole('admin'), async (req: TenantRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;
  const action = req.query.action as string;
  const entity_type = req.query.entity_type as string;
  const user_id = req.query.user_id as string;

  let query = supabaseAdmin
    .from('audit_logs')
    .select('*, users!user_id(name, email)', { count: 'exact' })
    .eq('tenant_id', req.tenant!.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (action) query = query.eq('action', action);
  if (entity_type) query = query.eq('entity_type', entity_type);
  if (user_id) query = query.eq('user_id', user_id);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ logs: data, total: count });
});

// ═══════════════════════════════════════════
// User Management (RBAC)
// ═══════════════════════════════════════════

complianceRoutes.get('/users', requireRole('admin'), async (req: TenantRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, name, role, created_at, avatar_url')
    .eq('tenant_id', req.tenant!.id)
    .order('name');

  if (error) return res.status(500).json({ error: error.message });
  res.json({ users: data });
});

complianceRoutes.patch('/users/:id/role', requireRole('admin'), async (req: TenantRequest, res: Response) => {
  const { role } = req.body;
  const validRoles = ['admin', 'facility_manager', 'reviewer', 'mentor', 'startup'];

  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
  }

  // Prevent self-demotion
  if (req.params.id === req.user!.id) {
    return res.status(400).json({ error: 'Cannot change your own role' });
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ role })
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenant!.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  await supabaseAdmin.from('audit_logs').insert({
    tenant_id: req.tenant!.id,
    user_id: req.user!.id,
    action: 'role_changed',
    entity_type: 'user',
    entity_id: req.params.id,
    metadata: { new_role: role, changed_by: req.user!.name },
  });

  res.json({ user: data });
});

// ═══════════════════════════════════════════
// Compliance Stats
// ═══════════════════════════════════════════

complianceRoutes.get('/stats', requireRole('admin'), async (req: TenantRequest, res: Response) => {
  const tenantId = req.tenant!.id;

  const [usersRes, logsRes, aiLogsRes] = await Promise.all([
    supabaseAdmin.from('users').select('role').eq('tenant_id', tenantId),
    supabaseAdmin.from('audit_logs').select('id', { count: 'exact' }).eq('tenant_id', tenantId),
    supabaseAdmin.from('audit_logs').select('id', { count: 'exact' }).eq('tenant_id', tenantId).like('action', 'ai_%'),
  ]);

  const users = usersRes.data || [];
  const roleBreakdown: Record<string, number> = {};
  for (const u of users) {
    roleBreakdown[u.role] = (roleBreakdown[u.role] || 0) + 1;
  }

  res.json({
    total_users: users.length,
    role_breakdown: roleBreakdown,
    total_audit_entries: logsRes.count || 0,
    ai_actions: aiLogsRes.count || 0,
  });
});
