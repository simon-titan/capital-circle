import { FunnelVideoFrame, VideoPlaceholder } from "./funnel-ui";

/**
 * Intro-Video auf der Free-Funnel-Landing-Page.
 *
 * Liest aus NEXT_PUBLIC_FREE_FUNNEL_VIDEO_URL — getrennt vom Pricing-Video,
 * damit beide Seiten unabhängig voneinander bestückt werden können.
 * Wenn leer: Platzhalter mit Gold-Play-Button, Seite bleibt vollständig funktionsfähig.
 */
export function FreeFunnelVideo() {
  const src = process.env.NEXT_PUBLIC_FREE_FUNNEL_VIDEO_URL?.trim() ?? "";

  return (
    <FunnelVideoFrame>
      {src ? (
        <video
          src={src}
          controls
          playsInline
          preload="metadata"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            background: "var(--cc-panel-solid)",
          }}
        />
      ) : (
        <VideoPlaceholder label="Vorstellungsvideo folgt in Kürze" />
      )}
    </FunnelVideoFrame>
  );
}
