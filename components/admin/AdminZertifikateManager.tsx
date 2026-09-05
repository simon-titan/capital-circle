"use client";

import { Alert, AlertIcon, Badge, Box, Button, HStack, Image, Spinner, Stack, Switch, Text } from "@chakra-ui/react";
import { Check, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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
    return (
      <Badge
        bg="rgba(52,211,153,0.14)"
        color="#34D399"
        border="1px solid rgba(52,211,153,0.4)"
        borderRadius="full"
        px={2}
        py={0.5}
        textTransform="none"
        fontWeight={500}
        className="inter"
      >
        Freigegeben
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge
        bg="rgba(248,113,113,0.14)"
        color="#F87171"
        border="1px solid rgba(248,113,113,0.4)"
        borderRadius="full"
        px={2}
        py={0.5}
        textTransform="none"
        fontWeight={500}
        className="inter"
      >
        Abgelehnt
      </Badge>
    );
  }
  return (
    <Badge
      bg="rgba(245,200,74,0.14)"
      color="#F5C84A"
      border="1px solid rgba(245,200,74,0.4)"
      borderRadius="full"
      px={2}
      py={0.5}
      textTransform="none"
      fontWeight={500}
      className="inter"
    >
      Pending
    </Badge>
  );
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
        <Spinner color="#D4AF37" />
      </HStack>
    );
  }

  return (
    <Stack gap={4}>
      {error ? (
        <Alert status="error" borderRadius="md" variant="left-accent">
          <AlertIcon />
          <Text fontSize="sm" className="inter">
            {error}
          </Text>
        </Alert>
      ) : null}

      {items.length === 0 ? (
        <Text fontSize="sm" color="gray.500" className="inter">
          Noch keine Einreichungen.
        </Text>
      ) : (
        <Stack gap={3}>
          {items.map((item) => {
            const busy = busyIds.has(item.id);
            return (
              <HStack
                key={item.id}
                align="flex-start"
                gap={4}
                p={4}
                borderRadius="12px"
                borderWidth="1px"
                borderColor="whiteAlpha.200"
                bg="rgba(255,255,255,0.02)"
                flexWrap="wrap"
              >
                <Box w="120px" h="120px" flexShrink={0} borderRadius="8px" overflow="hidden" bg="blackAlpha.400">
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
                    <Text fontWeight="600" className="inter-semibold">
                      {item.memberName}
                    </Text>
                    <StatusBadge status={item.status} />
                  </HStack>
                  {item.caption ? (
                    <Text fontSize="sm" color="gray.300" className="inter">
                      {item.caption}
                    </Text>
                  ) : (
                    <Text fontSize="sm" color="gray.600" className="inter" fontStyle="italic">
                      Keine Beschreibung
                    </Text>
                  )}
                  <Text fontSize="xs" color="gray.500" className="inter">
                    Eingereicht: {formatDate(item.submittedAt)}
                    {item.reviewedAt ? ` · Geprueft: ${formatDate(item.reviewedAt)}` : ""}
                  </Text>
                </Stack>

                <Stack minW="180px" gap={2} align="flex-end">
                  {item.status !== "approved" ? (
                    <Button
                      size="sm"
                      colorScheme="green"
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
                      variant="outline"
                      colorScheme="red"
                      leftIcon={<X size={14} />}
                      isLoading={busy}
                      onClick={() => void patch(item.id, { status: "rejected" })}
                    >
                      Ablehnen
                    </Button>
                  ) : null}
                  {item.status === "approved" ? (
                    <HStack>
                      <Text fontSize="xs" color="gray.400" className="inter">
                        Oeffentlich
                      </Text>
                      <Switch
                        size="sm"
                        colorScheme="yellow"
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
