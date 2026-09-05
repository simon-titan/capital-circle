"use client";

import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  HStack,
  IconButton,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  Tooltip,
  useToast,
} from "@chakra-ui/react";
import { Check, Pencil, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface PaymentIssue {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  is_paid: boolean;
  access_until: string | null;
  payment_failed_email_1_sent_at: string | null;
  payment_failed_email_2_sent_at: string | null;
  payment_failed_email_3_sent_at: string | null;
  dunning_admin_note: string | null;
  last_failed_amount_cents: number | null;
  last_failed_currency: string | null;
  last_failed_reason: string | null;
  last_failed_attempt_count: number | null;
  last_failed_at: string | null;
}

function formatAmount(cents: number | null, currency: string | null): string {
  if (cents === null) return "—";
  const amount = cents / 100;
  return amount.toLocaleString("de-DE", { style: "currency", currency: (currency ?? "eur").toUpperCase() });
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatRemaining(accessUntil: string | null): { label: string; urgent: boolean } {
  if (!accessUntil) return { label: "—", urgent: false };
  const diffMs = new Date(accessUntil).getTime() - Date.now();
  if (diffMs <= 0) return { label: "Abgelaufen", urgent: true };
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
  return { label: `${hours}h ${minutes}min`, urgent: hours < 6 };
}

function MailBadge({ label, sentAt }: { label: string; sentAt: string | null }) {
  return (
    <Tooltip label={sentAt ? `Versendet ${formatDateTime(sentAt)}` : "Noch nicht versendet"} hasArrow fontSize="xs">
      <Badge
        fontSize="9px"
        px={1.5}
        py={0.5}
        borderRadius="6px"
        bg={sentAt ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)"}
        color={sentAt ? "rgba(74,222,128,0.90)" : "rgba(255,255,255,0.30)"}
        border="none"
      >
        {label}
      </Badge>
    </Tooltip>
  );
}

function NoteCell({ issue, onSaved }: { issue: PaymentIssue; onSaved: (id: string, note: string | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(issue.dunning_admin_note ?? "");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/payment-issues/${issue.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dunning_admin_note: value.trim() || null }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Fehler beim Speichern.");
      onSaved(issue.id, value.trim() || null);
      setEditing(false);
    } catch (err) {
      toast({ title: "Fehler", description: (err as Error).message, status: "error", duration: 3000, isClosable: true });
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <HStack spacing={1} align="flex-start">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          size="xs"
          rows={2}
          w="200px"
          bg="rgba(255,255,255,0.04)"
          borderColor="rgba(212,175,55,0.35)"
          color="var(--color-text-primary)"
          _focus={{ borderColor: "rgba(212,175,55,0.60)" }}
          placeholder="z. B. kontaktiert am 06.09."
        />
        <Stack spacing={1}>
          <IconButton
            aria-label="Speichern"
            icon={<Check size={12} />}
            size="xs"
            isLoading={saving}
            onClick={handleSave}
            bg="rgba(34,197,94,0.15)"
            color="rgba(74,222,128,0.90)"
            _hover={{ bg: "rgba(34,197,94,0.25)" }}
          />
          <IconButton
            aria-label="Abbrechen"
            icon={<X size={12} />}
            size="xs"
            variant="ghost"
            onClick={() => {
              setValue(issue.dunning_admin_note ?? "");
              setEditing(false);
            }}
            color="rgba(255,255,255,0.40)"
          />
        </Stack>
      </HStack>
    );
  }

  return (
    <HStack spacing={1} align="center">
      <Text fontSize="xs" color="rgba(255,255,255,0.45)" className="inter" noOfLines={2} maxW="180px">
        {issue.dunning_admin_note || "—"}
      </Text>
      <IconButton
        aria-label="Notiz bearbeiten"
        icon={<Pencil size={11} />}
        size="xs"
        variant="ghost"
        color="rgba(255,255,255,0.25)"
        _hover={{ color: "var(--color-accent-gold)", bg: "rgba(255,255,255,0.06)" }}
        onClick={() => setEditing(true)}
      />
    </HStack>
  );
}

export function AdminZahlungsstoerungenManager() {
  const [issues, setIssues] = useState<PaymentIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/payment-issues", { cache: "no-store" });
      const json = (await res.json()) as { ok: boolean; items?: PaymentIssue[]; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Fehler beim Laden.");
      setIssues(json.items ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleNoteSaved(id: string, note: string | null) {
    setIssues((prev) => prev.map((i) => (i.id === id ? { ...i, dunning_admin_note: note } : i)));
  }

  return (
    <>
      <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
        <Text fontSize="sm" color="var(--color-text-secondary)" className="inter">
          {issues.length} Mitglied{issues.length === 1 ? "" : "er"} mit Zahlungsstörung
        </Text>
      </HStack>

      {error && (
        <Alert status="error" variant="subtle" bg="rgba(229,72,77,0.10)" borderRadius="12px" mt={4}>
          <AlertIcon />
          <Text fontSize="sm" className="inter">{error}</Text>
        </Alert>
      )}

      <Box mt={6} borderRadius="16px" border="1px solid rgba(255,255,255,0.07)" overflow="hidden" bg="rgba(255,255,255,0.02)">
        {loading ? (
          <Box p={8} textAlign="center">
            <Text color="rgba(255,255,255,0.35)" className="inter" fontSize="sm">Lade Zahlungsstörungen…</Text>
          </Box>
        ) : issues.length === 0 ? (
          <Box p={10} textAlign="center">
            <Text color="rgba(255,255,255,0.35)" className="inter" fontSize="sm" mb={2}>
              Aktuell keine Zahlungsstörungen.
            </Text>
            <Text color="rgba(255,255,255,0.20)" className="inter" fontSize="xs">
              Kein Mitglied befindet sich im Grace-Zeitraum oder hatte in den letzten 30 Tagen eine fehlgeschlagene Zahlung.
            </Text>
          </Box>
        ) : (
          <Box overflowX="auto">
            <Table variant="unstyled" size="sm">
              <Thead>
                <Tr borderBottom="1px solid rgba(255,255,255,0.06)">
                  {["Mitglied", "Letzter Fehlversuch", "Betrag", "Versuche", "Dunning-Mails", "Grace-Zeit", "Notiz"].map((h) => (
                    <Th
                      key={h}
                      py={3}
                      px={4}
                      fontSize="10px"
                      letterSpacing="0.10em"
                      textTransform="uppercase"
                      color="rgba(255,255,255,0.35)"
                      className="inter-semibold"
                      fontWeight={600}
                    >
                      {h}
                    </Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {issues.map((issue) => {
                  const remaining = formatRemaining(issue.access_until);
                  return (
                    <Tr
                      key={issue.id}
                      borderBottom="1px solid rgba(255,255,255,0.04)"
                      _last={{ borderBottom: "none" }}
                      _hover={{ bg: "rgba(255,255,255,0.025)" }}
                      transition="background 150ms ease"
                    >
                      <Td py={3.5} px={4}>
                        <Stack spacing={0}>
                          <Text fontSize="sm" className="inter-semibold" color="var(--color-text-primary)" noOfLines={1}>
                            {issue.full_name || issue.username || "Unbenannt"}
                          </Text>
                          <Text fontSize="xs" color="rgba(255,255,255,0.35)" className="inter" noOfLines={1}>
                            {issue.email || "—"}
                          </Text>
                        </Stack>
                      </Td>
                      <Td py={3.5} px={4}>
                        <Text fontSize="xs" color="rgba(255,255,255,0.60)" className="inter">
                          {formatDateTime(issue.last_failed_at)}
                        </Text>
                        {issue.last_failed_reason && (
                          <Text fontSize="10px" color="rgba(229,72,77,0.75)" className="inter" noOfLines={1} maxW="160px">
                            {issue.last_failed_reason}
                          </Text>
                        )}
                      </Td>
                      <Td py={3.5} px={4}>
                        <Text fontSize="sm" className="jetbrains-mono" color="var(--color-text-primary)">
                          {formatAmount(issue.last_failed_amount_cents, issue.last_failed_currency)}
                        </Text>
                      </Td>
                      <Td py={3.5} px={4}>
                        <Text fontSize="sm" className="jetbrains-mono" color="var(--color-text-primary)">
                          {issue.last_failed_attempt_count ?? "—"}
                        </Text>
                      </Td>
                      <Td py={3.5} px={4}>
                        <HStack spacing={1}>
                          <MailBadge label="1" sentAt={issue.payment_failed_email_1_sent_at} />
                          <MailBadge label="2" sentAt={issue.payment_failed_email_2_sent_at} />
                          <MailBadge label="3" sentAt={issue.payment_failed_email_3_sent_at} />
                        </HStack>
                      </Td>
                      <Td py={3.5} px={4}>
                        <Badge
                          fontSize="9px"
                          px={2}
                          py={0.5}
                          borderRadius="6px"
                          bg={remaining.urgent ? "rgba(229,72,77,0.15)" : "rgba(212,175,55,0.12)"}
                          color={remaining.urgent ? "rgba(248,113,113,0.90)" : "var(--color-accent-gold)"}
                          border="none"
                        >
                          {remaining.label}
                        </Badge>
                      </Td>
                      <Td py={3.5} px={4}>
                        <NoteCell issue={issue} onSaved={handleNoteSaved} />
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>

      <Text fontSize="xs" color="rgba(255,255,255,0.20)" className="inter" mt={2}>
        Grace-Zeit wird beim Laden der Seite berechnet (kein Live-Countdown). Mail 1 kommt vom Stripe-Webhook, Mail 2/3 vom Dunning-Cron.
      </Text>
    </>
  );
}
