import { Box } from "@chakra-ui/react";
import { Suspense, type ReactNode } from "react";
import { ladeBewertungsspiegel } from "@/lib/landing-reviews";
import type { Abschnitt } from "@/lib/analytics/kaufweg";
import { FunnelTrackerProvider } from "../FunnelTracker";
import { GoldGlowDivider } from "../GoldGlowDivider";
import { LandingFooter } from "../landing-ui";
import { ReviewSection } from "../ReviewSection";
import { AngebotSection } from "./AngebotSection";
import { BeitrittModalProvider } from "./BeitrittModal";
import { ErgebnisseSection } from "./ErgebnisseSection";
import { FaqSection } from "./FaqSection";
import { FinalCtaSection } from "./FinalCtaSection";
import { FounderBriefSection } from "./FounderBriefSection";
import { FuerWenSection } from "./FuerWenSection";
import { KaufFehlerHinweis } from "./KaufFehlerHinweis";
import { MembershipHero } from "./MembershipHero";
import { MembershipMobileCta } from "./MembershipMobileCta";
import { MembershipNav } from "./MembershipNav";
import { ProzessSection } from "./ProzessSection";
import { VergleichSection } from "./VergleichSection";

/**
 * Die Sales-Landing auf `/`.
 *
 * ── Die Reihenfolge ist das Argument ───────────────────────────────────────
 * Versprechen (Hero) → Beweis (Ergebnisse, Bewertungen) → Ablauf (Prozess) →
 * Abgrenzung (Vergleich) → Einordnung (Für wen) → Person (Brief) → Angebot →
 * Einwände (FAQ) → Abschluss. Der Prozess steht zwischen Beweis und
 * Abgrenzung, weil „wie läuft das ab?" die Frage ist, die direkt auf einen
 * Beleg folgt — und weil der Vergleich danach nicht mehr erklären muss, was
 * Capital Circle überhaupt tut. Der Preis steht bewusst erst nach dem Brief: Wer bis
 * dahin gelesen hat, entscheidet nicht mehr zwischen „99 €" und „kostenlos",
 * sondern zwischen „mit System" und „weiter wie bisher".
 *
 * Die Bewertungen sitzen direkt hinter den Auszahlungen, weil beide dasselbe
 * tun — belegen, dass die Behauptung nicht nur eine Behauptung ist. Sie lesen
 * über `landingSlug="membership"` aus der Tabelle `landing_reviews` (Seeds in
 * Migration 069) statt aus der Landing-Config, deren Texte vom kostenlosen
 * Kurs handeln.
 *
 * Diese Datei ist eine Server-Komponente ohne eigenen Zustand — jeder
 * Abschnitt bringt sein „use client" selbst mit, wenn er es braucht. Auch
 * `BeitrittModalProvider` ist so einer: Er ist die Client-Grenze für den
 * Beitritts-Dialog, und die Abschnitte darin bleiben serverseitig gerendert,
 * weil sie ihm nur als `children` durchgereicht werden.
 */
/**
 * Bewertungen der Verkaufsseite: **nur** die Kategorie `global`.
 *
 * Unter `membership` liegen vier ältere Stimmen, die nicht mehr gezeigt werden
 * sollen (Entscheidung Simon, 20.09.2026). Sie bleiben im Admin stehen, damit
 * sie sich ohne Datenverlust wieder einschalten lassen — hier reicht dafür ein
 * Eintrag in dieser Liste.
 */
const BEWERTUNGS_KATEGORIEN = ["global"];

/**
 * Die Markierung, an der die Messung erkennt, wie weit jemand gekommen ist.
 *
 * Sie steht **hier** und nicht in den Abschnitten selbst, weil „wie weit" eine
 * Aussage über die Reihenfolge der Seite ist — und die Reihenfolge steht in
 * dieser Datei. Die Namen und ihr Rang liegen in `ABSCHNITTE`
 * (`lib/analytics/kaufweg.ts`); wer hier umsortiert, sortiert dort mit, sonst
 * zeigt die Auswertung einen Abschnitt als „weiter gekommen", der weiter oben
 * steht.
 *
 * Ein gewöhnlicher Block-Kasten, ausdrücklich **nicht** `display: contents`:
 * Ein Element ohne eigenen Kasten hat keine Fläche, und der
 * `IntersectionObserver` der Messung hätte nichts zu beobachten. Im Fluss von
 * `<main>` ändert ein zusätzlicher Block nichts — die Abschnitte sind
 * vollbreite Blöcke mit eigenem Innenabstand, und dazwischen liegen nur die
 * Trennlinien.
 */
function Abschnittsmarke({ name, children }: { name: Abschnitt; children: ReactNode }) {
  return <Box data-abschnitt={name}>{children}</Box>;
}

export async function MembershipLanding() {
  // Eine Abfrage fuer beide Sternezeilen — dieselbe Quelle wie die Liste
  // weiter unten, damit Zahl und Liste nicht auseinanderlaufen.
  /*
    Beide Kategorien: `membership` sind die Stimmen zur Mitgliedschaft,
    `global` die, die auf jede Verkaufsseite passen (25 Stück, bis zum
    20.09.2026 nirgends sichtbar). Der Spiegel zaehlt dieselbe Menge, die die
    Liste unten zeigt.
  */
  const bewertungen = await ladeBewertungsspiegel(BEWERTUNGS_KATEGORIEN);

  return (
    <Box position="relative" minH="100vh" w="full" bg="var(--cc-bg)" color="var(--cc-text)" overflowX="clip">
      {/* Himmel: Sternenfeld und Champagner-Licht, beides fixiert hinter dem Inhalt. */}
      <Box className="cc-stars" aria-hidden />
      <Box className="cc-goldlight" aria-hidden />

      {/*
        Der Dialog hinter den sechs „Capital Circle beitreten"-Knöpfen. Er muss
        Kopfleiste, Hero, den festen Balken und die Abschnitte gemeinsam
        umschließen — jeder dieser Knöpfe öffnet denselben Dialog.
      */}
      {/*
        Die Messung des Kaufwegs umschließt alles, weil sie beides braucht: die
        Abschnitte (wie weit jemand gekommen ist) und die sieben Kauf-Knöpfe (wo
        geklickt wurde). Ohne Einwilligungsbanner — sie speichert weder Cookie
        noch IP, siehe `components/landing/FunnelTracker.tsx` und Abschnitt 13
        der Datenschutzerklärung.
      */}
      <FunnelTrackerProvider>
        <BeitrittModalProvider>
          <Box position="relative" zIndex={1}>
              {/* Sprungziel der Wortmarke in der Kopfleiste. */}
            <Box id="seitenanfang" aria-hidden />

            <MembershipNav />

            <Box as="main">
              {/* Liest `?fehler=<code>`, wohin `app/go/[plan]/route.ts` bei einem
                  Kassenfehler zurueckleitet. Bewusst im Client und in `Suspense`:
                  Laese die Seite den Parameter serverseitig, waere die ganze
                  Verkaufsseite dynamisch — teuer fuer einen Fall, den fast niemand
                  sieht. So bleibt die Seite statisch und nur dieser Streifen
                  haengt an der Adresse. */}
              <Suspense fallback={null}>
                <KaufFehlerHinweis />
              </Suspense>

              <Abschnittsmarke name="hero">
                <MembershipHero bewertungen={bewertungen} />
              </Abschnittsmarke>

              <Abschnittsmarke name="ergebnisse">
                <ErgebnisseSection />
              </Abschnittsmarke>
              <GoldGlowDivider />

              <Abschnittsmarke name="bewertungen">
                <ReviewSection landingSlug={BEWERTUNGS_KATEGORIEN.join(",")} />
              </Abschnittsmarke>
              <GoldGlowDivider />

              <Abschnittsmarke name="ablauf">
                <ProzessSection />
              </Abschnittsmarke>
              <GoldGlowDivider />

              <Abschnittsmarke name="vergleich">
                <VergleichSection />
              </Abschnittsmarke>
              <GoldGlowDivider />

              <Abschnittsmarke name="fuer_wen">
                <FuerWenSection />
              </Abschnittsmarke>
              <GoldGlowDivider />

              <Abschnittsmarke name="brief">
                <FounderBriefSection />
              </Abschnittsmarke>
              <GoldGlowDivider />

              <Abschnittsmarke name="angebot">
                <AngebotSection />
              </Abschnittsmarke>
              <GoldGlowDivider />

              <Abschnittsmarke name="faq">
                <FaqSection />
              </Abschnittsmarke>
              <GoldGlowDivider />

              <Abschnittsmarke name="abschluss">
                <FinalCtaSection bewertungen={bewertungen} />
              </Abschnittsmarke>
            </Box>

            <LandingFooter />
            {/* Platz für den festen CTA-Balken auf schmalen Bildschirmen: Am
                Seitenende ist er eingeblendet und läge sonst genau über der
                Fußzeile — und damit über Impressum und „Verträge hier kündigen". */}
            <Box aria-hidden display={{ base: "block", md: "none" }} h="120px" />
          </Box>

          <MembershipMobileCta />
        </BeitrittModalProvider>
      </FunnelTrackerProvider>
    </Box>
  );
}
