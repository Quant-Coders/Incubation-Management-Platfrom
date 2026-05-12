/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * IncuBase App — Root Component
 * 
 * Routes:
 * - / → Landing page (public)
 * - /login → Authentication
 * - /signup → Registration
 * - /app/* → Dashboard (authenticated, role-gated)
 */

import React, { useState, useEffect } from 'react';
import { useAuthStore, useTenantStore } from './lib/store';
import { supabase } from './lib/supabase';
import { LandingPage } from './pages/landing/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProgramsListPage } from './pages/programs/ProgramsListPage';
import { ApplicationsListPage } from './pages/applications/ApplicationsListPage';
import { FacilitiesPage } from './pages/facilities/FacilitiesPage';
import { LifecyclePage } from './pages/lifecycle/LifecyclePage';
import { AnalyticsPage } from './pages/analytics/AnalyticsPage';
import { AIInsightsPage } from './pages/ai/AIInsightsPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { CompliancePage } from './pages/compliance/CompliancePage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { ProgramDetailPage } from './pages/programs/ProgramDetailPage';
import { ApplicationDetailPage } from './pages/applications/ApplicationDetailPage';
import { ApplicationSubmitPage } from './pages/applications/ApplicationSubmitPage';
import { Loader2 } from 'lucide-react';

export default function App() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const setSession = useAuthStore((s) => s.setSession);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setLoading = useAuthStore((s) => s.setLoading);
  const setTenant = useTenantStore((s) => s.setTenant);
  const logout = useAuthStore((s) => s.logout);
  const [currentPath, setCurrentPath] = useState(window.location.hash.slice(1) || '/');

  const navigate = (path: string) => {
    setCurrentPath(path);
    window.location.hash = path;
  };

  // Listen for hash changes (browser back/forward)
  useEffect(() => {
    const handler = () => setCurrentPath(window.location.hash.slice(1) || '/');
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  // Auth session persistence — restore session on app load
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && isMounted) {
          // Fetch user profile
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            setSession(session);
            setUser({
              id: profile.id,
              email: profile.email,
              name: profile.name,
              role: profile.role,
              tenant_id: profile.tenant_id,
              avatar_url: profile.avatar_url,
            });

            // Fetch tenant
            const { data: tenantData } = await supabase
              .from('tenants')
              .select('*')
              .eq('id', profile.tenant_id)
              .single();

            if (tenantData) {
              setTenant({
                id: tenantData.id,
                name: tenantData.name,
                slug: tenantData.slug,
                plan: tenantData.plan,
              });
            }
          }
        }
      } catch (err) {
        console.error('[Auth] Session restore failed:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    restoreSession();

    // Listen for auth changes (login/logout from other tabs)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        logout();
        setTenant(null);
        navigate('/');
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    setTenant(null);
    navigate('/');
  };

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-on-surface-variant text-sm">Loading IncuBase...</p>
        </div>
      </div>
    );
  }

  // Public routes
  if (currentPath === '/' || currentPath === '') {
    return <LandingPage onNavigate={navigate} />;
  }

  if (currentPath === '/login') {
    if (user) { navigate('/app'); return null; }
    return <LoginPage onNavigate={navigate} />;
  }

  if (currentPath === '/signup') {
    if (user) { navigate('/app'); return null; }
    return <SignupPage onNavigate={navigate} />;
  }

  // Protected routes — require authentication
  if (currentPath.startsWith('/app')) {
    if (!user) {
      return <LoginPage onNavigate={navigate} />;
    }

    return (
      <DashboardLayout currentPath={currentPath} onNavigate={navigate}>
        {currentPath === '/app' && <DashboardPage onNavigate={navigate} />}
        {currentPath === '/app/programs' && <ProgramsListPage onNavigate={navigate} />}
        {currentPath === '/app/programs/new' && <ProgramDetailPage onNavigate={navigate} />}
        {currentPath.startsWith('/app/programs/') && currentPath !== '/app/programs/new' && (
          <ProgramDetailPage programId={currentPath.replace('/app/programs/', '')} onNavigate={navigate} />
        )}
        {currentPath === '/app/applications' && <ApplicationsListPage onNavigate={navigate} />}
        {currentPath === '/app/applications/submit' && <ApplicationSubmitPage onNavigate={navigate} />}
        {currentPath.startsWith('/app/applications/') && currentPath !== '/app/applications/submit' && (
          <ApplicationDetailPage applicationId={currentPath.replace('/app/applications/', '')} onNavigate={navigate} />
        )}
        {currentPath === '/app/facilities' && <FacilitiesPage onNavigate={navigate} />}
        {currentPath === '/app/lifecycle' && <LifecyclePage />}
        {currentPath === '/app/analytics' && <AnalyticsPage />}
        {currentPath === '/app/ai' && <AIInsightsPage />}
        {currentPath === '/app/reports' && <ReportsPage />}
        {currentPath === '/app/compliance' && <CompliancePage />}
        {currentPath === '/app/settings' && <SettingsPage />}
      </DashboardLayout>
    );
  }

  // 404
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="font-headline text-6xl font-bold text-primary">404</h1>
        <p className="text-on-surface-variant">Page not found</p>
        <button onClick={() => navigate('/')} className="gradient-btn px-6 py-3 rounded-xl text-sm font-bold">
          Go Home
        </button>
      </div>
    </div>
  );
}

