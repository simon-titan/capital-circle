"use client";

import { Alert, AlertIcon, Box, Button, HStack, Image, Spinner, Stack, Switch, Text } from "@chakra-ui/react";
import { Check, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  StatusPill,
  adminAlertIconColor,
  adminAlertProps,
  adminDangerButtonProps,
  adminEmptyProps,
  adminInsetProps,
  adminSwitchSx,
} from "@/components/admin/adminUi";

type Status = "pending" | "approved" | "rejected";

type CertificateRow = {
  id: string;
  userId: string;
  memberName: string;
  storageKey: string;
  caption: string | null;
  status: Status;
  isPublic: boolean;
  submittedAt: string;
  reviewedAt: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" });

function formatDate(iso: string): string {
  try {
    return dateFormatter.format(new Date(iso));
  } catch {
    return iso;
  }
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "approved") {
    return <StatusPill tone="success">Freigegeben</StatusPill>;
  }
  if (status === "rejected") {
    return <StatusPill tone="danger">Abgelehnt</StatusPill>;
  }
  return <StatusPill tone="attention">Pending</StatusPill>;
}

export function AdminZertifikateManager() {
  const [items, setItems] = useState<CertificateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/certificates", { credentials: "same-origin" });
      const json = (await res.json()) as { ok?: boolean; items?: CertificateRow[]; error?: string };
      if (!res.ok || !json.ok || !json.items) {
        throw new Error(json.error || `Laden fehlgeschlagen (${res.status})`);
      }
      setItems(json.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = useCallback(async (id: string, body: { status?: Status; isPublic?: boolean }) => {
    setBusyIds((prev) => new Set(prev).add(id));
    setError(null);
    try {
      const res = await fetch(`/api/admin/certificates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { ok?: boolean; item?: unknown; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `Aktion fehlgeschlagen (${res.status})`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler.");
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [load]);

  if (loading) {
    return (
      <HStack py={10} justify="center">
        <Spinner color="var(--cc-gold)" />
      </HStack>
    );
  }

  return (
    <Stack gap={4}>
      {error ? (
        <Alert status="error" {...adminAlertProps("error")}>
          <AlertIcon color={adminAlertIconColor("error")} />
          <Text fontSize="sm">{error}</Text>
        </Alert>
      ) : null}

      {items.length === 0 ? (
        <Box {...adminEmptyProps}>Noch keine Einreichungen.</Box>
      ) : (
        <Stack gap={3}>
          {items.map((item) => {
            const busy = busyIds.has(item.id);
            return (
              <HStack key={item.id} align="flex-start" gap={4} p={4} flexWrap="wrap" {...adminInsetProps}>
                <Box
                  w="120px"
                  h="120px"
                  flexShrink={0}
                  borderRadius="8px"
                  overflow="hidden"
                  bg="var(--cc-surface-2)"
                  border="1px solid var(--cc-line)"
                >
                  <Image
                    src={`/api/admin/storage-url?key=${encodeURIComponent(item.storageKey)}`}
                    alt={item.caption ?? "Nachweis"}
                    w="100%"
                    h="100%"
                    objectFit="cover"
                  />
                </Box>

                <Stack flex="1" minW="220px" gap={1}>
                  <HStack justify="space-between" flexWrap="wrap" gap={2}>
                    <Text fontWeight={600} color="var(--cc-text)">
                      {item.memberName}
                    </Text>
                    <StatusBadge status={item.status} />
                  </HStack>
                  {item.caption ? (
                    <Text fontSize="sm" color="var(--cc-text-soft)">
                      {item.caption}
                    </Text>
                  ) : (
                    <Text fontSize="sm" color="var(--cc-text-3)" fontStyle="italic">
                      Keine Beschreibung
                    </Text>
                  )}
                  <Text className="cc-num" fontSize="xs" color="var(--cc-text-2)">
                    Eingereicht: {formatDate(item.submittedAt)}
                    {item.reviewedAt ? ` · Geprueft: ${formatDate(item.reviewedAt)}` : ""}
                  </Text>
                </Stack>

                <Stack minW="180px" gap={2} align="flex-end">
                  {item.status !== "approved" ? (
                    <Button
                      size="sm"
                      variant="gold"
                      leftIcon={<Check size={14} />}
                      isLoading={busy}
                      onClick={() => void patch(item.id, { status: "approved" })}
                    >
                      Freigeben
                    </Button>
                  ) : null}
                  {item.status !== "rejected" ? (
                    <Button
                      size="sm"
                      {...adminDangerButtonProps}
                      leftIcon={<X size={14} />}
                      isLoading={busy}
                      onClick={() => void patch(item.id, { status: "rejected" })}
                    >
                      Ablehnen
                    </Button>
                  ) : null}
                  {item.status === "approved" ? (
                    <HStack>
                      <Text fontSize="xs" color="var(--cc-text-2)">
                        Öffentlich
                      </Text>
                      <Switch
                        size="sm"
                        sx={adminSwitchSx}
                        isChecked={item.isPublic}
                        isDisabled={busy}
                        onChange={(e) => void patch(item.id, { isPublic: e.target.checked })}
                      />
                    </HStack>
                  ) : null}
                </Stack>
              </HStack>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
