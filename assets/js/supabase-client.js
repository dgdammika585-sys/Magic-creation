// MAGIC CREATIONS — public browser client configuration.
// This file intentionally contains only the Supabase publishable key.
// NEVER place a Supabase secret/service-role key in browser code.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.1/+esm';

export const SUPABASE_URL = 'https://yidsydqmiodolhgftypv.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_yQ5mvBIGmiLXk3JDe-za9A_kVtO97__';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});
