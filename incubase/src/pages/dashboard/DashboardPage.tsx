/**
 * Dashboard Page — Role-specific overview
 * Shows different metrics and widgets based on the user's role.
 */
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/src/lib/store';
import { supabase } from '@/src/lib/supabase';
import { cn } from '@/src/lib/utils';
import {
  DraftingCompass, Files, Users, Armchair, BarChart3, TrendingUp,
  CheckCircle2, Clock, AlertTriangle, BrainCircuit, Building2, Loader2,
  Shield, Activity, Send
} from 'lucide-react';

// Stat Card Component
const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  change?: string;
  color?: string;
}> = ({ icon: Icon, label, value, change, color = 'text-primary' }) => (
  <div className="glass-card p-6 group hover:shadow-[0_0_30px_rgba(79,70,229,0.15)] transition-all duration-300">
    <div className="flex items-start justify-between mb-4">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center bg-white/5", color)}>
        <Icon className="w-6 h-6" />
      </div>
      {change && (
        <span className={cn("text-xs font-bold px-2 py-1 rounded-full", 
          change.startsWith('+') ? "bg-green-500/10 text-green-400" : "bg-error/10 text-error"
        )}>
          {change}
        </span>
      )}
    </div>
    <p className="text-3xl font-headline font-bold mb-1">{value}</p>
    <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wide">{label}</p>
  </div>
);

// Activity Item
const ActivityItem: React.FC<{ icon: React.ElementType; text: string; time: string; color: string }> = ({ icon: Icon, text, time, color }) => (
  <div className="flex items-start gap-4 py-4 border-b border-white/5 last:border-0">
    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", color)}>
      <Icon className="w-4 h-4" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm">{text}</p>
      <p className="text-xs text-on-surface-variant mt-0.5">{time}</p>
    </div>
  </div>
);

interface DashboardPageProps {
  onNavigate: (path: string) => void;
}

const actionIcons: Record<string, React.ElementType> = {
  ai_summarize: BrainCircuit, ai_prescreen: BrainCircuit, ai_mentor_match: BrainCircuit,
  ai_facility_predict: BrainCircuit, ai_progress_insight: BrainCircuit,
  role_changed: Shield, milestone_created: Activity, mentorship_logged: Users,
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const user = useAuthStore((s) => s.user);
  
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<any>({});
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        if (user.role === 'admin' || user.role === 'reviewer') {
          const [progRes, appRes, spaceRes, userRes] = await Promise.all([
            supabase.from('programs').select('id', { count: 'exact' }).in('status', ['open', 'evaluating', 'active']),
            supabase.from('applications').select('id', { count: 'exact' }).eq('status', 'submitted'),
            supabase.from('spaces').select('status'),
            supabase.from('users').select('id', { count: 'exact' }).eq('role', 'mentor')
          ]);
          
          const spaces = spaceRes.data || [];
          const occupied = spaces.filter(s => s.status === 'occupied').length;
          const occRate = spaces.length ? Math.round((occupied / spaces.length) * 100) : 0;
          
          setStatsData({
            activePrograms: progRes.count || 0,
            pendingApps: appRes.count || 0,
            occupancy: `${occRate}%`,
            mentors: userRes.count || 0
          });
        } 
        else if (user.role === 'facility_manager') {
          const { data: spaces } = await supabase.from('spaces').select('*');
          const totalSpaces = spaces?.length || 0;
          const occupied = spaces?.filter(s => s.status === 'occupied').length || 0;
          const occRate = totalSpaces ? Math.round((occupied / totalSpaces) * 100) : 0;
          
          const { data: bookings } = await supabase
            .from('bookings')
            .select('id', { count: 'exact' })
            .gte('start_time', new Date().toISOString().slice(0, 10));

          setStatsData({
            totalSpaces,
            occupied,
            bookings: bookings?.length || 0,
            utilization: `${occRate}%`
          });
        }
        else if (user.role === 'startup') {
          // Fetch startup's own data
          const { data: startup } = await supabase
            .from('startups')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (startup) {
            const [milRes, sessRes, spaceRes] = await Promise.all([
              supabase.from('milestones').select('id, status').eq('startup_id', startup.id),
              supabase.from('mentorship_sessions').select('id', { count: 'exact' }).eq('startup_id', startup.id),
              supabase.from('space_allocations').select('spaces(name)').eq('startup_id', startup.id).eq('status', 'active').maybeSingle(),
            ]);
            const mils = milRes.data || [];
            const completed = mils.filter(m => m.status === 'completed').length;
            setStatsData({
              milestones: `${completed}/${mils.length}`,
              deadline: mils.find(m => m.status !== 'completed') ? 'Upcoming' : 'All done!',
              sessions: sessRes.data?.length || 0,
              space: (spaceRes.data as any)?.spaces?.name || 'Not assigned'
            });
          } else {
            setStatsData({ milestones: '0/0', deadline: '—', sessions: 0, space: 'Not assigned' });
          }
        }
        else if (user.role === 'mentor') {
          const { data: sessions } = await supabase
            .from('mentorship_sessions')
            .select('id', { count: 'exact' })
            .eq('mentor_id', user.id);
          setStatsData({ sessions: sessions?.length || 0 });
        }

        // Fetch real recent activity from audit logs
        const { data: auditData } = await supabase
          .from('audit_logs')
          .select('id, action, entity_type, created_at, users(name)')
          .order('created_at', { ascending: false })
          .limit(6);

        if (auditData && auditData.length > 0) {
          setActivities(auditData.map((log) => ({
            icon: actionIcons[log.action] || Activity,
            text: `${formatAction(log.action)} (${log.entity_type}) by ${(log as any).users?.name || 'System'}`,
            time: formatTimeAgo(log.created_at),
            color: getActionColor(log.action),
          })));
        } else {
          // Fallback to defaults if no audit logs exist yet
          setActivities([
            { icon: Files, text: 'New application received', time: 'Recently', color: 'bg-primary/10 text-primary' },
            { icon: CheckCircle2, text: 'System checks nominal', time: 'Today', color: 'bg-green-500/10 text-green-400' },
            { icon: BrainCircuit, text: 'AI Agents ready', time: 'Today', color: 'bg-secondary/10 text-secondary' },
          ]);
        }
        
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const adminStats = [
    { icon: DraftingCompass, label: 'Active Programs', value: statsData.activePrograms, color: 'text-primary' },
    { icon: Files, label: 'Pending Applications', value: statsData.pendingApps, color: 'text-secondary' },
    { icon: Armchair, label: 'Space Occupancy', value: statsData.occupancy, color: 'text-primary' },
    { icon: Users, label: 'Active Mentors', value: statsData.mentors, color: 'text-tertiary' },
  ];

  const facilityStats = [
    { icon: Armchair, label: 'Total Spaces', value: statsData.totalSpaces, color: 'text-primary' },
    { icon: Building2, label: 'Occupied', value: statsData.occupied, color: 'text-secondary' },
    { icon: Clock, label: 'Bookings Today', value: statsData.bookings, color: 'text-tertiary' },
    { icon: BarChart3, label: 'Utilization', value: statsData.utilization, color: 'text-primary' },
  ];

  const startupStats = [
    { icon: CheckCircle2, label: 'Milestones Done', value: statsData.milestones, color: 'text-primary' },
    { icon: Clock, label: 'Next Deadline', value: statsData.deadline, color: 'text-tertiary' },
    { icon: Users, label: 'Mentor Sessions', value: statsData.sessions, color: 'text-secondary' },
    { icon: Armchair, label: 'My Space', value: statsData.space, color: 'text-primary' },
  ];

  const mentorStats = [
    { icon: Users, label: 'Sessions Conducted', value: statsData.sessions, color: 'text-primary' },
  ];

  const stats = user?.role === 'facility_manager' ? facilityStats :
    user?.role === 'startup' ? startupStats :
    user?.role === 'mentor' ? mentorStats : adminStats;

  // Quick actions with navigation
  const quickActions = [
    { label: 'Create Program', icon: DraftingCompass, roles: ['admin'], path: '/app/programs/new' },
    { label: 'Review Applications', icon: Files, roles: ['admin', 'reviewer'], path: '/app/applications' },
    { label: 'View AI Insights', icon: BrainCircuit, roles: ['admin', 'reviewer'], path: '/app/ai' },
    { label: 'Manage Spaces', icon: Armchair, roles: ['admin', 'facility_manager'], path: '/app/facilities' },
    { label: 'Apply to Program', icon: Send, roles: ['startup'], path: '/app/applications/submit' },
    { label: 'View My Progress', icon: TrendingUp, roles: ['startup'], path: '/app/lifecycle' },
  ].filter((action) => user && action.roles.includes(user.role));

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-headline font-bold">
          Welcome back, <span className="text-gradient">{user?.name || 'User'}</span>
        </h1>
        <p className="text-on-surface-variant text-sm mt-1">Here's what's happening in your incubation center today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="font-headline font-bold text-lg mb-4">Recent Activity</h3>
          <div>
            {activities.map((item, i) => (
              <ActivityItem key={i} {...item} />
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass-card p-6">
          <h3 className="font-headline font-bold text-lg mb-4">Quick Actions</h3>
          <div className="space-y-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => onNavigate(action.path)}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 hover:text-primary transition-colors text-sm font-medium text-left"
              >
                <action.icon className="w-5 h-5 text-primary" />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

function formatAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatTimeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getActionColor(action: string): string {
  if (action.startsWith('ai_')) return 'bg-secondary/10 text-secondary';
  if (action === 'milestone_created') return 'bg-green-500/10 text-green-400';
  if (action === 'mentorship_logged') return 'bg-purple-500/10 text-purple-400';
  if (action === 'role_changed') return 'bg-amber-500/10 text-amber-400';
  return 'bg-primary/10 text-primary';
}


