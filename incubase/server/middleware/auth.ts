/**
 * Auth Middleware
 * Verifies Supabase JWT tokens and extracts user info.
 * Attaches user data to request for downstream use.
 */

import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../db/client';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenant_id: string;
  };
  accessToken?: string;
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verify the JWT with Supabase
    const { data: { user: authUser }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !authUser) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Fetch user profile with role and tenant info
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, tenant_id')
      .eq('id', authUser.id)
      .single();

    if (profileError || !userProfile) {
      res.status(403).json({ error: 'User profile not found. Please complete registration.' });
      return;
    }

    if (!userProfile.tenant_id) {
      res.status(403).json({ error: 'User is not associated with any organization.' });
      return;
    }

    // Attach user info to request
    req.user = {
      id: userProfile.id,
      email: userProfile.email,
      name: userProfile.name,
      role: userProfile.role,
      tenant_id: userProfile.tenant_id,
    };
    req.accessToken = token;

    next();
  } catch (err) {
    console.error('[Auth Middleware Error]', err);
    res.status(500).json({ error: 'Authentication service error' });
  }
}

/**
 * Role-based access control middleware factory.
 * Usage: requireRole('admin', 'facility_manager')
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`,
      });
      return;
    }

    next();
  };
}
