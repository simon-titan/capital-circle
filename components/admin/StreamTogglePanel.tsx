"use client";

import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Code,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  IconButton,
  Input,
  OrderedList,
  ListItem,
  Stack,
  Switch,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import { Copy, ExternalLink, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export type AdminStreamSettings = {
  isLive: boolean;
  streamId: string;
  title: string;
  startedAt: string | null;
  updatedAt: string | null;
};

type Props = {
  initial: AdminStreamSettings;
};

/* v3.2 „Champagner auf Graphit“ (DESIGN.md) — Admin-Formular und Status */
const fieldSx = {
  bg: "rgba(255, 255, 255, 0.03)",
  border: "1px solid",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  color: "var(--cc-text)",
  _placeholder: { color: "var(--cc-text-3)" },
  _hover: { borderColor: "rgba(255, 255, 255, 0.22)" },
  _focusVisible: { borderColor: "var(--cc-gold-line)", boxShadow: "0 0 0 1px var(--cc-gold-line)" },
} as const;

const switchSx = {
  ".chakra-switch__track": { bg: "var(--cc-track)" },
  ".chakra-switch__track[data-checked]": { bg: "var(--cc-gold)" },
} as const;

/** Kartentitel im Label-Schnitt (13px, versal, gesperrt). */
const cardTitleSx = {
  fontSize: "13px",
  lineHeight: "18px",
  fontWeight: 500,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--cc-text-soft)",
} as const;

const pillSx = {
  display: "inline-flex",
  alignItems: "center",
  px: 2.5,
  py: 1,
  borderRadius: "full",
  fontSize: "11px",
  fontWeight: 500,
  textTransform: "none",
  letterSpacing: "0.02em",
} as const;

const ghostIconSx = {
  variant: "ghost",
  color: "var(--cc-text-2)",
  _hover: { bg: "rgba(255, 255, 255, 0.06)", color: "var(--cc-text)" },
} as const;

const codeSx = {
  className: "cc-num",
  bg: "rgba(255, 255, 255, 0.06)",
  color: "var(--cc-text-soft)",
  borderRadius: "6px",
  px: 1.5,
} as const;

const RTMPS_URL = "rtmps://live.cloudflare.com:443/live/";

/**
 * Admin-Panel fuer den Free-Live-Stream.
 * - Toggle is_live
 * - Cloudflare Video-UID + Titel setzen
 * - OBS/RTMP-Anleitung als Accordion
 */
export function StreamTogglePanel({ initial }: Props) {
  const [isLive, setIsLive] = useState<boolean>(initial.isLive);
  const [streamId, setStreamId] = useState<string>(initial.streamId);
  const [title, setTitle] = useState<string>(initial.title);
  const [startedAt, setStartedAt] = useState<string | null>(initial.startedAt);
  const [updatedAt, setUpdatedAt] = useState<string | null>(initial.updatedAt);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; msg: string } | null>(null);

  // Dirty-Check: wir zeigen "ungespeichert" an, wenn User editiert hat.
  const dirty = useMemo(
    () =>
      isLive !== initial.isLive ||
      streamId.trim() !== initial.streamId.trim() ||
      title.trim() !== initial.title.trim(),
    [isLive, streamId, title, initial],
  );

  // Feedback nach 4s ausblenden.
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  const save = useCallback(async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/stream/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          isLive,
          streamId: streamId.trim(),
          title: title.trim(),
        }),
      });
      const json = (await res.json()) as
        | { ok: true; status: { isLive: boolean; streamId: string | null; title: string; startedAt: string | null; updatedAt: string | null } }
        | { ok: false; error: string };

      if (!res.ok || !("ok" in json) || json.ok !== true) {
        const errMsg = "ok" in json && json.ok === false ? json.error : `Fehler ${res.status}`;
        setFeedback({ kind: "error", msg: errMsg });
        return;
      }

      setIsLive(json.status.isLive);
      setStreamId(json.status.streamId ?? "");
      setTitle(json.status.title);
      setStartedAt(json.status.startedAt);
      setUpdatedAt(json.status.updatedAt);
      setFeedback({ kind: "success", msg: "Einstellungen gespeichert." });
    } catch (e) {
      setFeedback({ kind: "error", msg: e instanceof Error ? e.message : "Unbekannter Fehler" });
    } finally {
      setSaving(false);
    }
  }, [isLive, streamId, title]);

  const copyToClipboard = useCallback(async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback({ kind: "success", msg: `${label} kopiert.` });
    } catch {
      setFeedback({ kind: "error", msg: "Kopieren fehlgeschlagen." });
    }
  }, []);

  const statusBadge = isLive ? (
    <Badge {...pillSx} bg="rgba(212, 176, 128, 0.12)" color="var(--cc-gold-light)" className="cc-num">
      <Box
        as="span"
        w="6px"
        h="6px"
        mr={1.5}
        borderRadius="full"
        bg="var(--cc-gold-light)"
        boxShadow="0 0 8px rgba(232, 192, 148, 0.6)"
        flexShrink={0}
        aria-hidden
      />
      Live{startedAt ? ` • seit ${formatSince(startedAt)}` : ""}
    </Badge>
  ) : (
    <Badge {...pillSx} bg="rgba(255, 255, 255, 0.06)" color="var(--cc-text-2)">
      Offline
    </Badge>
  );

  return (
    <Stack gap={6}>
      {/* Status-Karte */}
      <Box className="cc-card cc-card--still" p={{ base: 5, md: 6 }}>
        <Stack gap={5}>
          <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
            <HStack gap={3}>
              <Text as="h2" {...cardTitleSx}>
                Aktueller Status
              </Text>
              {statusBadge}
            </HStack>
            <Button
              as="a"
              href="/stream"
              target="_blank"
              rel="noopener noreferrer"
              variant="line"
              size="sm"
              leftIcon={<ExternalLink size={14} />}
            >
              Free-Ansicht öffnen
            </Button>
          </Flex>

          {updatedAt ? (
            <Text fontSize="xs" color="var(--cc-text-3)" className="cc-num">
              Zuletzt geändert: {new Date(updatedAt).toLocaleString("de-DE")}
            </Text>
          ) : null}

          {feedback ? (
            <Alert
              status={feedback.kind === "success" ? "success" : "error"}
              variant="subtle"
              borderRadius="8px"
              bg={feedback.kind === "success" ? "rgba(74, 222, 128, 0.1)" : "rgba(248, 113, 113, 0.1)"}
              color="var(--cc-text)"
            >
              <AlertIcon color={feedback.kind === "success" ? "var(--cc-success)" : "var(--cc-danger)"} />
              <Text fontSize="sm">{feedback.msg}</Text>
            </Alert>
          ) : null}

          {/* Toggle */}
          <FormControl display="flex" alignItems="center" justifyContent="space-between" gap={4}>
            <Box>
              <FormLabel htmlFor="stream-live-switch" mb={1} fontSize="sm" fontWeight={600} color="var(--cc-text)">
                Free-Streaming aktiv
              </FormLabel>
              <Text fontSize="xs" color="var(--cc-text-2)">
                Wenn aktiv: Free-Mitglieder sehen den Stream auf /stream (Polling-Delay bis 15 s).
              </Text>
            </Box>
            <Switch
              id="stream-live-switch"
              size="lg"
              sx={switchSx}
              isChecked={isLive}
              onChange={(e) => setIsLive(e.target.checked)}
            />
          </FormControl>

          {/* Titel */}
          <FormControl>
            <FormLabel fontSize="sm" fontWeight={600} color="var(--cc-text)">
              Titel
            </FormLabel>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z. B. Live: NFP-Reaktion"
              {...fieldSx}
            />
            <FormHelperText color="var(--cc-text-2)" fontSize="xs">
              Wird den Free-Usern als Chip über dem Player angezeigt.
            </FormHelperText>
          </FormControl>

          {/* Video-UID */}
          <FormControl isInvalid={isLive && streamId.trim().length === 0}>
            <FormLabel fontSize="sm" fontWeight={600} color="var(--cc-text)">
              Cloudflare Video-UID
            </FormLabel>
            <HStack gap={2}>
              <Input
                value={streamId}
                onChange={(e) => setStreamId(e.target.value)}
                placeholder="z. B. 31c9291ab41fac05471db4e73aa11717"
                className="cc-num"
                {...fieldSx}
                _invalid={{ borderColor: "var(--cc-danger)", boxShadow: "0 0 0 1px var(--cc-danger)" }}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
              />
              <Tooltip label="UID kopieren" hasArrow bg="var(--cc-surface-2)" color="var(--cc-text)">
                <IconButton
                  aria-label="UID kopieren"
                  icon={<Copy size={14} />}
                  {...ghostIconSx}
                  onClick={() => copyToClipboard(streamId.trim(), "Video-UID")}
                  isDisabled={streamId.trim().length === 0}
                />
              </Tooltip>
            </HStack>
            <FormHelperText color="var(--cc-text-2)" fontSize="xs">
              Das ist die <b>Output-Video-UID</b> des Cloudflare Live-Inputs (nicht der Stream-Key).
              Im Cloudflare-Dashboard zu finden unter <i>Stream → Live Inputs → [dein Input] → Video UID</i>.
            </FormHelperText>
          </FormControl>

          {/* Save */}
          <Flex justify="flex-end" gap={3}>
            {dirty ? (
              <Text fontSize="xs" alignSelf="center" color="var(--cc-gold-light)">
                Ungespeicherte Aenderungen
              </Text>
            ) : null}
            <Button
              onClick={save}
              isLoading={saving}
              loadingText="Speichert"
              leftIcon={<Save size={14} />}
              variant="gold"
              isDisabled={isLive && streamId.trim().length === 0}
            >
              Übernehmen
            </Button>
          </Flex>
        </Stack>
      </Box>

      {/* OBS-Setup Accordion */}
      <Box className="cc-card cc-card--still">
        <Accordion allowToggle>
          <AccordionItem border="none">
            <h2>
              <AccordionButton
                px={{ base: 5, md: 6 }}
                py={4}
                borderRadius="12px"
                _hover={{ bg: "rgba(255, 255, 255, 0.03)" }}
              >
                <Box flex="1" textAlign="left">
                  <Text as="span" display="block" {...cardTitleSx}>
                    OBS / RTMPS einrichten
                  </Text>
                  <Text as="span" display="block" fontSize="xs" color="var(--cc-text-2)" mt={1}>
                    Kurzanleitung für OBS Studio mit Cloudflare Stream.
                  </Text>
                </Box>
                <AccordionIcon color="var(--cc-gold-light)" />
              </AccordionButton>
            </h2>
            <AccordionPanel px={{ base: 5, md: 6 }} pb={6}>
              <Stack gap={5} fontSize="sm" color="var(--cc-text-soft)">
                <OrderedList spacing={3} pl={5}>
                  <ListItem>
                    <Text>
                      Im Cloudflare-Dashboard <b>Stream → Live Inputs → Create Live Input</b> anlegen.
                      Modus auf <b>RTMPS</b> stellen. Cloudflare zeigt dann drei Werte:
                    </Text>
                    <Stack gap={2} mt={3} pl={1}>
                      <LabelCopyRow label="RTMPS-URL" value={RTMPS_URL} onCopy={copyToClipboard} />
                      <Text fontSize="xs" color="var(--cc-text-2)">
                        <b>Stream-Key</b>: geheimer Token (wird in OBS eingetragen). Niemals an Nutzer weitergeben.
                      </Text>
                      <Text fontSize="xs" color="var(--cc-text-2)">
                        <b>Video-UID</b>: oeffentliche ID des Live-Outputs (wird oben im Panel eingetragen).
                      </Text>
                    </Stack>
                  </ListItem>

                  <ListItem>
                    <Text>
                      In OBS: <b>Einstellungen → Stream</b>:
                    </Text>
                    <Stack gap={1} mt={2} pl={1} fontSize="xs">
                      <Text>
                        Dienst: <Code {...codeSx}>Custom...</Code>
                      </Text>
                      <Text>
                        Server: <Code {...codeSx}>{RTMPS_URL}</Code>
                      </Text>
                      <Text>
                        Stream-Schluessel: der geheime Key aus Cloudflare (nicht die Video-UID).
                      </Text>
                    </Stack>
                    <Text mt={2} fontSize="xs" color="var(--cc-text-2)" className="cc-num">
                      Empfohlene Ausgabe: 1080p / 30 fps / 4500–6000 kbps (x264, keyframe interval 2 s).
                    </Text>
                  </ListItem>

                  <ListItem>
                    <Text>
                      Zurück im Panel oben:
                    </Text>
                    <Stack gap={1} mt={2} pl={1} fontSize="xs">
                      <Text>• <b>Titel</b> eintragen (z. B. „Live: NFP-Reaktion“).</Text>
                      <Text>• <b>Video-UID</b> aus Cloudflare einfuegen.</Text>
                      <Text>• Schalter <b>„Free-Streaming aktiv“</b> auf EIN.</Text>
                      <Text>• <b>Übernehmen</b> klicken.</Text>
                      <Text>• In OBS <b>„Streaming starten“</b>.</Text>
                    </Stack>
                    <Text mt={2} fontSize="xs" color="var(--cc-text-2)">
                      Free-User sehen den Stream innerhalb von 15 s automatisch (Polling-Intervall).
                    </Text>
                  </ListItem>

                  <ListItem>
                    <Text>
                      Nach dem Stream: Schalter AUS → Free-User sehen wieder den Offline-Zustand.
                      Cloudflare speichert die Aufzeichnung automatisch (kann später manuell ins Replay-Archiv
                      importiert werden).
                    </Text>
                  </ListItem>
                </OrderedList>

                <Alert
                  status="info"
                  variant="subtle"
                  borderRadius="8px"
                  bg="rgba(255, 255, 255, 0.03)"
                  border="1px solid var(--cc-line)"
                  color="var(--cc-text)"
                >
                  <AlertIcon color="var(--cc-text-2)" />
                  <Box>
                    <Text fontSize="sm" fontWeight={600} mb={1}>
                      Env-Variable gesetzt?
                    </Text>
                    <Text fontSize="xs" color="var(--cc-text-2)">
                      Der Free-Player braucht <Code {...codeSx} fontSize="xs">NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN</Code>
                      {" "}
                      (Format <Code {...codeSx} fontSize="xs">customer-&lt;hash&gt;</Code>). Ohne diesen Wert erscheint statt
                      des Players ein Hinweis an die Nutzer.
                    </Text>
                  </Box>
                </Alert>
              </Stack>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </Box>
    </Stack>
  );
}

function LabelCopyRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (value: string, label: string) => void;
}) {
  return (
    <Flex align="center" gap={2} flexWrap="wrap">
      <Text fontSize="xs" color="var(--cc-text-2)">
        {label}:
      </Text>
      <Code {...codeSx} fontSize="xs" px={2} py={1}>
        {value}
      </Code>
      <Tooltip label={`${label} kopieren`} hasArrow bg="var(--cc-surface-2)" color="var(--cc-text)">
        <IconButton
          aria-label={`${label} kopieren`}
          icon={<Copy size={12} />}
          size="xs"
          {...ghostIconSx}
          onClick={() => onCopy(value, label)}
        />
      </Tooltip>
    </Flex>
  );
}

/** Kurze „seit HH:MM Uhr“-Anzeige fuer das Status-Badge. */
function formatSince(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "?";
  return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}
