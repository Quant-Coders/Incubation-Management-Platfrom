/**
 * Compliance Page — Audit logs, RBAC management, and security overview.
 */
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/src/lib/store';
import {
  Shield, Loader2, AlertCircle, Users, FileText, Activity,
  ChevronDown, Clock, User, BrainCircuit
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

const API_BASE = '/api/compliance';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: any;
  created_at: string;
  users: { name: string; email: string } | null;
}

interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

interface ComplianceStats {
  total_users: number;
  role_breakdown: Record<string, number>;
  total_audit_entries: number;
  ai_actions: number;
}

const roleColors: Record<string, string> = {
  admin: 'bg-red-500/20 text-red-400',
  facility_manager: 'bg-amber-500/20 text-amber-400',
  reviewer: 'bg-blue-500/20 text-blue-400',
  mentor: 'bg-purple-500/20 text-purple-400',
  startup: 'bg-green-500/20 text-green-400',
};

const actionIcons: Record<string, React.ElementType> = {
  ai_summarize: BrainCircuit,
  ai_prescreen: BrainCircuit,
  ai_mentor_match: BrainCircuit,
  ai_facility_predict: BrainCircuit,
  ai_progress_insight: BrainCircuit,
  role_changed: Shield,
  milestone_created: Activity,
  mentorship_logged: Users,
};

export const CompliancePage: React.FC = () => {
  const session = useAuthStore((s) => s.session);
  const [tab, setTab] = useState<'logs' | 'users'>('logs');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [logFilter, setLogFilter] = useState('');
  const [logsTotal, setLogsTotal] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  });

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [logsRes, usersRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/audit-logs?limit=100`, { headers: getHeaders() }),
        fetch(`${API_BASE}/users`, { headers: getHeaders() }),
        fetch(`${API_BASE}/stats`, { headers: getHeaders() }),
      ]);

      if (logsRes.ok) { const d = await logsRes.json(); setLogs(d.logs || []); setLogsTotal(d.total || 0); }
      if (usersRes.ok) { const d = await usersRes.json(); setUsers(d.users || []); }
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const changeRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/role`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredLogs = logFilter
    ? logs.filter((l) => l.action.includes(logFilter) || l.entity_type.includes(logFilter))
    : logs;

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
      <div>
        <h1 className="text-2xl font-headline font-bold flex items-center gap-3">
          <Shield className="w-7 h-7 text-primary" />
          Compliance & Security
        </h1>
        <p className="text-on-surface-variant text-sm mt-1">
          Audit trail, role management, and security oversight
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-5">
            <Users className="w-5 h-5 text-primary mb-2" />
            <p className="text-3xl font-headline font-bold">{stats.total_users}</p>
            <p className="text-xs text-on-surface-variant uppercase mt-1">Total Users</p>
          </div>
          <div className="glass-card p-5">
            <FileText className="w-5 h-5 text-secondary mb-2" />
            <p className="text-3xl font-headline font-bold">{stats.total_audit_entries}</p>
            <p className="text-xs text-on-surface-variant uppercase mt-1">Audit Entries</p>
          </div>
          <div className="glass-card p-5">
            <BrainCircuit className="w-5 h-5 text-purple-400 mb-2" />
            <p className="text-3xl font-headline font-bold">{stats.ai_actions}</p>
            <p className="text-xs text-on-surface-variant uppercase mt-1">AI Actions</p>
          </div>
          <div className="glass-card p-5">
            <Shield className="w-5 h-5 text-green-400 mb-2" />
            <p className="text-xs text-on-surface-variant uppercase mb-2">Roles</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(stats.role_breakdown).map(([role, count]) => (
                <span key={role} className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold", roleColors[role])}>
                  {role}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
        <button onClick={() => setTab('logs')} className={cn("px-5 py-2.5 rounded-lg text-sm font-bold transition-all", tab === 'logs' ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-on-surface')}>
          <Activity className="w-4 h-4 inline mr-2" />Audit Logs
        </button>
        <button onClick={() => setTab('users')} className={cn("px-5 py-2.5 rounded-lg text-sm font-bold transition-all", tab === 'users' ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-on-surface')}>
          <Users className="w-4 h-4 inline mr-2" />User Roles
        </button>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 rounded-xl p-4 text-sm text-error flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Audit Logs Tab */}
      {tab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              placeholder="Filter by action or entity type..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50"
            />
            <span className="text-xs text-on-surface-variant">{logsTotal} total</span>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="glass-card p-8 text-center text-on-surface-variant">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No audit log entries found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log) => {
                const ActionIcon = actionIcons[log.action] || Activity;
                return (
                  <div key={log.id} className="glass-card p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                      <ActionIcon className="w-4 h-4 text-on-surface-variant" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold">{log.action}</span>
                        <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full">{log.entity_type}</span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1">
                        by {log.users?.name || 'System'} ({log.users?.email || ''})
                      </p>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <p className="text-[10px] text-on-surface-variant/60 mt-1 font-mono truncate">
                          {JSON.stringify(log.metadata)}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-on-surface-variant whitespace-nowrap flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="glass-card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                {u.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{u.name}</p>
                <p className="text-xs text-on-surface-variant">{u.email}</p>
              </div>
              <div className="relative">
                <select
                  value={u.role}
                  onChange={(e) => changeRole(u.id, e.target.value)}
                  className={cn("text-xs font-bold px-3 py-1.5 rounded-full appearance-none cursor-pointer pr-7 border-none outline-none", roleColors[u.role])}
                >
                  <option value="admin">Admin</option>
                  <option value="facility_manager">Facility Manager</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="mentor">Mentor</option>
                  <option value="startup">Startup</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
              </div>
              <span className="text-[10px] text-on-surface-variant">
                Joined {new Date(u.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
