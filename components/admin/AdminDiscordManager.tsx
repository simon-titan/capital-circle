"use client";

import { Box, Button, HStack, Input, Stack, Text, useToast } from "@chakra-ui/react";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ADMIN_CARD_CLASS,
  adminInputProps,
  adminRowProps,
  StatusPill,
  type AdminTone,
} from "@/components/admin/adminUi";

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

/** ok = regulär, offen = Warteraum, Fehler = keine Rolle, sonst neutral. */
function roleStatusTone(status: DiscordRoleStatus): AdminTone {
  switch (status) {
    case "regular":
      return "success";
    case "waiting_room":
      return "attention";
    case "none":
      return "danger";
    default:
      return "neutral";
  }
}

const COLUMN_HEADS = ["Name", "E-Mail", "Discord", "Discord ID", "Verbunden seit", "Status", "Rollen-Status"];

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
        {/* Seitentitel „Discord Übersicht“ kommt aus app/(admin)/admin/discord/page.tsx */}
        <Text fontSize="14px" color="var(--cc-text-2)" className="cc-num">
          {loading ? "Wird geladen…" : `${rows.length} Nutzer gesamt`}
        </Text>
        <HStack spacing={3}>
          <Input
            placeholder="Suche nach Name, E-Mail, Discord…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxW="340px"
            size="sm"
            {...adminInputProps}
          />
          <Button
            variant="line"
            size="sm"
            leftIcon={<RefreshCw size={14} />}
            onClick={handleSync}
            isLoading={syncing}
            loadingText="Gleicht ab…"
            flexShrink={0}
          >
            Bestand abgleichen
          </Button>
        </HStack>
      </HStack>

      <Box className={ADMIN_CARD_CLASS}>
        <HStack
          px={4}
          py={2.5}
          borderBottom="1px solid var(--cc-line-strong)"
          spacing={3}
          display={{ base: "none", xl: "flex" }}
          flexWrap="wrap"
        >
          {COLUMN_HEADS.map((h) => (
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
              fontSize="12px"
              fontWeight={500}
              letterSpacing="0.06em"
              textTransform="uppercase"
              color="var(--cc-text-2)"
            >
              {h}
            </Text>
          ))}
        </HStack>

        {loading ? (
          <Text px={4} py={6} fontSize="14px" color="var(--cc-text-2)">
            Daten werden geladen…
          </Text>
        ) : filtered.length === 0 ? (
          <Text px={4} py={6} fontSize="14px" color="var(--cc-text-2)">
            Keine Einträge.
          </Text>
        ) : (
          filtered.map((r) => (
            <HStack
              key={r.userId}
              px={4}
              py={3}
              spacing={3}
              align={{ base: "flex-start", xl: "center" }}
              flexDir={{ base: "column", xl: "row" }}
              {...adminRowProps}
              sx={{ "&:last-of-type": { borderBottomRadius: "12px" } }}
            >
              <Text fontSize="14px" fontWeight={500} color="var(--cc-text)" flex={1} minW={0} noOfLines={2}>
                {r.name}
              </Text>
              <Text
                fontSize="14px"
                color="var(--cc-text-soft)"
                flex={1.2}
                minW={{ xl: "160px" }}
                noOfLines={2}
                wordBreak="break-all"
              >
                {r.email}
              </Text>
              <Text w={{ base: "100%", xl: "120px" }} fontSize="14px" color="var(--cc-text-2)" noOfLines={1}>
                {r.discordUsername ?? "—"}
              </Text>
              <Text
                w={{ base: "100%", xl: "140px" }}
                fontSize="12px"
                className="cc-num"
                color="var(--cc-text-3)"
                noOfLines={1}
              >
                {r.discordUserId ?? "—"}
              </Text>
              <Text w={{ base: "100%", xl: "130px" }} fontSize="12px" className="cc-num" color="var(--cc-text-2)">
                {formatConnected(r.connectedAt)}
              </Text>
              <Box w={{ base: "100%", xl: "120px" }}>
                <StatusPill tone={r.connected ? "success" : "attention"}>
                  {r.connected ? "Verbunden" : "Nicht verbunden"}
                </StatusPill>
              </Box>
              <Box w={{ base: "100%", xl: "120px" }}>
                <StatusPill tone={roleStatusTone(r.roleStatus)}>{roleStatusLabel(r.roleStatus)}</StatusPill>
              </Box>
            </HStack>
          ))
        )}
      </Box>
    </Stack>
  );
}
