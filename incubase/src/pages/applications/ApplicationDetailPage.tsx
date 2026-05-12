/**
 * Application Detail Page
 * - For admins/reviewers: Full form data view + weighted scorecard + status management
 * - For startups: View their own application status
 */
import React, { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/lib/store';
import {
  Files, ArrowLeft, Loader2, AlertCircle, CheckCircle2, Star,
  BrainCircuit, ChevronRight, Clock, User, Send, Sparkles
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface Application {
  id: string;
  status: string;
  current_round: number;
  form_data: any;
  submitted_at: string;
  startups: { id: string; company_name: string; sector: string; stage: string; description: string } | null;
  programs: { id: string; title: string; evaluation_config: any } | null;
}

interface EvaluationCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  max_score: number;
}

interface ApplicationDetailPageProps {
  applicationId: string;
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

const DEFAULT_CRITERIA: EvaluationCriterion[] = [
  { id: 'innovation', name: 'Innovation & Uniqueness', description: 'How novel is the solution?', weight: 25, max_score: 10 },
  { id: 'market', name: 'Market Potential', description: 'Size and accessibility of target market', weight: 25, max_score: 10 },
  { id: 'team', name: 'Team Capability', description: 'Relevant experience and skills', weight: 20, max_score: 10 },
  { id: 'feasibility', name: 'Technical Feasibility', description: 'Can it be built and scaled?', weight: 15, max_score: 10 },
  { id: 'impact', name: 'Social/Economic Impact', description: 'Positive impact on society', weight: 15, max_score: 10 },
];

export const ApplicationDetailPage: React.FC<ApplicationDetailPageProps> = ({ applicationId, onNavigate }) => {
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const isReviewer = user?.role === 'admin' || user?.role === 'reviewer';

  const [application, setApplication] = useState<Application | null>(null);
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingEval, setSubmittingEval] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [aiSummarizing, setAiSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [existingEval, setExistingEval] = useState<any>(null);

  useEffect(() => {
    fetchApplication();
  }, [applicationId]);

  const fetchApplication = async () => {
    setLoading(true);
    setError('');

    const { data, error: err } = await supabase
      .from('applications')
      .select('*, startups(id, company_name, sector, stage, description), programs(id, title, evaluation_config)')
      .eq('id', applicationId)
      .single();

    if (err || !data) { setError('Application not found.'); setLoading(false); return; }
    setApplication(data as Application);

    // Load evaluation criteria for the program
    if (data.programs?.id) {
      const { data: critData } = await supabase
        .from('evaluation_criteria')
        .select('*')
        .eq('program_id', data.programs.id)
        .order('sort_order');
      setCriteria(critData && critData.length > 0 ? critData : DEFAULT_CRITERIA);
    } else {
      setCriteria(DEFAULT_CRITERIA);
    }

    // Load existing evaluation by this reviewer
    if (isReviewer) {
      const { data: evalData } = await supabase
        .from('evaluations')
        .select('*')
        .eq('application_id', applicationId)
        .eq('reviewer_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (evalData) {
        setExistingEval(evalData);
        setScores(evalData.scores || {});
        setComments(evalData.comments || '');
      }
    }

    setLoading(false);
  };

  const submitEvaluation = async () => {
    setSubmittingEval(true);
    setError('');
    try {
      // Calculate weighted total
      let weightedTotal = 0;
      for (const c of criteria) {
        const score = scores[c.id] || 0;
        weightedTotal += (score / c.max_score) * c.weight;
      }

      const evalPayload = {
        tenant_id: user?.tenant_id,
        application_id: applicationId,
        reviewer_id: user?.id,
        round: application?.current_round || 1,
        scores,
        comments,
        weighted_total: parseFloat(weightedTotal.toFixed(2)),
        submitted_at: new Date().toISOString(),
      };

      if (existingEval) {
        const { error: err } = await supabase
          .from('evaluations')
          .update(evalPayload)
          .eq('id', existingEval.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('evaluations')
          .insert(evalPayload);
        if (err) throw err;
      }

      // Auto-move status to under_review
      if (application?.status === 'submitted') {
        await supabase.from('applications').update({ status: 'under_review' }).eq('id', applicationId);
        setApplication((a) => a ? { ...a, status: 'under_review' } : a);
      }

      setSuccess('Evaluation submitted successfully!');
      setTimeout(() => setSuccess(''), 3000);
      fetchApplication();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingEval(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    setUpdatingStatus(true);
    setError('');
    try {
      const { error: err } = await supabase
        .from('applications')
        .update({ status: newStatus })
        .eq('id', applicationId);
      if (err) throw err;
      setApplication((a) => a ? { ...a, status: newStatus } : a);
      setSuccess(`Status updated to ${newStatus.replace('_', ' ')}.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const runAISummary = async () => {
    setAiSummarizing(true);
    setError('');
    try {
      const res = await fetch(`/api/ai/summarize/${applicationId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI summarization failed');
      setAiSummary(data.summary);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAiSummarizing(false);
    }
  };

  const calcWeightedTotal = () => {
    let total = 0;
    for (const c of criteria) {
      total += ((scores[c.id] || 0) / c.max_score) * c.weight;
    }
    return parseFloat(total.toFixed(1));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="glass-card p-12 text-center">
        <Files className="w-12 h-12 mx-auto mb-4 text-on-surface-variant/30" />
        <p className="text-on-surface-variant">Application not found.</p>
      </div>
    );
  }

  const statusStyle = statusStyles[application.status] || statusStyles.submitted;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => onNavigate('/app/applications')} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-headline font-bold flex items-center gap-3">
              <Files className="w-7 h-7 text-primary" />
              {application.startups?.company_name || 'Application'}
            </h1>
            <p className="text-on-surface-variant text-sm mt-0.5">
              Applied to: <strong>{application.programs?.title || 'Unknown Program'}</strong>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("text-xs font-bold px-3 py-1.5 rounded-full", statusStyle.color)}>
            {statusStyle.label}
          </span>
          {isReviewer && (
            <button
              onClick={runAISummary}
              disabled={aiSummarizing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors text-sm font-bold disabled:opacity-50"
            >
              {aiSummarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
              AI Summary
            </button>
          )}
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Application Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Startup Profile */}
          {application.startups && (
            <div className="glass-card p-6">
              <h3 className="font-headline font-bold text-lg mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" /> Startup Profile
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-xs text-on-surface-variant uppercase">Company</p>
                  <p className="font-bold mt-1">{application.startups.company_name}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-xs text-on-surface-variant uppercase">Sector</p>
                  <p className="font-bold mt-1">{application.startups.sector || '—'}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-xs text-on-surface-variant uppercase">Stage</p>
                  <p className="font-bold mt-1 capitalize">{application.startups.stage || '—'}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-xs text-on-surface-variant uppercase">Round</p>
                  <p className="font-bold mt-1">Round {application.current_round}</p>
                </div>
              </div>
              {application.startups.description && (
                <p className="text-sm text-on-surface-variant mt-4">{application.startups.description}</p>
              )}
            </div>
          )}

          {/* Form Data */}
          <div className="glass-card p-6">
            <h3 className="font-headline font-bold text-lg mb-4">Application Responses</h3>
            {application.form_data && Object.keys(application.form_data).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(application.form_data).map(([key, value]) => (
                  <div key={key} className="bg-white/5 rounded-xl p-4">
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-2">
                      {key.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm">{typeof value === 'string' ? value : JSON.stringify(value)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant text-center py-6">No form data submitted.</p>
            )}
          </div>

          {/* AI Summary Panel */}
          {aiSummary && (
            <div className="glass-card p-6 border border-secondary/20">
              <h3 className="font-headline font-bold text-lg mb-4 flex items-center gap-2 text-secondary">
                <Sparkles className="w-5 h-5" /> AI Analysis
              </h3>
              <p className="text-sm text-on-surface-variant mb-4">{aiSummary.executive_summary}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {aiSummary.key_risks && (
                  <div className="bg-error/5 rounded-xl p-3">
                    <p className="text-xs font-bold text-error uppercase mb-2">Key Risks</p>
                    <ul className="space-y-1">
                      {aiSummary.key_risks.map((r: string, i: number) => (
                        <li key={i} className="text-xs text-on-surface-variant">• {r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                  <span className="text-xs text-on-surface-variant">Overall Impression</span>
                  <span className={cn(
                    "text-xs font-bold px-2 py-1 rounded-full",
                    aiSummary.overall_impression === 'strong' ? 'bg-green-500/20 text-green-400' :
                    aiSummary.overall_impression === 'moderate' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  )}>
                    {aiSummary.overall_impression}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-on-surface-variant/60 mt-3">
                AI-generated analysis — human review required before decisions.
              </p>
            </div>
          )}
        </div>

        {/* Right: Actions + Scorecard */}
        <div className="space-y-6">
          {/* Status Management */}
          {isReviewer && (
            <div className="glass-card p-5">
              <h4 className="font-headline font-bold text-sm mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Update Status
              </h4>
              <div className="space-y-2">
                {['under_review', 'shortlisted', 'accepted', 'rejected', 'waitlisted'].map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(s)}
                    disabled={application.status === s || updatingStatus}
                    className={cn(
                      "w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40",
                      application.status === s
                        ? 'bg-primary/20 text-primary cursor-default'
                        : 'bg-white/5 hover:bg-white/10'
                    )}
                  >
                    {application.status === s && <CheckCircle2 className="w-3 h-3 inline mr-2" />}
                    {s.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Evaluation Scorecard */}
          {isReviewer && (
            <div className="glass-card p-5">
              <h4 className="font-headline font-bold text-sm mb-4 flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" />
                {existingEval ? 'Update Evaluation' : 'Score Application'}
              </h4>

              <div className="space-y-4">
                {criteria.map((c) => (
                  <div key={c.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{c.name}</span>
                      <span className="text-xs text-on-surface-variant">{c.weight}% weight</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={c.max_score}
                        step={1}
                        value={scores[c.id] || 0}
                        onChange={(e) => setScores({ ...scores, [c.id]: parseInt(e.target.value) })}
                        className="flex-1 h-2 accent-primary cursor-pointer"
                      />
                      <span className="text-xs font-bold w-10 text-right">{scores[c.id] || 0}/{c.max_score}</span>
                    </div>
                  </div>
                ))}

                {/* Weighted Total */}
                <div className="border-t border-white/10 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface-variant">Weighted Score</span>
                    <span className={cn(
                      "text-lg font-headline font-bold",
                      calcWeightedTotal() >= 75 ? 'text-green-400' :
                      calcWeightedTotal() >= 50 ? 'text-amber-400' : 'text-error'
                    )}>
                      {calcWeightedTotal()}%
                    </span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all"
                      style={{ width: `${calcWeightedTotal()}%` }}
                    />
                  </div>
                </div>

                {/* Comments */}
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Reviewer comments (optional)..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-primary/50 resize-none"
                />

                <button
                  onClick={submitEvaluation}
                  disabled={submittingEval}
                  className="gradient-btn w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submittingEval ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {submittingEval ? 'Submitting...' : existingEval ? 'Update Score' : 'Submit Evaluation'}
                </button>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="glass-card p-5">
            <h4 className="font-headline font-bold text-sm mb-3">Details</h4>
            <div className="space-y-2 text-xs text-on-surface-variant">
              <div className="flex justify-between">
                <span>Submitted</span>
                <span className="font-medium text-on-surface">
                  {application.submitted_at ? new Date(application.submitted_at).toLocaleDateString() : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Round</span>
                <span className="font-medium text-on-surface">Round {application.current_round}</span>
              </div>
              <div className="flex justify-between">
                <span>Application ID</span>
                <span className="font-mono text-[10px]">{applicationId.slice(0, 8)}...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
