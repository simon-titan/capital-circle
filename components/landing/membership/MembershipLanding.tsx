import { Box } from "@chakra-ui/react";
import { Suspense } from "react";
import { ladeBewertungsspiegel } from "@/lib/landing-reviews";
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
/** Bewertungen der Verkaufsseite: eigene Stimmen plus die seitenübergreifenden. */
const BEWERTUNGS_KATEGORIEN = ["membership", "global"];

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

            <MembershipHero bewertungen={bewertungen} />

            <ErgebnisseSection />
            <GoldGlowDivider />

            <ReviewSection landingSlug={BEWERTUNGS_KATEGORIEN.join(",")} />
            <GoldGlowDivider />

            <ProzessSection />
            <GoldGlowDivider />

            <VergleichSection />
            <GoldGlowDivider />

            <FuerWenSection />
            <GoldGlowDivider />

            <FounderBriefSection />
            <GoldGlowDivider />

            <AngebotSection />
            <GoldGlowDivider />

            <FaqSection />
            <GoldGlowDivider />

            <FinalCtaSection bewertungen={bewertungen} />
          </Box>

          <LandingFooter />
          {/* Platz für den festen CTA-Balken auf schmalen Bildschirmen: Am
              Seitenende ist er eingeblendet und läge sonst genau über der
              Fußzeile — und damit über Impressum und „Verträge hier kündigen". */}
          <Box aria-hidden display={{ base: "block", md: "none" }} h="120px" />
        </Box>

        <MembershipMobileCta />
      </BeitrittModalProvider>
    </Box>
  );
}
