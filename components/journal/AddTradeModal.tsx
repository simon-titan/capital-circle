"use client";

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Grid,
  HStack,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  useBreakpointValue,
} from "@chakra-ui/react";
import { ArrowLeft, CheckCircle2, FileUp, Lock, RefreshCw, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { DEFAULT_IMPORT_TIMEZONE, IMPORT_TIMEZONES } from "@/lib/journal/import/time";
import { IMPORT_METHODS, PROVIDERS, TRADOVATE_EXPORT_STEPS } from "./constants";
import { ManualTradeForm } from "./ManualTradeForm";
import type { ImportResult } from "./types";

type Step = "provider" | "method" | "upload" | "loading" | "result" | "manual";

/** Kachel für Anbieter und Import-Methoden — gesperrte Varianten mit Schloss. */
function SelectableTile({
  label,
  description,
  locked,
  onClick,
}: {
  label: string;
  description?: string;
  locked: boolean;
  onClick?: () => void;
}) {
  return (
    <Box
      as={locked ? "div" : "button"}
      onClick={locked ? undefined : onClick}
      textAlign="left"
      w="100%"
      p={4}
      borderRadius="12px"
      border="1px solid"
      borderColor={locked ? "rgba(255,255,255,0.05)" : "var(--j-line)"}
      bg={locked ? "transparent" : "var(--j-panel-raised)"}
      opacity={locked ? 0.45 : 1}
      cursor={locked ? "not-allowed" : "pointer"}
      transition="all 0.15s ease"
      _hover={locked ? undefined : { borderColor: "var(--j-line-strong)", bg: "var(--j-accent-soft)" }}
      aria-disabled={locked}
    >
      <HStack justify="space-between" align="start" gap={2}>
        <Stack gap={1} flex="1" minW={0}>
          <Text className="inter-semibold" fontSize="sm" color="var(--cc-text)">
            {label}
          </Text>
          {description && (
            <Text fontSize="xs" color="var(--cc-text-2)" lineHeight="1.4">
              {description}
            </Text>
          )}
          {locked && (
            <Text fontSize="xs" color="var(--cc-text-3)" className="inter">
              Aktuell gesperrt
            </Text>
          )}
        </Stack>
        {locked && <Icon as={Lock} boxSize={4} color="var(--cc-text-3)" mt={0.5} />}
      </HStack>
    </Box>
  );
}

export function AddTradeModal({
  isOpen,
  onClose,
  accountId,
  onImported,
}: {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  onImported: () => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Chakras `size` ist ein Theming-Prop und nimmt kein Responsive-Objekt.
  const isMobile = useBreakpointValue({ base: true, md: false }, { fallback: "md" });

  const [step, setStep] = useState<Step>("provider");
  const [timezone, setTimezone] = useState<string>(DEFAULT_IMPORT_TIMEZONE);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep("provider");
    setResult(null);
    setError(null);
    setDragging(false);
  }, []);

  const close = useCallback(() => {
    onClose();
    // Erst nach der Schliess-Animation zurücksetzen, sonst flackert der Inhalt.
    window.setTimeout(reset, 200);
  }, [onClose, reset]);

  const upload = useCallback(
    async (file: File) => {
      setError(null);

      if (!file.name.toLowerCase().endsWith(".csv")) {
        setError("Bitte eine CSV-Datei auswählen.");
        return;
      }

      setStep("loading");
      try {
        const csv = await file.text();
        const response = await fetch("/api/journal/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId, fileName: file.name, csv, timezone }),
        });
        const payload = await response.json();

        if (!response.ok || !payload.ok) {
          setError(errorMessage(payload?.error, payload));
          setStep("upload");
          return;
        }

        setResult(payload as ImportResult);
        setStep("result");
        onImported();
      } catch {
        setError("Die Datei konnte nicht gelesen werden.");
        setStep("upload");
      }
    },
    [accountId, timezone, onImported],
  );

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void upload(file);
  };

  const back = () => {
    if (step === "method") setStep("provider");
    else if (step === "upload") setStep("method");
    else if (step === "manual") setStep("provider");
    else setStep("provider");
  };

  const title =
    step === "provider"
      ? "Broker, Prop Firm oder Trading-Plattform wählen"
      : step === "method"
        ? "Import-Methode wählen"
        : step === "upload"
          ? "Orders-Export hochladen"
          : step === "manual"
            ? "Trade manuell eintragen"
            : step === "loading"
              ? "Import läuft"
              : "Import abgeschlossen";

  const wideStep = step === "upload" || step === "manual";
  const modalSize = isMobile ? "full" : wideStep ? "4xl" : "2xl";

  return (
    <Modal isOpen={isOpen} onClose={close} size={modalSize} isCentered={!isMobile} scrollBehavior="inside">
      <ModalOverlay bg="rgba(5, 7, 10, 0.72)" backdropFilter="blur(6px)" />
      {/* Das Modal rendert im Portal außerhalb von JournalChrome — die Attribute holen Journal-Tokens und Plattform-Stile hinein. */}
      <ModalContent
        data-journal-wide
        data-platform
        bg="var(--cc-panel-solid)"
        border={{ base: "none", md: "1px solid var(--cc-gold-line)" }}
        borderRadius={{ base: 0, md: "16px" }}
        boxShadow="0 24px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(212, 176, 128, 0.08)"
        mx={{ base: 0, md: 4 }}
      >
        <ModalHeader pr={12}>
          <Stack gap={2} align="flex-start">
            {step !== "provider" && step !== "loading" && step !== "result" && (
              <Button size="xs" variant="ghost" onClick={back} leftIcon={<ArrowLeft size={14} />} ml={-2} color="var(--cc-text-2)">
                Zurück
              </Button>
            )}
            <Text className="inter-semibold" fontSize={{ base: "md", md: "lg" }} color="var(--cc-text)" lineHeight="1.35">
              {title}
            </Text>
          </Stack>
        </ModalHeader>
        {step !== "loading" && <ModalCloseButton />}

        <ModalBody pb={{ base: 8, md: 6 }}>
          {step === "provider" && (
            <SimpleGrid columns={{ base: 2, md: 3 }} gap={{ base: 2.5, md: 3 }}>
              {PROVIDERS.map((provider) => (
                <SelectableTile
                  key={provider.id}
                  label={provider.label}
                  description={provider.hint}
                  locked={provider.locked}
                  onClick={() => setStep(provider.id === "manual" ? "manual" : "method")}
                />
              ))}
            </SimpleGrid>
          )}

          {step === "method" && (
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
              {IMPORT_METHODS.map((method) => (
                <SelectableTile
                  key={method.id}
                  label={method.label}
                  description={method.description}
                  locked={method.locked}
                  onClick={() => setStep(method.id === "manual" ? "manual" : "upload")}
                />
              ))}
            </SimpleGrid>
          )}

          {step === "upload" && (
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={{ base: 5, md: 6 }}>
              <Stack gap={4}>
                <Box
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
                  }}
                  cursor="pointer"
                  borderRadius="14px"
                  border="2px dashed"
                  borderColor={dragging ? "var(--j-accent)" : "var(--j-line)"}
                  bg={dragging ? "var(--j-accent-soft)" : "var(--j-panel)"}
                  transition="all 0.15s ease"
                  _hover={{ borderColor: "var(--j-line-strong)" }}
                  py={{ base: 8, md: 12 }}
                  px={6}
                  textAlign="center"
                >
                  <Icon as={UploadCloud} boxSize={9} color="var(--cc-text-2)" mb={3} />
                  <Text className="inter-semibold" color="var(--cc-text)">
                    CSV hierher ziehen
                  </Text>
                  <Text fontSize="sm" color="var(--cc-text-2)" mt={1}>
                    oder klicken, um eine Datei auszuwählen
                  </Text>
                </Box>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void upload(file);
                    e.target.value = "";
                  }}
                />

                <Box>
                  <Text fontSize="sm" color="var(--cc-text-2)" mb={2}>
                    Zeitzone deines Exports
                  </Text>
                  <Select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    bg="var(--j-panel-raised)"
                    borderColor="var(--j-line)"
                    size="sm"
                  >
                    {IMPORT_TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value} style={{ background: "#0e1217" }}>
                        {tz.label}
                      </option>
                    ))}
                  </Select>
                  <Text fontSize="xs" color="var(--cc-text-3)" mt={2} lineHeight="1.5">
                    Bestimmt, welchem Handelstag ein Trade zugeordnet wird. Im Zweifel die Zeitzone, die du in
                    TradingView eingestellt hast.
                  </Text>
                </Box>

                {error && (
                  <Alert status="error" bg="rgba(239,68,68,0.12)" borderRadius="md" color="var(--cc-text)">
                    <AlertIcon color="var(--color-loss)" />
                    <Text fontSize="sm">{error}</Text>
                  </Alert>
                )}
              </Stack>

              <Box borderRadius="12px" border="1px solid var(--j-line)" bg="var(--j-panel)" p={5}>
                <HStack gap={2} mb={3}>
                  <Icon as={FileUp} boxSize={4} color="var(--cc-text-2)" />
                  <Text className="inter-semibold" fontSize="sm" color="var(--cc-text)">
                    So exportierst du deine Orders
                  </Text>
                </HStack>
                <Stack as="ol" gap={2.5} pl={0}>
                  {TRADOVATE_EXPORT_STEPS.map((instruction, index) => (
                    <HStack key={instruction} align="start" gap={3}>
                      <Box
                        flexShrink={0}
                        w="20px"
                        h="20px"
                        borderRadius="full"
                        bg="var(--j-accent-soft)"
                        color="var(--cc-gold-light)"
                        fontSize="11px"
                        className="cc-num"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        mt="1px"
                      >
                        {index + 1}
                      </Box>
                      <Text fontSize="sm" color="var(--cc-text-2)" lineHeight="1.5">
                        {instruction}
                      </Text>
                    </HStack>
                  ))}
                </Stack>
              </Box>
            </Grid>
          )}

          {step === "manual" && <ManualTradeForm accountId={accountId} onSaved={() => { onImported(); close(); }} />}

          {step === "loading" && (
            <Stack align="center" py={12} gap={4}>
              <Spinner size="xl" color="var(--j-accent)" thickness="3px" speed="0.7s" emptyColor="var(--j-line)" />
              <Text className="inter-semibold" color="var(--cc-text)">
                Einen kurzen Augenblick…
              </Text>
              <Text fontSize="sm" color="var(--cc-text-2)" textAlign="center" maxW="26rem">
                Wir lesen deine Orders aus und bauen daraus die einzelnen Trades zusammen.
              </Text>
            </Stack>
          )}

          {step === "result" && result && (
            <Stack align="center" py={6} gap={5}>
              <Icon as={CheckCircle2} boxSize={12} color="var(--color-profit)" />
              <Stack gap={1} textAlign="center">
                <Text className="inter-semibold" fontSize="xl" color="var(--cc-text)">
                  {result.inserted} {result.inserted === 1 ? "Trade" : "Trades"} importiert
                </Text>
                <Text fontSize="sm" color="var(--cc-text-2)">
                  {summaryLine(result)}
                </Text>
              </Stack>

              {result.unresolvedProducts.length > 0 && (
                <Alert status="warning" bg="rgba(253,224,71,0.1)" borderRadius="md" color="var(--cc-text)">
                  <AlertIcon color="#FDE047" />
                  <Text fontSize="sm">
                    Kein Punktwert für: {result.unresolvedProducts.join(", ")}. Diese Zeilen wurden übersprungen.
                  </Text>
                </Alert>
              )}

              <Button
                variant="gold"
                size="lg"
                w={{ base: "100%", md: "auto" }}
                whiteSpace="normal"
                onClick={() => {
                  close();
                  router.push("/trading-journal/dashboard");
                }}
              >
                Performance jetzt im Dashboard anschauen
              </Button>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<RefreshCw size={14} />}
                onClick={reset}
                color="var(--cc-text-2)"
              >
                Weitere Datei importieren
              </Button>
            </Stack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

function summaryLine(result: ImportResult): string {
  const parts = [`${result.tradeCount} Round-Trips erkannt`];
  if (result.skipped > 0) parts.push(`${result.skipped} bereits vorhanden`);
  if (result.openPositions > 0) {
    parts.push(`${result.openPositions} offene ${result.openPositions === 1 ? "Position" : "Positionen"} ignoriert`);
  }
  if (result.invalidRows > 0) parts.push(`${result.invalidRows} Zeilen unlesbar`);
  return `${parts.join(" · ")}.`;
}

function errorMessage(code: unknown, payload: { inserted?: number }): string {
  switch (code) {
    case "file_already_imported":
      return `Diese Datei wurde bereits importiert (${payload.inserted ?? 0} Trades). Exportiere einen neuen Zeitraum.`;
    case "no_filled_orders":
      return "In der Datei stehen keine ausgeführten Orders. Prüfe, ob du den Reiter „Orders“ exportiert hast.";
    case "empty_file":
      return "Die Datei ist leer.";
    case "file_too_large":
      return "Die Datei ist zu groß. Exportiere einen kürzeren Zeitraum.";
    case "paid_membership_required":
      return "Das Trading Journal ist Mitgliedern vorbehalten.";
    case "invalid_timezone":
      return "Ungültige Zeitzone.";
    default:
      return "Der Import ist fehlgeschlagen. Bitte versuch es erneut.";
  }
}
