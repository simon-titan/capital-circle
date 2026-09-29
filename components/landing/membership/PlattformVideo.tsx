"use client";

import { Box } from "@chakra-ui/react";
import { useEffect, useRef } from "react";
import { preload } from "react-dom";

/**
 * Die Plattform im Hero — eine echte Bildschirmaufnahme als stummer Loop.
 *
 * Ersetzt seit 29.09.2026 den Markup-Nachbau des Dashboards
 * (`PlattformVorschau`): Das Video zeigt die echte Plattform in Bewegung,
 * Klick für Klick, statt eines Standbilds mit ausgedachten Zahlen.
 *
 * ── Dateien (`public/hero/`) ───────────────────────────────────────────────
 * Aus einer 18,5-MB-Aufnahme (1872 × 950, 30 fps) ohne Tonspur neu kodiert,
 * die ersten 1,6 s abgeschnitten: Dort lädt die Seite noch, und der Loop
 * sprang sonst jedes Mal vom fertigen Dashboard in einen leeren Bildschirm.
 * Jetzt beginnt und endet er auf demselben Bild.
 *
 *   plattform-1-av1.mp4         AV1, 1872 px     ~1,0 MB
 *   plattform-1.mp4             H.264, 1872 px   ~2,1 MB  (ohne AV1-Decoder)
 *   plattform-1-mobil-av1.mp4   AV1, 1080 px     ~0,5 MB
 *   plattform-1-mobil.mp4       H.264, 1080 px   ~0,9 MB
 *   plattform-1-poster.webp     erstes Bild      ~64 KB
 *
 * Der Browser nimmt die **erste** `<source>`, die er abspielen kann. Deshalb
 * stehen die Mobil-Fassungen (mit `media`) vorn und AV1 jeweils vor H.264.
 * Ältere Browser, die `media` an `<source>` nicht kennen, landen auf der
 * Mobil-Fassung — kleiner, aber noch scharf genug.
 *
 * **Die Ziffer im Dateinamen ist die Version.** `next.config.ts` liefert
 * `public/hero/` mit einem Jahr Cache und `immutable` aus. Wer das Video
 * austauscht, vergibt neue Namen (`plattform-2-…`), sonst sehen
 * wiederkehrende Besucher noch ein Jahr lang das alte.
 *
 * ── Kein Player ────────────────────────────────────────────────────────────
 * Keine Steuerelemente, kein Bild-im-Bild, kein Cast, keine Klicks
 * (`pointerEvents="none"`). Das Video ist Dekoration wie der Nachbau davor,
 * daher `aria-hidden`.
 *
 * `muted` setzt der Effekt zusätzlich als Eigenschaft: React schreibt das
 * Attribut beim Server-Rendern nicht ins HTML, und ohne Stummschaltung
 * verweigern Browser das automatische Abspielen.
 *
 * ── Leistung ───────────────────────────────────────────────────────────────
 * Das Poster wird mit hoher Priorität vorgeladen — es ist das größte Element
 * über dem Falz und steht, bevor das erste Videobild da ist. Außerhalb des
 * Sichtfelds hält das Video an (spart Akku und CPU), bei
 * `prefers-reduced-motion` bleibt es beim Poster stehen.
 */

const POSTER = "/hero/plattform-1-poster.webp";

export function PlattformVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  preload(POSTER, { as: "image", fetchPriority: "high" });

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = true;

    const ruhig = window.matchMedia("(prefers-reduced-motion: reduce)");
    let sichtbar = true;

    const abspielen = () => {
      if (sichtbar && !ruhig.matches) {
        // Scheitert still, etwa im Stromsparmodus von iOS — dann bleibt das Poster.
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    };

    const beobachter = new IntersectionObserver(([eintrag]) => {
      sichtbar = eintrag.isIntersecting;
      abspielen();
    });
    beobachter.observe(video);
    ruhig.addEventListener("change", abspielen);
    abspielen();

    return () => {
      beobachter.disconnect();
      ruhig.removeEventListener("change", abspielen);
    };
  }, []);

  return (
    <Box
      aria-hidden
      // `cc-neutral` wie beim Nachbau davor und im echten Dashboard: keine
      // Gold-Kante um eine Aufnahme, die selbst keine trägt.
      className="cc-neutral cc-card cc-card--still"
      overflow="hidden"
      p={0}
      // Unten offen wie der Nachbau davor: Die Aufnahme taucht in den
      // Abschnitt darunter ab (Verlauf in `MembershipHero`).
      borderBottomRadius={0}
      borderBottom="none"
      bg="var(--cc-bg)"
    >
      <Box
        as="video"
        ref={ref}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={POSTER}
        tabIndex={-1}
        disablePictureInPicture
        disableRemotePlayback
        controlsList="nodownload nofullscreen noremoteplayback"
        display="block"
        w="100%"
        h="auto"
        sx={{ aspectRatio: "1872 / 950" }}
        pointerEvents="none"
        userSelect="none"
      >
        <source
          src="/hero/plattform-1-mobil-av1.mp4"
          type='video/mp4; codecs="av01.0.04M.08"'
          media="(max-width: 767px)"
        />
        <source src="/hero/plattform-1-mobil.mp4" type='video/mp4; codecs="avc1.640028"' media="(max-width: 767px)" />
        <source src="/hero/plattform-1-av1.mp4" type='video/mp4; codecs="av01.0.08M.08"' />
        <source src="/hero/plattform-1.mp4" type='video/mp4; codecs="avc1.640028"' />
      </Box>
    </Box>
  );
}
