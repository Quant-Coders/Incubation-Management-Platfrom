/**
 * Analytics Page — Facility utilization, booking trends, and program stats.
 */
import React, { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/lib/store';
import {
  BarChart3, Loader2, AlertCircle, TrendingUp, Building2,
  Layers, Clock, Calendar, Users, PieChart, DraftingCompass
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface OccupancyData {
  total: number;
  occupied: number;
  available: number;
  maintenance: number;
  reserved: number;
  occupancy_rate: number;
  total_capacity: number;
}

interface TypeBreakdown {
  type: string;
  total: number;
  occupied: number;
  available: number;
  occupancy_rate: number;
  total_capacity: number;
}

interface FloorBreakdown {
  floor: string;
  total: number;
  occupied: number;
  available: number;
  occupancy_rate: number;
}

interface BookingTrend {
  date: string;
  bookings: number;
}

interface PeakHour {
  hour: number;
  bookings: number;
}

interface DayBreakdown {
  day: string;
  bookings: number;
}

const API_BASE = '/api/analytics';

interface ProgramStat { id: string; title: string; status: string; max_intake: number | null; total_applications: number; accepted: number; fill_rate: number; }

const typeLabels: Record<string, string> = {
  seat: 'Seats',
  cabin: 'Cabins',
  meeting_room: 'Meeting Rooms',
};

export const AnalyticsPage: React.FC = () => {
  const session = useAuthStore((s) => s.session);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [occupancy, setOccupancy] = useState<OccupancyData | null>(null);
  const [typeBreakdown, setTypeBreakdown] = useState<TypeBreakdown[]>([]);
  const [floorBreakdown, setFloorBreakdown] = useState<FloorBreakdown[]>([]);
  const [bookingTrends, setBookingTrends] = useState<BookingTrend[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHour[]>([]);
  const [dayBreakdown, setDayBreakdown] = useState<DayBreakdown[]>([]);
  const [totalBookings, setTotalBookings] = useState(0);
  const [programStats, setProgramStats] = useState<ProgramStat[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  });

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');

    try {
      const [occRes, typeRes, floorRes, trendRes, progRes] = await Promise.all([
        fetch(`${API_BASE}/occupancy`, { headers: getHeaders() }),
        fetch(`${API_BASE}/by-type`, { headers: getHeaders() }),
        fetch(`${API_BASE}/by-floor`, { headers: getHeaders() }),
        fetch(`${API_BASE}/booking-trends?days=30`, { headers: getHeaders() }),
        fetch(`${API_BASE}/programs`, { headers: getHeaders() }),
      ]);

      if (occRes.ok) setOccupancy(await occRes.json());
      if (typeRes.ok) { const d = await typeRes.json(); setTypeBreakdown(d.breakdown || []); }
      if (floorRes.ok) { const d = await floorRes.json(); setFloorBreakdown(d.breakdown || []); }
      if (trendRes.ok) {
        const d = await trendRes.json();
        setBookingTrends(d.trends || []);
        setPeakHours(d.peak_hours || []);
        setDayBreakdown(d.day_breakdown || []);
        setTotalBookings(d.total_bookings || 0);
      }
      if (progRes.ok) { const d = await progRes.json(); setProgramStats(d.programs || []); }
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const maxBookings = Math.max(...bookingTrends.map((t) => t.bookings), 1);
  const maxDayBookings = Math.max(...dayBreakdown.map((d) => d.bookings), 1);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-headline font-bold flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-primary" />
          Analytics
        </h1>
        <p className="text-on-surface-variant text-sm mt-1">
          Facility utilization metrics, booking trends, and capacity insights
        </p>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-sm text-error flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Occupancy Overview */}
      {occupancy && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard value={occupancy.total} label="Total Spaces" icon={Building2} />
          <StatCard value={occupancy.occupied} label="Occupied" icon={Users} color="text-primary" />
          <StatCard value={occupancy.available} label="Available" icon={Building2} color="text-green-400" />
          <StatCard value={occupancy.maintenance} label="Maintenance" icon={Building2} color="text-error" />
          <div className="glass-card p-5">
            <p className="text-3xl font-headline font-bold text-gradient">{occupancy.occupancy_rate}%</p>
            <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wide mt-1">Occupancy Rate</p>
            <div className="mt-3 h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-700" style={{ width: `${occupancy.occupancy_rate}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Type Breakdown */}
      {typeBreakdown.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-headline font-bold text-lg mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary" /> Utilization by Space Type
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {typeBreakdown.map((t) => (
              <div key={t.type} className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-sm">{typeLabels[t.type] || t.type}</span>
                  <span className="text-xs text-on-surface-variant">{t.occupied}/{t.total}</span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden mb-2">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      t.occupancy_rate > 80 ? 'bg-error' :
                      t.occupancy_rate > 50 ? 'bg-amber-500' : 'bg-green-500'
                    )}
                    style={{ width: `${t.occupancy_rate}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-on-surface-variant">
                  <span>{t.occupancy_rate}% occupied</span>
                  <span>Capacity: {t.total_capacity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floor Breakdown */}
      {floorBreakdown.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-headline font-bold text-lg mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" /> Occupancy by Floor
          </h3>
          <div className="space-y-3">
            {floorBreakdown.map((f) => (
              <div key={f.floor} className="flex items-center gap-4">
                <span className="text-sm font-bold w-28 truncate">{f.floor}</span>
                <div className="flex-1 h-8 bg-white/5 rounded-lg overflow-hidden relative">
                  <div
                    className="h-full bg-primary/30 rounded-lg transition-all duration-700 flex items-center px-3"
                    style={{ width: `${f.occupancy_rate}%` }}
                  >
                    <span className="text-[10px] font-bold whitespace-nowrap">{f.occupied}/{f.total} occupied</span>
                  </div>
                </div>
                <span className="text-sm font-bold w-14 text-right">{f.occupancy_rate}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Booking Trends Chart */}
      {bookingTrends.length > 0 && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline font-bold text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Booking Trends (30 days)
            </h3>
            <span className="text-xs text-on-surface-variant">{totalBookings} total bookings</span>
          </div>
          <div className="flex items-end gap-1 h-40">
            {bookingTrends.map((t, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                <div
                  className="w-full bg-primary/40 hover:bg-primary/70 rounded-t transition-all duration-200 min-h-[2px]"
                  style={{ height: `${(t.bookings / maxBookings) * 100}%` }}
                />
                <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                  <div className="bg-surface-container-highest rounded-lg px-2 py-1 text-[10px] whitespace-nowrap border border-white/10">
                    {t.date}: {t.bookings}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-on-surface-variant">
            <span>{bookingTrends[0]?.date}</span>
            <span>{bookingTrends[bookingTrends.length - 1]?.date}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Peak Hours */}
        {peakHours.length > 0 && (
          <div className="glass-card p-6">
            <h3 className="font-headline font-bold text-lg mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Peak Hours
            </h3>
            <div className="space-y-3">
              {peakHours.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm font-mono w-16">{String(p.hour).padStart(2, '0')}:00</span>
                  <div className="flex-1 h-6 bg-white/5 rounded overflow-hidden">
                    <div
                      className="h-full bg-secondary/40 rounded flex items-center px-2"
                      style={{ width: `${(p.bookings / peakHours[0].bookings) * 100}%` }}
                    >
                      <span className="text-[10px] font-bold">{p.bookings}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Day of Week */}
        {dayBreakdown.length > 0 && (
          <div className="glass-card p-6">
            <h3 className="font-headline font-bold text-lg mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Bookings by Day
            </h3>
            <div className="space-y-3">
              {dayBreakdown.map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm w-24">{d.day.slice(0, 3)}</span>
                  <div className="flex-1 h-6 bg-white/5 rounded overflow-hidden">
                    <div
                      className="h-full bg-tertiary/40 rounded flex items-center px-2"
                      style={{ width: `${maxDayBookings > 0 ? (d.bookings / maxDayBookings) * 100 : 0}%` }}
                    >
                      <span className="text-[10px] font-bold">{d.bookings}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Program Statistics */}
      {programStats.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-headline font-bold text-lg mb-4 flex items-center gap-2">
            <DraftingCompass className="w-5 h-5 text-primary" /> Program Statistics
          </h3>
          <div className="space-y-3">
            {programStats.map((p) => (
              <div key={p.id} className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-bold text-sm">{p.title}</span>
                    <span className={cn(
                      "ml-3 text-[10px] font-bold px-2 py-0.5 rounded-full",
                      p.status === 'active' ? 'bg-primary/20 text-primary' :
                      p.status === 'open' ? 'bg-green-500/20 text-green-400' :
                      'bg-white/10 text-on-surface-variant'
                    )}>
                      {p.status}
                    </span>
                  </div>
                  <span className="text-xs text-on-surface-variant">{p.accepted}/{p.max_intake || '∞'} accepted</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                  <span>{p.total_applications} applications</span>
                  {p.max_intake && (
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                        style={{ width: `${Math.min(p.fill_rate, 100)}%` }}
                      />
                    </div>
                  )}
                  {p.max_intake && <span className="font-bold text-on-surface">{p.fill_rate}% filled</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state when no data */}
      {!occupancy && bookingTrends.length === 0 && (
        <div className="glass-card p-12 text-center text-on-surface-variant">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-bold">No analytics data yet</p>
          <p className="text-sm mt-1">Data will appear as spaces are created and bookings are made.</p>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ value: number; label: string; icon: React.ElementType; color?: string }> = ({ value, label, icon: Icon, color }) => (
  <div className="glass-card p-5">
    <div className="flex items-center gap-2 mb-2">
      <Icon className={cn("w-4 h-4", color || 'text-on-surface-variant')} />
    </div>
    <p className={cn("text-3xl font-headline font-bold", color)}>{value}</p>
    <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wide mt-1">{label}</p>
  </div>
);
