"use client";

import { Badge, Box, Button, HStack, Input, Stack, Text, useToast } from "@chakra-ui/react";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type DiscordRoleStatus = "regular" | "waiting_room" | "none" | null;

type AdminDiscordRow = {
  userId: string;
  name: string;
  email: string;
  discordUsername: string | null;
  discordUserId: string | null;
  connectedAt: string | null;
  connected: boolean;
  roleStatus: DiscordRoleStatus;
};

function roleStatusLabel(status: DiscordRoleStatus): string {
  switch (status) {
    case "regular":
      return "Regulär";
    case "waiting_room":
      return "Warteraum";
    case "none":
      return "Keine";
    default:
      return "—";
  }
}

function roleStatusColors(status: DiscordRoleStatus): { bg: string; color: string } {
  switch (status) {
    case "regular":
      return { bg: "rgba(212,175,55,0.15)", color: "var(--color-accent-gold)" };
    case "waiting_room":
      return { bg: "rgba(255,255,255,0.08)", color: "gray.300" };
    case "none":
      return { bg: "rgba(229,72,77,0.10)", color: "rgba(248,113,113,0.85)" };
    default:
      return { bg: "transparent", color: "gray.600" };
  }
}

const fieldStyles = {
  bg: "rgba(255,255,255,0.06)",
  borderColor: "whiteAlpha.300",
  color: "gray.100",
  _placeholder: { color: "gray.500" },
  _focus: { borderColor: "blue.400", boxShadow: "0 0 0 1px rgba(59,130,246,0.45)" },
} as const;

export function AdminDiscordManager() {
  const [rows, setRows] = useState<AdminDiscordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/discord");
    const json = (await res.json()) as { ok?: boolean; rows?: AdminDiscordRow[] };
    if (json.ok && json.rows) setRows(json.rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch (AdminMembersManager pattern)
    void load();
  }, [load]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/discord/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apply: true }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; fixedCount?: number; checkedCount?: number };
      if (!json.ok) {
        toast({
          title: "Abgleich fehlgeschlagen",
          description: json.error ?? "Unbekannter Fehler.",
          status: "error",
          duration: 4000,
          isClosable: true,
        });
        return;
      }
      toast({
        title: "Bestand abgeglichen",
        description: `${json.fixedCount ?? 0} von ${json.checkedCount ?? 0} Verknüpfungen korrigiert.`,
        status: "success",
        duration: 4000,
        isClosable: true,
      });
      await load();
    } finally {
      setSyncing(false);
    }
  }, [load, toast]);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.email.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      (r.discordUsername ?? "").toLowerCase().includes(q) ||
      (r.discordUserId ?? "").includes(q)
    );
  });

  const formatConnected = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  };

  return (
    <Stack spacing={4}>
      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <Box>
          <Text className="radley-regular" fontSize="xl" color="whiteAlpha.950">
            Discord Übersicht
          </Text>
          <Text fontSize="sm" className="inter" color="gray.400" mt={0.5}>
            {loading ? "Wird geladen…" : `${rows.length} Nutzer gesamt`}
          </Text>
        </Box>
        <HStack spacing={3}>
          <Input
            placeholder="Suche nach Name, E-Mail, Discord…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxW="340px"
            size="sm"
            {...fieldStyles}
          />
          <Button
            leftIcon={<RefreshCw size={14} />}
            onClick={handleSync}
            isLoading={syncing}
            loadingText="Gleicht ab…"
            size="sm"
            borderRadius="10px"
            className="inter-semibold"
            bg="rgba(212,175,55,0.15)"
            color="var(--color-accent-gold)"
            border="1px solid rgba(212,175,55,0.35)"
            _hover={{ bg: "rgba(212,175,55,0.25)", borderColor: "rgba(212,175,55,0.60)" }}
          >
            Bestand abgleichen
          </Button>
        </HStack>
      </HStack>

      <Box
        borderRadius="16px"
        borderWidth="1px"
        borderColor="whiteAlpha.150"
        overflow="hidden"
        bg="rgba(0,0,0,0.2)"
      >
        <HStack
          px={4}
          py={3}
          borderBottom="1px solid rgba(255,255,255,0.07)"
          bg="rgba(255,255,255,0.03)"
          spacing={3}
          display={{ base: "none", xl: "flex" }}
          flexWrap="wrap"
        >
          {["Name", "E-Mail", "Discord", "Discord ID", "Verbunden seit", "Status", "Rollen-Status"].map((h) => (
            <Text
              key={h}
              flex={h === "E-Mail" ? 1.2 : h === "Name" ? 1 : undefined}
              w={
                h === "Discord ID"
                  ? "140px"
                  : h === "Verbunden seit"
                    ? "130px"
                    : h === "Status"
                      ? "120px"
                      : h === "Rollen-Status"
                        ? "120px"
                        : h === "Discord"
                          ? "120px"
                          : undefined
              }
              minW={h === "E-Mail" ? "160px" : undefined}
              fontSize="11px"
              className="inter"
              fontWeight={500}
              letterSpacing="0.08em"
              textTransform="uppercase"
              color="gray.600"
            >
              {h}
            </Text>
          ))}
        </HStack>

        {loading ? (
          <Text px={4} py={6} fontSize="sm" color="gray.400" className="inter">
            Daten werden geladen…
          </Text>
        ) : filtered.length === 0 ? (
          <Text px={4} py={6} fontSize="sm" color="gray.400" className="inter">
            Keine Einträge.
          </Text>
        ) : (
          filtered.map((r) => (
            <HStack
              key={r.userId}
              px={4}
              py={3.5}
              borderBottom="1px solid rgba(255,255,255,0.05)"
              spacing={3}
              align="flex-start"
              flexDir={{ base: "column", xl: "row" }}
              transition="background 150ms"
              _hover={{ bg: "rgba(255,255,255,0.03)" }}
            >
              <Text className="inter" fontSize="sm" fontWeight={500} color="gray.100" flex={1} minW={0} noOfLines={2}>
                {r.name}
              </Text>
              <Text
                className="inter"
                fontSize="sm"
                color="gray.300"
                flex={1.2}
                minW={{ xl: "160px" }}
                noOfLines={2}
                wordBreak="break-all"
              >
                {r.email}
              </Text>
              <Text w={{ base: "100%", xl: "120px" }} fontSize="sm" className="inter" color="gray.400" noOfLines={1}>
                {r.discordUsername ?? "—"}
              </Text>
              <Text
                w={{ base: "100%", xl: "140px" }}
                fontSize="xs"
                className="jetbrains-mono"
                color="gray.500"
                noOfLines={1}
              >
                {r.discordUserId ?? "—"}
              </Text>
              <Text w={{ base: "100%", xl: "130px" }} fontSize="xs" className="inter" color="gray.500">
                {formatConnected(r.connectedAt)}
              </Text>
              <Text w={{ base: "100%", xl: "120px" }} fontSize="sm" className="inter" color="gray.200">
                {r.connected ? "✅ Verbunden" : "⚠️ Nicht verbunden"}
              </Text>
              <Box w={{ base: "100%", xl: "120px" }}>
                <Badge
                  fontSize="xs"
                  px={2}
                  py={0.5}
                  borderRadius="6px"
                  border="none"
                  {...roleStatusColors(r.roleStatus)}
                >
                  {roleStatusLabel(r.roleStatus)}
                </Badge>
              </Box>
            </HStack>
          ))
        )}
      </Box>
    </Stack>
  );
}
