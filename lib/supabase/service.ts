/**
 * Service-Role-Client (bypass RLS).
 *
 * Re-Export aus `lib/supabase/server.ts` für Konsistenz mit dem in
 * `docs/agent-packages/paket-2-email-infrastruktur.md` dokumentierten Import-Pfad
 * (`@/lib/supabase/service`). Die eigentliche Implementierung lebt unverändert
 * in `server.ts` — diese Datei existiert nur, damit beide Pfade funktionieren.
 *
 * NIEMALS aus Client-Komponenten importieren — Service-Role-Key umgeht RLS.
 */
export { createServiceClient } from "./server";
