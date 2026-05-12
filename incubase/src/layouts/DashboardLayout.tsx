/**
 * Dashboard Layout
 * Wraps authenticated pages with sidebar and topbar.
 */
import React, { useState } from 'react';
import { cn } from '@/src/lib/utils';
import { useUIStore, useAuthStore, useTenantStore } from '@/src/lib/store';
import { Sidebar } from '../components/layout/Sidebar';
import { Bell, Search, Menu } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, currentPath, onNavigate }) => {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const user = useAuthStore((s) => s.user);
  const tenant = useTenantStore((s) => s.tenant);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar currentPath={currentPath} onNavigate={onNavigate} />

      {/* Main content */}
      <div className={cn("transition-all duration-300", sidebarOpen ? "ml-64" : "ml-20")}>
        {/* Topbar */}
        <header className="h-20 border-b border-white/10 bg-surface/80 backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-white/10 rounded-lg">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg font-bold font-headline">
                {getPageTitle(currentPath)}
              </h2>
              {tenant && <p className="text-xs text-on-surface-variant">{tenant.name}</p>}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="hidden md:flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2.5 border border-white/10">
              <Search className="w-4 h-4 text-on-surface-variant" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none w-48"
              />
            </div>

            {/* Notifications */}
            <button className="relative p-2.5 hover:bg-white/10 rounded-xl transition-colors">
              <Bell className="w-5 h-5 text-on-surface-variant" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-secondary rounded-full" />
            </button>

            {/* User avatar */}
            {user && (
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

function getPageTitle(path: string): string {
  const titles: Record<string, string> = {
    '/app': 'Dashboard',
    '/app/programs': 'Programs',
    '/app/programs/new': 'New Program',
    '/app/applications': 'Applications',
    '/app/applications/submit': 'Apply to Program',
    '/app/lifecycle': 'Startups & Lifecycle',
    '/app/facilities': 'Facilities',
    '/app/analytics': 'Analytics',
    '/app/ai': 'AI Insights',
    '/app/reports': 'Reports',
    '/app/compliance': 'Compliance',
    '/app/settings': 'Settings',
  };
  if (titles[path]) return titles[path];
  if (path.startsWith('/app/programs/')) return 'Program Details';
  if (path.startsWith('/app/applications/')) return 'Application Details';
  return 'IncuBase';
}
