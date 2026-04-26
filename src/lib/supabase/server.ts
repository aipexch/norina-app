import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SIXTY_DAYS_IN_SECONDS = 60 * 24 * 60 * 60;

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                maxAge: SIXTY_DAYS_IN_SECONDS,
              })
            );
          } catch {
            // Called from Server Component — ignore
          }
        },
      },
    }
  );
}
