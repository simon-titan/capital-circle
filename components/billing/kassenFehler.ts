import { TEAM_POSTFACH } from "@/config/team";

/**
 * Antwort von `/api/stripe/create-checkout-session`, fehlertolerant gelesen.
 *
 * `res.json()` wirft bei einem leeren oder nicht-JSON-Körper, und der Toast
 * zeigte dann den Parserfehler des Browsers („Unexpected end of JSON input",
 * in Safari „The string did not match the expected pattern"). Genau das sahen
 * die Whop-Umzügler am 22.09.2026 statt eines Satzes, mit dem sie etwas
 * anfangen konnten.
 */
export type KassenAntwort = {
  ok?: boolean;
  clientSecret?: string;
  error?: string;
};

export async function leseKassenAntwort(res: Response): Promise<KassenAntwort> {
  try {
    const text = await res.text();
    return text ? (JSON.parse(text) as KassenAntwort) : {};
  } catch {
    return {};
  }
}

/** Fehlercode der Route als Satz für den Toast. Unbekanntes fällt auf den allgemeinen Kassenfehler. */
export function kassenFehlerText(code: string | undefined): string {
  switch (code) {
    case "unauthorized":
      return "Deine Anmeldung ist abgelaufen. Bitte melde dich erneut an und versuch es noch einmal.";
    case "lifetime_gesperrt":
      return "Das Angebot steht dir gerade nicht zur Verfügung.";
    default:
      return `Die Kasse konnte gerade nicht geöffnet werden. Bitte versuch es gleich noch einmal oder schreib uns an ${TEAM_POSTFACH}.`;
  }
}
