/**
 * Applications List Page — Module 2: Application & Evaluation
 * Shows all applications with AI summarization capabilities.
 */
import React, { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/lib/store';
import {
  Files, Search, Filter, Loader2, AlertCircle, BrainCircuit,
  CheckCircle2, Clock, XCircle, Star, ChevronDown, Eye
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface Application {
  id: string;
  status: string;
  current_round: number;
  form_data: any;
  submitted_at: string;
  created_at: string;
  startups: { company_name: string } | null;
  programs: { title: string } | null;
}

interface ApplicationsListPageProps {
  onNavigate: (path: string) => void;
}

const statusStyles: Record<string, { color: string; label: string }> = {
  draft: { color: 'bg-white/10 text-on-surface-variant', label: 'Draft' },
  submitted: { color: 'bg-blue-500/10 text-blue-400', label: 'Submitted' },
  under_review: { color: 'bg-tertiary/10 text-tertiary', label: 'Under Review' },
  shortlisted: { color: 'bg-primary/10 text-primary', label: 'Shortlisted' },
  accepted: { color: 'bg-green-500/10 text-green-400', label: 'Accepted' },
  rejected: { color: 'bg-error/10 text-error', label: 'Rejected' },
  waitlisted: { color: 'bg-yellow-500/10 text-yellow-400', label: 'Waitlisted' },
};

export const ApplicationsListPage: React.FC<ApplicationsListPageProps> = ({ onNavigate }) => {
  const user = useAuthStore((s) => s.user);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [summarizing, setSummarizing] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('applications')
        .select('*, startups(company_name), programs(title)')
        .order('submitted_at', { ascending: false });

      if (err) throw err;
      setApplications(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async (appId: string) => {
    setSummarizing(appId);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(`/api/applications/${appId}/summarize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      alert(`AI Summary:\n\n${result.summary?.executive_summary || JSON.stringify(result.summary, null, 2)}`);
    } catch (err: any) {
      alert(`Summarization failed: ${err.message}`);
    } finally {
      setSummarizing(null);
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const filtered = applications.filter((app) => {
    const matchesSearch = searchTerm === '' || 
      app.startups?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.programs?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-headline font-bold">Applications</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            {applications.length} application{applications.length !== 1 ? 's' : ''} total
          </p>
        </div>
        {user?.role === 'startup' && (
          <button
            onClick={() => onNavigate('/app/applications/submit')}
            className="gradient-btn px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2"
          >
            <Star className="w-4 h-4" /> Apply to Program
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by startup or program..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl pl-11 pr-8 py-3 text-sm outline-none focus:border-primary/50 appearance-none cursor-pointer min-w-[160px]"
          >
            <option value="all">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
        </div>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-sm text-error flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Applications Table */}
      {filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Files className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-4" />
          <h3 className="font-headline text-lg font-bold mb-2">No Applications Found</h3>
          <p className="text-on-surface-variant text-sm">
            {applications.length > 0 ? 'Try adjusting your filters.' : 'Applications will appear here once startups submit them.'}
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-on-surface-variant px-6 py-4">Startup</th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-on-surface-variant px-6 py-4">Program</th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-on-surface-variant px-6 py-4">Status</th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-on-surface-variant px-6 py-4">Round</th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-on-surface-variant px-6 py-4">Submitted</th>
                  <th className="text-right text-xs font-bold uppercase tracking-wider text-on-surface-variant px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((app) => {
                  const statusStyle = statusStyles[app.status] || statusStyles.draft;
                  return (
                    <tr key={app.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium">{app.startups?.company_name || 'Unknown'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-on-surface-variant">{app.programs?.title || 'Unknown'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("text-xs font-bold px-3 py-1.5 rounded-full", statusStyle.color)}>
                          {statusStyle.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-on-surface-variant">Round {app.current_round}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-on-surface-variant">{formatDate(app.submitted_at)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(user?.role === 'admin' || user?.role === 'reviewer') && (
                            <button
                              onClick={() => handleSummarize(app.id)}
                              disabled={summarizing === app.id}
                              className="p-2 rounded-lg hover:bg-secondary/10 text-secondary transition-colors disabled:opacity-50"
                              title="AI Summarize"
                            >
                              {summarizing === app.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <BrainCircuit className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => onNavigate(`/app/applications/${app.id}`)}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4 text-on-surface-variant" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
