import { createClient } from '@supabase/supabase-js';

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const supabaseUrl = viteEnv?.VITE_SUPABASE_URL;
const supabaseAnonKey = viteEnv?.VITE_SUPABASE_ANON_KEY;

export const authRedirectUrl = viteEnv?.VITE_AUTH_REDIRECT_URL || 'https://resume-builder-softbranes-projects.vercel.app';
export const enableAnonymousAuth = viteEnv?.VITE_ENABLE_ANONYMOUS_AUTH === 'true';

export const isAuthConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isAuthConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
