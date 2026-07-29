import "server-only";
import { createClient } from "@supabase/supabase-js";

// Full-privilege client for Super Admin operations (creating/deleting auth users).
// Never import this from client components.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
