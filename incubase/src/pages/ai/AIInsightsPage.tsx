/**
 * AI Insights Page — Unified dashboard for all 5 AI agents.
 * Human-in-the-loop: all results are recommendations only.
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/lib/store';
import {
  BrainCircuit, FileText, ListChecks, Users, Building2, TrendingUp,
  Loader2, AlertCircle, Sparkles, ChevronRight, Target, Shield
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

const API_BASE = '/api/ai';

interface AgentCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const agents: AgentCard[] = [
  { id: 'summarizer', title: 'Application Summarizer', description: 'Generate structured summaries of startup applications for faster reviewer screening.', icon: FileText, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  { id: 'prescreener', title: 'Pre-screener & Shortlister', description: 'Score applications against weighted criteria and produce preliminary rankings.', icon: ListChecks, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  { id: 'mentor_matcher', title: 'Mentor-Startup Matcher', description: 'Suggest optimal mentor-startup pairings based on skills and expertise alignment.', icon: Users, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  { id: 'facility_predictor', title: 'Facility Predictor', description: 'Forecast facility demand and identify peak usage patterns.', icon: Building2, color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  { id: 'progress_insights', title: 'Progress Insights', description: 'Flag startups excelling or struggling based on milestone and engagement data.', icon: TrendingUp, color: 'text-rose-400', bgColor: 'bg-rose-500/10' },
];

export const AIInsightsPage: React.FC = () => {
  const session = useAuthStore((s) => s.session);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  // Data for agent inputs
  const [applications, setApplications] = useState<any[]>([]);
  const [startups, setStartups] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [appsRes, startupsRes] = await Promise.all([
      supabase.from('applications').select('id, status, startups(id, company_name), programs(id, title)').order('submitted_at', { ascending: false }).limit(50),
      supabase.from('startups').select('id, company_name, sector, stage').limit(50),
    ]);
    setApplications(appsRes.data || []);
    setStartups(startupsRes.data || []);
  };

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  });

  const runAgent = async (agentId: string) => {
    if (!selectedId && agentId !== 'facility_predictor') {
      setError('Please select an item to analyze.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      let endpoint = '';
      let body: any = {};

      switch (agentId) {
        case 'summarizer':
          endpoint = `${API_BASE}/summarize/${selectedId}`;
          break;
        case 'prescreener':
          endpoint = `${API_BASE}/prescreen/${selectedId}`;
          break;
        case 'mentor_matcher':
          endpoint = `${API_BASE}/mentor-match/${selectedId}`;
          body = { top_n: 5 };
          break;
        case 'facility_predictor':
          endpoint = `${API_BASE}/facility-predict`;
          body = { forecast_period: 'next 7 days' };
          break;
        case 'progress_insights':
          endpoint = `${API_BASE}/progress/${selectedId}`;
          break;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Agent call failed');
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderSelector = () => {
    if (!activeAgent) return null;

    if (activeAgent === 'facility_predictor') {
      return (
        <div className="glass-card p-4 text-sm text-on-surface-variant">
          This agent analyzes your facility data automatically. No selection needed.
        </div>
      );
    }

    if (activeAgent === 'summarizer' || activeAgent === 'prescreener') {
      if (applications.length === 0) {
        return (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-400">
            No applications found. Startups need to submit applications before AI analysis can run.
          </div>
        );
      }
      return (
        <div className="space-y-2">
          <label className="text-sm font-medium text-on-surface-variant">Select Application</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50"
          >
            <option value="">Choose an application...</option>
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {(app.startups as any)?.company_name || 'Unknown'} — {(app.programs as any)?.title || 'No Program'} ({app.status})
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (activeAgent === 'mentor_matcher' || activeAgent === 'progress_insights') {
      if (startups.length === 0) {
        return (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-400">
            No startups found. Startups need to register before AI analysis can run.
          </div>
        );
      }
      return (
        <div className="space-y-2">
          <label className="text-sm font-medium text-on-surface-variant">Select Startup</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50"
          >
            <option value="">Choose a startup...</option>
            {startups.map((s) => (
              <option key={s.id} value={s.id}>
                {s.company_name} ({s.sector || 'N/A'} — {s.stage || 'N/A'})
              </option>
            ))}
          </select>
        </div>
      );
    }

    return null;
  };

  const renderResult = () => {
    if (!result) return null;

    if (activeAgent === 'summarizer' && result.summary) {
      const s = result.summary;
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-headline font-bold text-lg">{result.startup_name}</h4>
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-bold uppercase",
              s.overall_impression === 'strong' ? 'bg-green-500/20 text-green-400' :
              s.overall_impression === 'moderate' ? 'bg-amber-500/20 text-amber-400' :
              'bg-red-500/20 text-red-400'
            )}>
              {s.overall_impression}
            </span>
          </div>
          <p className="text-on-surface-variant text-sm">{s.executive_summary}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoBlock title="Problem" content={s.problem_statement} />
            <InfoBlock title="Solution" content={s.proposed_solution} />
            <InfoBlock title="Target Market" content={s.target_market} />
            <InfoBlock title="Business Model" content={s.business_model} />
            <InfoBlock title="Team Strength" content={s.team_strength} />
            <InfoBlock title="Competitive Advantage" content={s.competitive_advantage} />
          </div>

          <div className="flex items-center gap-4 text-xs text-on-surface-variant">
            <span>Stage: <strong className="text-on-surface">{s.stage_assessment}</strong></span>
            <span>Confidence: <strong className="text-on-surface">{Math.round(s.confidence * 100)}%</strong></span>
          </div>

          {s.key_risks && s.key_risks.length > 0 && (
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-2">Key Risks</p>
              <div className="flex flex-wrap gap-2">
                {s.key_risks.map((risk: string, i: number) => (
                  <span key={i} className="bg-error/10 text-error text-xs px-3 py-1 rounded-full">{risk}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (activeAgent === 'prescreener' && result.result) {
      const r = result.result;
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-headline font-bold text-lg">{r.startup_name}</h4>
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-bold uppercase",
              r.recommendation === 'strongly_recommend' ? 'bg-green-500/20 text-green-400' :
              r.recommendation === 'recommend' ? 'bg-blue-500/20 text-blue-400' :
              r.recommendation === 'borderline' ? 'bg-amber-500/20 text-amber-400' :
              'bg-red-500/20 text-red-400'
            )}>
              {r.recommendation.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-3xl font-headline font-bold text-gradient">{r.percentage}%</div>
            <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all"
                style={{ width: `${r.percentage}%` }}
              />
            </div>
          </div>

          {r.criteria_scores && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Criteria Breakdown</p>
              {r.criteria_scores.map((cs: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-on-surface-variant w-40 truncate">{cs.criterion_name}</span>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(cs.score / cs.max_score) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold w-12 text-right">{cs.score}/{cs.max_score}</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {r.key_strengths && r.key_strengths.length > 0 && (
              <div>
                <p className="text-xs font-bold text-green-400 uppercase mb-2">Strengths</p>
                <ul className="space-y-1">
                  {r.key_strengths.map((s: string, i: number) => (
                    <li key={i} className="text-sm text-on-surface-variant flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">+</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {r.key_concerns && r.key_concerns.length > 0 && (
              <div>
                <p className="text-xs font-bold text-red-400 uppercase mb-2">Concerns</p>
                <ul className="space-y-1">
                  {r.key_concerns.map((c: string, i: number) => (
                    <li key={i} className="text-sm text-on-surface-variant flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">-</span> {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeAgent === 'mentor_matcher' && result.matches) {
      return (
        <div className="space-y-4">
          <h4 className="font-headline font-bold text-lg">
            Mentor Matches for {result.startup_name}
          </h4>
          <div className="space-y-3">
            {result.matches.map((m: any, i: number) => (
              <div key={i} className="glass-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
                      {m.mentor_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-bold">{m.mentor_name}</p>
                      <p className="text-xs text-on-surface-variant">{m.match_rationale}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-headline font-bold text-gradient">{m.match_score}</span>
                    <p className="text-[10px] text-on-surface-variant uppercase">Match Score</p>
                  </div>
                </div>
                {m.complementary_skills && m.complementary_skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {m.complementary_skills.map((skill: string, j: number) => (
                      <span key={j} className="text-[10px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-full">{skill}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeAgent === 'facility_predictor' && result.prediction) {
      const p = result.prediction;
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-headline font-bold text-lg">Facility Usage Forecast</h4>
            {p.capacity_alert && (
              <span className="bg-error/20 text-error text-xs px-3 py-1 rounded-full font-bold animate-pulse">
                Capacity Alert
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="glass-card p-4 text-center">
              <p className="text-xs text-on-surface-variant uppercase">Trend</p>
              <p className={cn(
                "text-lg font-bold mt-1 capitalize",
                p.occupancy_trend === 'increasing' ? 'text-amber-400' :
                p.occupancy_trend === 'decreasing' ? 'text-green-400' : 'text-blue-400'
              )}>
                {p.occupancy_trend}
              </p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-xs text-on-surface-variant uppercase">Peak Hours</p>
              <p className="text-sm font-bold mt-1">{p.peak_hours?.join(', ') || 'N/A'}</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-xs text-on-surface-variant uppercase">Peak Days</p>
              <p className="text-sm font-bold mt-1">{p.peak_days?.join(', ') || 'N/A'}</p>
            </div>
          </div>

          {p.recommendations && p.recommendations.length > 0 && (
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-2">Recommendations</p>
              <ul className="space-y-2">
                {p.recommendations.map((rec: string, i: number) => (
                  <li key={i} className="text-sm text-on-surface-variant flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-on-surface-variant">
            Analyzed {result.spaces_analyzed} spaces | Confidence: {Math.round(p.confidence * 100)}%
          </p>
        </div>
      );
    }

    if (activeAgent === 'progress_insights' && result.insight) {
      const ins = result.insight;
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-headline font-bold text-lg">{result.startup_name}</h4>
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-bold uppercase",
              ins.status === 'excelling' ? 'bg-green-500/20 text-green-400' :
              ins.status === 'on_track' ? 'bg-blue-500/20 text-blue-400' :
              ins.status === 'at_risk' ? 'bg-amber-500/20 text-amber-400' :
              'bg-red-500/20 text-red-400'
            )}>
              {ins.status.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-4 text-center">
              <p className="text-xs text-on-surface-variant uppercase">Milestone Completion</p>
              <p className="text-3xl font-headline font-bold text-gradient mt-1">{ins.milestone_completion_rate}%</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-xs text-on-surface-variant uppercase">Engagement Score</p>
              <p className="text-3xl font-headline font-bold text-gradient mt-1">{ins.engagement_score}</p>
            </div>
          </div>

          {ins.key_findings && ins.key_findings.length > 0 && (
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-2">Key Findings</p>
              <ul className="space-y-2">
                {ins.key_findings.map((f: string, i: number) => (
                  <li key={i} className="text-sm text-on-surface-variant flex items-start gap-2">
                    <Target className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {ins.recommendations && ins.recommendations.length > 0 && (
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-2">Recommendations</p>
              <ul className="space-y-2">
                {ins.recommendations.map((r: string, i: number) => (
                  <li key={i} className="text-sm text-on-surface-variant flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    // Fallback: raw JSON
    return (
      <pre className="text-xs text-on-surface-variant overflow-auto max-h-96 p-4 bg-white/5 rounded-xl">
        {JSON.stringify(result, null, 2)}
      </pre>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-headline font-bold flex items-center gap-3">
            <BrainCircuit className="w-7 h-7 text-primary" />
            AI Insights
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Gemini-powered intelligence for your incubation ecosystem
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-full">
          <Shield className="w-3.5 h-3.5" />
          Human-in-the-loop
        </div>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => {
          const Icon = agent.icon;
          const isActive = activeAgent === agent.id;
          return (
            <button
              key={agent.id}
              onClick={() => { setActiveAgent(agent.id); setResult(null); setError(''); setSelectedId(''); }}
              className={cn(
                "glass-card p-5 text-left transition-all duration-200 hover:scale-[1.02] group",
                isActive && "ring-2 ring-primary/50 bg-primary/5"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", agent.bgColor)}>
                  <Icon className={cn("w-5 h-5", agent.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{agent.title}</p>
                  <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">{agent.description}</p>
                </div>
                <ChevronRight className={cn("w-4 h-4 text-on-surface-variant transition-transform", isActive && "rotate-90 text-primary")} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Agent Panel */}
      {activeAgent && (
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-headline font-bold text-lg">
              {agents.find((a) => a.id === activeAgent)?.title}
            </h3>
            <button
              onClick={() => runAgent(activeAgent)}
              disabled={loading}
              className="gradient-btn px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? 'Analyzing...' : 'Run Agent'}
            </button>
          </div>

          {/* Input selector */}
          {renderSelector()}

          {/* Error */}
          {error && (
            <div className="bg-error/10 border border-error/20 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-error">{error}</p>
                {error.includes('rate') || error.includes('busy') ? (
                  <p className="text-xs text-error/70 mt-1">The Gemini API has usage limits. Wait 30-60 seconds before retrying.</p>
                ) : null}
              </div>
              <button
                onClick={() => { setError(''); runAgent(activeAgent!); }}
                className="text-xs font-bold text-error hover:text-error/80 border border-error/30 px-3 py-1.5 rounded-lg transition-colors shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="border-t border-white/10 pt-6">
              {renderResult()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const InfoBlock: React.FC<{ title: string; content: string }> = ({ title, content }) => (
  <div className="bg-white/5 rounded-xl p-3">
    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-1">{title}</p>
    <p className="text-sm">{content}</p>
  </div>
);
