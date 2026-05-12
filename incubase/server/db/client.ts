/**
 * Supabase Server Client
 * Uses the service role key for server-side operations (bypasses RLS for admin tasks).
 * For user-scoped queries, use the per-request client with the user's JWT.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Service role client — full database access, bypasses RLS
// Use only for admin operations, audit logging, and AI agent queries
export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

// Create a user-scoped client from their JWT token
// This client respects RLS policies and tenant isolation
export function createUserClient(accessToken: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: { persistSession: false },
  });
}
