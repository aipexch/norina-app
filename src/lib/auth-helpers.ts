import { createClient } from "@/lib/supabase/client";

// Demo user ID für Entwicklung ohne Login
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Gibt die User-ID zurück — entweder vom eingeloggten User oder die Demo-ID
 */
export async function getUserId(): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? DEMO_USER_ID;
}

export { DEMO_USER_ID };
