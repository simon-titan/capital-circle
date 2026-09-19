"use client";

import { Flex, Stack, Switch, Text, useToast } from "@chakra-ui/react";
import { useEffect, useState, type CSSProperties } from "react";
import { DashCard, Meta } from "@/components/platform/dashboard/primitives";

/**
 * Discord-Direktnachrichten ein- oder ausschalten
 * (`profiles.discord_dm_widerspruch`, Widerspruchslösung wie in MoonTrading).
 *
 * ── Warum der Text so genau sagt, was der Schalter tut ──────────────────────
 *
 * Im Schwesterprojekt hiess es an dieser Stelle „Antworten auf deine Anfragen
 * kommen per Mail und zusätzlich als Direktnachricht" — dabei schickte der Bot
 * längst auch Zahlungshinweise, und niemand erfuhr, dass die wichtigste
 * Nachricht trotzdem per Mail kommt. Wer einen Schalter umlegt, soll wissen,
 * worauf er verzichtet und worauf nicht:
 *
 * - **ab:** Direktnachrichten des Capital-Circle-Bots — Hinweise zu Zahlung
 *   und Mitgliedschaft, Antworten des Teams darauf, Angebote.
 * - **bleibt:** jede Mail (sie ist der verlässliche Weg), die Rollen auf dem
 *   Server und der Kanal „zugang-pausiert".
 *
 * Steht nur da, wenn ein Discord-Konto verknüpft ist, und zwar für jeden —
 * auch für ehemalige Mitglieder, denen sonst die Community-Karte fehlt.
 */
export function DiscordNachrichten({ style }: { style?: CSSProperties }) {
  const toast = useToast();
  const [widerspruch, setWiderspruch] = useState<boolean | null>(null);
  const [nichtVerfuegbar, setNichtVerfuegbar] = useState(false);
  const [speichert, setSpeichert] = useState(false);

  useEffect(() => {
    let abgebrochen = false;
    const laden = async () => {
      try {
        const res = await fetch("/api/profile/discord-benachrichtigung", { cache: "no-store" });
        const daten = (await res.json().catch(() => ({}))) as { ok?: boolean; widerspruch?: boolean };
        if (abgebrochen) return;
        if (!res.ok || !daten.ok) setNichtVerfuegbar(true);
        else setWiderspruch(Boolean(daten.widerspruch));
      } catch {
        if (!abgebrochen) setNichtVerfuegbar(true);
      }
    };
    void laden();
    return () => {
      abgebrochen = true;
    };
  }, []);

  const umschalten = async (aktiv: boolean) => {
    setSpeichert(true);
    try {
      const res = await fetch("/api/profile/discord-benachrichtigung", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widerspruch: !aktiv }),
      });
      const daten = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (!res.ok || !daten.ok) throw new Error("nicht gespeichert");
      setWiderspruch(!aktiv);
      toast({
        title: aktiv ? "Discord-Nachrichten an" : "Discord-Nachrichten aus",
        description: aktiv ? undefined : "Wichtige Hinweise bekommst du weiterhin per Mail.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch {
      toast({ title: "Einstellung konnte nicht gespeichert werden", status: "error", duration: 4000, isClosable: true });
    } finally {
      setSpeichert(false);
    }
  };

  if (nichtVerfuegbar) return null;
  const aktiv = widerspruch === null ? true : !widerspruch;

  return (
    <DashCard label="Discord-Nachrichten" labelId="settings-discord-dm" className="cc-card--still cc-rise" style={style}>
      <Stack spacing={4}>
        <Flex gap={4} align="flex-start" justify="space-between">
          <Stack spacing={1.5} minW={0}>
            <Text id="discord-dm-titel" fontSize="15px" fontWeight={500} color="var(--cc-text)">
              Direktnachrichten vom Capital-Circle-Bot
            </Text>
            <Meta lineHeight={1.6}>
              Hinweise zu deiner Zahlung und Mitgliedschaft, Antworten des Teams darauf und gelegentliche Angebote
              schicken wir dir zusätzlich als Direktnachricht auf Discord.
            </Meta>
          </Stack>
          <Switch
            id="discord-dm-schalter"
            aria-labelledby="discord-dm-titel"
            isChecked={aktiv}
            isDisabled={widerspruch === null || speichert}
            onChange={(e) => void umschalten(e.target.checked)}
            flexShrink={0}
            mt={1}
          />
        </Flex>
        <Meta lineHeight={1.6}>
          Ausgeschaltet bekommst du das alles nur noch per E-Mail — die E-Mail kommt in jedem Fall. Deine Rollen auf dem
          Server und der Kanal „zugang-pausiert“ hängen nicht an dieser Einstellung.
        </Meta>
      </Stack>
    </DashCard>
  );
}
