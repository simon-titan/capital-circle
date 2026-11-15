/**
 * Einmal-Kampagnen unter `/admin/kampagnen` (15.11.2026). Logik in
 * `lib/kampagnen/kampagnen.ts`, Texte in `lib/email/templates/playbook/kampagnen.tsx`.
 */

export type KampagneId = "retargeting" | "trustpilot";

/**
 * Bewertungsseite auf Trustpilot. Vorgabe ist die Bewertungsadresse für die
 * Domain — stimmt das Trustpilot-Profil nicht mit der Domain überein, die
 * richtige Adresse über `NEXT_PUBLIC_TRUSTPILOT_URL` setzen.
 */
export const TRUSTPILOT_URL =
  process.env.NEXT_PUBLIC_TRUSTPILOT_URL?.trim() || "https://de.trustpilot.com/evaluate/capitalcircletrading.com";

export const KAMPAGNEN = {
  retargeting: {
    vorlage: "RT01",
    titel: "Retargeting: ehemalige Free-Kurs-Mitglieder",
    beschreibung:
      "Alle, die sich früher für den kostenlosen Kurs angemeldet haben (Willkommensmail des alten /free), heute nicht zahlen, keine Bewerbung im neuen Weg und keinen laufenden Zugang haben. Der Link in der Mail schaltet den Kurs ohne Bewerbung für 30 Tage frei.",
    zielUrl: null,
  },
  trustpilot: {
    vorlage: "TP01",
    titel: "Trustpilot-Bewertung: zahlende Mitglieder",
    beschreibung: "Alle Konten mit bezahltem Zugang (Abo, Lifetime, Mentoring, Whop-Altkonten), ohne Admins.",
    zielUrl: TRUSTPILOT_URL,
  },
} as const satisfies Record<KampagneId, { vorlage: "RT01" | "TP01"; titel: string; beschreibung: string; zielUrl: string | null }>;

export const KAMPAGNEN_IDS: KampagneId[] = ["retargeting", "trustpilot"];
