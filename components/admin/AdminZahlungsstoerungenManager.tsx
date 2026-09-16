"use client";

import {
  Alert,
  AlertIcon,
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
import {
  ADMIN_CARD_CLASS,
  StatusPill,
  adminAlertIconColor,
  adminAlertProps,
  adminCardPadding,
  adminInputProps,
  adminTableSx,
} from "@/components/admin/adminUi";

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

/** Tooltip auf Graphit statt Chakras hellem Standard. */
const tooltipSx = { "--tooltip-bg": "var(--cc-surface-2)" } as const;

function MailBadge({ label, sentAt }: { label: string; sentAt: string | null }) {
  return (
    <Tooltip
      label={sentAt ? `Versendet ${formatDateTime(sentAt)}` : "Noch nicht versendet"}
      hasArrow
      fontSize="xs"
      color="var(--cc-text)"
      borderRadius="6px"
      sx={tooltipSx}
    >
      {/* Span-Wrapper: Tooltip braucht ein ref-fähiges Kind */}
      <Box as="span" display="inline-flex">
        <StatusPill tone={sentAt ? "success" : "neutral"} className="cc-num" px={1.5}>
          {label}
        </StatusPill>
      </Box>
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
          {...adminInputProps}
          borderRadius="6px"
          placeholder="z. B. kontaktiert am 06.09."
        />
        <Stack spacing={1}>
          <IconButton
            aria-label="Speichern"
            icon={<Check size={12} />}
            size="xs"
            variant="gold"
            isLoading={saving}
            onClick={handleSave}
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
            color="var(--cc-text-2)"
            _hover={{ bg: "rgba(255, 255, 255, 0.05)", color: "var(--cc-text)" }}
          />
        </Stack>
      </HStack>
    );
  }

  return (
    <HStack spacing={1} align="center">
      <Text fontSize="xs" color="var(--cc-text-2)" noOfLines={2} maxW="180px">
        {issue.dunning_admin_note || "—"}
      </Text>
      <IconButton
        aria-label="Notiz bearbeiten"
        icon={<Pencil size={11} />}
        size="xs"
        variant="ghost"
        color="var(--cc-text-3)"
        _hover={{ color: "var(--cc-gold-light)", bg: "rgba(255, 255, 255, 0.05)" }}
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
        <Text fontSize="sm" color="var(--cc-text-2)" className="cc-num">
          {issues.length} Mitglied{issues.length === 1 ? "" : "er"} mit Zahlungsstörung
        </Text>
      </HStack>

      {error && (
        <Alert status="error" {...adminAlertProps("error")} mt={4}>
          <AlertIcon color={adminAlertIconColor("error")} />
          <Text fontSize="sm">{error}</Text>
        </Alert>
      )}

      <Box mt={5} className={ADMIN_CARD_CLASS} p={adminCardPadding}>
        {loading ? (
          <Box p={8} textAlign="center">
            <Text color="var(--cc-text-2)" fontSize="sm">
              Lade Zahlungsstörungen…
            </Text>
          </Box>
        ) : issues.length === 0 ? (
          <Box p={10} textAlign="center">
            <Text color="var(--cc-text-2)" fontSize="sm" mb={2}>
              Aktuell keine Zahlungsstörungen.
            </Text>
            <Text color="var(--cc-text-3)" fontSize="xs">
              Kein Mitglied befindet sich im Grace-Zeitraum oder hatte in den letzten 30 Tagen eine fehlgeschlagene Zahlung.
            </Text>
          </Box>
        ) : (
          <Box overflowX="auto" mx={{ base: -1, md: -2 }}>
            <Table variant="unstyled" size="sm" sx={adminTableSx}>
              <Thead>
                <Tr>
                  {["Mitglied", "Letzter Fehlversuch", "Betrag", "Versuche", "Dunning-Mails", "Grace-Zeit", "Notiz"].map((h) => (
                    <Th key={h}>{h}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {issues.map((issue) => {
                  const remaining = formatRemaining(issue.access_until);
                  return (
                    <Tr key={issue.id}>
                      <Td>
                        <Stack spacing={0}>
                          <Text fontSize="sm" fontWeight={600} color="var(--cc-text)" noOfLines={1}>
                            {issue.full_name || issue.username || "Unbenannt"}
                          </Text>
                          <Text fontSize="xs" color="var(--cc-text-3)" noOfLines={1}>
                            {issue.email || "—"}
                          </Text>
                        </Stack>
                      </Td>
                      <Td>
                        <Text fontSize="xs" className="cc-num" color="var(--cc-text-2)">
                          {formatDateTime(issue.last_failed_at)}
                        </Text>
                        {issue.last_failed_reason && (
                          <Text fontSize="11px" color="var(--cc-danger)" noOfLines={1} maxW="160px">
                            {issue.last_failed_reason}
                          </Text>
                        )}
                      </Td>
                      <Td>
                        <Text fontSize="sm" className="cc-num" color="var(--cc-text)">
                          {formatAmount(issue.last_failed_amount_cents, issue.last_failed_currency)}
                        </Text>
                      </Td>
                      <Td>
                        <Text fontSize="sm" className="cc-num" color="var(--cc-text)">
                          {issue.last_failed_attempt_count ?? "—"}
                        </Text>
                      </Td>
                      <Td>
                        <HStack spacing={1}>
                          <MailBadge label="1" sentAt={issue.payment_failed_email_1_sent_at} />
                          <MailBadge label="2" sentAt={issue.payment_failed_email_2_sent_at} />
                          <MailBadge label="3" sentAt={issue.payment_failed_email_3_sent_at} />
                        </HStack>
                      </Td>
                      <Td>
                        <StatusPill tone={remaining.urgent ? "danger" : "attention"} className="cc-num">
                          {remaining.label}
                        </StatusPill>
                      </Td>
                      <Td>
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

      <Text fontSize="xs" color="var(--cc-text-3)" mt={2}>
        Grace-Zeit wird beim Laden der Seite berechnet (kein Live-Countdown). Mail 1 kommt vom Stripe-Webhook, Mail 2/3 vom Dunning-Cron.
      </Text>
    </>
  );
}
