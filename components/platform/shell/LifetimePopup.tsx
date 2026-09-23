"use client";

import {
  Box,
  Button,
  List,
  ListIcon,
  ListItem,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalOverlay,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { Check, Infinity as InfinityIcon } from "lucide-react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { lifetimeKasseAdresse } from "@/components/billing/LifetimeOffer";
import { euro, lifetimeRechnung, ordinalWort } from "@/components/billing/ersparnis";
import { IconTile } from "@/components/platform/dashboard/primitives";
import { LIFETIME_PREIS } from "@/config/lifetime";

/**
 * Lifetime-Popup: erscheint einmal, ab dem 30. Tag nach Kontoanlage, für alle,
 * die Lifetime kaufen dürfen (Nutzerwunsch 23.09.2026). Wer es sieht und wann,
 * entscheidet `app/api/lifetime/popup` — hier wird nur gefragt und angezeigt.
 *
 * Geschlossen ist geschlossen, egal auf welchem Weg (Kreuz, „Später", Klick
 * daneben, Kauf): Die Route merkt es sich am Profil, der Browser zusätzlich in
 * `localStorage`, falls Migration 104 noch fehlt.
 *
 * Keine Gold-Kante und kein Schein: Das Popup kann auch über dem Dashboard
 * aufgehen, und dort läuft alles unter `.cc-neutral` (AGENTS.md, 16.09.2026).
 * Gold-Schrift und Gold-Knopf sind auch dort erlaubt.
 */

const MERKNOTIZ = "cc-lifetime-popup-gesehen";

/** Hier steht das Angebot ohnehin, oder es wird gerade bezahlt. */
const OHNE_POPUP = ["/einstellungen/abonnement", "/checkout", "/billing"];

function lokalGesehen(): boolean {
  try {
    return window.localStorage.getItem(MERKNOTIZ) === "1";
  } catch {
    return false;
  }
}

function merkeGesehen(): void {
  try {
    window.localStorage.setItem(MERKNOTIZ, "1");
  } catch {
    // Ohne Merknotiz weiter; die Route merkt es sich ohnehin.
  }
  void fetch("/api/lifetime/popup", { method: "POST" }).catch(() => undefined);
}

export function LifetimePopup() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const toast = useToast();
  const [offen, setOffen] = useState(false);
  const [ehemalig, setEhemalig] = useState(false);
  const [laeuft, setLaeuft] = useState(false);

  const hierNicht = OHNE_POPUP.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (hierNicht || lokalGesehen()) return;
    let abgebrochen = false;
    let zeitgeber: ReturnType<typeof setTimeout> | undefined;
    void (async () => {
      try {
        const res = await fetch("/api/lifetime/popup", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { zeigen?: boolean; ehemalig?: boolean };
        if (abgebrochen || !json.zeigen) return;
        setEhemalig(Boolean(json.ehemalig));
        // Kurz warten: Wer eine Seite öffnet, soll erst sehen, wo er ist.
        zeitgeber = setTimeout(() => setOffen(true), 1200);
      } catch {
        // Kein Popup — kein Schaden.
      }
    })();
    return () => {
      abgebrochen = true;
      if (zeitgeber) clearTimeout(zeitgeber);
    };
    // Nur einmal je Besuch der Schale fragen, nicht bei jedem Seitenwechsel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function schliessen() {
    setOffen(false);
    merkeGesehen();
  }

  async function kaufen() {
    setLaeuft(true);
    merkeGesehen();
    try {
      router.push(await lifetimeKasseAdresse());
    } catch (err) {
      toast({
        title: "Checkout konnte nicht gestartet werden",
        description: err instanceof Error ? err.message : "Unbekannter Fehler",
        status: "error",
        duration: 6000,
        isClosable: true,
      });
      setLaeuft(false);
    }
  }

  const rechnung = lifetimeRechnung();

  return (
    <Modal isOpen={offen && !hierNicht} onClose={schliessen} isCentered size="lg" scrollBehavior="inside">
      <ModalOverlay bg="rgba(8, 10, 12, 0.72)" backdropFilter="blur(6px)" />
      <ModalContent
        bg="var(--cc-panel-solid)"
        border="1px solid var(--cc-line-strong)"
        borderRadius="12px"
        boxShadow="0 24px 60px rgba(0, 0, 0, 0.6)"
        color="var(--cc-text)"
        mx={4}
      >
        <ModalCloseButton color="var(--cc-text-3)" top={4} right={4} />
        <ModalBody pt={7} pb={2} px={{ base: 5, md: 7 }}>
          <Stack spacing={5}>
            <Stack spacing={2}>
              <Text
                fontSize="12px"
                fontWeight={500}
                letterSpacing="0.12em"
                textTransform="uppercase"
                color="var(--cc-gold-light)"
              >
                Einmal zahlen, dauerhaft dabei
              </Text>
              <Text as="h2" fontSize={{ base: "20px", md: "22px" }} fontWeight={600} lineHeight={1.3} pr={8}>
                Capital Circle für immer, mit einer einzigen Zahlung.
              </Text>
            </Stack>

            <Stack direction="row" spacing={4} align="center">
              <IconTile>
                <InfinityIcon size={24} strokeWidth={1.5} aria-hidden />
              </IconTile>
              <Stack spacing={0} minW={0}>
                <Text className="cc-num" fontSize={{ base: "24px", md: "28px" }} fontWeight={600}>
                  {LIFETIME_PREIS}
                </Text>
                <Text fontSize="13px" color="var(--cc-text-3)">
                  einmalig, keine weitere Abbuchung
                </Text>
              </Stack>
            </Stack>

            {rechnung?.jahreBisGuenstiger && rechnung.jahrespaketBisDahin ? (
              <Box
                border="1px solid rgba(232, 192, 148, 0.28)"
                bg="var(--cc-gold-wash)"
                borderRadius="10px"
                px="14px"
                py="12px"
              >
                <Text fontSize="14px" lineHeight={1.6} color="var(--cc-text-2)">
                  <Text as="span" color="var(--cc-gold-light)" fontWeight={600}>
                    Ab dem {ordinalWort(rechnung.jahreBisGuenstiger)} Jahr zahlst du nichts mehr.
                  </Text>{" "}
                  Im Jahrespaket wären bis dahin{" "}
                  <Text as="span" className="cc-num" color="var(--cc-text)" fontWeight={600}>
                    {euro(rechnung.jahrespaketBisDahin)}
                  </Text>{" "}
                  fällig, hier bleibt es bei{" "}
                  <Text as="span" className="cc-num" color="var(--cc-text)" fontWeight={600}>
                    {euro(rechnung.preis)}
                  </Text>
                  , einmal.
                </Text>
              </Box>
            ) : null}

            <List spacing={2} fontSize="14px" color="var(--cc-text-2)">
              {[
                "Institut, Live-Sessions und Journal ohne Enddatum.",
                "Alles Künftige ist inbegriffen: neue Module, Sessions und Werkzeuge.",
                ehemalig
                  ? "Keine Verlängerung, keine Preiserhöhung, nichts zu verwalten."
                  : "Dein laufendes Abo endet automatisch zum bezahlten Periodenende, doppelt zahlst du nie.",
              ].map((zeile) => (
                <ListItem key={zeile} display="flex" alignItems="flex-start" gap={2}>
                  <ListIcon as={Check} color="var(--cc-gold-light)" mt="3px" boxSize={4} />
                  <Text as="span">{zeile}</Text>
                </ListItem>
              ))}
            </List>
          </Stack>
        </ModalBody>

        <ModalFooter
          px={{ base: 5, md: 7 }}
          pt={5}
          pb={6}
          gap={3}
          flexDirection={{ base: "column-reverse", sm: "row" }}
          alignItems="stretch"
        >
          <Button
            as={NextLink}
            href="/einstellungen/abonnement#lifetime"
            variant="line"
            onClick={schliessen}
            flex={{ sm: "1" }}
          >
            Details ansehen
          </Button>
          <Button variant="gold" onClick={() => void kaufen()} isLoading={laeuft} flex={{ sm: "1" }}>
            Lifetime sichern
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
