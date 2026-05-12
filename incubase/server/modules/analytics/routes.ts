/**
 * Module 5: Facility Utilization Analytics (DPR §5.5)
 *
 * Provides occupancy metrics, utilization breakdowns, and trend data.
 */
import { Router, Response } from 'express';
import { TenantRequest } from '../../middleware/tenant';
import { requireRole } from '../../middleware/auth';
import { supabaseAdmin } from '../../db/client';

export const analyticsRoutes = Router();

// ═══════════════════════════════════════════
// Overall Occupancy
// ═══════════════════════════════════════════

analyticsRoutes.get('/occupancy', requireRole('admin', 'facility_manager'), async (req: TenantRequest, res: Response) => {
  const { data: spaces } = await supabaseAdmin
    .from('spaces')
    .select('id, status, type, floor, capacity')
    .eq('tenant_id', req.tenant!.id);

  if (!spaces) return res.json({ total: 0, occupied: 0, available: 0, occupancy_rate: 0 });

  const total = spaces.length;
  const occupied = spaces.filter((s) => s.status === 'occupied').length;
  const available = spaces.filter((s) => s.status === 'available').length;
  const maintenance = spaces.filter((s) => s.status === 'maintenance').length;
  const reserved = spaces.filter((s) => s.status === 'reserved').length;

  res.json({
    total,
    occupied,
    available,
    maintenance,
    reserved,
    occupancy_rate: total > 0 ? parseFloat((occupied / total * 100).toFixed(1)) : 0,
    total_capacity: spaces.reduce((sum, s) => sum + (s.capacity || 1), 0),
  });
});

// ═══════════════════════════════════════════
// Breakdown by Type
// ═══════════════════════════════════════════

analyticsRoutes.get('/by-type', requireRole('admin', 'facility_manager'), async (req: TenantRequest, res: Response) => {
  const { data: spaces } = await supabaseAdmin
    .from('spaces')
    .select('type, status, capacity')
    .eq('tenant_id', req.tenant!.id);

  if (!spaces) return res.json({ breakdown: [] });

  const types = [...new Set(spaces.map((s) => s.type))];
  const breakdown = types.map((type) => {
    const typeSpaces = spaces.filter((s) => s.type === type);
    const total = typeSpaces.length;
    const occupied = typeSpaces.filter((s) => s.status === 'occupied').length;
    return {
      type,
      total,
      occupied,
      available: total - occupied,
      occupancy_rate: total > 0 ? parseFloat((occupied / total * 100).toFixed(1)) : 0,
      total_capacity: typeSpaces.reduce((sum, s) => sum + (s.capacity || 1), 0),
    };
  });

  res.json({ breakdown });
});

// ═══════════════════════════════════════════
// Breakdown by Floor
// ═══════════════════════════════════════════

analyticsRoutes.get('/by-floor', requireRole('admin', 'facility_manager'), async (req: TenantRequest, res: Response) => {
  const { data: spaces } = await supabaseAdmin
    .from('spaces')
    .select('floor, status, type, capacity')
    .eq('tenant_id', req.tenant!.id);

  if (!spaces) return res.json({ breakdown: [] });

  const floors = [...new Set(spaces.map((s) => s.floor))].sort();
  const breakdown = floors.map((floor) => {
    const floorSpaces = spaces.filter((s) => s.floor === floor);
    const total = floorSpaces.length;
    const occupied = floorSpaces.filter((s) => s.status === 'occupied').length;
    return {
      floor,
      total,
      occupied,
      available: total - occupied,
      occupancy_rate: total > 0 ? parseFloat((occupied / total * 100).toFixed(1)) : 0,
    };
  });

  res.json({ breakdown });
});

// ═══════════════════════════════════════════
// Booking Trends (time-series)
// ═══════════════════════════════════════════

analyticsRoutes.get('/booking-trends', requireRole('admin', 'facility_manager'), async (req: TenantRequest, res: Response) => {
  const days = parseInt(req.query.days as string) || 30;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('start_time, end_time, space_id')
    .eq('tenant_id', req.tenant!.id)
    .gte('start_time', startDate)
    .order('start_time');

  if (!bookings || bookings.length === 0) return res.json({ trends: [], total_bookings: 0 });

  // Group by day
  const dailyMap: Record<string, number> = {};
  for (const b of bookings) {
    const day = b.start_time.split('T')[0];
    dailyMap[day] = (dailyMap[day] || 0) + 1;
  }

  const trends = Object.entries(dailyMap).map(([date, count]) => ({ date, bookings: count })).sort((a, b) => a.date.localeCompare(b.date));

  // Peak hours analysis
  const hourCounts: Record<number, number> = {};
  for (const b of bookings) {
    const hour = new Date(b.start_time).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  }

  const peakHours = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([hour, count]) => ({ hour: parseInt(hour), bookings: count }));

  // Day of week analysis
  const dayCounts: Record<string, number> = {};
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  for (const b of bookings) {
    const dayName = dayNames[new Date(b.start_time).getDay()];
    dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
  }

  const dayBreakdown = dayNames.map((name) => ({ day: name, bookings: dayCounts[name] || 0 }));

  res.json({
    trends,
    total_bookings: bookings.length,
    peak_hours: peakHours,
    day_breakdown: dayBreakdown,
  });
});

// ═══════════════════════════════════════════
// Program Statistics
// ═══════════════════════════════════════════

analyticsRoutes.get('/programs', requireRole('admin'), async (req: TenantRequest, res: Response) => {
  const { data: programs } = await supabaseAdmin
    .from('programs')
    .select('id, title, status, max_intake')
    .eq('tenant_id', req.tenant!.id);

  if (!programs) return res.json({ programs: [] });

  const programStats = [];
  for (const p of programs) {
    const { count: appCount } = await supabaseAdmin
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('program_id', p.id);

    const { count: acceptedCount } = await supabaseAdmin
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('program_id', p.id)
      .eq('status', 'accepted');

    programStats.push({
      id: p.id,
      title: p.title,
      status: p.status,
      max_intake: p.max_intake,
      total_applications: appCount || 0,
      accepted: acceptedCount || 0,
      fill_rate: p.max_intake ? parseFloat(((acceptedCount || 0) / p.max_intake * 100).toFixed(1)) : 0,
    });
  }

  res.json({ programs: programStats });
});
