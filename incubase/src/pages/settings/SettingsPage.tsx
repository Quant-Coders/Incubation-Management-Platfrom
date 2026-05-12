/**
 * Settings Page — User profile, preferences, and account management.
 */
import React, { useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore, useTenantStore } from '@/src/lib/store';
import {
  Settings, User, Building2, LogOut, Save, Loader2, CheckCircle2, Shield
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

export const SettingsPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const tenant = useTenantStore((s) => s.tenant);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState(user?.name || '');
  const [email] = useState(user?.email || '');

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const { error: err } = await supabase
        .from('users')
        .update({ name })
        .eq('id', user.id);

      if (err) throw err;
      setUser({ ...user, name });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.hash = '/';
    window.location.reload();
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-headline font-bold flex items-center gap-3">
          <Settings className="w-7 h-7 text-primary" />
          Settings
        </h1>
        <p className="text-on-surface-variant text-sm mt-1">
          Manage your profile and account preferences
        </p>
      </div>

      {/* Profile Section */}
      <div className="glass-card p-6 space-y-6">
        <h3 className="font-headline font-bold text-lg flex items-center gap-2">
          <User className="w-5 h-5 text-primary" /> Profile
        </h3>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold">{name}</p>
            <p className="text-sm text-on-surface-variant">{email}</p>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block",
              user?.role === 'admin' ? 'bg-red-500/20 text-red-400' :
              user?.role === 'facility_manager' ? 'bg-amber-500/20 text-amber-400' :
              user?.role === 'reviewer' ? 'bg-blue-500/20 text-blue-400' :
              user?.role === 'mentor' ? 'bg-purple-500/20 text-purple-400' :
              'bg-green-500/20 text-green-400'
            )}>
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-on-surface-variant block mb-1.5">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-on-surface-variant block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none opacity-60 cursor-not-allowed"
            />
            <p className="text-[10px] text-on-surface-variant mt-1">Email cannot be changed</p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-error">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving || name === user?.name}
          className="gradient-btn px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Organization Section */}
      {tenant && (
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-headline font-bold text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> Organization
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-xs text-on-surface-variant uppercase">Name</p>
              <p className="font-bold mt-1">{tenant.name}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-xs text-on-surface-variant uppercase">Slug</p>
              <p className="font-bold mt-1 font-mono text-sm">{tenant.slug}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-xs text-on-surface-variant uppercase">Plan</p>
              <p className="font-bold mt-1 capitalize">{tenant.plan}</p>
            </div>
          </div>
        </div>
      )}

      {/* Security Section */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="font-headline font-bold text-lg flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> Security
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
            <div>
              <p className="text-sm font-medium">Multi-tenant isolation</p>
              <p className="text-xs text-on-surface-variant">Row Level Security enforced on all data</p>
            </div>
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full font-bold">Active</span>
          </div>
          <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
            <div>
              <p className="text-sm font-medium">Role-based access</p>
              <p className="text-xs text-on-surface-variant">Permissions enforced per user role</p>
            </div>
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full font-bold">Active</span>
          </div>
          <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
            <div>
              <p className="text-sm font-medium">AI human-in-the-loop</p>
              <p className="text-xs text-on-surface-variant">All AI actions are recommendations only</p>
            </div>
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full font-bold">Enforced</span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass-card p-6 border border-error/20">
        <h3 className="font-headline font-bold text-lg text-error mb-4">Danger Zone</h3>
        <button
          onClick={handleLogout}
          className="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 bg-error/10 text-error hover:bg-error/20 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
};
