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
 *
 * `primary` = Gold-Button (Theme-Variante `gold`), `outline` = Line-Button.
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

  return (
    <Button
      onClick={openPortal}
      isLoading={loading}
      loadingText="Öffnet…"
      variant={variant === "outline" ? "line" : "gold"}
      rightIcon={<ExternalLink size={14} aria-hidden />}
      w={{ base: "100%", sm: "auto" }}
    >
      {label}
    </Button>
  );
}
