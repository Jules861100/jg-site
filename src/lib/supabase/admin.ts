import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// service_role client: bypasses RLS. Server-only, never expose to the
// browser. Used for cross-tenant operations like onboarding (creating
// an organization + its first profile in one transaction-like step).
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
