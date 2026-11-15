import { BEWERBUNG_MIN_ZEICHEN, bewerbung } from "@/config/training";
import type { BewerbungsAntworten } from "./bewerbung";

/**
 * Prüft die Bewerbungsfelder aus dem Request — gleiche Regel für das neue
 * Konto (`/api/training/registrieren`) und das bestehende
 * (`/api/training/bewerbung`). Mindestlänge nur gegen Leereingaben.
 */
export function pruefeBewerbung(body: Record<string, unknown>):
  | { ok: true; antworten: BewerbungsAntworten; kontaktGewuenscht: boolean; telefon: string | null }
  | { ok: false; felder: Record<string, true> } {
  const roh = (body.antworten ?? {}) as Record<string, unknown>;
  const felder: Record<string, true> = {};
  const antworten = {} as BewerbungsAntworten;
  for (const f of bewerbung.fragen) {
    const wert = typeof roh[f.id] === "string" ? (roh[f.id] as string).trim().slice(0, 3000) : "";
    if (wert.length < BEWERBUNG_MIN_ZEICHEN) felder[f.id] = true;
    antworten[f.id] = wert;
  }
  if (typeof body.kontaktGewuenscht !== "boolean") felder.kontakt = true;
  const telefonRoh = typeof body.telefon === "string" ? body.telefon.trim().slice(0, 40) : "";
  const telefon = body.kontaktGewuenscht === true && telefonRoh ? telefonRoh : null;
  // Kontaktwunsch braucht eine Nummer — sonst kann der Vertrieb nicht anrufen.
  if (body.kontaktGewuenscht === true && !telefon) felder.telefon = true;
  if (telefon && !/^[+\d][\d\s/()-]{5,}$/.test(telefon)) felder.telefon = true;
  if (Object.keys(felder).length) return { ok: false, felder };
  return { ok: true, antworten, kontaktGewuenscht: body.kontaktGewuenscht === true, telefon };
}
