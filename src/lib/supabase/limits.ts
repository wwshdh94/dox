import { PRODUCTION_MAX_DOCS_PER_MEMBER } from '@/lib/documentLimits';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';

/** Map Supabase document cap errors to user-facing copy. */
export function formatDocumentSyncError(message: string): string {
  if (message.includes('member_document_cap_reached')) {
    return `This family member has reached the ${PRODUCTION_MAX_DOCS_PER_MEMBER}-document limit.`;
  }
  return message;
}

export async function fetchLaunchCohortSignupCount(): Promise<number | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('launch_cohort_signup_count');
  if (error || data == null) return null;
  return data as number;
}
