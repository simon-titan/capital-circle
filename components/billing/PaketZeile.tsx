import { Box, Button, Flex, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import { DashCard, Meta } from "@/components/platform/dashboard/primitives";
import { Pill } from "./SubscriptionCard";
import { formatDate, subscriptionStatus, TIER_LABEL, TIER_PREIS, type Tier } from "./format";

/** Die Felder der Abo-Zeile, die für eine Zusammenfassung reichen. */
export interface PaketAbo {
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

/**
 * Was der Nutzer bezahlt — in einer Zeile, ganz oben auf der Profilseite.
 *
 * Grund für die Doppelung mit `SubscriptionCard`: Das Profil ist die erste
 * Seite des Konto-Bereichs, und wer dort landet, sah bis 09/2026 seine Streak
 * und seine Lernzeit, aber kein Wort über sein Paket. Der Weg zur Vollansicht
 * muss von hier aus sichtbar sein.
 *
 * Bewusst **ohne** Kaufmöglichkeit: Ein zweiter Kaufknopf neben dem der
 * Abo-Seite hieße zwei Wege in dieselbe Kasse, und der Nutzer müsste raten,
 * welcher der richtige ist. Hier steht nur, was ist, plus ein Link.
 */
export function PaketZeile({
  tier,
  abo,
  lifetimeGekauftAm,
  accessUntil,
}: {
  tier: Tier;
  abo: PaketAbo | null;
  lifetimeGekauftAm: string | null;
  accessUntil: string | null;
}) {
  const preis = TIER_PREIS[tier];
  /*
    Nur die Lagen, die der Status hergibt und die den Nutzer angehen: „Aktiv"
    weiß er selbst, eine überfällige Zahlung nicht. Deshalb steht hier nur,
    was rot ist — und das führt ihn über den Knopf zur Vollansicht.
  */
  const status = abo && !abo.cancelAtPeriodEnd ? subscriptionStatus(abo.status) : null;

  return (
    <Box className="cc-rise" style={{ animationDelay: "80ms" }}>
      <DashCard
        label="Dein Paket"
        labelId="profil-paket"
        // Für Free ist das die einzige Verkaufsfläche dieser Seite; für alle
        // anderen ist es eine Auskunft und bekommt deshalb keine Hero-Kante.
        hero={tier === "free"}
        action={
          /*
            Link aussen herum statt `as={NextLink}` — siehe app/(admin)/admin/page.tsx.
            Diese Datei ist eine Server-Komponente, `DashCard` und `Button` sind
            Client-Komponenten. Eine Komponente als Prop waere eine Funktion ueber
            die Server-Grenze, und React bricht beim Rendern mit „Functions cannot
            be passed directly to Client Components" ab.
          */
          <NextLink href="/einstellungen/abonnement" style={{ display: "block" }}>
            <Button
              as="span"
              variant={tier === "free" ? "gold" : "line"}
              w={{ base: "100%", sm: "auto" }}
            >
              {tier === "free" ? "Pakete ansehen" : "Paket ansehen"}
            </Button>
          </NextLink>
        }
      >
        <Flex align="baseline" gap={3} wrap="wrap">
          <Pill tone={tier === "lifetime" || tier === "ht_1on1" ? "gold" : "neutral"}>{TIER_LABEL[tier]}</Pill>
          {status?.danger ? <Pill tone="danger">{status.label}</Pill> : null}

          {/* Tabellarische Ziffern nur, wo eine Zahl steht. */}
          <Text className={preis ? "cc-num" : undefined} fontSize="16px" fontWeight={600} color="var(--cc-text)">
            {preis ? `${preis.betrag} ${preis.periode}` : kopfzeile(tier)}
          </Text>

          <Meta>{laufzeit(tier, abo, lifetimeGekauftAm, accessUntil)}</Meta>
        </Flex>
      </DashCard>
    </Box>
  );
}

/** Was statt eines Preises steht, wenn der Tarif keinen wiederkehrenden hat. */
function kopfzeile(tier: Tier): string {
  if (tier === "lifetime") return "Einmal bezahlt";
  if (tier === "ht_1on1") return "1:1-Mentoring";
  return "Kostenfreier Zugang";
}

/**
 * Die Datumszeile.
 *
 * Für ein laufendes Abo steht hier „Laufzeit bis …" und nicht „Nächste
 * Abbuchung am …": Ob wirklich abgebucht wird, hängt an `pause_collection`,
 * und das steht ausschließlich bei Stripe. Diese Zeile fragt Stripe bewusst
 * nicht — eine Zusammenfassung ist keinen zusätzlichen API-Aufruf pro
 * Profilaufruf wert. Die Vollansicht unter Abonnement fragt und schreibt die
 * Pause aus; bis dahin sagt das Profil nur, was die Datenbank sicher weiß.
 */
function laufzeit(tier: Tier, abo: PaketAbo | null, lifetimeGekauftAm: string | null, accessUntil: string | null) {
  if (tier === "lifetime") return `Erworben am ${formatDate(lifetimeGekauftAm)} · keine weitere Abbuchung`;
  if (tier === "ht_1on1") return "Termine vereinbaren wir direkt mit dir per E-Mail.";
  if (tier === "free") return "Noch kein Paket gebucht — die Plattform ist nur teilweise offen.";
  if (abo?.cancelAtPeriodEnd) return `Gekündigt · Zugang bis ${formatDate(abo.currentPeriodEnd)}`;
  if (abo) return `Laufzeit bis ${formatDate(abo.currentPeriodEnd)}`;
  return `Zugang bis ${formatDate(accessUntil)} · von Hand eingetragen`;
}
