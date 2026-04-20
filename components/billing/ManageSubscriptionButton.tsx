"use client";

import { Button, useToast } from "@chakra-ui/react";
import { ExternalLink } from "lucide-react";
import { useState } from "react";

/**
 * Stripe-Customer-Portal-Button.
 *
 * Ruft `/api/stripe/create-portal-session` und leitet den User in einem neuen
 * Tab auf die signierte Portal-URL weiter. Kein Redirect im selben Tab, damit
 * der User nach Ende des Portal-Flows wieder bei uns landet, ohne den
 * Plattform-State zu verlieren.
 */
export function ManageSubscriptionButton({
  label = "Abo verwalten",
  variant = "primary",
}: {
  label?: string;
  variant?: "primary" | "outline";
}) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function openPortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
      });
      const json = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !json.ok || !json.url) {
        throw new Error(json.error ?? "portal_failed");
      }
      window.open(json.url, "_blank", "noopener");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast({
        title: "Portal konnte nicht geöffnet werden",
        description: msg,
        status: "error",
        duration: 6000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }

  if (variant === "outline") {
    return (
      <Button
        onClick={openPortal}
        isLoading={loading}
        loadingText="Öffnet…"
        variant="unstyled"
        display="inline-flex"
        alignItems="center"
        gap="8px"
        px={5}
        minH="40px"
        borderRadius="10px"
        borderWidth="1px"
        borderColor="rgba(212,175,55,0.40)"
        color="var(--color-accent-gold)"
        className="inter-semibold"
        fontSize="14px"
        _hover={{ bg: "rgba(212,175,55,0.10)", borderColor: "rgba(212,175,55,0.65)" }}
      >
        {label}
        <ExternalLink size={14} />
      </Button>
    );
  }

  return (
    <Button
      onClick={openPortal}
      isLoading={loading}
      loadingText="Öffnet…"
      variant="unstyled"
      display="inline-flex"
      alignItems="center"
      gap="8px"
      px={5}
      minH="44px"
      borderRadius="10px"
      color="#FFFFFF"
      className="inter-semibold"
      fontSize="14px"
      bg="linear-gradient(135deg, #D4AF37 0%, #A67C00 100%)"
      boxShadow="0 0 20px rgba(212,175,55,0.20), inset 0 1px 0 rgba(255,255,255,0.12)"
      transition="all 150ms cubic-bezier(0.16, 1, 0.3, 1)"
      _hover={{
        bg: "linear-gradient(135deg, #E8C547 0%, #D4AF37 100%)",
        boxShadow: "0 0 32px rgba(212,175,55,0.35), inset 0 1px 0 rgba(255,255,255,0.16)",
        transform: "translateY(-1px)",
      }}
      _active={{ transform: "translateY(0)" }}
    >
      {label}
      <ExternalLink size={14} />
    </Button>
  );
}
