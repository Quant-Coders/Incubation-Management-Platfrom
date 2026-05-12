/**
 * Application Submit Page — for startup users to apply to open programs.
 * Renders form based on program's form_schema, or a default generic form.
 */
import React, { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/lib/store';
import {
  Send, ArrowLeft, Loader2, AlertCircle, CheckCircle2,
  DraftingCompass, Rocket, ChevronDown
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface Program {
  id: string;
  title: string;
  description: string;
  status: string;
  application_deadline: string;
  max_intake: number;
  form_schema: FormField[];
}

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number';
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

interface ApplicationSubmitPageProps {
  onNavigate: (path: string) => void;
}

const DEFAULT_FORM_FIELDS: FormField[] = [
  { id: 'company_name', label: 'Company Name', type: 'text', placeholder: 'Your company name', required: true },
  { id: 'problem_statement', label: 'Problem Statement', type: 'textarea', placeholder: 'Describe the problem you are solving...', required: true },
  { id: 'solution', label: 'Your Solution', type: 'textarea', placeholder: 'Describe your product or service...', required: true },
  { id: 'target_market', label: 'Target Market', type: 'textarea', placeholder: 'Who are your customers? What is the market size?', required: true },
  { id: 'revenue_model', label: 'Revenue / Business Model', type: 'textarea', placeholder: 'How does your startup make money?', required: false },
  { id: 'team_info', label: 'Team Information', type: 'textarea', placeholder: 'Tell us about the founding team — backgrounds, relevant experience...', required: true },
  { id: 'traction', label: 'Traction & Milestones', type: 'textarea', placeholder: 'Any users, pilots, revenue, partnerships, or notable progress?', required: false },
  { id: 'funding_raised', label: 'Funding Raised (if any)', type: 'text', placeholder: 'e.g., ₹10L bootstrapped, or Seed funded', required: false },
  { id: 'why_this_program', label: 'Why This Program?', type: 'textarea', placeholder: 'What do you hope to gain from this incubation program?', required: true },
  { id: 'website', label: 'Website / Demo Link', type: 'text', placeholder: 'https://...', required: false },
];

export const ApplicationSubmitPage: React.FC<ApplicationSubmitPageProps> = ({ onNavigate }) => {
  const user = useAuthStore((s) => s.user);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [myStartup, setMyStartup] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [existingApplications, setExistingApplications] = useState<Set<string>>(new Set());

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    setLoading(true);
    // Fetch open programs
    const { data: progData } = await supabase
      .from('programs')
      .select('id, title, description, status, application_deadline, max_intake, form_schema')
      .eq('status', 'open')
      .order('application_deadline', { ascending: true });

    // Fetch startup associated with this user
    const { data: startupData } = await supabase
      .from('startups')
      .select('*')
      .eq('user_id', user?.id)
      .maybeSingle();

    // Fetch existing applications by this startup
    if (startupData) {
      const { data: appsData } = await supabase
        .from('applications')
        .select('program_id')
        .eq('startup_id', startupData.id);
      setExistingApplications(new Set(appsData?.map((a) => a.program_id) || []));
    }

    setPrograms(progData || []);
    setMyStartup(startupData);
    setLoading(false);
  };

  const handleSelectProgram = (p: Program) => {
    setSelectedProgram(p);
    setFormData({});
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgram || !myStartup) {
      setError('Please select a program and ensure your startup profile is set up.');
      return;
    }

    const fields = getFormFields();
    // Validate required fields
    for (const field of fields) {
      if (field.required && !formData[field.id]?.trim()) {
        setError(`"${field.label}" is required.`);
        return;
      }
    }

    setSubmitting(true);
    setError('');
    try {
      const { error: err } = await supabase.from('applications').insert({
        tenant_id: user?.tenant_id,
        startup_id: myStartup.id,
        program_id: selectedProgram.id,
        form_data: formData,
        status: 'submitted',
        current_round: 1,
        submitted_at: new Date().toISOString(),
      });
      if (err) throw err;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getFormFields = (): FormField[] => {
    if (selectedProgram?.form_schema && selectedProgram.form_schema.length > 0) {
      return selectedProgram.form_schema;
    }
    return DEFAULT_FORM_FIELDS;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass-card p-12 text-center max-w-md space-y-4">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-headline font-bold">Application Submitted!</h2>
          <p className="text-on-surface-variant text-sm">
            Your application to <strong>{selectedProgram?.title}</strong> has been received. You'll be notified as the review progresses.
          </p>
          <button onClick={() => onNavigate('/app/applications')} className="gradient-btn px-6 py-3 rounded-xl text-sm font-bold mx-auto block">
            View My Applications
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => onNavigate('/app/applications')} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-headline font-bold flex items-center gap-3">
            <Send className="w-7 h-7 text-primary" />
            Apply to a Program
          </h1>
          <p className="text-on-surface-variant text-sm mt-0.5">Submit your application to an open incubation program</p>
        </div>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-sm text-error flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* No startup profile warning */}
      {!myStartup && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-400">
          No startup profile found for your account. Please contact your incubation manager.
        </div>
      )}

      {/* Program Selection */}
      {!selectedProgram ? (
        <div className="space-y-4">
          <h3 className="font-headline font-bold text-lg">Select a Program</h3>
          {programs.length === 0 ? (
            <div className="glass-card p-10 text-center text-on-surface-variant">
              <DraftingCompass className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No programs are currently open for applications.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {programs.map((p) => {
                const alreadyApplied = existingApplications.has(p.id);
                const deadline = p.application_deadline ? new Date(p.application_deadline) : null;
                const daysLeft = deadline ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

                return (
                  <div
                    key={p.id}
                    onClick={() => !alreadyApplied && myStartup && handleSelectProgram(p)}
                    className={cn(
                      "glass-card p-5 transition-all duration-200",
                      alreadyApplied ? 'opacity-60 cursor-not-allowed' :
                      !myStartup ? 'opacity-60 cursor-not-allowed' :
                      'cursor-pointer hover:shadow-[0_0_20px_rgba(79,70,229,0.15)] hover:-translate-y-0.5'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <DraftingCompass className="w-5 h-5 text-primary" />
                          <h4 className="font-headline font-bold">{p.title}</h4>
                          {alreadyApplied && (
                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold">
                              Applied
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-on-surface-variant line-clamp-2">{p.description}</p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-on-surface-variant">
                          {daysLeft !== null && daysLeft > 0 && (
                            <span className="text-amber-400 font-medium">{daysLeft} days to apply</span>
                          )}
                          {p.max_intake && <span>Max {p.max_intake} startups</span>}
                        </div>
                      </div>
                      {!alreadyApplied && myStartup && (
                        <button className="gradient-btn px-4 py-2 rounded-xl text-sm font-bold shrink-0 ml-4">
                          Apply
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Application Form */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedProgram(null)} className="p-1.5 hover:bg-white/10 rounded-lg">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <p className="text-xs text-on-surface-variant">Applying to</p>
                <h3 className="font-headline font-bold">{selectedProgram.title}</h3>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="glass-card p-6 space-y-6">
            {getFormFields().map((field) => (
              <div key={field.id}>
                <label className="text-sm font-medium text-on-surface-variant block mb-1.5">
                  {field.label}
                  {field.required && <span className="text-error ml-1">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={formData[field.id] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                    placeholder={field.placeholder}
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  />
                ) : field.type === 'select' && field.options ? (
                  <div className="relative">
                    <select
                      value={formData[field.id] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 appearance-none cursor-pointer"
                    >
                      <option value="">Select...</option>
                      {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                  </div>
                ) : (
                  <input
                    type={field.type}
                    value={formData[field.id] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={submitting || !myStartup}
              className="gradient-btn w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
