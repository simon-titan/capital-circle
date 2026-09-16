"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DiscordTerminHero } from "./DiscordTerminHero";
import { DiscordTerminFounder } from "./DiscordTerminFounder";
import { DiscordTerminMobileCTA } from "./DiscordTerminMobileCTA";
import { FunnelFooter, FunnelGround, FunnelPageStyles, FunnelSplash } from "./DiscordFunnelChrome";
import { createVideoTracker } from "@/lib/discord-funnel/video-tracking";

const DiscordQuestionsModal = dynamic(
  () =>
    import("@/components/marketing/DiscordQuestionsModal").then((m) => ({
      default: m.DiscordQuestionsModal,
    })),
  { ssr: false },
);

/**
 * /discord/termin — /bewerbung-Kopie im Funnel-Look (Hero + CTA-Footer + Founder).
 * Der CTA öffnet das 6-Fragen-Popup; nach Abschluss → /discord/termin/danke (Calendly).
 */
export function DiscordTerminClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lid = (searchParams.get("lid") ?? "").trim();
  // Identify-Loop-Schutz: Callback hängt einen `discord`-Param an.
  const identifyAttempted = (searchParams.get("discord") ?? "") !== "";

  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Kein lid (intern beworbener Link) → Discord-User per OAuth identifizieren.
  useEffect(() => {
    if (!lid && !identifyAttempted) {
      window.location.href = "/api/discord-funnel/identify";
    }
  }, [lid, identifyAttempted]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  /* ── Throttled Video Tracking (vereinheitlichter Helper) ─────────────────── */
  // source 'discord_funnel' + lid; session_id ergänzt der Helper automatisch.
  const videoTracker = useMemo(
    () => createVideoTracker({ token: lid || null, source: "discord_funnel" }),
    [lid],
  );

  const openModal = useCallback(() => setModalOpen(true), []);

  const handleComplete = useCallback(() => {
    setModalOpen(false);
    router.push(`/discord/termin/danke?lid=${encodeURIComponent(lid)}`);
  }, [router, lid]);

  const videoSrc =
    process.env.NEXT_PUBLIC_DISCORD_TERMIN_VIDEO_URL ??
    process.env.NEXT_PUBLIC_STEP2_BEWERBUNG_VIDEO_URL;
  const videoPoster = process.env.NEXT_PUBLIC_DISCORD_TERMIN_VIDEO_POSTER;

  // Während der Identify-Weiterleitung nichts rendern.
  if (!lid && !identifyAttempted) return null;

  return (
    <>
      <FunnelSplash visible={loading} />
      <FunnelPageStyles mobileCta />

      <DiscordTerminMobileCTA onApply={openModal} />

      <FunnelGround>
        <DiscordTerminHero
          onApply={openModal}
          videoSrc={videoSrc}
          videoPoster={videoPoster}
          onVideoProgress={videoTracker.handleProgress}
          onVideoEnded={videoTracker.handleEnded}
        />

        <DiscordTerminFounder />

        {/* Footer disclaimer */}
        <FunnelFooter>
          Mit dem Abschicken der Bewerbung stimmst du unserer Datenschutzerklärung zu. Trading
          und Investitionen sind mit erheblichen Verlustrisiken verbunden. Frühere Ergebnisse
          sind keine Garantie für zukünftige Gewinne.
        </FunnelFooter>
      </FunnelGround>

      {modalOpen && (
        <DiscordQuestionsModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          token={lid}
          onComplete={handleComplete}
        />
      )}
    </>
  );
}
