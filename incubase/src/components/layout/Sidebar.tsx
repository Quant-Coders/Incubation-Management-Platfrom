/**
 * Dashboard Sidebar Navigation
 * Role-aware navigation that shows/hides items based on user permissions.
 */
import React from 'react';
import { cn } from '@/src/lib/utils';
import { useAuthStore, useUIStore } from '@/src/lib/store';
import {
  LayoutDashboard, DraftingCompass, Files, Users, Calendar,
  Building2, BarChart3, FileText, Shield, Settings, LogOut,
  Hexagon, ChevronLeft, BrainCircuit, Armchair
} from 'lucide-react';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  roles: string[];        // which roles can see this item
  badge?: string;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/app', roles: ['admin', 'facility_manager', 'reviewer', 'mentor', 'startup'] },
  { icon: DraftingCompass, label: 'Programs', href: '/app/programs', roles: ['admin', 'reviewer'] },
  { icon: Files, label: 'Applications', href: '/app/applications', roles: ['admin', 'reviewer', 'startup'] },
  { icon: Users, label: 'Startups', href: '/app/lifecycle', roles: ['admin', 'mentor', 'reviewer'] },
  { icon: Armchair, label: 'Facilities', href: '/app/facilities', roles: ['admin', 'facility_manager', 'startup'] },
  { icon: BarChart3, label: 'Analytics', href: '/app/analytics', roles: ['admin', 'facility_manager'] },
  { icon: BrainCircuit, label: 'AI Insights', href: '/app/ai', roles: ['admin', 'reviewer', 'mentor'] },
  { icon: FileText, label: 'Reports', href: '/app/reports', roles: ['admin', 'facility_manager', 'mentor'] },
  { icon: Shield, label: 'Compliance', href: '/app/compliance', roles: ['admin'] },
  { icon: Settings, label: 'Settings', href: '/app/settings', roles: ['admin', 'facility_manager', 'reviewer', 'mentor', 'startup'] },
];

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPath, onNavigate }) => {
  const user = useAuthStore((s) => s.user);
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const logout = useAuthStore((s) => s.logout);

  const filteredNav = navItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-full bg-surface border-r border-white/10 flex flex-col transition-all duration-300 z-40",
      sidebarOpen ? "w-64" : "w-20"
    )}>
      {/* Logo */}
      <div className="h-20 flex items-center gap-3 px-6 border-b border-white/10">
        <div className="w-8 h-8 rounded bg-primary flex items-center justify-center flex-shrink-0">
          <Hexagon className="w-5 h-5 text-on-primary fill-on-primary/20" />
        </div>
        {sidebarOpen && (
          <span className="font-headline text-xl font-bold text-primary tracking-tight">IncuBase</span>
        )}
        <button
          onClick={toggleSidebar}
          className={cn("ml-auto p-1.5 rounded-lg hover:bg-white/10 text-on-surface-variant transition-transform", !sidebarOpen && "rotate-180")}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = currentPath === item.href || (item.href !== '/app' && currentPath.startsWith(item.href));
          return (
            <button
              key={item.href}
              onClick={() => onNavigate(item.href)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface-variant hover:bg-white/5 hover:text-on-surface"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
              {sidebarOpen && item.badge && (
                <span className="ml-auto bg-secondary/20 text-secondary text-xs px-2 py-0.5 rounded-full font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="border-t border-white/10 p-4">
        {sidebarOpen && user && (
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-on-surface-variant capitalize">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};
