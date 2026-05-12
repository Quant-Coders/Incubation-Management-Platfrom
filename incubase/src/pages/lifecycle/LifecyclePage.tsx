/**
 * Startups & Lifecycle Page
 * Track milestones, mentorship sessions, and startup progress.
 */
import React, { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/lib/store';
import {
  Loader2, AlertCircle, Rocket, Target, Calendar, Plus,
  CheckCircle2, Clock, AlertTriangle, Users, ChevronDown, X
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface Startup {
  id: string;
  company_name: string;
  sector: string;
  stage: string;
}

interface Milestone {
  id: string;
  startup_id: string;
  title: string;
  description: string;
  due_date: string;
  status: string;
  progress: number;
  category: string;
  completed_at: string | null;
}

interface MentorshipSession {
  id: string;
  startup_id: string;
  session_date: string;
  duration_minutes: number;
  topic: string;
  notes: string;
  rating: number;
  users: { name: string; email: string } | null;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-on-surface-variant', label: 'Pending' },
  in_progress: { icon: Target, color: 'text-primary', label: 'In Progress' },
  completed: { icon: CheckCircle2, color: 'text-green-400', label: 'Completed' },
  overdue: { icon: AlertTriangle, color: 'text-error', label: 'Overdue' },
};

export const LifecyclePage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [selectedStartup, setSelectedStartup] = useState<string>('');
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [sessions, setSessions] = useState<MentorshipSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'milestones' | 'mentorship'>('milestones');
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);

  useEffect(() => {
    loadStartups();
  }, []);

  useEffect(() => {
    if (selectedStartup) {
      loadStartupData(selectedStartup);
    }
  }, [selectedStartup]);

  const loadStartups = async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('startups')
      .select('id, company_name, sector, stage')
      .order('company_name');

    if (err) { setError(err.message); setLoading(false); return; }
    setStartups(data || []);
    if (data && data.length > 0) setSelectedStartup(data[0].id);
    setLoading(false);
  };

  const loadStartupData = async (startupId: string) => {
    const [milRes, sessRes] = await Promise.all([
      supabase.from('milestones').select('*').eq('startup_id', startupId).order('due_date'),
      supabase.from('mentorship_sessions').select('*, users!mentor_id(name, email)').eq('startup_id', startupId).order('session_date', { ascending: false }),
    ]);
    setMilestones(milRes.data || []);
    setSessions(sessRes.data || []);
  };

  const updateMilestone = async (id: string, updates: Partial<Milestone>) => {
    const { error: err } = await supabase
      .from('milestones')
      .update(updates)
      .eq('id', id);
    if (!err) loadStartupData(selectedStartup);
  };

  const addMilestone = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const { error: err } = await supabase.from('milestones').insert({
      tenant_id: user?.tenant_id,
      startup_id: selectedStartup,
      title: form.get('title'),
      description: form.get('description'),
      due_date: form.get('due_date'),
      category: form.get('category') || 'general',
      status: 'pending',
      progress: 0,
    });
    if (!err) { setShowAddMilestone(false); loadStartupData(selectedStartup); }
  };

  const addSession = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const { error: err } = await supabase.from('mentorship_sessions').insert({
      tenant_id: user?.tenant_id,
      startup_id: selectedStartup,
      mentor_id: user?.id,
      session_date: form.get('session_date'),
      duration_minutes: parseInt(form.get('duration') as string) || 60,
      topic: form.get('topic'),
      notes: form.get('notes'),
      rating: parseInt(form.get('rating') as string) || null,
      status: 'completed',
    });
    if (!err) { setShowAddSession(false); loadStartupData(selectedStartup); }
  };

  // Calculate stats
  const completedMilestones = milestones.filter((m) => m.status === 'completed').length;
  const overdueMilestones = milestones.filter((m) => m.status !== 'completed' && new Date(m.due_date) < new Date()).length;
  const completionRate = milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0;

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
          <h1 className="text-2xl font-headline font-bold flex items-center gap-3">
            <Rocket className="w-7 h-7 text-primary" />
            Startups & Lifecycle
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Track milestones, mentorship, and progress for incubated startups
          </p>
        </div>
      </div>

      {/* Startup Selector */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Rocket className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <select
            value={selectedStartup}
            onChange={(e) => setSelectedStartup(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-8 py-3 text-sm outline-none focus:border-primary/50 appearance-none cursor-pointer"
          >
            {startups.map((s) => (
              <option key={s.id} value={s.id}>{s.company_name} ({s.sector || 'N/A'})</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
        </div>
      </div>

      {/* Stats */}
      {selectedStartup && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-5">
            <p className="text-3xl font-headline font-bold">{milestones.length}</p>
            <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wide mt-1">Total Milestones</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-3xl font-headline font-bold text-green-400">{completedMilestones}</p>
            <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wide mt-1">Completed</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-3xl font-headline font-bold text-error">{overdueMilestones}</p>
            <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wide mt-1">Overdue</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-3xl font-headline font-bold text-gradient">{completionRate}%</p>
            <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wide mt-1">Completion Rate</p>
            <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full" style={{ width: `${completionRate}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
        <button onClick={() => setTab('milestones')} className={cn("px-5 py-2.5 rounded-lg text-sm font-bold transition-all", tab === 'milestones' ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-on-surface')}>
          <Target className="w-4 h-4 inline mr-2" />Milestones
        </button>
        <button onClick={() => setTab('mentorship')} className={cn("px-5 py-2.5 rounded-lg text-sm font-bold transition-all", tab === 'mentorship' ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-on-surface')}>
          <Users className="w-4 h-4 inline mr-2" />Mentorship
        </button>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-sm text-error flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Milestones Tab */}
      {tab === 'milestones' && selectedStartup && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowAddMilestone(true)} className="gradient-btn px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Milestone
            </button>
          </div>

          {milestones.length === 0 ? (
            <div className="glass-card p-8 text-center text-on-surface-variant">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No milestones yet. Create one to start tracking progress.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {milestones.map((m) => {
                const isOverdue = m.status !== 'completed' && new Date(m.due_date) < new Date();
                const effectiveStatus = isOverdue ? 'overdue' : m.status;
                const config = statusConfig[effectiveStatus] || statusConfig.pending;
                const StatusIcon = config.icon;
                return (
                  <div key={m.id} className="glass-card p-4 flex items-center gap-4">
                    <button
                      onClick={() => updateMilestone(m.id, { status: m.status === 'completed' ? 'in_progress' : 'completed', progress: m.status === 'completed' ? m.progress : 100 })}
                      className={cn("w-8 h-8 rounded-full flex items-center justify-center border transition-all", m.status === 'completed' ? 'bg-green-500/20 border-green-500/30' : 'border-white/20 hover:border-primary/50')}
                    >
                      <StatusIcon className={cn("w-4 h-4", config.color)} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-bold text-sm", m.status === 'completed' && "line-through opacity-60")}>{m.title}</p>
                      {m.description && <p className="text-xs text-on-surface-variant mt-0.5 truncate">{m.description}</p>}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full">{m.category}</span>
                        <span className="text-[10px] text-on-surface-variant flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {new Date(m.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="w-24">
                      <div className="flex items-center justify-between text-[10px] text-on-surface-variant mb-1">
                        <span>Progress</span><span>{m.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${m.progress}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Mentorship Tab */}
      {tab === 'mentorship' && selectedStartup && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowAddSession(true)} className="gradient-btn px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2">
              <Plus className="w-4 h-4" /> Log Session
            </button>
          </div>

          {sessions.length === 0 ? (
            <div className="glass-card p-8 text-center text-on-surface-variant">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No mentorship sessions recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <div key={s.id} className="glass-card p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-sm">
                        {s.users?.name?.charAt(0) || 'M'}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{s.topic || 'Mentorship Session'}</p>
                        <p className="text-xs text-on-surface-variant">with {s.users?.name || 'Mentor'}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-on-surface-variant">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(s.session_date).toLocaleDateString()}</span>
                          <span>{s.duration_minutes} min</span>
                          {s.rating && <span className="text-amber-400">{'★'.repeat(s.rating)}{'☆'.repeat(5 - s.rating)}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                  {s.notes && <p className="text-xs text-on-surface-variant mt-3 pl-13 border-t border-white/5 pt-3">{s.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Milestone Modal */}
      {showAddMilestone && (
        <Modal title="Add Milestone" onClose={() => setShowAddMilestone(false)}>
          <form onSubmit={addMilestone} className="space-y-4">
            <input name="title" required placeholder="Milestone title" className="form-input" />
            <textarea name="description" placeholder="Description (optional)" className="form-input min-h-[80px]" />
            <input name="due_date" type="date" required className="form-input" />
            <select name="category" className="form-input">
              <option value="general">General</option>
              <option value="product">Product</option>
              <option value="fundraising">Fundraising</option>
              <option value="team">Team</option>
              <option value="revenue">Revenue</option>
              <option value="compliance">Compliance</option>
            </select>
            <button type="submit" className="gradient-btn w-full py-3 rounded-xl text-sm font-bold">Create Milestone</button>
          </form>
        </Modal>
      )}

      {/* Add Session Modal */}
      {showAddSession && (
        <Modal title="Log Mentorship Session" onClose={() => setShowAddSession(false)}>
          <form onSubmit={addSession} className="space-y-4">
            <input name="topic" required placeholder="Session topic" className="form-input" />
            <input name="session_date" type="date" required className="form-input" />
            <input name="duration" type="number" placeholder="Duration (minutes)" defaultValue={60} className="form-input" />
            <textarea name="notes" placeholder="Session notes" className="form-input min-h-[80px]" />
            <select name="rating" className="form-input">
              <option value="">Rating (optional)</option>
              <option value="5">5 — Excellent</option>
              <option value="4">4 — Good</option>
              <option value="3">3 — Average</option>
              <option value="2">2 — Below Average</option>
              <option value="1">1 — Poor</option>
            </select>
            <button type="submit" className="gradient-btn w-full py-3 rounded-xl text-sm font-bold">Log Session</button>
          </form>
        </Modal>
      )}
    </div>
  );
};

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
    <div className="relative glass-card p-6 w-full max-w-md space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-headline font-bold text-lg">{title}</h3>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg"><X className="w-5 h-5" /></button>
      </div>
      {children}
    </div>
  </div>
);
