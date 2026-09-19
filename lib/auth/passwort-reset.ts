import { createSetPasswordLink } from "@/lib/auth/password-link";
import { findeUserIdZuEmail } from "@/lib/checkout/user-lookup";
import { logEmailSent } from "@/lib/email/sequence-log";
import { sendPasswortZuruecksetzen } from "@/lib/email/templates/passwort-zuruecksetzen";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * „Passwort vergessen" — Wiederherstellungslink erzeugen und über Resend
 * verschicken.
 *
 * ── Warum nicht Supabases eigener Mailer ────────────────────────────────────
 * `resetPasswordForEmail` schickt über Supabase. Ob dort ein eigenes SMTP
 * eingerichtet ist, wissen wir nicht, und der Standard-Mailer ist auf wenige
 * Mails pro Stunde gedrosselt — projektweit, nicht je Nutzer. Außerdem käme die
 * Mail im Supabase-Layout. Wir erzeugen den Link deshalb wie die
 * Willkommensmail über die Admin-API (`createSetPasswordLink`) und verschicken
 * ihn selbst. Derselbe Link, dieselbe Zielkette `/auth/confirm` → `/set-password`.
 *
 * ── Keine Kontoauskunft ─────────────────────────────────────────────────────
 * Diese Funktion läuft in `after()` der Route, also erst **nachdem** die
 * Antwort raus ist. Die Antwort ist für jede gültige Adresse dieselbe, und sie
 * ist gleich schnell — ob hinter der Adresse ein Konto steht, verrät weder
 * der Inhalt noch die Dauer. Das Ergebnis hier geht nur ins Server-Log.
 *
 * ── Drosselung ──────────────────────────────────────────────────────────────
 *   - **Je Adresse** über `email_sequence_log` (Sequenz `passwort_reset`):
 *     höchstens 3 Mails pro Stunde, frühestens 60 s nach der letzten. Das
 *     schützt vor allem den Empfänger: Jede neue Anforderung ersetzt den
 *     Wiederherstellungs-Token bei Supabase — auch den aus der
 *     Willkommensmail. Ohne Grenze könnte jeder, der eine Adresse kennt, deren
 *     gültigen Link im Minutentakt entwerten. Die Grenze greift still: Eine
 *     sichtbare Meldung „zu viele Anfragen für diese Adresse" wäre genau die
 *     Kontoauskunft, die wir vermeiden (Log-Zeilen gibt es nur für Konten).
 *   - **Je IP** im Speicher (`ipGedrosselt`), sichtbar als 429 — die Grenze
 *     hängt nicht am Konto und verrät deshalb nichts.
 *
 * Fehlgeschlagene Sendungen werden zurückgerollt und zählen nicht mit — wie in
 * `sendEmail`. Sonst stünde in der Mail-Statistik „gesendet" für Mails, die nie
 * rausgingen (Stand 19.09.2026: Resend-Domain noch ohne DKIM, jeder Versand
 * scheitert).
 */

export const RESET_SEQUENZ = "passwort_reset";

export const RESET_GRENZEN = {
  /** Höchstens so viele Mails je Adresse im Fenster. */
  proAdresse: 3,
  /** Mindestabstand zwischen zwei Mails an dieselbe Adresse. */
  abstandMs: 60 * 1000,
  /** Höchstens so viele Anfragen je IP im Fenster (je Server-Instanz, siehe unten). */
  proIp: 10,
  fensterMs: 60 * 60 * 1000,
} as const;

export type ResetErgebnis = "verschickt" | "kein_konto" | "gedrosselt" | "fehler";

const EMAIL_MUSTER = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalisiereEmail(wert: string): string {
  return wert.trim().toLowerCase();
}

export function istGueltigeEmail(wert: string): boolean {
  return wert.length <= 254 && EMAIL_MUSTER.test(wert);
}

/* ── Drosselung je IP (im Speicher) ─────────────────────────────────────────
 *
 * **Grenze dieser Lösung:** Der Zähler lebt im Speicher einer Server-Instanz.
 * Auf Vercel laufen mehrere Instanzen parallel, und ein Kaltstart beginnt bei
 * null — die tatsächliche Obergrenze ist also „10 je Stunde je Instanz". Als
 * Bremse gegen einen einzelnen Skript-Lauf reicht das; gegen einen verteilten
 * Angriff nicht. Die harte Grenze je Adresse liegt deshalb in der Datenbank.
 * Wer mehr will, setzt hier Upstash (`@upstash/ratelimit`) ein — die
 * Variablen sind in `.env.local` vorgesehen, das Paket ist nicht installiert.
 */

const ipTreffer = new Map<string, number[]>();
/** Deckel gegen unbegrenztes Wachstum der Map (älteste Einträge fliegen zuerst). */
const MAX_IP_EINTRAEGE = 5000;

/** Zählt die Anfrage und meldet, ob die IP ihr Kontingent schon ausgeschöpft hat. */
export function ipGedrosselt(ip: string | null, jetzt: number = Date.now()): boolean {
  if (!ip) return false;
  const seit = jetzt - RESET_GRENZEN.fensterMs;
  const liste = (ipTreffer.get(ip) ?? []).filter((t) => t > seit);
  const gesperrt = liste.length >= RESET_GRENZEN.proIp;
  if (!gesperrt) liste.push(jetzt);

  // Neu einsortieren, damit die Map in Reihenfolge der letzten Nutzung steht.
  ipTreffer.delete(ip);
  ipTreffer.set(ip, liste);
  if (ipTreffer.size > MAX_IP_EINTRAEGE) {
    const aeltester = ipTreffer.keys().next().value;
    if (aeltester !== undefined) ipTreffer.delete(aeltester);
  }
  return gesperrt;
}

/* ── Drosselung je Adresse (Datenbank) ─────────────────────────────────────── */

type Service = ReturnType<typeof createServiceClient>;

async function adresseGedrosselt(service: Service, email: string, jetzt: number): Promise<boolean> {
  const seit = new Date(jetzt - RESET_GRENZEN.fensterMs).toISOString();
  const { data, error } = await service
    .from("email_sequence_log")
    .select("sent_at")
    .eq("recipient_email", email)
    .eq("sequence", RESET_SEQUENZ)
    .gte("sent_at", seit)
    .order("sent_at", { ascending: false })
    .limit(RESET_GRENZEN.proAdresse);

  if (error) {
    // Ohne Zähler keine Grenze — dann lieber keine Mail. Der Nutzer kann es
    // gleich noch einmal versuchen; ein offenes Tor bliebe offen.
    throw new Error(`Drosselung nicht prüfbar: ${error.message}`);
  }

  const zeilen = (data as { sent_at: string }[] | null) ?? [];
  if (zeilen.length >= RESET_GRENZEN.proAdresse) return true;
  const letzte = zeilen[0]?.sent_at;
  return Boolean(letzte && jetzt - Date.parse(letzte) < RESET_GRENZEN.abstandMs);
}

/* ── Ablauf ──────────────────────────────────────────────────────────────── */

/**
 * Prüft Grenze und Konto, erzeugt den Link und verschickt ihn. Wirft nie —
 * das Ergebnis ist nur für das Server-Log bestimmt.
 */
export async function verschickeWiederherstellungslink(emailRoh: string): Promise<ResetErgebnis> {
  const email = normalisiereEmail(emailRoh);
  const jetzt = Date.now();

  try {
    const service = createServiceClient();

    if (await adresseGedrosselt(service, email, jetzt)) return "gedrosselt";

    const userId = await findeUserIdZuEmail(service, email);
    if (!userId) return "kein_konto";

    /*
     * Den Platz im Log **vor** dem Link beanspruchen. `generateLink` ersetzt
     * den bisherigen Token des Kontos; kämen zwei Anfragen gleichzeitig durch
     * die Prüfung oben, entwertete die zweite den Link der ersten Mail. Der
     * Schritt ist die laufende Minute: Die UNIQUE-Bedingung
     * (recipient_email, sequence, step) lässt davon nur eine durch.
     */
    const schritt = Math.floor(jetzt / 60_000);
    const beansprucht = await logEmailSent({
      userId,
      recipientEmail: email,
      sequence: RESET_SEQUENZ,
      step: schritt,
    });
    if (!beansprucht) return "gedrosselt";

    let resendMessageId: string | undefined;
    try {
      const link = await createSetPasswordLink(service, email);
      ({ resendMessageId } = await sendPasswortZuruecksetzen({ an: email, link }));
    } catch (err) {
      const { error: rollbackFehler } = await service
        .from("email_sequence_log")
        .delete()
        .eq("recipient_email", email)
        .eq("sequence", RESET_SEQUENZ)
        .eq("step", schritt);
      if (rollbackFehler) {
        console.error("[passwort-reset] Log-Rollback fehlgeschlagen:", rollbackFehler.message);
      }
      throw err;
    }

    // Message-ID nachtragen, damit der Resend-Webhook Öffnen/Klicken zuordnen
    // kann. Best effort — die Mail ist bereits raus.
    if (resendMessageId) {
      const { error } = await service
        .from("email_sequence_log")
        .update({ resend_message_id: resendMessageId })
        .eq("recipient_email", email)
        .eq("sequence", RESET_SEQUENZ)
        .eq("step", schritt);
      if (error) console.error("[passwort-reset] resend_message_id nicht gespeichert:", error.message);
    }

    return "verschickt";
  } catch (err) {
    console.error("[passwort-reset] Wiederherstellungslink nicht verschickt:", err);
    return "fehler";
  }
}
