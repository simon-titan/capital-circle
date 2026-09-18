"use client";

import {
  Box,
  Button,
  Flex,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Text,
  Textarea,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { CheckCircle2, LifeBuoy, PauseCircle, TicketPercent } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Meta } from "@/components/platform/dashboard/primitives";
import { formatDate } from "./format";

type Grund = "too_expensive" | "not_enough_value" | "tech_issues" | "other";

const GRUENDE: { wert: Grund; label: string }[] = [
  { wert: "too_expensive", label: "Zu teuer für meine aktuelle Lage" },
  { wert: "not_enough_value", label: "Ich nutze es zu wenig" },
  { wert: "tech_issues", label: "Technische Probleme" },
  { wert: "other", label: "Ein anderer Grund" },
];

type Schritt = "grund" | "angebot" | "bestaetigen" | "fertig";

const FELD_SX = {
  bg: "rgba(255, 255, 255, 0.03)",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  color: "var(--cc-text)",
  _placeholder: { color: "var(--cc-text-3)" },
  _hover: { borderColor: "rgba(212, 176, 128, 0.4)" },
  _focusVisible: { borderColor: "var(--cc-gold)", boxShadow: "0 0 0 1px var(--cc-gold)" },
};

/**
 * Kündigungs-Flow in der App statt im Stripe-Portal.
 *
 * Drei Schritte mit Absicht: Grund, Halte-Angebot, Bestätigung. Das Portal
 * kann den mittleren nicht — es kennt weder unsere vier Gründe noch die Pause
 * als Alternative, und was der Nutzer dort eingibt, landet in Stripes
 * Auswertung statt in `cancellations`.
 *
 * Das Halte-Angebot richtet sich nach dem Grund: Wer zu wenig Zeit hat, dem
 * hilft eine Pause; wer den Preis nennt, dem ein Rabatt; wer über Technik
 * klagt, braucht den Support und keinen Rabatt. Ein Angebot, das am Grund
 * vorbeigeht, liest sich wie eine Verkaufsmasche.
 */
export function CancelFlow({
  periodenEnde,
  rabattVerfuegbar,
  bereitsGekuendigt,
  pausiertBis,
}: {
  periodenEnde: string;
  rabattVerfuegbar: boolean;
  bereitsGekuendigt: boolean;
  pausiertBis: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [schritt, setSchritt] = useState<Schritt>("grund");
  const [grund, setGrund] = useState<Grund>("too_expensive");
  const [freitext, setFreitext] = useState("");
  const [pauseMonate, setPauseMonate] = useState("1");
  const [laeuft, setLaeuft] = useState(false);
  const [endeAm, setEndeAm] = useState(periodenEnde);

  function schliessen() {
    onClose();
    // Erst nach dem Schließen zurücksetzen, sonst blitzt der erste Schritt
    // während der Ausblend-Animation auf.
    window.setTimeout(() => setSchritt("grund"), 250);
    if (schritt === "fertig") router.refresh();
  }

  async function ruf(pfad: string, methode: "POST" | "DELETE", body?: unknown) {
    const res = await fetch(pfad, {
      method: methode,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json()) as { ok?: boolean; error?: string; detail?: string; accessUntil?: string };
    if (!res.ok || !json.ok) throw new Error(json.detail ?? json.error ?? "Die Aktion hat nicht geklappt.");
    return json;
  }

  async function pausieren() {
    setLaeuft(true);
    try {
      const json = await ruf("/api/stripe/subscription/pause", "POST", {
        months: Number(pauseMonate),
        reason: grund,
      });
      toast({
        title: "Mitgliedschaft pausiert",
        description: `Die Abrechnung ruht ${pauseMonate} Monat(e). Dein Zugang endet am ${formatDate(
          json.accessUntil ?? periodenEnde,
        )} und kommt danach automatisch zurück.`,
        status: "success",
        duration: 8000,
        isClosable: true,
      });
      onClose();
      router.refresh();
    } catch (err) {
      melde(err);
    } finally {
      setLaeuft(false);
    }
  }

  async function rabattNehmen() {
    setLaeuft(true);
    try {
      await ruf("/api/stripe/subscription/discount", "POST");
      toast({
        title: "Rabatt ist aktiv",
        description: "Er greift ab der nächsten Abrechnung. Deine Mitgliedschaft läuft unverändert weiter.",
        status: "success",
        duration: 8000,
        isClosable: true,
      });
      onClose();
      router.refresh();
    } catch (err) {
      melde(err);
    } finally {
      setLaeuft(false);
    }
  }

  async function kuendigen() {
    setLaeuft(true);
    try {
      const json = await ruf("/api/stripe/subscription/cancel", "POST", {
        reason: grund,
        feedback: freitext,
      });
      setEndeAm(json.accessUntil ?? periodenEnde);
      setSchritt("fertig");
    } catch (err) {
      melde(err);
    } finally {
      setLaeuft(false);
    }
  }

  async function kuendigungZuruecknehmen() {
    setLaeuft(true);
    try {
      await ruf("/api/stripe/subscription/cancel", "DELETE");
      toast({
        title: "Kündigung zurückgenommen",
        description: "Deine Mitgliedschaft läuft ganz normal weiter.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      router.refresh();
    } catch (err) {
      melde(err);
    } finally {
      setLaeuft(false);
    }
  }

  async function pauseBeenden() {
    setLaeuft(true);
    try {
      await ruf("/api/stripe/subscription/pause", "DELETE");
      toast({
        title: "Pause beendet",
        description: "Die Abrechnung läuft wieder, dein Zugang ist sofort zurück.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      router.refresh();
    } catch (err) {
      melde(err);
    } finally {
      setLaeuft(false);
    }
  }

  function melde(err: unknown) {
    toast({
      title: "Das hat nicht geklappt",
      description: err instanceof Error ? err.message : "Unbekannter Fehler",
      status: "error",
      duration: 7000,
      isClosable: true,
    });
  }

  /* ── Zustände, in denen es nichts zu kündigen gibt ─────────────────────── */

  if (bereitsGekuendigt) {
    return (
      <Zone ton="danger">
        <Stack spacing={1} minW={0}>
          <Text fontSize="15px" fontWeight={600} color="var(--cc-text)">
            Deine Mitgliedschaft endet am {formatDate(periodenEnde)}
          </Text>
          <Meta>Bis dahin bleibt alles freigeschaltet. Du kannst die Kündigung jederzeit zurücknehmen.</Meta>
        </Stack>
        <Button variant="line" onClick={() => void kuendigungZuruecknehmen()} isLoading={laeuft} flexShrink={0}>
          Kündigung zurücknehmen
        </Button>
      </Zone>
    );
  }

  if (pausiertBis) {
    return (
      <Zone ton="neutral">
        <Stack spacing={1} minW={0}>
          <Text fontSize="15px" fontWeight={600} color="var(--cc-text)">
            Pausiert bis {formatDate(pausiertBis)}
          </Text>
          <Meta>Bis dahin wird nichts abgebucht. Du kannst jederzeit früher zurückkommen.</Meta>
        </Stack>
        <Button variant="gold" onClick={() => void pauseBeenden()} isLoading={laeuft} flexShrink={0}>
          Jetzt fortsetzen
        </Button>
      </Zone>
    );
  }

  /* ── Regelfall ────────────────────────────────────────────────────────── */

  return (
    <>
      <Zone ton="danger">
        <Stack spacing={1} minW={0}>
          <Text fontSize="15px" fontWeight={600} color="var(--cc-text)">
            Mitgliedschaft kündigen
          </Text>
          <Meta>
            Dein Zugang bleibt bis zum Ende der bezahlten Laufzeit ({formatDate(periodenEnde)}) bestehen.
          </Meta>
        </Stack>
        <Button variant="line" color="var(--cc-danger)" onClick={onOpen} flexShrink={0}>
          Kündigen
        </Button>
      </Zone>

      <Modal isOpen={isOpen} onClose={schliessen} isCentered size="lg" scrollBehavior="inside">
        <ModalOverlay bg="rgba(8, 10, 12, 0.72)" backdropFilter="blur(2px)" />
        <ModalContent
          bg="var(--cc-panel-solid)"
          border="1px solid var(--cc-line-strong)"
          borderRadius="12px"
          color="var(--cc-text)"
          mx={4}
        >
          <ModalHeader borderBottom="1px solid var(--cc-line)" fontSize="17px" fontWeight={600}>
            {schritt === "grund"
              ? "Bevor du gehst"
              : schritt === "angebot"
                ? "Vielleicht passt das besser"
                : schritt === "bestaetigen"
                  ? "Kündigung bestätigen"
                  : "Kündigung bestätigt"}
          </ModalHeader>
          <ModalCloseButton color="var(--cc-text-2)" />

          <ModalBody py={5}>
            {schritt === "grund" ? (
              <Stack spacing={5}>
                <Meta>Eine Frage nur — sie hilft uns mehr als jede Umfrage danach.</Meta>
                <RadioGroup value={grund} onChange={(v) => setGrund(v as Grund)}>
                  <Stack spacing={3}>
                    {GRUENDE.map((g) => (
                      <Radio key={g.wert} value={g.wert} colorScheme="brand" borderColor="var(--cc-line-strong)">
                        <Text fontSize="15px">{g.label}</Text>
                      </Radio>
                    ))}
                  </Stack>
                </RadioGroup>
                <Textarea
                  value={freitext}
                  onChange={(e) => setFreitext(e.target.value)}
                  placeholder="Magst du es genauer sagen? (freiwillig)"
                  rows={3}
                  sx={FELD_SX}
                />
              </Stack>
            ) : null}

            {schritt === "angebot" ? (
              <Stack spacing={4}>
                {grund === "tech_issues" ? (
                  <Angebot
                    icon={<LifeBuoy size={20} strokeWidth={1.75} aria-hidden />}
                    titel="Lass es uns reparieren"
                    text="Technische Probleme sind der einzige Grund auf der Liste, den wir wirklich abstellen können. Schreib uns — meistens ist es in einem Tag erledigt."
                    aktion={
                      <Button as={Link} href="/support" variant="gold" size="sm" onClick={schliessen}>
                        Support schreiben
                      </Button>
                    }
                  />
                ) : null}

                {grund === "too_expensive" && rabattVerfuegbar ? (
                  <Angebot
                    icon={<TicketPercent size={20} strokeWidth={1.75} aria-hidden />}
                    titel="Rabatt auf die nächsten Abrechnungen"
                    text="Wenn es nur am Betrag liegt: Wir senken ihn, statt dich zu verlieren. Der Rabatt greift ab der nächsten Abbuchung."
                    aktion={
                      <Button variant="gold" size="sm" onClick={() => void rabattNehmen()} isLoading={laeuft}>
                        Rabatt annehmen
                      </Button>
                    }
                  />
                ) : null}

                <Angebot
                  icon={<PauseCircle size={20} strokeWidth={1.75} aria-hidden />}
                  titel="Pausieren statt kündigen"
                  text="Die Abrechnung ruht, dein Fortschritt, dein Journal und deine Streak bleiben erhalten. Danach geht es weiter, wo du aufgehört hast."
                  aktion={
                    <HStack spacing={2}>
                      <Select
                        value={pauseMonate}
                        onChange={(e) => setPauseMonate(e.target.value)}
                        size="sm"
                        w="130px"
                        sx={FELD_SX}
                        aria-label="Dauer der Pause"
                      >
                        <option value="1" style={{ background: "#151a1e" }}>
                          1 Monat
                        </option>
                        <option value="2" style={{ background: "#151a1e" }}>
                          2 Monate
                        </option>
                        <option value="3" style={{ background: "#151a1e" }}>
                          3 Monate
                        </option>
                      </Select>
                      <Button variant="gold" size="sm" onClick={() => void pausieren()} isLoading={laeuft}>
                        Pausieren
                      </Button>
                    </HStack>
                  }
                />
              </Stack>
            ) : null}

            {schritt === "bestaetigen" ? (
              <Stack spacing={4}>
                <Text fontSize="15px" lineHeight={1.7} color="var(--cc-text-soft)">
                  Deine Mitgliedschaft endet am{" "}
                  <Text as="span" className="cc-num" fontWeight={600} color="var(--cc-text)">
                    {formatDate(periodenEnde)}
                  </Text>
                  . Bis dahin bleibt alles freigeschaltet, danach wird nichts mehr abgebucht.
                </Text>
                <Meta>
                  Dein Journal und dein Fortschritt bleiben gespeichert — wenn du zurückkommst, ist alles noch da.
                </Meta>
              </Stack>
            ) : null}

            {schritt === "fertig" ? (
              <Stack spacing={4} align="flex-start">
                <Box color="var(--cc-gold-light)">
                  <CheckCircle2 size={28} strokeWidth={1.5} aria-hidden />
                </Box>
                <Text fontSize="15px" lineHeight={1.7} color="var(--cc-text-soft)">
                  Erledigt. Dein Zugang läuft noch bis{" "}
                  <Text as="span" className="cc-num" fontWeight={600} color="var(--cc-text)">
                    {formatDate(endeAm)}
                  </Text>
                  . Danach endet die Mitgliedschaft automatisch.
                </Text>
                <Meta>Du kannst die Kündigung bis dahin jederzeit auf dieser Seite zurücknehmen.</Meta>
              </Stack>
            ) : null}
          </ModalBody>

          <ModalFooter borderTop="1px solid var(--cc-line)" gap={3}>
            {schritt === "grund" ? (
              <>
                <Button variant="ghost" color="var(--cc-text-2)" onClick={schliessen}>
                  Doch nicht
                </Button>
                <Button variant="line" onClick={() => setSchritt("angebot")}>
                  Weiter
                </Button>
              </>
            ) : null}

            {schritt === "angebot" ? (
              <>
                <Button variant="ghost" color="var(--cc-text-2)" onClick={schliessen}>
                  Doch nicht
                </Button>
                <Button variant="line" color="var(--cc-danger)" onClick={() => setSchritt("bestaetigen")}>
                  Trotzdem kündigen
                </Button>
              </>
            ) : null}

            {schritt === "bestaetigen" ? (
              <>
                <Button variant="ghost" color="var(--cc-text-2)" onClick={() => setSchritt("angebot")}>
                  Zurück
                </Button>
                <Button
                  variant="line"
                  color="var(--cc-danger)"
                  borderColor="rgba(248, 113, 113, 0.32)"
                  onClick={() => void kuendigen()}
                  isLoading={laeuft}
                >
                  Jetzt kündigen
                </Button>
              </>
            ) : null}

            {schritt === "fertig" ? (
              <Button variant="gold" onClick={schliessen}>
                Schließen
              </Button>
            ) : null}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

/** Abschlusszeile der Seite — rot nur dort, wo wirklich etwas endet. */
function Zone({ ton, children }: { ton: "danger" | "neutral"; children: React.ReactNode }) {
  const rot = ton === "danger";
  return (
    <Flex
      className="cc-rise"
      style={{ animationDelay: "290ms" }}
      direction={{ base: "column", sm: "row" }}
      align={{ base: "stretch", sm: "center" }}
      justify="space-between"
      gap={4}
      p={{ base: 5, md: 6 }}
      borderRadius="12px"
      border="1px solid"
      borderColor={rot ? "rgba(248, 113, 113, 0.28)" : "var(--cc-line-strong)"}
      bg={rot ? "rgba(248, 113, 113, 0.04)" : "rgba(255, 255, 255, 0.02)"}
    >
      {children}
    </Flex>
  );
}

function Angebot({
  icon,
  titel,
  text,
  aktion,
}: {
  icon: React.ReactNode;
  titel: string;
  text: string;
  aktion: React.ReactNode;
}) {
  return (
    <Stack
      spacing={3}
      p={4}
      borderRadius="10px"
      border="1px solid var(--cc-line-strong)"
      bg="rgba(255, 255, 255, 0.02)"
    >
      <HStack spacing={2.5} color="var(--cc-gold-light)">
        {icon}
        <Text fontSize="15px" fontWeight={600} color="var(--cc-text)">
          {titel}
        </Text>
      </HStack>
      <Text fontSize="14px" lineHeight={1.6} color="var(--cc-text-2)">
        {text}
      </Text>
      <Box>{aktion}</Box>
    </Stack>
  );
}
