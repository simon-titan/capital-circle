import { Box } from "@chakra-ui/react";
import { GoldGlowDivider } from "../GoldGlowDivider";
import { LandingFooter } from "../landing-ui";
import { ReviewSection } from "../ReviewSection";
import { AngebotSection } from "./AngebotSection";
import { ErgebnisseSection } from "./ErgebnisseSection";
import { FaqSection } from "./FaqSection";
import { FinalCtaSection } from "./FinalCtaSection";
import { FounderBriefSection } from "./FounderBriefSection";
import { FuerWenSection } from "./FuerWenSection";
import { LichtSchiene } from "./membership-ui";
import { MembershipHero } from "./MembershipHero";
import { MembershipMobileCta } from "./MembershipMobileCta";
import { MembershipNav } from "./MembershipNav";
import { VergleichSection } from "./VergleichSection";

/**
 * Die Sales-Landing auf `/`.
 *
 * ── Die Reihenfolge ist das Argument ───────────────────────────────────────
 * Versprechen (Hero) → Beweis (Ergebnisse, Bewertungen) → Abgrenzung
 * (Vergleich) → Einordnung (Für wen) → Person (Brief) → Angebot → Einwände
 * (FAQ) → Abschluss. Der Preis steht bewusst erst nach dem Brief: Wer bis
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
 * Abschnitt bringt sein „use client" selbst mit, wenn er es braucht.
 */
export function MembershipLanding() {
  return (
    <Box position="relative" minH="100vh" w="full" bg="var(--cc-bg)" color="var(--cc-text)" overflowX="clip">
      {/* Himmel: Sternenfeld und Champagner-Licht, beides fixiert hinter dem Inhalt. */}
      <Box className="cc-stars" aria-hidden />
      <Box className="cc-goldlight" aria-hidden />

      <Box position="relative" zIndex={1}>
        <LichtSchiene />

        {/* Sprungziel der Wortmarke in der Kopfleiste. */}
        <Box id="seitenanfang" aria-hidden />

        <MembershipNav />

        <Box as="main">
          <MembershipHero />

          <ErgebnisseSection />
          <GoldGlowDivider />

          <ReviewSection landingSlug="membership" />
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

          <FinalCtaSection />
        </Box>

        <LandingFooter />
      </Box>

      <MembershipMobileCta />
    </Box>
  );
}
