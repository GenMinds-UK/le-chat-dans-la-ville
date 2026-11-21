import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Browser client. Only the publishable key is used here; row-level security
// limits every query to the signed-in user's own rows.
let browserClient: SupabaseClient | undefined;

export function getSupabaseBrowser(): SupabaseClient {
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set (see .env.example)"
      );
    }
    browserClient = createBrowserClient(url, key);
  }
  return browserClient;
}
