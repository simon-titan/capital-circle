"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DiscordTerminHero } from "./DiscordTerminHero";
import { DiscordTerminFounder } from "./DiscordTerminFounder";
import { DiscordTerminMobileCTA } from "./DiscordTerminMobileCTA";
import { FunnelFooter, FunnelGround, FunnelPageStyles, FunnelSplash } from "./DiscordFunnelChrome";
import type { LeadFunnelTracking } from "@/components/marketing/DiscordQuestionsModal";
import { createVideoTracker } from "@/lib/discord-funnel/video-tracking";

const DiscordQuestionsModal = dynamic(
  () =>
    import("@/components/marketing/DiscordQuestionsModal").then((m) => ({
      default: m.DiscordQuestionsModal,
    })),
  { ssr: false },
);

/** utm_source-Fallback, der diese Leads als Nicht-Discord-Herkunft markiert. */
const LEAD_SOURCE = "termin-direkt";

function getOrCreateSessionId(): string {
  try {
    const existing = sessionStorage.getItem("cc_discord_sid");
    if (existing) return existing;
    const newId = crypto.randomUUID();
    sessionStorage.setItem("cc_discord_sid", newId);
    return newId;
  } catch {
    return "unknown";
  }
}

function readTracking(): LeadFunnelTracking {
  let utm: Record<string, string | null> = {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
  };
  let referrer: string | null = null;
  try {
    const params = new URLSearchParams(window.location.search);
    utm = {
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      utm_content: params.get("utm_content"),
      utm_term: params.get("utm_term"),
    };
    referrer = document.referrer || null;
  } catch {
    // window/document nicht verfügbar
  }
  return {
    session_id: getOrCreateSessionId(),
    // Ohne UTM in der URL den Funnel klar als "termin-direkt" kennzeichnen.
    utm_source: utm.utm_source ?? LEAD_SOURCE,
    utm_medium: utm.utm_medium,
    utm_campaign: utm.utm_campaign,
    utm_content: utm.utm_content,
    utm_term: utm.utm_term,
    referrer,
  };
}

/**
 * /termin — exakte Kopie von /discord/termin OHNE Discord-OAuth.
 * Der CTA öffnet das Popup, das zuerst Name/E-Mail/Telefon abfragt (legt einen Lead
 * ohne Discord-Invite an) und danach die 6 Funnel-Fragen stellt. Anschließend →
 * /termin/danke (Calendly). Die Leads landen im selben System (discord_leads),
 * markiert als utm_source="termin-direkt" mit discord_user_id = NULL.
 */
export function TerminDirectClient() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [tracking, setTracking] = useState<LeadFunnelTracking | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Tracking-Snapshot erst beim Öffnen des Popups ermitteln (kein setState im Effect,
  // window/sessionStorage stehen hier sicher zur Verfügung).
  const openModal = () => {
    setTracking((t) => t ?? readTracking());
    setModalOpen(true);
  };

  // Visit-Tracking (einmal pro Mount) — feuert reines Fire-and-forget, kein State.
  useEffect(() => {
    const snapshot = readTracking();
    try {
      fetch("/api/discord-funnel/visit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session_id: snapshot.session_id,
          utm_source: snapshot.utm_source,
          utm_medium: snapshot.utm_medium,
          utm_campaign: snapshot.utm_campaign,
          utm_content: snapshot.utm_content,
          utm_term: snapshot.utm_term,
          referrer: snapshot.referrer,
        }),
      }).catch(() => undefined);
    } catch {
      // Tracking-Fehler still ignorieren
    }
  }, []);

  // Video-Tracking: Watches der /termin-Seite werden anonym (nur session_id) erfasst
  // und beim Lead-Anlegen rückwirkend verknüpft.
  const videoTracker = useMemo(
    () => createVideoTracker({ token: null, source: "termin_direct" }),
    [],
  );

  const videoSrc = process.env.NEXT_PUBLIC_DISCORD_TERMIN_VIDEO_URL;
  const videoPoster = process.env.NEXT_PUBLIC_DISCORD_TERMIN_VIDEO_POSTER;

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
          token=""
          collectContact
          leadSource={LEAD_SOURCE}
          tracking={tracking}
          sourceOrigin="termin_direct"
          onComplete={(newToken) => {
            setModalOpen(false);
            router.push(`/termin/danke?lid=${encodeURIComponent(newToken ?? "")}`);
          }}
        />
      )}
    </>
  );
}
