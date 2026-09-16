"use client";

import {
  Alert,
  AlertIcon,
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
import {
  ADMIN_CARD_CLASS,
  AdminCardTitle,
  StatusPill,
  adminAlertIconColor,
  adminAlertProps,
  adminCardPadding,
  adminInputProps,
  adminSwitchSx,
} from "@/components/admin/adminUi";

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
    <Box className={ADMIN_CARD_CLASS} p={adminCardPadding}>
      <Stack gap={5}>
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
          <HStack gap={3}>
            <AdminCardTitle>Aktueller Status</AdminCardTitle>
            {enabled ? (
              <StatusPill tone="attention">Wartung aktiv</StatusPill>
            ) : (
              <StatusPill tone="success">Online</StatusPill>
            )}
          </HStack>
        </Flex>

        {updatedAt ? (
          <Text className="cc-num" fontSize="xs" color="var(--cc-text-3)">
            Zuletzt geändert: {new Date(updatedAt).toLocaleString("de-DE")}
          </Text>
        ) : null}

        {feedback ? (
          <Alert status={feedback.kind === "success" ? "success" : "error"} {...adminAlertProps(feedback.kind)}>
            <AlertIcon color={adminAlertIconColor(feedback.kind)} />
            <Text fontSize="sm">{feedback.msg}</Text>
          </Alert>
        ) : null}

        <FormControl display="flex" alignItems="center" justifyContent="space-between" gap={4}>
          <Box>
            <FormLabel htmlFor="maintenance-switch" mb={1} fontWeight={600} color="var(--cc-text)">
              Wartungsmodus aktiv
            </FormLabel>
            <Text fontSize="xs" color="var(--cc-text-2)">
              Wenn aktiv: alle Nutzer außer Admins werden auf /wartung umgeleitet.
            </Text>
          </Box>
          <Switch
            id="maintenance-switch"
            size="lg"
            sx={adminSwitchSx}
            isChecked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
        </FormControl>

        <FormControl>
          <FormLabel fontWeight={600} color="var(--cc-text)">
            Nachricht (optional)
          </FormLabel>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="z. B. Wir spielen gerade ein Update ein und sind in ca. 30 Minuten zurück."
            rows={4}
            {...adminInputProps}
          />
          <FormHelperText color="var(--cc-text-2)" fontSize="xs">
            Wird auf /wartung angezeigt. Leer = Standardtext.
          </FormHelperText>
        </FormControl>

        <Flex justify="flex-end" gap={3}>
          {dirty ? (
            <Text fontSize="xs" alignSelf="center" color="var(--cc-gold-light)">
              Ungespeicherte Aenderungen
            </Text>
          ) : null}
          <Button
            onClick={() => void save()}
            isLoading={saving}
            loadingText="Speichert"
            leftIcon={<Save size={14} />}
            variant="gold"
          >
            Übernehmen
          </Button>
        </Flex>
      </Stack>
    </Box>
  );
}
