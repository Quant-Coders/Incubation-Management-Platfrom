/**
 * Reports Page — Generate and view custom reports.
 */
import React, { useState } from 'react';
import { useAuthStore } from '@/src/lib/store';
import {
  FileBarChart, Loader2, AlertCircle, Download, RefreshCw,
  TrendingUp, Building2, Target, Briefcase
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

const API_BASE = '/api/reports';

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  endpoint: string;
}

const reportTypes: ReportType[] = [
  { id: 'executive', title: 'Executive Summary', description: 'High-level overview of all operations for leadership.', icon: Briefcase, color: 'text-blue-400', endpoint: '/executive-summary' },
  { id: 'funnel', title: 'Application Funnel', description: 'Pipeline breakdown from submission to acceptance.', icon: TrendingUp, color: 'text-emerald-400', endpoint: '/application-funnel' },
  { id: 'facility', title: 'Facility Utilization', description: 'Space occupancy, allocations, and booking metrics.', icon: Building2, color: 'text-amber-400', endpoint: '/facility-utilization' },
  { id: 'milestones', title: 'Milestone Progress', description: 'Startup milestone completion rates and status.', icon: Target, color: 'text-purple-400', endpoint: '/milestone-progress' },
];

export const ReportsPage: React.FC = () => {
  const session = useAuthStore((s) => s.session);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  });

  const generateReport = async (report: ReportType) => {
    setLoading(true);
    setError('');
    setReportData(null);
    setActiveReport(report.id);

    try {
      const res = await fetch(`${API_BASE}${report.endpoint}`, { headers: getHeaders() });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate report');
      }
      setReportData(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderReport = () => {
    if (!reportData) return null;

    if (activeReport === 'executive') return <ExecutiveReport data={reportData.data} />;
    if (activeReport === 'funnel') return <FunnelReport data={reportData} />;
    if (activeReport === 'facility') return <FacilityReport data={reportData.data} />;
    if (activeReport === 'milestones') return <MilestoneReport data={reportData.data} />;

    return <pre className="text-xs overflow-auto">{JSON.stringify(reportData, null, 2)}</pre>;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-headline font-bold flex items-center gap-3">
          <FileBarChart className="w-7 h-7 text-primary" />
          Reports
        </h1>
        <p className="text-on-surface-variant text-sm mt-1">
          Generate custom reports for stakeholders
        </p>
      </div>

      {/* Report Type Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          return (
            <button
              key={report.id}
              onClick={() => generateReport(report)}
              disabled={loading}
              className={cn(
                "glass-card p-5 text-left transition-all duration-200 hover:scale-[1.02]",
                activeReport === report.id && "ring-2 ring-primary/50"
              )}
            >
              <Icon className={cn("w-8 h-8 mb-3", report.color)} />
              <p className="font-bold text-sm">{report.title}</p>
              <p className="text-xs text-on-surface-variant mt-1">{report.description}</p>
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="glass-card p-8 text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-sm text-on-surface-variant">Generating report...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-sm text-error flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Report Output */}
      {reportData && !loading && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-headline font-bold text-lg">
                {reportTypes.find((r) => r.id === activeReport)?.title}
              </h3>
              <p className="text-xs text-on-surface-variant">
                Generated: {new Date(reportData.generated_at).toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => { const r = reportTypes.find((rt) => rt.id === activeReport); if (r) generateReport(r); }}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="border-t border-white/10 pt-4">
            {renderReport()}
          </div>
        </div>
      )}
    </div>
  );
};

// ═══ Report Sub-components ═══

const ExecutiveReport: React.FC<{ data: any }> = ({ data }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <ReportSection title="Programs">
      <MetricRow label="Total" value={data.programs.total} />
      <MetricRow label="Active" value={data.programs.active} color="text-green-400" />
      <MetricRow label="Open for Applications" value={data.programs.open} color="text-blue-400" />
    </ReportSection>
    <ReportSection title="Applications">
      <MetricRow label="Total" value={data.applications.total} />
      <MetricRow label="Submitted" value={data.applications.submitted} />
      <MetricRow label="Under Review" value={data.applications.under_review} color="text-amber-400" />
      <MetricRow label="Accepted" value={data.applications.accepted} color="text-green-400" />
      <MetricRow label="Rejected" value={data.applications.rejected} color="text-error" />
    </ReportSection>
    <ReportSection title="Facilities">
      <MetricRow label="Total Spaces" value={data.facilities.total_spaces} />
      <MetricRow label="Occupied" value={data.facilities.occupied} color="text-primary" />
      <MetricRow label="Available" value={data.facilities.available} color="text-green-400" />
      <MetricRow label="Occupancy Rate" value={`${data.facilities.occupancy_rate}%`} color="text-gradient" />
    </ReportSection>
    <ReportSection title="Engagement">
      <MetricRow label="Total Startups" value={data.startups.total} />
      <MetricRow label="Mentorship Sessions" value={data.mentorship.total_sessions} />
    </ReportSection>
  </div>
);

const FunnelReport: React.FC<{ data: any }> = ({ data }) => {
  const maxCount = Math.max(...(data.funnel || []).map((f: any) => f.count), 1);
  return (
    <div className="space-y-4">
      <p className="text-sm text-on-surface-variant">Total Applications: <strong>{data.total_applications}</strong></p>
      <div className="space-y-2">
        {(data.funnel || []).map((stage: any, i: number) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs w-28 capitalize">{stage.stage.replace('_', ' ')}</span>
            <div className="flex-1 h-8 bg-white/5 rounded-lg overflow-hidden">
              <div
                className="h-full bg-primary/30 rounded-lg flex items-center px-3 transition-all duration-500"
                style={{ width: `${maxCount > 0 ? (stage.count / maxCount) * 100 : 0}%` }}
              >
                <span className="text-[10px] font-bold">{stage.count}</span>
              </div>
            </div>
            <span className="text-xs w-12 text-right text-on-surface-variant">{stage.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const FacilityReport: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MiniStat label="Total Spaces" value={data.summary.total_spaces} />
      <MiniStat label="Occupied" value={data.summary.occupied} />
      <MiniStat label="Available" value={data.summary.available} />
      <MiniStat label="Occupancy" value={`${data.summary.occupancy_rate}%`} />
    </div>
    <div>
      <p className="text-xs font-bold text-on-surface-variant uppercase mb-2">By Type</p>
      <div className="space-y-2">
        {(data.by_type || []).map((t: any, i: number) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs w-28 capitalize">{t.type.replace('_', ' ')}</span>
            <div className="flex-1 h-6 bg-white/5 rounded overflow-hidden">
              <div className="h-full bg-secondary/40 rounded flex items-center px-2" style={{ width: `${t.utilization}%` }}>
                <span className="text-[10px] font-bold">{t.occupied}/{t.total}</span>
              </div>
            </div>
            <span className="text-xs w-12 text-right">{t.utilization}%</span>
          </div>
        ))}
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div className="bg-white/5 rounded-xl p-3">
        <p className="text-xs text-on-surface-variant">Active Allocations</p>
        <p className="font-bold text-lg">{data.active_allocations}</p>
      </div>
      <div className="bg-white/5 rounded-xl p-3">
        <p className="text-xs text-on-surface-variant">Bookings (30d)</p>
        <p className="font-bold text-lg">{data.bookings_last_30_days}</p>
      </div>
    </div>
  </div>
);

const MilestoneReport: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <MiniStat label="Total" value={data.summary.total} />
      <MiniStat label="Completed" value={data.summary.completed} />
      <MiniStat label="In Progress" value={data.summary.in_progress} />
      <MiniStat label="Overdue" value={data.summary.overdue} />
      <MiniStat label="Completion Rate" value={`${data.summary.completion_rate}%`} />
    </div>
    {data.by_startup && data.by_startup.length > 0 && (
      <div>
        <p className="text-xs font-bold text-on-surface-variant uppercase mb-3">By Startup</p>
        <div className="space-y-2">
          {data.by_startup.map((s: any, i: number) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs w-40 truncate font-medium">{s.startup_name}</span>
              <div className="flex-1 h-6 bg-white/5 rounded overflow-hidden">
                <div
                  className={cn("h-full rounded flex items-center px-2", s.completion_rate >= 75 ? 'bg-green-500/30' : s.completion_rate >= 50 ? 'bg-amber-500/30' : 'bg-red-500/30')}
                  style={{ width: `${s.completion_rate}%` }}
                >
                  <span className="text-[10px] font-bold">{s.completed}/{s.total}</span>
                </div>
              </div>
              <span className="text-xs w-12 text-right font-bold">{s.completion_rate}%</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

const ReportSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white/5 rounded-xl p-4">
    <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-3">{title}</h4>
    <div className="space-y-2">{children}</div>
  </div>
);

const MetricRow: React.FC<{ label: string; value: number | string; color?: string }> = ({ label, value, color }) => (
  <div className="flex justify-between items-center">
    <span className="text-xs text-on-surface-variant">{label}</span>
    <span className={cn("text-sm font-bold", color)}>{value}</span>
  </div>
);

const MiniStat: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div className="bg-white/5 rounded-xl p-3 text-center">
    <p className="text-xs text-on-surface-variant">{label}</p>
    <p className="text-xl font-headline font-bold mt-1">{value}</p>
  </div>
);
