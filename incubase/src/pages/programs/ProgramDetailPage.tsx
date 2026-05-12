/**
 * Program Detail / Create / Edit Page
 * Supports: viewing program details, creating new programs, editing existing programs.
 * Admin-only for create/edit; all authenticated users can view.
 */
import React, { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/lib/store';
import {
  DraftingCompass, ArrowLeft, Save, Loader2, AlertCircle,
  CheckCircle2, Calendar, Users, Clock, Zap, Archive, Plus, Trash2, Edit3
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
  evaluation_config: any;
  form_schema: any[];
  created_at: string;
}

interface ProgramDetailPageProps {
  programId?: string; // undefined = create mode
  onNavigate: (path: string) => void;
}

const statusConfig: Record<string, { color: string; label: string }> = {
  draft: { color: 'bg-white/10 text-on-surface-variant', label: 'Draft' },
  open: { color: 'bg-green-500/10 text-green-400', label: 'Open' },
  evaluating: { color: 'bg-tertiary/10 text-tertiary', label: 'Evaluating' },
  active: { color: 'bg-primary/10 text-primary', label: 'Active' },
  closed: { color: 'bg-error/10 text-error', label: 'Closed' },
  archived: { color: 'bg-white/5 text-on-surface-variant/50', label: 'Archived' },
};

export const ProgramDetailPage: React.FC<ProgramDetailPageProps> = ({ programId, onNavigate }) => {
  const user = useAuthStore((s) => s.user);
  const isCreate = !programId;
  const isAdmin = user?.role === 'admin';

  const [program, setProgram] = useState<Partial<Program>>({
    title: '',
    description: '',
    status: 'draft',
    start_date: '',
    end_date: '',
    application_deadline: '',
    max_intake: 20,
    form_schema: [],
    evaluation_config: {},
  });

  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(isCreate);
  const [applications, setApplications] = useState<any[]>([]);

  useEffect(() => {
    if (programId) {
      fetchProgram(programId);
      fetchApplications(programId);
    }
  }, [programId]);

  const fetchProgram = async (id: string) => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('programs')
      .select('*')
      .eq('id', id)
      .single();
    if (err) { setError(err.message); setLoading(false); return; }
    setProgram(data);
    setLoading(false);
  };

  const fetchApplications = async (id: string) => {
    const { data } = await supabase
      .from('applications')
      .select('id, status, startups(company_name), submitted_at')
      .eq('program_id', id)
      .order('submitted_at', { ascending: false });
    setApplications(data || []);
  };

  const handleSave = async () => {
    if (!program.title?.trim()) { setError('Program title is required.'); return; }
    setSaving(true);
    setError('');

    try {
      if (isCreate) {
        const { data, error: err } = await supabase
          .from('programs')
          .insert({
            tenant_id: user?.tenant_id,
            created_by: user?.id,
            title: program.title,
            description: program.description,
            status: program.status || 'draft',
            start_date: program.start_date || null,
            end_date: program.end_date || null,
            application_deadline: program.application_deadline || null,
            max_intake: program.max_intake || null,
            form_schema: program.form_schema || [],
            evaluation_config: program.evaluation_config || {},
          })
          .select()
          .single();

        if (err) throw err;
        setSuccess('Program created successfully!');
        setTimeout(() => onNavigate(`/app/programs/${data.id}`), 1200);
      } else {
        const { error: err } = await supabase
          .from('programs')
          .update({
            title: program.title,
            description: program.description,
            status: program.status,
            start_date: program.start_date || null,
            end_date: program.end_date || null,
            application_deadline: program.application_deadline || null,
            max_intake: program.max_intake || null,
            form_schema: program.form_schema || [],
            evaluation_config: program.evaluation_config || {},
          })
          .eq('id', programId!);

        if (err) throw err;
        setSuccess('Program updated!');
        setEditMode(false);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const statusInfo = statusConfig[program.status || 'draft'];
  const statusCounts = applications.reduce((acc: Record<string, number>, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => onNavigate('/app/programs')} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-headline font-bold flex items-center gap-3">
              <DraftingCompass className="w-7 h-7 text-primary" />
              {isCreate ? 'New Program' : editMode ? 'Edit Program' : program.title}
            </h1>
            {!isCreate && !editMode && (
              <span className={cn("text-xs font-bold px-3 py-1 rounded-full mt-2 inline-block", statusInfo.color)}>
                {statusInfo.label}
              </span>
            )}
          </div>
        </div>
        {isAdmin && !editMode && !isCreate && (
          <button onClick={() => setEditMode(true)} className="gradient-btn px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2">
            <Edit3 className="w-4 h-4" /> Edit Program
          </button>
        )}
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-sm text-error flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-sm text-green-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {success}
        </div>
      )}

      {/* View mode */}
      {!editMode && !isCreate && (
        <div className="space-y-6">
          {/* Program Info Card */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-headline font-bold text-lg">Program Details</h3>
            <p className="text-on-surface-variant">{program.description || 'No description provided.'}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InfoBlock icon={Calendar} label="Start Date" value={formatDate(program.start_date || '')} />
              <InfoBlock icon={Calendar} label="End Date" value={formatDate(program.end_date || '')} />
              <InfoBlock icon={Clock} label="Application Deadline" value={formatDate(program.application_deadline || '')} />
              <InfoBlock icon={Users} label="Max Intake" value={program.max_intake ? `${program.max_intake} startups` : 'Unlimited'} />
            </div>
          </div>

          {/* Applications Overview */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline font-bold text-lg">Applications ({applications.length})</h3>
              <button
                onClick={() => onNavigate('/app/applications')}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                View All →
              </button>
            </div>
            {applications.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-6">No applications yet.</p>
            ) : (
              <div className="space-y-3">
                {/* Status breakdown */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.entries(statusCounts).map(([status, count]) => (
                    <span key={status} className="text-xs bg-white/5 px-3 py-1 rounded-full">
                      {status.replace('_', ' ')}: <strong>{count}</strong>
                    </span>
                  ))}
                </div>
                {/* Recent 5 applications */}
                {applications.slice(0, 5).map((app) => (
                  <div key={app.id} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                    <span className="text-sm font-medium">{app.startups?.company_name || 'Unknown'}</span>
                    <span className={cn(
                      "text-xs font-bold px-2 py-1 rounded-full",
                      app.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                      app.status === 'rejected' ? 'bg-error/20 text-error' :
                      app.status === 'shortlisted' ? 'bg-primary/20 text-primary' :
                      'bg-white/10 text-on-surface-variant'
                    )}>
                      {app.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      {(editMode || isCreate) && (
        <div className="glass-card p-6 space-y-6">
          <h3 className="font-headline font-bold text-lg">
            {isCreate ? 'Program Information' : 'Edit Program'}
          </h3>

          <div className="space-y-5">
            {/* Title */}
            <div>
              <label className="text-sm font-medium text-on-surface-variant block mb-1.5">Program Title *</label>
              <input
                type="text"
                value={program.title || ''}
                onChange={(e) => setProgram({ ...program, title: e.target.value })}
                placeholder="e.g., Cohort 2025 — FinTech Accelerator"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-on-surface-variant block mb-1.5">Description</label>
              <textarea
                value={program.description || ''}
                onChange={(e) => setProgram({ ...program, description: e.target.value })}
                placeholder="Describe the program goals, eligibility criteria, and what participants can expect..."
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              />
            </div>

            {/* Status */}
            <div>
              <label className="text-sm font-medium text-on-surface-variant block mb-1.5">Status</label>
              <select
                value={program.status || 'draft'}
                onChange={(e) => setProgram({ ...program, status: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 appearance-none cursor-pointer"
              >
                <option value="draft">Draft</option>
                <option value="open">Open for Applications</option>
                <option value="evaluating">Evaluating</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-on-surface-variant block mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={program.start_date || ''}
                  onChange={(e) => setProgram({ ...program, start_date: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 transition-all"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-on-surface-variant block mb-1.5">End Date</label>
                <input
                  type="date"
                  value={program.end_date || ''}
                  onChange={(e) => setProgram({ ...program, end_date: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 transition-all"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-on-surface-variant block mb-1.5">Application Deadline</label>
                <input
                  type="date"
                  value={program.application_deadline || ''}
                  onChange={(e) => setProgram({ ...program, application_deadline: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 transition-all"
                />
              </div>
            </div>

            {/* Max Intake */}
            <div>
              <label className="text-sm font-medium text-on-surface-variant block mb-1.5">Max Intake (startups)</label>
              <input
                type="number"
                min={1}
                value={program.max_intake || ''}
                onChange={(e) => setProgram({ ...program, max_intake: parseInt(e.target.value) || 0 })}
                placeholder="Leave blank for unlimited"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 transition-all"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="gradient-btn px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : isCreate ? 'Create Program' : 'Save Changes'}
            </button>
            {!isCreate && (
              <button
                onClick={() => { setEditMode(false); fetchProgram(programId!); }}
                className="px-6 py-3 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const InfoBlock: React.FC<{ icon: React.ElementType; label: string; value: string }> = ({ icon: Icon, label, value }) => (
  <div className="bg-white/5 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-1">
      <Icon className="w-4 h-4 text-on-surface-variant" />
      <span className="text-xs text-on-surface-variant uppercase tracking-wide">{label}</span>
    </div>
    <p className="font-bold text-sm">{value}</p>
  </div>
);
