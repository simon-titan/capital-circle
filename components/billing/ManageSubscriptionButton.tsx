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
 *
 * `flow` springt im Portal direkt in eine Maske (aktuell nur die
 * Kartenaktualisierung). Ohne `flow` landet der Nutzer auf der Portal-Startseite.
 *
 * `block` ist für den Fuß einer Preiskarte: Dort steht der Knopf in einer Reihe
 * mit den Knöpfen der beiden Nachbarkarten und muss deren Maß halten, sonst
 * sitzt eine der drei Karten sichtbar schief.
 */
export function ManageSubscriptionButton({
  label = "Abo verwalten",
  variant = "primary",
  flow,
  block = false,
}: {
  label?: string;
  variant?: "primary" | "outline";
  flow?: "payment_method_update";
  block?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function openPortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(flow ? { flow } : {}),
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
      w={block ? "100%" : { base: "100%", sm: "auto" }}
      h={block ? "48px" : undefined}
      fontSize={block ? "15px" : undefined}
    >
      {label}
    </Button>
  );
}
