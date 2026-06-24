import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { debug } from '@/lib/debug';

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && key);
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    const url = import.meta.env.VITE_SUPABASE_URL!.trim();
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY!.trim();
    debug('supabase', 'creating client', {
      host: (() => {
        try {
          return new URL(url).host;
        } catch {
          return 'invalid-url';
        }
      })(),
      anonKeyHint: key.length >= 12 ? `${key.slice(0, 6)}…${key.slice(-4)}` : '(short)',
      pkce: true,
    });

    client = createClient(
      url,
      key,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
        },
      },
    );
  }
  return client;
}

/** Demo sign-in when Supabase is not configured (local dev). Off on Prod when env set. */
export function isDemoAuthEnabled(): boolean {
  if (import.meta.env.VITE_DEMO_AUTH === 'false') return false;
  if (isSupabaseConfigured()) return false;
  return import.meta.env.VITE_DEMO_AUTH === 'true' || import.meta.env.DEV;
}
