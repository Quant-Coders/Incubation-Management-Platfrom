/**
 * IncuBase Express Backend — Modular Monolith
 * 
 * Entry point for the server-side application.
 * Mounts all module routes with auth and tenant middleware.
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authMiddleware } from './middleware/auth';
import { tenantMiddleware } from './middleware/tenant';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { programRoutes } from './modules/programs/routes';
import { applicationRoutes } from './modules/applications/routes';
import { lifecycleRoutes } from './modules/lifecycle/routes';
import { facilityRoutes } from './modules/facilities/routes';
import { analyticsRoutes } from './modules/analytics/routes';
import { reportRoutes } from './modules/reports/routes';
import { complianceRoutes } from './modules/compliance/routes';
import { aiRoutes } from './modules/ai/routes';

const app = express();
const PORT = process.env.PORT || 3001;

// ═══ Global Middleware ═══
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimitMiddleware);

// ═══ Health Check (public) ═══
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'incubase-api', timestamp: new Date().toISOString() });
});

// ═══ Protected Routes (auth + tenant required) ═══
app.use('/api/programs', authMiddleware, tenantMiddleware, programRoutes);
app.use('/api/applications', authMiddleware, tenantMiddleware, applicationRoutes);
app.use('/api/lifecycle', authMiddleware, tenantMiddleware, lifecycleRoutes);
app.use('/api/facilities', authMiddleware, tenantMiddleware, facilityRoutes);
app.use('/api/analytics', authMiddleware, tenantMiddleware, analyticsRoutes);
app.use('/api/reports', authMiddleware, tenantMiddleware, reportRoutes);
app.use('/api/compliance', authMiddleware, tenantMiddleware, complianceRoutes);

// ═══ AI Agent Routes (auth + tenant + admin/reviewer only) ═══
app.use('/api/ai', authMiddleware, tenantMiddleware, aiRoutes);

// ═══ Error Handler ═══
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[API Error]', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
  });
});

app.listen(PORT, () => {
  console.log(`[IncuBase API] Running on http://localhost:${PORT}`);
});

export default app;
