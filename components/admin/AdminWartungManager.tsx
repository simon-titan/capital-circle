"use client";

import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Stack,
  Switch,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export type AdminMaintenanceSettings = {
  enabled: boolean;
  message: string;
  updatedAt: string | null;
};

type Props = {
  initial: AdminMaintenanceSettings;
};

export function AdminWartungManager({ initial }: Props) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [message, setMessage] = useState(initial.message);
  const [updatedAt, setUpdatedAt] = useState<string | null>(initial.updatedAt);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; msg: string } | null>(null);

  const dirty = useMemo(
    () => enabled !== initial.enabled || message.trim() !== initial.message.trim(),
    [enabled, message, initial],
  );

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  const save = useCallback(async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/settings/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ enabled, message: message.trim() }),
      });
      const json = (await res.json()) as
        | { ok: true; enabled: boolean; message: string; updatedAt: string | null }
        | { ok: false; error: string };

      if (!res.ok || !("ok" in json) || json.ok !== true) {
        const errMsg = "ok" in json && json.ok === false ? json.error : `Fehler ${res.status}`;
        setFeedback({ kind: "error", msg: errMsg });
        return;
      }

      setEnabled(json.enabled);
      setMessage(json.message);
      setUpdatedAt(json.updatedAt);
      setFeedback({ kind: "success", msg: "Einstellungen gespeichert." });
    } catch (e) {
      setFeedback({ kind: "error", msg: e instanceof Error ? e.message : "Unbekannter Fehler" });
    } finally {
      setSaving(false);
    }
  }, [enabled, message]);

  return (
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
            {enabled ? (
              <Badge
                variant="subtle"
                colorScheme="red"
                px={3}
                py={1}
                borderRadius="full"
                className="inter-semibold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="0.08em"
              >
                Wartung aktiv
              </Badge>
            ) : (
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
                Online
              </Badge>
            )}
          </HStack>
        </Flex>

        {updatedAt ? (
          <Text fontSize="xs" color="var(--color-text-tertiary)" className="inter">
            Zuletzt geaendert: {new Date(updatedAt).toLocaleString("de-DE")}
          </Text>
        ) : null}

        {feedback ? (
          <Alert status={feedback.kind === "success" ? "success" : "error"} borderRadius="md" variant="left-accent">
            <AlertIcon />
            <Text fontSize="sm" className="inter">
              {feedback.msg}
            </Text>
          </Alert>
        ) : null}

        <FormControl display="flex" alignItems="center" justifyContent="space-between" gap={4}>
          <Box>
            <FormLabel htmlFor="maintenance-switch" mb={1} className="inter-semibold" color="whiteAlpha.900">
              Wartungsmodus aktiv
            </FormLabel>
            <Text fontSize="xs" color="var(--color-text-muted)" className="inter">
              Wenn aktiv: alle Nutzer außer Admins werden auf /wartung umgeleitet.
            </Text>
          </Box>
          <Switch
            id="maintenance-switch"
            size="lg"
            colorScheme="red"
            isChecked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
        </FormControl>

        <FormControl>
          <FormLabel className="inter-semibold" color="whiteAlpha.900">
            Nachricht (optional)
          </FormLabel>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="z. B. Wir spielen gerade ein Update ein und sind in ca. 30 Minuten zurueck."
            className="inter"
            bg="rgba(0,0,0,0.3)"
            borderColor="var(--color-border-default)"
            color="whiteAlpha.950"
            _placeholder={{ color: "whiteAlpha.400" }}
            rows={4}
          />
          <FormHelperText color="var(--color-text-muted)" className="inter" fontSize="xs">
            Wird auf /wartung angezeigt. Leer = Standardtext.
          </FormHelperText>
        </FormControl>

        <Flex justify="flex-end" gap={3}>
          {dirty ? (
            <Text fontSize="xs" alignSelf="center" color="rgba(234, 179, 8, 0.9)" className="inter">
              Ungespeicherte Aenderungen
            </Text>
          ) : null}
          <Button
            onClick={() => void save()}
            isLoading={saving}
            loadingText="Speichert"
            leftIcon={<Save size={14} />}
            colorScheme="yellow"
            variant="solid"
          >
            Uebernehmen
          </Button>
        </Flex>
      </Stack>
    </Box>
  );
}
