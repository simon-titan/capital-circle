"use client";

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { History, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  AdminLabel,
  StatusPill,
  adminAlertIconColor,
  adminAlertProps,
  adminFormLabelProps,
  adminInputProps,
  adminInsetProps,
  adminModalHeaderProps,
  adminModalProps,
  adminOptionStyle,
  adminOverlayProps,
  type AdminTone,
} from "@/components/admin/adminUi";

export type Tier = "free" | "monthly" | "lifetime" | "ht_1on1";

const TIER_LABELS: Record<Tier, string> = {
  free: "Free",
  monthly: "Monthly (99 €)",
  lifetime: "Lifetime",
  ht_1on1: "High-Ticket 1on1",
};

/** Bezahlte Dauer-Tiers in Champagner, alles andere neutral — keine Zusatzfarben. */
const TIER_TONE: Record<Tier, AdminTone> = {
  free: "neutral",
  monthly: "neutral",
  lifetime: "attention",
  ht_1on1: "attention",
};

interface AuditItem {
  id: string;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  adminId: string | null;
  adminName: string | null;
}

interface CurrentSnapshot {
  membership_tier: Tier;
  access_until: string | null;
  is_paid: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    email: string;
    fullName: string | null;
  } | null;
  initial: CurrentSnapshot | null;
  onSaved?: (next: CurrentSnapshot) => void;
}

const dateFmt = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

function toLocalDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // YYYY-MM-DD
  const tz = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export function UserTierOverrideModal({
  isOpen,
  onClose,
  user,
  initial,
  onSaved,
}: Props) {
  const [tier, setTier] = useState<Tier>("free");
  const [accessUntil, setAccessUntil] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [auditLoading, setAuditLoading] = useState(false);
  const [audit, setAudit] = useState<AuditItem[]>([]);

  // Reset bei User-Wechsel oder Open
  useEffect(() => {
    if (!isOpen || !initial) return;
    setTier(initial.membership_tier);
    setAccessUntil(toLocalDateInput(initial.access_until));
    setError(null);
  }, [isOpen, initial]);

  const loadAudit = useCallback(async () => {
    if (!user) return;
    setAuditLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/audit-log?limit=20`);
      const json = (await res.json()) as
        | { ok: true; items: AuditItem[] }
        | { ok: false; error: string };
      if ("ok" in json && json.ok) {
        setAudit(json.items);
      }
    } finally {
      setAuditLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) void loadAudit();
  }, [isOpen, user, loadAudit]);

  if (!user) return null;

  const dirty =
    initial !== null &&
    (tier !== initial.membership_tier ||
      accessUntil !== toLocalDateInput(initial.access_until));

  async function save() {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const body: { membership_tier: Tier; access_until?: string | null } = {
        membership_tier: tier,
      };
      body.access_until = accessUntil ? new Date(accessUntil).toISOString() : null;

      const res = await fetch(`/api/admin/users/${user.id}/tier`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as
        | {
            ok: true;
            user: {
              membership_tier: Tier;
              is_paid: boolean;
              access_until: string | null;
            };
          }
        | { ok: false; error: string };

      if (!res.ok || !("ok" in json) || !json.ok) {
        const msg =
          (json as { error?: string }).error ?? "Speichern fehlgeschlagen.";
        setError(msg);
        return;
      }
      onSaved?.({
        membership_tier: json.user.membership_tier,
        is_paid: json.user.is_paid,
        access_until: json.user.access_until,
      });
      void loadAudit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Netzwerkfehler.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="2xl" scrollBehavior="inside">
      <ModalOverlay {...adminOverlayProps} />
      <ModalContent {...adminModalProps}>
        <ModalHeader {...adminModalHeaderProps}>
          <HStack spacing={2}>
            <Box color="var(--cc-gold-light)">
              <ShieldCheck size={18} strokeWidth={1.75} />
            </Box>
            <Text>Tier-Override</Text>
          </HStack>
          <Text fontSize="sm" fontWeight={400} color="var(--cc-text-2)" mt={1}>
            {user.fullName ?? user.email}
          </Text>
        </ModalHeader>
        <ModalCloseButton color="var(--cc-text-2)" />

        <ModalBody>
          <Stack spacing={6}>
            {initial ? (
              <HStack spacing={3} flexWrap="wrap">
                <Text fontSize="xs" color="var(--cc-text-2)">
                  Aktuell:
                </Text>
                <TierBadge tier={initial.membership_tier} />
                {initial.access_until ? (
                  <Text fontSize="xs" className="cc-num" color="var(--cc-text-2)">
                    bis {dateFmt.format(new Date(initial.access_until))}
                  </Text>
                ) : (
                  <Text fontSize="xs" color="var(--cc-text-2)">
                    kein Ablaufdatum
                  </Text>
                )}
              </HStack>
            ) : null}

            <Stack spacing={4} direction={{ base: "column", md: "row" }}>
              <FormControl flex={1}>
                <FormLabel {...adminFormLabelProps}>Neuer Tier</FormLabel>
                <Select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as Tier)}
                  {...adminInputProps}
                >
                  {(Object.keys(TIER_LABELS) as Tier[]).map((t) => (
                    <option key={t} value={t} style={adminOptionStyle}>
                      {TIER_LABELS[t]}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl flex={1}>
                <FormLabel {...adminFormLabelProps}>access_until (optional)</FormLabel>
                <Input
                  type="date"
                  value={accessUntil}
                  onChange={(e) => setAccessUntil(e.target.value)}
                  className="cc-num"
                  {...adminInputProps}
                />
                <FormHelperText fontSize="xs" color="var(--cc-text-2)">
                  Leer lassen → Zugriff unbefristet (bis Tier sich ändert).
                </FormHelperText>
              </FormControl>
            </Stack>

            <Alert status="info" variant="subtle" {...adminAlertProps("warning")} alignItems="flex-start">
              <AlertIcon color={adminAlertIconColor("warning")} />
              <Text>
                Speichern setzt zusätzlich <b>is_paid = {tier === "free" ? "false" : "true"}</b>.
                Aktion wird im Audit-Log gespeichert.
              </Text>
            </Alert>

            {error ? (
              <Alert status="error" {...adminAlertProps("error")}>
                <AlertIcon color={adminAlertIconColor("error")} />
                <Text fontSize="sm">{error}</Text>
              </Alert>
            ) : null}

            <Divider borderColor="var(--cc-line)" />

            <Stack spacing={3}>
              <HStack spacing={2} color="var(--cc-text-2)">
                <History size={14} />
                <AdminLabel>Audit-Log</AdminLabel>
              </HStack>

              {auditLoading ? (
                <HStack py={4} justify="center">
                  <Spinner size="sm" color="var(--cc-gold)" />
                </HStack>
              ) : audit.length === 0 ? (
                <Text fontSize="xs" color="var(--cc-text-2)">
                  Keine bisherigen Admin-Änderungen für diesen User.
                </Text>
              ) : (
                <Stack spacing={2}>
                  {audit.map((a) => (
                    <Box key={a.id} {...adminInsetProps} borderRadius="8px" p={3}>
                      <HStack justify="space-between" mb={1} flexWrap="wrap">
                        <Text fontSize="xs" color="var(--cc-text)">
                          <b>{a.action}</b>
                          {a.field ? ` · ${a.field}` : ""}
                        </Text>
                        <Text fontSize="11px" color="var(--cc-text-2)" className="cc-num">
                          {dateFmt.format(new Date(a.createdAt))}
                        </Text>
                      </HStack>
                      <Text fontSize="xs" color="var(--cc-text-2)">
                        {a.oldValue ?? "—"} →{" "}
                        <Box as="b" color="var(--cc-text)" fontWeight={600}>
                          {a.newValue ?? "—"}
                        </Box>
                        {a.adminName ? ` · durch ${a.adminName}` : ""}
                      </Text>
                    </Box>
                  ))}
                </Stack>
              )}
            </Stack>
          </Stack>
        </ModalBody>

        <ModalFooter gap={2}>
          <Button variant="ghost" color="var(--cc-text-2)" onClick={onClose}>
            Schließen
          </Button>
          <Button
            variant="gold"
            onClick={() => void save()}
            isLoading={saving}
            isDisabled={!dirty}
          >
            Tier speichern
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function TierBadge({ tier }: { tier: Tier }) {
  return <StatusPill tone={TIER_TONE[tier]}>{TIER_LABELS[tier]}</StatusPill>;
}
