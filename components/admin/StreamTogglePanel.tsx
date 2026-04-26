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
    <Badge
      variant="subtle"
      colorScheme="green"
      px={3}
      py={1}
      borderRadius="full"
      className="inter-semibold"
      fontSize="xs"
      textTransform="uppercase"
      letterSpacing="0.08em"
    >
      Live{startedAt ? ` • seit ${formatSince(startedAt)}` : ""}
    </Badge>
  ) : (
    <Badge
      variant="subtle"
      colorScheme="gray"
      px={3}
      py={1}
      borderRadius="full"
      className="inter-semibold"
      fontSize="xs"
      textTransform="uppercase"
      letterSpacing="0.08em"
    >
      Offline
    </Badge>
  );

  return (
    <Stack gap={6}>
      {/* Status-Karte */}
      <Box
        borderRadius="16px"
        borderWidth="1px"
        borderColor="var(--color-border-default)"
        bg="rgba(15, 18, 24, 0.7)"
        backdropFilter="blur(16px)"
        p={{ base: 5, md: 6 }}
      >
        <Stack gap={5}>
          <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
            <HStack gap={3}>
              <Text className="radley-regular" fontSize="lg" color="whiteAlpha.950">
                Aktueller Status
              </Text>
              {statusBadge}
            </HStack>
            <Button
              as="a"
              href="/stream"
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
              size="sm"
              borderColor="rgba(255,255,255,0.18)"
              color="whiteAlpha.800"
              _hover={{ bg: "rgba(255,255,255,0.06)" }}
              leftIcon={<ExternalLink size={14} />}
            >
              Free-Ansicht oeffnen
            </Button>
          </Flex>

          {updatedAt ? (
            <Text fontSize="xs" color="var(--color-text-tertiary)" className="inter">
              Zuletzt geaendert: {new Date(updatedAt).toLocaleString("de-DE")}
            </Text>
          ) : null}

          {feedback ? (
            <Alert
              status={feedback.kind === "success" ? "success" : "error"}
              borderRadius="md"
              variant="left-accent"
            >
              <AlertIcon />
              <Text fontSize="sm" className="inter">
                {feedback.msg}
              </Text>
            </Alert>
          ) : null}

          {/* Toggle */}
          <FormControl display="flex" alignItems="center" justifyContent="space-between" gap={4}>
            <Box>
              <FormLabel htmlFor="stream-live-switch" mb={1} className="inter-semibold" color="whiteAlpha.900">
                Free-Streaming aktiv
              </FormLabel>
              <Text fontSize="xs" color="var(--color-text-muted)" className="inter">
                Wenn aktiv: Free-Mitglieder sehen den Stream auf /stream (Polling-Delay bis 15 s).
              </Text>
            </Box>
            <Switch
              id="stream-live-switch"
              size="lg"
              colorScheme="green"
              isChecked={isLive}
              onChange={(e) => setIsLive(e.target.checked)}
            />
          </FormControl>

          {/* Titel */}
          <FormControl>
            <FormLabel className="inter-semibold" color="whiteAlpha.900">
              Titel
            </FormLabel>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z. B. Live: NFP-Reaktion"
              className="inter"
              bg="rgba(0,0,0,0.3)"
              borderColor="var(--color-border-default)"
              color="whiteAlpha.950"
              _placeholder={{ color: "whiteAlpha.400" }}
            />
            <FormHelperText color="var(--color-text-muted)" className="inter" fontSize="xs">
              Wird den Free-Usern als Chip ueber dem Player angezeigt.
            </FormHelperText>
          </FormControl>

          {/* Video-UID */}
          <FormControl isInvalid={isLive && streamId.trim().length === 0}>
            <FormLabel className="inter-semibold" color="whiteAlpha.900">
              Cloudflare Video-UID
            </FormLabel>
            <HStack gap={2}>
              <Input
                value={streamId}
                onChange={(e) => setStreamId(e.target.value)}
                placeholder="z. B. 31c9291ab41fac05471db4e73aa11717"
                className="jetbrains-mono"
                bg="rgba(0,0,0,0.3)"
                borderColor="var(--color-border-default)"
                color="whiteAlpha.950"
                _placeholder={{ color: "whiteAlpha.400" }}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
              />
              <Tooltip label="UID kopieren" hasArrow>
                <IconButton
                  aria-label="UID kopieren"
                  icon={<Copy size={14} />}
                  variant="ghost"
                  color="whiteAlpha.800"
                  onClick={() => copyToClipboard(streamId.trim(), "Video-UID")}
                  isDisabled={streamId.trim().length === 0}
                />
              </Tooltip>
            </HStack>
            <FormHelperText color="var(--color-text-muted)" className="inter" fontSize="xs">
              Das ist die <b>Output-Video-UID</b> des Cloudflare Live-Inputs (nicht der Stream-Key).
              Im Cloudflare-Dashboard zu finden unter <i>Stream → Live Inputs → [dein Input] → Video UID</i>.
            </FormHelperText>
          </FormControl>

          {/* Save */}
          <Flex justify="flex-end" gap={3}>
            {dirty ? (
              <Text fontSize="xs" alignSelf="center" color="rgba(234, 179, 8, 0.9)" className="inter">
                Ungespeicherte Aenderungen
              </Text>
            ) : null}
            <Button
              onClick={save}
              isLoading={saving}
              loadingText="Speichert"
              leftIcon={<Save size={14} />}
              colorScheme="green"
              variant="solid"
              isDisabled={isLive && streamId.trim().length === 0}
            >
              Uebernehmen
            </Button>
          </Flex>
        </Stack>
      </Box>

      {/* OBS-Setup Accordion */}
      <Box
        borderRadius="16px"
        borderWidth="1px"
        borderColor="var(--color-border-default)"
        bg="rgba(15, 18, 24, 0.6)"
        backdropFilter="blur(16px)"
        overflow="hidden"
      >
        <Accordion allowToggle>
          <AccordionItem border="none">
            <h2>
              <AccordionButton px={{ base: 5, md: 6 }} py={4} _hover={{ bg: "rgba(255,255,255,0.04)" }}>
                <Box flex="1" textAlign="left">
                  <Text className="radley-regular" fontSize="md" color="whiteAlpha.950">
                    OBS / RTMPS einrichten
                  </Text>
                  <Text fontSize="xs" color="var(--color-text-muted)" className="inter" mt={1}>
                    Kurzanleitung fuer OBS Studio mit Cloudflare Stream.
                  </Text>
                </Box>
                <AccordionIcon color="whiteAlpha.800" />
              </AccordionButton>
            </h2>
            <AccordionPanel px={{ base: 5, md: 6 }} pb={6}>
              <Stack gap={5} className="inter" fontSize="sm" color="whiteAlpha.850">
                <OrderedList spacing={3} pl={5}>
                  <ListItem>
                    <Text>
                      Im Cloudflare-Dashboard <b>Stream → Live Inputs → Create Live Input</b> anlegen.
                      Modus auf <b>RTMPS</b> stellen. Cloudflare zeigt dann drei Werte:
                    </Text>
                    <Stack gap={2} mt={3} pl={1}>
                      <LabelCopyRow label="RTMPS-URL" value={RTMPS_URL} onCopy={copyToClipboard} />
                      <Text fontSize="xs" color="var(--color-text-muted)">
                        <b>Stream-Key</b> — geheimer Token (wird in OBS eingetragen). Niemals an Nutzer weitergeben.
                      </Text>
                      <Text fontSize="xs" color="var(--color-text-muted)">
                        <b>Video-UID</b> — oeffentliche ID des Live-Outputs (wird oben im Panel eingetragen).
                      </Text>
                    </Stack>
                  </ListItem>

                  <ListItem>
                    <Text>
                      In OBS: <b>Einstellungen → Stream</b>:
                    </Text>
                    <Stack gap={1} mt={2} pl={1} fontSize="xs">
                      <Text>
                        Dienst: <Code colorScheme="gray">Custom...</Code>
                      </Text>
                      <Text>
                        Server: <Code colorScheme="gray">{RTMPS_URL}</Code>
                      </Text>
                      <Text>
                        Stream-Schluessel: der geheime Key aus Cloudflare (nicht die Video-UID).
                      </Text>
                    </Stack>
                    <Text mt={2} fontSize="xs" color="var(--color-text-muted)">
                      Empfohlene Ausgabe: 1080p / 30 fps / 4500–6000 kbps (x264, keyframe interval 2 s).
                    </Text>
                  </ListItem>

                  <ListItem>
                    <Text>
                      Zurueck im Panel oben:
                    </Text>
                    <Stack gap={1} mt={2} pl={1} fontSize="xs">
                      <Text>• <b>Titel</b> eintragen (z. B. „Live: NFP-Reaktion“).</Text>
                      <Text>• <b>Video-UID</b> aus Cloudflare einfuegen.</Text>
                      <Text>• Schalter <b>„Free-Streaming aktiv“</b> auf EIN.</Text>
                      <Text>• <b>Uebernehmen</b> klicken.</Text>
                      <Text>• In OBS <b>„Streaming starten“</b>.</Text>
                    </Stack>
                    <Text mt={2} fontSize="xs" color="var(--color-text-muted)">
                      Free-User sehen den Stream innerhalb von 15 s automatisch (Polling-Intervall).
                    </Text>
                  </ListItem>

                  <ListItem>
                    <Text>
                      Nach dem Stream: Schalter AUS → Free-User sehen wieder den Offline-Zustand.
                      Cloudflare speichert die Aufzeichnung automatisch (kann spaeter manuell ins Replay-Archiv
                      importiert werden).
                    </Text>
                  </ListItem>
                </OrderedList>

                <Alert status="info" borderRadius="md" variant="left-accent" bg="rgba(59,130,246,0.12)">
                  <AlertIcon />
                  <Box>
                    <Text fontSize="sm" className="inter-semibold" mb={1}>
                      Env-Variable gesetzt?
                    </Text>
                    <Text fontSize="xs" className="inter">
                      Der Free-Player braucht <Code fontSize="xs">NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN</Code>
                      {" "}
                      (Format <Code fontSize="xs">customer-&lt;hash&gt;</Code>). Ohne diesen Wert erscheint statt
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
      <Text fontSize="xs" color="var(--color-text-muted)">
        {label}:
      </Text>
      <Code fontSize="xs" px={2} py={1} borderRadius="md">
        {value}
      </Code>
      <Tooltip label={`${label} kopieren`} hasArrow>
        <IconButton
          aria-label={`${label} kopieren`}
          icon={<Copy size={12} />}
          size="xs"
          variant="ghost"
          color="whiteAlpha.800"
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
