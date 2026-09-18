"use client";

import { Box, Button, Divider, HStack, Spinner, Stack, Switch, Text } from "@chakra-ui/react";
import { Infinity as InfinityIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ADMIN_CARD_CLASS,
  AdminCardTitle,
  StatusPill,
  adminCardPadding,
  adminSwitchSx,
} from "@/components/admin/adminUi";

type Gruppe = { name: string; count: number };

/**
 * Steuerung des Lifetime-Angebots.
 *
 * Der globale Schalter ist der Normalfall und steht im Auslieferungszustand
 * auf „an": Wer eine normale, aktive Mitgliedschaft hat, darf Lifetime kaufen.
 * Die Gruppen darunter sind die Feinsteuerung — sie greifen erst, wenn der
 * Schalter aus ist, und erlauben es, das Angebot einem bestimmten Segment zu
 * zeigen (etwa importierten Bestandsmitgliedern) und allen anderen nicht.
 *
 * Das Angebot erscheint ausschliesslich im Mitgliederbereich unter
 * `/einstellungen/abonnement`. Es gibt keinen oeffentlichen Preis und keinen
 * Link von der Landingpage.
 */
export function AdminLifetimeOfferPanel({ onChanged }: { onChanged?: () => void }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [gruppen, setGruppen] = useState<Gruppe[]>([]);
  const [speichert, setSpeichert] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const laden = useCallback(async (abgebrochen?: () => boolean) => {
    const res = await fetch("/api/admin/users/lifetime-offer");
    const json = (await res.json()) as { ok?: boolean; enabled?: boolean; groups?: Gruppe[]; error?: string };
    if (abgebrochen?.()) return;
    if (!json.ok) {
      setFehler(json.error ?? "Zustand konnte nicht geladen werden.");
      return;
    }
    setEnabled(Boolean(json.enabled));
    setGruppen(json.groups ?? []);
  }, []);

  useEffect(() => {
    let weg = false;
    void (async () => {
      await laden(() => weg);
    })();
    return () => {
      weg = true;
    };
  }, [laden]);

  async function umlegen(next: boolean) {
    setSpeichert(true);
    setFehler(null);
    const vorher = enabled;
    setEnabled(next);
    const res = await fetch("/api/admin/users/lifetime-offer", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    setSpeichert(false);
    if (!json.ok) {
      setEnabled(vorher);
      setFehler(json.error ?? "Schalter konnte nicht gesetzt werden.");
      return;
    }
    onChanged?.();
  }

  return (
    <Stack spacing={4} className={ADMIN_CARD_CLASS} p={adminCardPadding}>
      <Box>
        <HStack spacing={2.5} mb={1.5}>
          <Box color="var(--cc-gold-light)">
            <InfinityIcon size={16} strokeWidth={1.75} aria-hidden />
          </Box>
          <AdminCardTitle>Lifetime-Angebot</AdminCardTitle>
        </HStack>
        <Text fontSize="sm" color="var(--cc-text-2)">
          Sichtbar nur für Mitglieder mit aktivem, zahlendem Abo — nie öffentlich, kein Link von der Landingpage.
        </Text>
      </Box>

      <Divider borderColor="var(--cc-line)" />

      <HStack justify="space-between" flexWrap="wrap" gap={4}>
        <Stack spacing={0.5} minW={0}>
          <Text fontSize="sm" fontWeight={500} color="var(--cc-text)">
            Lifetime für alle Mitglieder freischalten
          </Text>
          <Text fontSize="xs" color="var(--cc-text-2)">
            {enabled === null
              ? "Wird geladen…"
              : enabled
                ? "An — jedes zahlende Mitglied sieht das Angebot."
                : "Aus — nur Mitglieder mit gesetzter Freischalt-Gruppe sehen es."}
          </Text>
        </Stack>
        <HStack spacing={3} flexShrink={0}>
          {speichert || enabled === null ? <Spinner size="sm" color="var(--cc-gold)" /> : null}
          <Switch
            size="lg"
            sx={adminSwitchSx}
            isChecked={Boolean(enabled)}
            isDisabled={enabled === null || speichert}
            onChange={(e) => void umlegen(e.target.checked)}
            aria-label="Lifetime für alle Mitglieder freischalten"
          />
        </HStack>
      </HStack>

      {gruppen.length > 0 ? (
        <Stack spacing={2}>
          <Text fontSize="xs" color="var(--cc-text-2)">
            Vergebene Freischalt-Gruppen:
          </Text>
          <HStack spacing={2} flexWrap="wrap">
            {gruppen.map((g) => (
              <StatusPill key={g.name} tone="attention">
                {g.name} · {g.count}
              </StatusPill>
            ))}
          </HStack>
        </Stack>
      ) : null}

      {fehler ? (
        <Text fontSize="sm" color="var(--cc-danger)">
          {fehler}
        </Text>
      ) : null}

      {enabled === false && gruppen.length === 0 ? (
        <Text fontSize="sm" color="var(--cc-text-2)">
          Der Schalter ist aus und es gibt keine Gruppe — aktuell sieht niemand das Angebot. Wähle unten Mitglieder aus
          und vergib eine Gruppe.
        </Text>
      ) : null}

      <Button size="sm" variant="line" onClick={() => void laden()} alignSelf="flex-start">
        Neu laden
      </Button>
    </Stack>
  );
}
