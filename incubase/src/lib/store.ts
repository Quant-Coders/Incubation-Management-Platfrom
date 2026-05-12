/**
 * Global State Management (Zustand)
 * Manages auth state, tenant context, and UI state.
 */

import { create } from 'zustand';

// ═══════════════════════════════════════════
// Auth Store
// ═══════════════════════════════════════════
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'facility_manager' | 'reviewer' | 'mentor' | 'startup';
  tenant_id: string;
  avatar_url?: string;
}

interface AuthState {
  user: User | null;
  session: any | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: any | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, session: null }),
}));

// ═══════════════════════════════════════════
// Tenant Store
// ═══════════════════════════════════════════
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: 'foundational' | 'professional' | 'enterprise';
  logo_url?: string;
}

interface TenantState {
  tenant: Tenant | null;
  setTenant: (tenant: Tenant | null) => void;
}

export const useTenantStore = create<TenantState>((set) => ({
  tenant: null,
  setTenant: (tenant) => set({ tenant }),
}));

// ═══════════════════════════════════════════
// UI Store
// ═══════════════════════════════════════════
interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));
