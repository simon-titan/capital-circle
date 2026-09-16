import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppUrl } from "@/lib/site-url";

/**
 * Erzeugt den Link „Passwort setzen" für die Willkommensmail nach einem
 * Gast-Checkout.
 *
 * **Warum `hashed_token` und nicht `action_link`?**
 * `generateLink` liefert beides. Der bequeme `action_link` zeigt auf Supabases
 * `/auth/v1/verify` und leitet von dort mit den Tokens im **Hash-Fragment**
 * weiter (`#access_token=…`). Fragmente schickt der Browser nie an den Server —
 * bei serverseitigem Rendering entsteht dadurch keine Sitzung, und die Seite
 * „Passwort setzen" scheitert mit „Auth session missing". Und zwar bei jedem
 * einzelnen Kunden, weil der Fehler nicht am Konto hängt, sondern am Weg.
 *
 * Der `hashed_token` aus derselben Antwort lässt sich dagegen in
 * `/auth/confirm` per `verifyOtp` serverseitig einlösen; die Sitzung landet
 * dort, wo sie hingehört — in den Cookies.
 *
 * Erfordert einen Service-Role-Client (Admin-API).
 */
export async function createSetPasswordLink(service: SupabaseClient, email: string): Promise<string> {
  const { data, error } = await service.auth.admin.generateLink({
    type: "recovery",
    email,
    // Wird in diesem Ablauf nicht benutzt (wir lösen den Token selbst ein),
    // Supabase verlangt aber eine erlaubte Adresse.
    options: { redirectTo: `${getAppUrl()}/auth/confirm` },
  });

  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    throw new Error(
      `generateLink für ${email} fehlgeschlagen: ${error?.message ?? "kein hashed_token"}`,
    );
  }

  const url = new URL("/auth/confirm", getAppUrl());
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", "recovery");
  url.searchParams.set("next", "/set-password");
  return url.toString();
}
