"use client";

import { Box } from "@chakra-ui/react";
import { useEffect, useRef } from "react";
import { preload } from "react-dom";

/**
 * Die Plattform im Hero — ein geschnittener Rundgang als stummer Loop.
 *
 * Ersetzt seit 29.09.2026 den Markup-Nachbau des Dashboards
 * (`PlattformVorschau`): Das Video zeigt die echte Plattform in Bewegung —
 * Dashboard, Institut, Journal, Live — statt eines Standbilds mit
 * ausgedachten Zahlen.
 *
 * ── Dateien (`public/hero/`) ───────────────────────────────────────────────
 * Quelle: „website hero.mp4", 60 s, 3648 × 2160, 60 fps, 263 MB. Neu kodiert
 * mit 30 fps und ohne Tonspur. Das Video beginnt und endet auf dem vollen
 * Dashboard, der Loop braucht deshalb keinen Schnitt.
 *
 *   plattform-2-av1.mp4         AV1, 1920 px     ~4,8 MB
 *   plattform-2.mp4             H.264, 1920 px   ~9,3 MB  (ohne AV1-Decoder)
 *   plattform-2-mobil-av1.mp4   AV1, 1080 px     ~2,5 MB
 *   plattform-2-mobil.mp4       H.264, 1080 px   ~3,8 MB
 *   plattform-2-poster.webp     erstes Bild      ~66 KB
 *
 * H.264 bekommen nur Geräte ohne AV1-Decoder, vor allem iPhones vor dem
 * 15 Pro und Macs vor M3. HEVC wäre für sie nur ~15 % kleiner gewesen
 * (8,1 statt 9,3 MB) — zu wenig für zwei weitere Dateien.
 *
 * Der Browser nimmt die **erste** `<source>`, die er abspielen kann. Deshalb
 * stehen die Mobil-Fassungen (mit `media`) vorn und AV1 jeweils vor H.264.
 * Ältere Browser, die `media` an `<source>` nicht kennen, landen auf der
 * Mobil-Fassung — kleiner, aber noch scharf genug.
 *
 * **Die Ziffer im Dateinamen ist die Version.** `next.config.ts` liefert
 * `public/hero/` mit einem Jahr Cache und `immutable` aus. Wer das Video
 * austauscht, vergibt neue Namen (`plattform-3-…`), sonst sehen
 * wiederkehrende Besucher noch ein Jahr lang das alte.
 *
 * ── Kein Player ────────────────────────────────────────────────────────────
 * Keine Steuerelemente, kein Bild-im-Bild, kein Cast, keine Klicks
 * (`pointerEvents="none"`). Das Video ist Dekoration wie der Nachbau davor,
 * daher `aria-hidden`.
 *
 * `muted` setzt der Effekt zusätzlich als Eigenschaft — doppelt hält besser:
 * Ohne Stummschaltung verweigern Browser das automatische Abspielen, und
 * ältere React-Versionen schrieben das Attribut nicht ins Server-HTML.
 *
 * ── Leistung ───────────────────────────────────────────────────────────────
 * Das Poster wird mit hoher Priorität vorgeladen — es ist das größte Element
 * über dem Falz und steht, bevor das erste Videobild da ist. Außerhalb des
 * Sichtfelds hält das Video an (spart Akku und CPU), bei
 * `prefers-reduced-motion` bleibt es beim Poster stehen.
 */

const POSTER = "/hero/plattform-2-poster.webp";

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
      position="relative"
      overflow="hidden"
      // Nur Schein, keine Kante (Nutzerwunsch 29.09.2026): ein warmer
      // Gold-Glow und weit außen ein Hauch Weiß heben das Video vom Himmel ab.
      // Rahmenlinie und Lichtkante oben standen einen Tag lang hier und sind
      // ausdrücklich wieder raus. Werte aus der Hero-Karte (DESIGN.md →
      // „Hero atmend"), nur ohne Atmen — ein Video bewegt sich schon selbst.
      borderRadius={{ base: "12px", md: "16px" }}
      boxShadow={{
        base: "0 0 22px rgba(212, 176, 128, 0.22), 0 0 48px rgba(255, 255, 255, 0.05), 0 14px 34px rgba(0, 0, 0, 0.5)",
        md: "0 0 40px rgba(212, 176, 128, 0.26), 0 0 110px rgba(255, 255, 255, 0.07), 0 28px 70px rgba(0, 0, 0, 0.55)",
      }}
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
        sx={{ aspectRatio: "1920 / 1136" }}
        pointerEvents="none"
        userSelect="none"
      >
        <source
          src="/hero/plattform-2-mobil-av1.mp4"
          type='video/mp4; codecs="av01.0.05M.08"'
          media="(max-width: 767px)"
        />
        <source src="/hero/plattform-2-mobil.mp4" type='video/mp4; codecs="avc1.640028"' media="(max-width: 767px)" />
        <source src="/hero/plattform-2-av1.mp4" type='video/mp4; codecs="av01.0.08M.08"' />
        <source src="/hero/plattform-2.mp4" type='video/mp4; codecs="avc1.640028"' />
      </Box>
    </Box>
  );
}
