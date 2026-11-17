"use client";

import {
  Box,
  Button,
  Grid,
  HStack,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import { ADMIN_CARD_CLASS, AdminCardTitle, adminOverlayProps } from "@/components/admin/adminUi";
import { KAMPAGNEN, type KampagneId } from "@/config/kampagnen";

type Stand = { id: KampagneId; gesamt: number; gesendet: number; offen: number; abgemeldet: number; gestoppt: number };

/**
 * Oberfläche zu `/api/admin/kampagnen`: je Kampagne Zahlen, Mailvorschau,
 * Testmail und Versand in Paketen. In der Preview ist „Senden" gesperrt
 * (gleiche Datenbank wie die Live-Seite).
 */
export function AdminKampagnen() {
  const toast = useToast();
  const [staende, setStaende] = useState<Stand[] | null>(null);
  const [echtSenden, setEchtSenden] = useState(false);
  const [laeuft, setLaeuft] = useState<string | null>(null);
  const [fortschritt, setFortschritt] = useState<string | null>(null);
  const [bestaetigen, setBestaetigen] = useState<Stand | null>(null);

  const laden = useCallback(async () => {
    const res = await fetch("/api/admin/kampagnen", { cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; staende?: Stand[]; echtSenden?: boolean; error?: string };
    if (!json.ok) {
      toast({ status: "error", title: "Kampagnen nicht geladen", description: json.error });
      setStaende([]);
      return;
    }
    setStaende(json.staende ?? []);
    setEchtSenden(Boolean(json.echtSenden));
  }, [toast]);

  useEffect(() => {
    void laden();
  }, [laden]);

  async function test(id: KampagneId) {
    setLaeuft(`test:${id}`);
    const res = await fetch("/api/admin/kampagnen", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kampagne: id, aktion: "test" }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; an?: string; error?: string };
    toast(
      json.ok
        ? { status: "success", title: `Testmail an ${json.an} ist raus.` }
        : { status: "error", title: "Testmail fehlgeschlagen", description: json.error },
    );
    setLaeuft(null);
  }

  async function senden(id: KampagneId) {
    setBestaetigen(null);
    setLaeuft(`senden:${id}`);
    let summe = 0;
    let abstand = 0;
    let fehler = 0;
    try {
      for (let runde = 0; runde < 50; runde++) {
        setFortschritt(`${summe} gesendet …`);
        const res = await fetch("/api/admin/kampagnen", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kampagne: id, aktion: "senden" }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          gesendet?: number;
          abstand?: number;
          fehler?: number;
          uebrig?: number;
          error?: string;
        };
        if (!json.ok) throw new Error(json.error ?? "Versand abgebrochen");
        summe += json.gesendet ?? 0;
        abstand += json.abstand ?? 0;
        fehler += json.fehler ?? 0;
        // Fertig, wenn nichts mehr übrig ist oder eine Runde nichts mehr verschicken konnte.
        if (!json.uebrig || !json.gesendet) break;
      }
      toast({
        status: fehler ? "warning" : "success",
        title: `${summe} Mails gesendet.`,
        description:
          [abstand ? `${abstand} hatten in den letzten 24 h schon eine Werbe-Mail und bleiben offen.` : "", fehler ? `${fehler} Fehler, siehe Log.` : ""]
            .filter(Boolean)
            .join(" ") || undefined,
        duration: 9000,
        isClosable: true,
      });
    } catch (err) {
      toast({ status: "error", title: "Versand abgebrochen", description: err instanceof Error ? err.message : undefined });
    }
    setFortschritt(null);
    setLaeuft(null);
    void laden();
  }

  if (!staende) {
    return <Spinner color="var(--cc-gold)" />;
  }

  return (
    <Stack spacing={8}>
      {!echtSenden ? (
        <Box className={ADMIN_CARD_CLASS} p={4} borderColor="rgba(232, 192, 148, 0.35)">
          <Text fontSize="14px" color="var(--cc-text-2)">
            Hier wird nicht echt gesendet (Preview oder lokal): Diese Umgebung teilt sich die Datenbank mit der Live-Seite. Testmails gehen,
            „Senden“ erst auf www.capitalcircletrading.com.
          </Text>
        </Box>
      ) : null}

      {staende.map((s) => {
        const k = KAMPAGNEN[s.id];
        return (
          <Grid key={s.id} templateColumns={{ base: "1fr", xl: "340px 1fr" }} gap={5} alignItems="start">
            <Stack className={ADMIN_CARD_CLASS} p={5} spacing={4}>
              <AdminCardTitle>{k.titel}</AdminCardTitle>
              <Text fontSize="13px" color="var(--cc-text-2)" lineHeight={1.6}>
                {k.beschreibung}
              </Text>
              <Grid templateColumns="1fr 1fr" gap={3}>
                {[
                  ["Empfänger", s.gesamt],
                  ["Gesendet", s.gesendet],
                  ["Offen", s.offen],
                  ["Abgemeldet / gesperrt", s.abgemeldet + s.gestoppt],
                ].map(([l, w]) => (
                  <Stack key={l as string} spacing={0}>
                    <Text className="cc-num" fontSize="22px" fontWeight={600} color="var(--cc-text)">
                      {w}
                    </Text>
                    <Text fontSize="12px" color="var(--cc-text-3)">
                      {l}
                    </Text>
                  </Stack>
                ))}
              </Grid>
              {k.zielUrl ? (
                <Text fontSize="12px" color="var(--cc-text-3)" wordBreak="break-all">
                  Ziel: {k.zielUrl}
                </Text>
              ) : null}
              <HStack spacing={3} flexWrap="wrap">
                <Button variant="line" size="sm" onClick={() => void test(s.id)} isLoading={laeuft === `test:${s.id}`} isDisabled={Boolean(laeuft)}>
                  Testmail an mich
                </Button>
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() => setBestaetigen(s)}
                  isLoading={laeuft === `senden:${s.id}`}
                  loadingText={fortschritt ?? "Sende …"}
                  isDisabled={!echtSenden || !s.offen || Boolean(laeuft)}
                >
                  An {s.offen} senden
                </Button>
              </HStack>
            </Stack>
            <Box
              as="iframe"
              src={`/api/admin/training/mail-vorschau?id=${k.vorlage}`}
              title={k.titel}
              w="full"
              h="760px"
              border="1px solid var(--cc-line)"
              borderRadius="12px"
              bg="#0f1317"
            />
          </Grid>
        );
      })}

      <Modal isOpen={Boolean(bestaetigen)} onClose={() => setBestaetigen(null)} isCentered>
        <ModalOverlay {...adminOverlayProps} />
        <ModalContent bg="var(--cc-panel-solid)" border="1px solid var(--cc-line-strong)" color="var(--cc-text)" mx={4}>
          <ModalHeader fontSize="18px">Wirklich senden?</ModalHeader>
          <ModalBody>
            <Text fontSize="14px" color="var(--cc-text-2)" lineHeight={1.6}>
              {bestaetigen ? `„${KAMPAGNEN[bestaetigen.id].titel}" geht jetzt an ${bestaetigen.offen} Adressen. Das lässt sich nicht zurückholen.` : null}
            </Text>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="line" onClick={() => setBestaetigen(null)}>
              Abbrechen
            </Button>
            <Button variant="gold" onClick={() => bestaetigen && void senden(bestaetigen.id)}>
              Jetzt senden
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}
