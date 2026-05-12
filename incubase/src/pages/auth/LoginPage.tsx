/**
 * Login Page
 * Handles email/password authentication via Supabase Auth.
 * Includes demo login buttons for quick testing.
 */
import React, { useState } from 'react';
import { Hexagon, Mail, Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore, useTenantStore } from '@/src/lib/store';

interface AuthPageProps {
  onNavigate: (path: string) => void;
}

export const LoginPage: React.FC<AuthPageProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);
  const setSession = useAuthStore((s) => s.setSession);
  const setTenant = useTenantStore((s) => s.setTenant);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) throw new Error('Profile not found. Contact your administrator.');

      // Fetch tenant
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', profile.tenant_id)
        .single();

      setSession(data.session);
      setUser({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        tenant_id: profile.tenant_id,
        avatar_url: profile.avatar_url,
      });

      if (tenantData) {
        setTenant({
          id: tenantData.id,
          name: tenantData.name,
          slug: tenantData.slug,
          plan: tenantData.plan,
        });
      }

      onNavigate('/app');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Demo login — bypass auth for development
  const handleDemoLogin = async (role: string) => {
    setError('');
    setLoading(true);
    
    const demoEmails: Record<string, string> = {
      admin: 'admin@incubase.demo',
      facility_manager: 'facility@incubase.demo',
      reviewer: 'reviewer@incubase.demo',
      mentor: 'mentor@incubase.demo',
      startup: 'startup@incubase.demo',
    };
    
    const demoPasswords: Record<string, string> = {
      admin: 'Admin@123456',
      facility_manager: 'Facility@123456',
      reviewer: 'Reviewer@123456',
      mentor: 'Mentor@123456',
      startup: 'Startup@123456',
    };

    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: demoEmails[role],
        password: demoPasswords[role],
      });

      if (authErr) throw authErr;

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', profile?.tenant_id)
        .single();

      setSession(data.session);
      setUser({
        id: profile!.id,
        email: profile!.email,
        name: profile!.name,
        role: profile!.role,
        tenant_id: profile!.tenant_id,
        avatar_url: profile!.avatar_url,
      });

      if (tenantData) {
        setTenant({
          id: tenantData.id,
          name: tenantData.name,
          slug: tenantData.slug,
          plan: tenantData.plan,
        });
      }

      onNavigate('/app');
    } catch (err: any) {
      setError(`Demo login failed: ${err.message}`);
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
          <p className="text-on-surface-variant text-sm">Sign in to your incubation center</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="glass-card p-8 space-y-6">
          {error && (
            <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-sm text-error">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@incubator.org"
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
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full gradient-btn py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Sign In
          </button>
        </form>

        {/* Demo Access */}
        <div className="glass-card p-6 space-y-4">
          <p className="text-xs text-center text-on-surface-variant font-bold uppercase tracking-widest">Demo Access — Real Auth</p>
          <div className="grid grid-cols-2 gap-2">
            {['admin', 'facility_manager', 'reviewer', 'startup', 'mentor'].map((role) => (
              <button
                key={role}
                onClick={() => handleDemoLogin(role)}
                disabled={loading}
                className="px-3 py-2.5 bg-white/5 hover:bg-primary/10 hover:text-primary rounded-lg text-xs font-medium capitalize transition-colors border border-white/5 disabled:opacity-50"
              >
                {role.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Signup link */}
        <p className="text-center text-sm text-on-surface-variant">
          Don't have an account?{' '}
          <button onClick={() => onNavigate('/signup')} className="text-primary hover:underline font-medium">
            Create one
          </button>
        </p>

        {/* Back to landing */}
        <p className="text-center">
          <button onClick={() => onNavigate('/')} className="text-sm text-on-surface-variant hover:text-primary transition-colors">
            ← Back to homepage
          </button>
        </p>
      </div>
    </div>
  );
};
