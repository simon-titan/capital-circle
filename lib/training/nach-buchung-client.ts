/**
 * Im Browser nach `calendly.event_scheduled`: fragt `/api/training/nach-buchung`
 * und wechselt bei einem Ziel nach kurzer Pause ins Free-Dashboard (die
 * Bestätigung im Modal bleibt so lange sichtbar). Ohne Anmeldung passiert nichts.
 */
export async function weiterNachBuchung(pauseMs = 1600): Promise<void> {
  try {
    const res = await fetch("/api/training/nach-buchung", { method: "POST" });
    const json = (await res.json().catch(() => null)) as { ziel?: string | null } | null;
    const ziel = json?.ziel;
    if (!ziel || !ziel.startsWith("/")) return;
    setTimeout(() => window.location.assign(ziel), pauseMs);
  } catch {
    // Netzfehler: Die Bestätigung im Modal bleibt stehen, der Termin ist gebucht.
  }
}
