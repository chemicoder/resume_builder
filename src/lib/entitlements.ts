import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

/**
 * Represents a user's AI feature entitlement. Sourced from the Supabase
 * `entitlements` table (one row per user). This module also accepts an
 * env-based allow-list for local development.
 *
 * Expected Supabase schema (run once in the SQL editor):
 *
 *   create table public.entitlements (
 *     user_id    uuid primary key references auth.users(id) on delete cascade,
 *     ai_access  boolean not null default false,
 *     ai_credits integer not null default 0,
 *     plan       text,
 *     notes      text,
 *     updated_at timestamptz not null default now()
 *   );
 *
 *   alter table public.entitlements enable row level security;
 *   create policy "user reads own entitlements"
 *     on public.entitlements for select
 *     using (auth.uid() = user_id);
 *
 * Sales/admin team manages rows directly in the Supabase dashboard or via a
 * service-role script. The app only reads.
 */
export interface Entitlement {
  aiAccess: boolean;
  aiCredits: number;
  plan: string | null;
  /** True if we could not load from Supabase and fell back to defaults. */
  fallback: boolean;
}

const DEFAULT: Entitlement = {
  aiAccess: false,
  aiCredits: 0,
  plan: null,
  fallback: true,
};

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;

/**
 * Returns true if the user's email is on the local-development override
 * list (comma-separated `VITE_AI_ALLOW_EMAILS`). This is a safety hatch so
 * the developer who deploys the app can use AI features without setting up
 * the entitlements row first.
 */
function isAllowlistedEmail(email: string | undefined): boolean {
  const raw = viteEnv?.VITE_AI_ALLOW_EMAILS;
  if (!raw || !email) return false;
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

export function useEntitlements(session: Session | null): { entitlement: Entitlement; loading: boolean } {
  const [entitlement, setEntitlement] = useState<Entitlement>(DEFAULT);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!session?.user) {
      setEntitlement(DEFAULT);
      return;
    }

    // Allow-listed emails get full access regardless of the DB row.
    if (isAllowlistedEmail(session.user.email)) {
      setEntitlement({ aiAccess: true, aiCredits: -1, plan: 'allowlist', fallback: false });
      return;
    }

    if (!supabase) {
      setEntitlement(DEFAULT);
      return;
    }

    setLoading(true);
    supabase
      .from('entitlements')
      .select('ai_access, ai_credits, plan')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          // No row → user has no AI access. This is the expected state for
          // new accounts; sales adds a row when they purchase access.
          setEntitlement(DEFAULT);
        } else {
          setEntitlement({
            aiAccess: Boolean(data.ai_access),
            aiCredits: typeof data.ai_credits === 'number' ? data.ai_credits : 0,
            plan: data.plan || null,
            fallback: false,
          });
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  return { entitlement, loading };
}

/**
 * Sales contact email shown in the upgrade notice. Configurable via
 * `VITE_SALES_EMAIL` so different deployments can override it.
 */
export const SALES_EMAIL = viteEnv?.VITE_SALES_EMAIL || 'sales@softbrane.com';
