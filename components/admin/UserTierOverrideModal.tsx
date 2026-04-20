"use client";

import {
  Alert,
  AlertIcon,
  Badge,
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

export type Tier = "free" | "monthly" | "lifetime" | "ht_1on1";

const TIER_LABELS: Record<Tier, string> = {
  free: "Free",
  monthly: "Monthly (97 €)",
  lifetime: "Lifetime",
  ht_1on1: "High-Ticket 1on1",
};

const TIER_BADGE: Record<Tier, { bg: string; color: string; border: string }> = {
  free: { bg: "rgba(255,255,255,0.06)", color: "#9A9AA4", border: "rgba(255,255,255,0.10)" },
  monthly: { bg: "rgba(212,175,55,0.10)", color: "#E8C547", border: "rgba(212,175,55,0.22)" },
  lifetime: { bg: "rgba(212,175,55,0.18)", color: "#FFD66B", border: "rgba(212,175,55,0.40)" },
  ht_1on1: { bg: "rgba(132,82,255,0.14)", color: "#C4B5FD", border: "rgba(132,82,255,0.40)" },
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
      <ModalOverlay backdropFilter="blur(8px)" bg="rgba(0,0,0,0.7)" />
      <ModalContent
        bg="rgba(10,11,14,0.97)"
        border="1px solid rgba(255,255,255,0.09)"
        borderRadius="20px"
        color="var(--color-text-primary)"
      >
        <ModalHeader className="radley-regular" fontWeight={400}>
          <HStack spacing={2}>
            <Box color="var(--color-accent-gold-light, #E8C547)">
              <ShieldCheck size={18} />
            </Box>
            <Text>Tier-Override</Text>
          </HStack>
          <Text fontSize="sm" color="var(--color-text-secondary)" className="inter" mt={1}>
            {user.fullName ?? user.email}
          </Text>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <Stack spacing={6}>
            {initial ? (
              <HStack spacing={3} flexWrap="wrap">
                <Text fontSize="xs" color="var(--color-text-secondary)" className="inter">
                  Aktuell:
                </Text>
                <TierBadge tier={initial.membership_tier} />
                {initial.access_until ? (
                  <Text fontSize="xs" className="jetbrains-mono" color="var(--color-text-secondary)">
                    bis {dateFmt.format(new Date(initial.access_until))}
                  </Text>
                ) : (
                  <Text fontSize="xs" color="var(--color-text-secondary)" className="inter">
                    kein Ablaufdatum
                  </Text>
                )}
              </HStack>
            ) : null}

            <Stack spacing={4} direction={{ base: "column", md: "row" }}>
              <FormControl flex={1}>
                <FormLabel
                  fontSize="xs"
                  textTransform="uppercase"
                  letterSpacing="0.07em"
                  color="gray.300"
                  className="inter"
                >
                  Neuer Tier
                </FormLabel>
                <Select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as Tier)}
                  bg="rgba(255,255,255,0.04)"
                  borderColor="rgba(255,255,255,0.12)"
                  color="var(--color-text-primary)"
                  className="inter"
                >
                  {(Object.keys(TIER_LABELS) as Tier[]).map((t) => (
                    <option key={t} value={t} style={{ background: "#0c0d10" }}>
                      {TIER_LABELS[t]}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl flex={1}>
                <FormLabel
                  fontSize="xs"
                  textTransform="uppercase"
                  letterSpacing="0.07em"
                  color="gray.300"
                  className="inter"
                >
                  access_until (optional)
                </FormLabel>
                <Input
                  type="date"
                  value={accessUntil}
                  onChange={(e) => setAccessUntil(e.target.value)}
                  bg="rgba(255,255,255,0.04)"
                  borderColor="rgba(255,255,255,0.12)"
                  color="var(--color-text-primary)"
                  className="inter"
                />
                <FormHelperText fontSize="xs" color="var(--color-text-secondary)" className="inter">
                  Leer lassen → Zugriff unbefristet (bis Tier sich ändert).
                </FormHelperText>
              </FormControl>
            </Stack>

            <Alert
              status="info"
              variant="subtle"
              bg="rgba(212,175,55,0.06)"
              borderRadius="10px"
              border="1px solid rgba(212,175,55,0.18)"
              fontSize="sm"
              className="inter"
              alignItems="flex-start"
            >
              <AlertIcon color="var(--color-accent-gold-light, #E8C547)" />
              <Text>
                Speichern setzt zusätzlich <b>is_paid = {tier === "free" ? "false" : "true"}</b>.
                Aktion wird im Audit-Log gespeichert.
              </Text>
            </Alert>

            {error ? (
              <Alert status="error" bg="rgba(229,72,77,0.10)" borderRadius="10px">
                <AlertIcon />
                <Text fontSize="sm" className="inter">{error}</Text>
              </Alert>
            ) : null}

            <Divider borderColor="rgba(255,255,255,0.07)" />

            <Stack spacing={3}>
              <HStack spacing={2}>
                <Box color="var(--color-text-secondary)">
                  <History size={14} />
                </Box>
                <Text
                  fontSize="11px"
                  letterSpacing="0.08em"
                  textTransform="uppercase"
                  color="var(--color-text-secondary)"
                  className="inter"
                >
                  Audit-Log
                </Text>
              </HStack>

              {auditLoading ? (
                <HStack py={4} justify="center">
                  <Spinner size="sm" color="var(--color-accent-gold)" />
                </HStack>
              ) : audit.length === 0 ? (
                <Text fontSize="xs" color="var(--color-text-secondary)" className="inter">
                  Keine bisherigen Admin-Änderungen für diesen User.
                </Text>
              ) : (
                <Stack spacing={2}>
                  {audit.map((a) => (
                    <Box
                      key={a.id}
                      borderRadius="8px"
                      border="1px solid rgba(255,255,255,0.06)"
                      bg="rgba(255,255,255,0.02)"
                      p={3}
                    >
                      <HStack justify="space-between" mb={1} flexWrap="wrap">
                        <Text fontSize="xs" color="var(--color-text-primary)" className="inter">
                          <b>{a.action}</b>
                          {a.field ? ` · ${a.field}` : ""}
                        </Text>
                        <Text fontSize="11px" color="var(--color-text-secondary)" className="jetbrains-mono">
                          {dateFmt.format(new Date(a.createdAt))}
                        </Text>
                      </HStack>
                      <Text fontSize="xs" color="var(--color-text-secondary)" className="inter">
                        {a.oldValue ?? "—"} → <b style={{ color: "#E8C547" }}>{a.newValue ?? "—"}</b>
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
          <Button variant="ghost" onClick={onClose} className="inter">
            Schließen
          </Button>
          <Button
            onClick={() => void save()}
            isLoading={saving}
            isDisabled={!dirty}
            bg="linear-gradient(135deg, #D4AF37 0%, #A67C00 100%)"
            color="#0a0a0a"
            _hover={{ filter: "brightness(1.06)" }}
            className="inter-semibold"
          >
            Tier speichern
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function TierBadge({ tier }: { tier: Tier }) {
  const v = TIER_BADGE[tier];
  return (
    <Badge
      bg={v.bg}
      color={v.color}
      border={`1px solid ${v.border}`}
      borderRadius="6px"
      fontSize="11px"
      px={2}
      py={0.5}
      className="inter"
      textTransform="none"
    >
      {TIER_LABELS[tier]}
    </Badge>
  );
}
