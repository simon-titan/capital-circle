/**
 * Das Jahres-Upgrade aus einem laufenden Monatsabo.
 *
 * Die Regel steht hier und nicht in der Seite, weil sie an **zwei** Stellen
 * gebraucht wird: Die Karte blendet das Angebot aus, und die Route lehnt es ab.
 * Nur die zweite schützt wirklich — eine ausgeblendete Karte ist kein Riegel.
 */

/**
 * Erst ab einem Monat Mitgliedschaft.
 *
 * Wer gerade erst gekauft hat, bekommt sonst zwei Tage später ein günstigeres
 * Angebot für dasselbe Produkt zu sehen — das liest sich wie ein Fehler im
 * ersten Kauf. Gemessen wird am Abo, nicht am Konto: `profiles.created_at`
 * ist bei einem Wechsel von Free auf zahlend Monate zu früh.
 */
export const UPGRADE_MINDESTTAGE = 30;

/** Aus diesen Laufzeiten heraus lohnt der Wechsel auf das Jahr. */
const UPGRADE_QUELLEN: ReadonlySet<string> = new Set(["monthly", "quarterly"]);

export interface UpgradeLage {
  tier: string;
  /** Stripe-Status des Abos. */
  status: string | null;
  cancelAtPeriodEnd: boolean;
  /** Beginn der laufenden Periode bzw. Anlage des Abos (ISO). */
  laufendSeit: string | null;
  /**
   * Läuft gerade eine Pause (`pause_collection`)? Optional, weil nur die Seite
   * es weiß: Der Wert steht ausschließlich bei Stripe, und die Route fragt
   * das Abo nicht ab. Fehlt er, prüft die Funktion wie bisher.
   */
  pausiert?: boolean;
}

export type UpgradeGrund =
  | "moeglich"
  | "kein_abo"
  | "falscher_tarif"
  | "nicht_aktiv"
  | "pausiert"
  | "gekuendigt"
  | "zu_jung";

export function pruefeUpgrade(lage: UpgradeLage): { moeglich: boolean; grund: UpgradeGrund } {
  if (!lage.status) return { moeglich: false, grund: "kein_abo" };
  if (!UPGRADE_QUELLEN.has(lage.tier)) return { moeglich: false, grund: "falscher_tarif" };
  if (lage.status !== "active" && lage.status !== "trialing") {
    return { moeglich: false, grund: "nicht_aktiv" };
  }
  // Wer pausiert hat, zahlt gerade nichts. Ein Wechsel würde die Pause mit
  // einer sofortigen Differenzrechnung beenden — das Gegenteil dessen, wofür
  // er pausiert hat.
  if (lage.pausiert) return { moeglich: false, grund: "pausiert" };
  // Ein gekündigtes Abo hochstufen hieße, es gegen den erklärten Willen des
  // Nutzers wiederzubeleben. Er soll erst die Kündigung zurücknehmen.
  if (lage.cancelAtPeriodEnd) return { moeglich: false, grund: "gekuendigt" };

  const seit = lage.laufendSeit ? new Date(lage.laufendSeit) : null;
  if (!seit || Number.isNaN(seit.getTime())) return { moeglich: false, grund: "zu_jung" };
  const tage = Math.floor((Date.now() - seit.getTime()) / 86_400_000);
  if (tage < UPGRADE_MINDESTTAGE) return { moeglich: false, grund: "zu_jung" };

  return { moeglich: true, grund: "moeglich" };
}

/**
 * Gehört der Tarif überhaupt zu den Laufzeiten, aus denen heraus das Angebot
 * gilt?
 *
 * Die Angebotskarte steht seit 09/2026 auch dann auf der Seite, wenn der
 * Wechsel noch nicht greift — ein verstecktes Angebot verkauft nichts. Sie
 * braucht deshalb eine zweite Frage neben `pruefeUpgrade()`: „gilt das für
 * diesen Tarif grundsätzlich?" beantwortet, **ob** die Karte erscheint,
 * `pruefeUpgrade()` beantwortet, ob ihr Knopf klickbar ist.
 */
export function istUpgradeQuelle(tier: string): boolean {
  return UPGRADE_QUELLEN.has(tier);
}

/**
 * Ab wann greift das Angebot? (ISO, oder `null` ohne bekannten Beginn.)
 *
 * Nur für die Anzeige: „Ab dem 30. Tag" ist eine Regel, „ab dem 14. Oktober"
 * ein Termin — und nur den kann sich jemand merken. Gerechnet wird aus
 * demselben Datum, das `pruefeUpgrade()` prüft, damit Text und Riegel nicht
 * auseinanderlaufen.
 */
export function upgradeFreiAb(laufendSeit: string | null): string | null {
  if (!laufendSeit) return null;
  const seit = new Date(laufendSeit);
  if (Number.isNaN(seit.getTime())) return null;
  return new Date(seit.getTime() + UPGRADE_MINDESTTAGE * 86_400_000).toISOString();
}

/**
 * Rabatt-Coupon für das Upgrade.
 *
 * Der Betrag steht in Stripe, nicht im Code: Wer die Aktion ändern will, legt
 * dort einen neuen Coupon an und trägt die ID in die Umgebungsvariable ein —
 * ohne Deployment. Fehlt sie, läuft das Upgrade ohne Rabatt durch, statt zu
 * scheitern; ein Wechsel zum vollen Jahrespreis ist immer noch ein gültiger
 * Wechsel.
 */
export function upgradeCouponId(): string | null {
  return process.env.STRIPE_UPGRADE_COUPON_ID?.trim() || null;
}

/** Halte-Angebot im Kündigungs-Flow. Gleiche Begründung wie oben. */
export function haltenCouponId(): string | null {
  return process.env.STRIPE_RETENTION_COUPON_ID?.trim() || null;
}
