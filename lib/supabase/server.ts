import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Server client for route handlers and server components. It acts as the
// signed-in user (session read from cookies), so row-level security applies.
export async function getSupabaseServer(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server components cannot write cookies. proxy.ts refreshes the
            // session on every request, so this is safe to ignore.
          }
        },
      },
    }
  );
}

// The signed-in user, verified with the auth server, or null. Use this in
// route handlers that must reject signed-out requests.
export async function getServerUser(): Promise<{
  supabase: SupabaseClient;
  user: User | null;
}> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user ?? null };
}
