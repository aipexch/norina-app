import { createClient } from "@/lib/supabase/client";

/**
 * Gibt die User-ID des eingeloggten Users zurück.
 * Wirft einen Fehler, wenn kein User eingeloggt ist.
 */
export async function getUserId(): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet");
  return user.id;
}
