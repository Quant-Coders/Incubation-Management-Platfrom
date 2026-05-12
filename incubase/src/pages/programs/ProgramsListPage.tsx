/**
 * Programs List Page — Module 1: Program Management
 * Lists all incubation programs with status badges and actions.
 */
import React, { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/lib/store';
import {
  DraftingCompass, Plus, Calendar, Users, ChevronRight,
  Loader2, AlertCircle, Clock, CheckCircle2, Archive, Zap
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface Program {
  id: string;
  title: string;
  description: string;
  status: string;
  start_date: string;
  end_date: string;
  application_deadline: string;
  max_intake: number;
  created_at: string;
}

interface ProgramsListPageProps {
  onNavigate: (path: string) => void;
}

const statusConfig: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  draft: { color: 'bg-white/10 text-on-surface-variant', icon: Clock, label: 'Draft' },
  open: { color: 'bg-green-500/10 text-green-400', icon: Zap, label: 'Open' },
  evaluating: { color: 'bg-tertiary/10 text-tertiary', icon: AlertCircle, label: 'Evaluating' },
  active: { color: 'bg-primary/10 text-primary', icon: CheckCircle2, label: 'Active' },
  closed: { color: 'bg-error/10 text-error', icon: Archive, label: 'Closed' },
  archived: { color: 'bg-white/5 text-on-surface-variant/50', icon: Archive, label: 'Archived' },
};

export const ProgramsListPage: React.FC<ProgramsListPageProps> = ({ onNavigate }) => {
  const user = useAuthStore((s) => s.user);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('programs')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      setPrograms(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getDaysUntilDeadline = (deadline: string) => {
    if (!deadline) return null;
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

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
          <h1 className="text-2xl font-headline font-bold">Incubation Programs</h1>
          <p className="text-on-surface-variant text-sm mt-1">
            {programs.length} program{programs.length !== 1 ? 's' : ''} across all cohorts
          </p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => onNavigate('/app/programs/new')}
            className="gradient-btn px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Program
          </button>
        )}
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-sm text-error flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Programs Grid */}
      {programs.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <DraftingCompass className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-4" />
          <h3 className="font-headline text-lg font-bold mb-2">No Programs Yet</h3>
          <p className="text-on-surface-variant text-sm">Create your first incubation program to get started.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {programs.map((program) => {
            const status = statusConfig[program.status] || statusConfig.draft;
            const StatusIcon = status.icon;
            const daysLeft = getDaysUntilDeadline(program.application_deadline);

            return (
              <div key={program.id}
                onClick={() => onNavigate(`/app/programs/${program.id}`)}
                className="glass-card p-6 group hover:shadow-[0_0_30px_rgba(79,70,229,0.12)] transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
              >
                {/* Status + Deadline */}
                <div className="flex items-center justify-between mb-4">
                  <span className={cn("text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5", status.color)}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>
                  {daysLeft !== null && daysLeft > 0 && program.status === 'open' && (
                    <span className="text-xs text-tertiary font-medium">
                      {daysLeft}d left to apply
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-headline text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                  {program.title}
                </h3>

                {/* Description */}
                <p className="text-on-surface-variant text-sm leading-relaxed mb-4 line-clamp-2">
                  {program.description}
                </p>

                {/* Meta */}
                <div className="flex items-center gap-4 text-xs text-on-surface-variant mb-4">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(program.start_date)} — {formatDate(program.end_date)}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Max {program.max_intake || '∞'} startups
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Deadline: {formatDate(program.application_deadline)}
                  </span>
                </div>

                {/* Action */}
                <div className="mt-5 pt-4 border-t border-white/5">
                  <button
                    onClick={(e) => { e.stopPropagation(); onNavigate(`/app/programs/${program.id}`); }}
                    className="w-full flex items-center justify-between text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    View Details
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
