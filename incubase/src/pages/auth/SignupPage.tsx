/**
 * Signup Page — Register new organization + admin user
 * Creates a tenant, then signs up the first admin user.
 */
import React, { useState } from 'react';
import { Hexagon, Mail, Lock, User, Building2, Loader2 } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore, useTenantStore } from '@/src/lib/store';

interface SignupPageProps {
  onNavigate: (path: string) => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onNavigate }) => {
  const [step, setStep] = useState(1); // 1: org info, 2: user info
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);
  const setSession = useAuthStore((s) => s.setSession);
  const setTenant = useTenantStore((s) => s.setTenant);

  const handleSlugify = (name: string) => {
    setOrgName(name);
    setOrgSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Create tenant via direct insert (uses service role via API)
      const { data: tenant, error: tenantErr } = await supabase
        .from('tenants')
        .insert({
          name: orgName,
          slug: orgSlug,
          plan: 'foundational',
        })
        .select()
        .single();

      if (tenantErr) {
        if (tenantErr.message.includes('duplicate') || tenantErr.message.includes('unique')) {
          throw new Error('Organization slug already taken. Try a different name.');
        }
        throw tenantErr;
      }

      // 2. Create auth user with tenant metadata
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: 'admin',
            tenant_id: tenant.id,
          },
        },
      });

      if (authErr) throw authErr;
      if (!authData.user) throw new Error('Signup failed. Please try again.');

      // 3. Wait a moment for the trigger to create the user profile
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 4. Set session and user state
      if (authData.session) {
        setSession(authData.session);
      }

      setUser({
        id: authData.user.id,
        email: email,
        name: name,
        role: 'admin',
        tenant_id: tenant.id,
      });

      setTenant({
        id: tenant.id,
        name: orgName,
        slug: orgSlug,
        plan: 'foundational',
      });

      onNavigate('/app');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background hero-mesh flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Hexagon className="w-7 h-7 text-on-primary fill-on-primary/20" />
            </div>
            <span className="font-headline text-3xl font-bold text-primary">IncuBase</span>
          </div>
          <p className="text-on-surface-variant text-sm">Create your incubation center account</p>
        </div>

        {/* Signup Form */}
        <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2); } : handleSignup} className="glass-card p-8 space-y-6">
          {/* Step indicator */}
          <div className="flex items-center gap-4 mb-2">
            <div className={`flex items-center gap-2 text-xs font-bold ${step >= 1 ? 'text-primary' : 'text-on-surface-variant'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-primary text-on-primary' : 'bg-white/10'}`}>1</span>
              Organization
            </div>
            <div className="flex-1 h-px bg-white/10" />
            <div className={`flex items-center gap-2 text-xs font-bold ${step >= 2 ? 'text-primary' : 'text-on-surface-variant'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-primary text-on-primary' : 'bg-white/10'}`}>2</span>
              Admin Account
            </div>
          </div>

          {error && (
            <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-sm text-error">
              {error}
            </div>
          )}

          {step === 1 && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Organization Name</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => handleSlugify(e.target.value)}
                    placeholder="National Innovation Centre"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">URL Slug</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant">incubase.io/</span>
                  <input
                    type="text"
                    value={orgSlug}
                    onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="my-incubator"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-24 pr-4 py-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <button type="submit" className="w-full gradient-btn py-3.5 rounded-xl font-bold text-sm">
                Continue →
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Rajesh Kumar"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@incubator.org"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-3.5 rounded-xl font-bold text-sm border border-white/10 hover:bg-white/5 transition-colors">
                  ← Back
                </button>
                <button type="submit" disabled={loading} className="flex-1 gradient-btn py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Create Account
                </button>
              </div>
            </>
          )}
        </form>

        {/* Link to login */}
        <p className="text-center text-sm text-on-surface-variant">
          Already have an account?{' '}
          <button onClick={() => onNavigate('/login')} className="text-primary hover:underline font-medium">
            Sign in
          </button>
        </p>

        {/* Back */}
        <p className="text-center">
          <button onClick={() => onNavigate('/')} className="text-sm text-on-surface-variant hover:text-primary transition-colors">
            ← Back to homepage
          </button>
        </p>
      </div>
    </div>
  );
};
