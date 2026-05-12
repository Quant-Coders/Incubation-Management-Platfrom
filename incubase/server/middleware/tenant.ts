/**
 * Tenant Middleware
 * Ensures tenant context is available for all requests.
 * Fetches tenant info and attaches it to the request.
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { supabaseAdmin } from '../db/client';

export interface TenantRequest extends AuthenticatedRequest {
  tenant?: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  };
}

export async function tenantMiddleware(
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user?.tenant_id) {
      res.status(403).json({ error: 'No tenant context available' });
      return;
    }

    // Fetch tenant details
    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select('id, name, slug, plan')
      .eq('id', req.user.tenant_id)
      .single();

    if (error || !tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    req.tenant = {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
    };

    next();
  } catch (err) {
    console.error('[Tenant Middleware Error]', err);
    res.status(500).json({ error: 'Tenant resolution error' });
  }
}
