import { createPublicKey, verify } from "node:crypto";

/**
 * Discord-Interaktionen: Signaturprüfung und Bausteine der Antwort.
 *
 * Übernommen aus MoonTrading. Der Endpunkt dazu ist
 * `app/api/discord/interactions/route.ts`.
 *
 * ── Warum Ed25519 und nicht ein geteiltes Geheimnis ─────────────────────────
 *
 * Jede Anfrage von Discord trägt eine Ed25519-Signatur über Zeitstempel und
 * Anfragekörper, geprüft gegen den öffentlichen Schlüssel der Anwendung
 * (`DISCORD_PUBLIC_KEY`, Developer Portal → General Information → **Public
 * Key**, nicht die Application-ID). **Ungeprüft wäre der Endpunkt offen für
 * jeden**, der die Adresse kennt, und über ihn liessen sich Antworten im Namen
 * beliebiger Mitglieder in Zahlungsfälle schreiben.
 *
 * ── Ohne neue Abhängigkeit ──────────────────────────────────────────────────
 *
 * Node prüft Ed25519 nativ. Discord liefert den Schlüssel als 32 rohe Bytes in
 * Hex, `createPublicKey` will ihn in SPKI-Form; die zwölf Bytes davor sind der
 * feste DER-Kopf für Ed25519. Kein `tweetnacl`, kein discord.js.
 */

/** DER-Kopf für einen Ed25519-Schlüssel in SPKI-Form. Konstant, 12 Bytes. */
const SPKI_KOPF = Buffer.from("302a300506032b6570032100", "hex");

export function interaktionenKonfiguriert(): boolean {
  return Boolean(process.env.DISCORD_PUBLIC_KEY?.trim());
}

/**
 * Signatur prüfen.
 *
 * **Der Körper muss roh hereinkommen**, als Text, genau wie empfangen. Wer
 * vorher `request.json()` aufruft, prüft danach gegen eine neu serialisierte
 * Fassung, die nicht zeichengleich sein muss, und der Fehler sieht dann aus
 * wie ein falscher Schlüssel.
 */
export function signaturGueltig(params: {
  koerper: string;
  signatur: string | null;
  zeitstempel: string | null;
}): boolean {
  const publicKey = process.env.DISCORD_PUBLIC_KEY?.trim();
  if (!publicKey || !params.signatur || !params.zeitstempel) return false;

  try {
    const schluessel = createPublicKey({
      key: Buffer.concat([SPKI_KOPF, Buffer.from(publicKey, "hex")]),
      format: "der",
      type: "spki",
    });

    return verify(
      null,
      Buffer.from(params.zeitstempel + params.koerper),
      schluessel,
      Buffer.from(params.signatur, "hex"),
    );
  } catch (err) {
    // Ein unbrauchbarer Schlüssel oder eine Signatur, die kein Hex ist. Beides
    // ist eine Absage, keine Ausnahme: Der Endpunkt antwortet mit 401.
    console.warn("[discord] Signatur nicht prüfbar:", (err as Error).message);
    return false;
  }
}

/* ── Typen, so weit wir sie brauchen ───────────────────────────────────────── */

export const INTERAKTION = {
  PING: 1,
  BEFEHL: 2,
  BAUSTEIN: 3,
  FORMULAR_ABGESCHICKT: 5,
} as const;

export const ANTWORT = {
  PONG: 1,
  NACHRICHT: 4,
  FORMULAR: 9,
} as const;

/** Nur für den Aufrufer sichtbar. Discords Bitmaske, 1 << 6. */
export const NUR_FUER_DICH = 64;

export interface Interaktion {
  type: number;
  data?: {
    name?: string;
    custom_id?: string;
    options?: Array<{ name: string; value: string }>;
    components?: Array<{ components?: Array<{ custom_id?: string; value?: string }> }>;
  };
  member?: { user?: { id?: string; username?: string } };
  user?: { id?: string; username?: string };
}

/**
 * Die Discord-Kennung des Aufrufers.
 *
 * Zwei Orte, weil Discord unterscheidet: Aus einem Server kommt `member.user`
 * (der Knopf im Warteraum), aus einer Direktnachricht `user` (der Knopf unter
 * der Mahnung). Wer nur eines liest, hat je nach Weg niemanden.
 */
export function discordIdVon(interaktion: Interaktion): string | null {
  return interaktion.member?.user?.id ?? interaktion.user?.id ?? null;
}

/** Wert eines Formularfelds aus der verschachtelten Struktur der Antwort. */
export function feldWert(interaktion: Interaktion, customId: string): string {
  for (const zeile of interaktion.data?.components ?? []) {
    for (const feld of zeile.components ?? []) {
      if (feld.custom_id === customId) return feld.value ?? "";
    }
  }
  return "";
}

export function nurFuerDich(text: string) {
  return {
    type: ANTWORT.NACHRICHT,
    // `allowed_mentions` leer: Eine Antwort darf niemanden anpingen.
    data: { content: text.slice(0, 2000), flags: NUR_FUER_DICH, allowed_mentions: { parse: [] as string[] } },
  };
}

/**
 * Discords Obergrenze für ein Textfeld in einem Formular.
 *
 * ── Warum diese Zahl hier steht ─────────────────────────────────────────────
 *
 * Discord erlaubt an `max_length` höchstens 4000 und weist ein Formular, das
 * mehr verlangt, mit `50035` ab. Der Kunde sieht dann „Diese Interaktion ist
 * fehlgeschlagen", und **bei uns gibt es keine Fehlermeldung**: Unser Endpunkt
 * hat längst mit 200 geantwortet. Im Schwesterprojekt ist genau das monatelang
 * unbemerkt geblieben. Gekappt wird deshalb hier und nicht beim Aufrufer.
 */
const FELD_MAX = 4000;

/**
 * Ein Formular (Modal). Discord erlaubt darin **ausschliesslich Textfelder**,
 * kein Auswahlmenü.
 */
export function formular(params: {
  customId: string;
  titel: string;
  felder: Array<{
    customId: string;
    label: string;
    lang?: boolean;
    pflicht?: boolean;
    maxLaenge?: number;
    platzhalter?: string;
  }>;
}) {
  return {
    type: ANTWORT.FORMULAR,
    data: {
      custom_id: params.customId.slice(0, 100),
      title: params.titel.slice(0, 45),
      components: params.felder.map((f) => ({
        type: 1,
        components: [
          {
            type: 4,
            custom_id: f.customId,
            label: f.label.slice(0, 45),
            style: f.lang ? 2 : 1,
            required: f.pflicht ?? true,
            max_length: Math.min(f.maxLaenge ?? FELD_MAX, FELD_MAX),
            ...(f.platzhalter ? { placeholder: f.platzhalter.slice(0, 100) } : {}),
          },
        ],
      })),
    },
  };
}
