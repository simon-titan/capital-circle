"use client";

import {
  Badge,
  Box,
  Button,
  HStack,
  Input,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import { Copy, Plus, Share2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SOURCE_ORIGIN_LABELS, type ChannelRow, type PerChannelRow } from "./types";
import { eurFromCents, FieldLabel, SectionCard } from "./primitives";

function ChannelStat({ label, value }: { label: string; value: string | number }) {
  return (
    <Stack spacing={0} align="center" minW="52px">
      <Text className="jetbrains-mono" fontSize="sm" color="var(--color-text-primary)" fontWeight={700}>
        {value}
      </Text>
      <Text fontSize="10px" color="#606068" className="inter" textTransform="uppercase" letterSpacing="0.06em">
        {label}
      </Text>
    </Stack>
  );
}

const inputSx = {
  bg: "rgba(255,255,255,0.04)",
  borderColor: "rgba(255,255,255,0.12)",
  color: "var(--color-text-primary)",
} as const;

export function ChannelsSection({ channels }: { channels: PerChannelRow[] }) {
  const [managed, setManaged] = useState<ChannelRow[]>([]);
  const [label, setLabel] = useState("");
  const [utmSource, setUtmSource] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const statsBySource = useMemo(() => {
    const m = new Map<string, PerChannelRow>();
    for (const c of channels) m.set(c.utm_source, c);
    return m;
  }, [channels]);

  const loadChannels = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/discord-funnel/channels", { cache: "no-store" });
      const json = (await res.json()) as { ok: boolean; items?: ChannelRow[]; error?: string };
      if (json.ok && json.items) setManaged(json.items);
    } catch {
      // still ignorieren — Verwaltung ist optional
    }
  }, []);

  useEffect(() => {
    void loadChannels();
  }, [loadChannels]);

  function buildLink(source: string, campaign: string | null): string {
    const u = new URLSearchParams({ utm_source: source });
    if (campaign) u.set("utm_campaign", campaign);
    return `${origin}/discord?${u.toString()}`;
  }

  async function addChannel() {
    if (!label.trim() || !utmSource.trim()) {
      setErr("Label und utm_source sind erforderlich.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/discord-funnel/channels", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          utm_source: utmSource.trim(),
          utm_campaign: utmCampaign.trim() || undefined,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setErr(json.error ?? "Kanal konnte nicht angelegt werden.");
        return;
      }
      setLabel("");
      setUtmSource("");
      setUtmCampaign("");
      await loadChannels();
    } finally {
      setBusy(false);
    }
  }

  async function deleteChannel(id: string) {
    await fetch(`/api/admin/discord-funnel/channels?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await loadChannels();
  }

  async function copyLink(link: string, id: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
    } catch {
      // Clipboard nicht verfügbar
    }
  }

  const managedSources = new Set(managed.map((m) => m.utm_source));
  const unmanaged = channels.filter(
    (c) => !managedSources.has(c.utm_source) && c.visits + c.leads > 0,
  );

  return (
    <SectionCard title="Kanäle & Tracking-Links" icon={<Share2 size={16} />}>
      <Stack spacing={5}>
        {/* Anlegen */}
        <Stack spacing={3} bg="#0C0D10" border="1px solid rgba(255,255,255,0.07)" borderRadius="12px" p={4}>
          <Text className="inter-semibold" fontSize="sm" color="var(--color-text-primary)">
            Neuen Kanal anlegen
          </Text>
          <HStack spacing={3} flexWrap="wrap" align="flex-end">
            <Stack spacing={1} flex="1" minW="140px">
              <FieldLabel>Label</FieldLabel>
              <Input
                size="sm"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="z. B. YouTube"
                className="inter"
                {...inputSx}
              />
            </Stack>
            <Stack spacing={1} flex="1" minW="140px">
              <FieldLabel>utm_source</FieldLabel>
              <Input
                size="sm"
                value={utmSource}
                onChange={(e) => setUtmSource(e.target.value)}
                placeholder="z. B. youtube"
                className="inter jetbrains-mono"
                {...inputSx}
              />
            </Stack>
            <Stack spacing={1} flex="1" minW="140px">
              <FieldLabel>utm_campaign (optional)</FieldLabel>
              <Input
                size="sm"
                value={utmCampaign}
                onChange={(e) => setUtmCampaign(e.target.value)}
                placeholder="z. B. launch-juni"
                className="inter jetbrains-mono"
                {...inputSx}
              />
            </Stack>
            <Button
              size="sm"
              onClick={() => void addChannel()}
              isLoading={busy}
              leftIcon={<Plus size={14} />}
              bg="rgba(212,175,55,0.16)"
              color="var(--color-accent-gold-light, #E8C547)"
              border="1px solid rgba(212,175,55,0.45)"
              _hover={{ bg: "rgba(212,175,55,0.24)" }}
              className="inter"
            >
              Anlegen
            </Button>
          </HStack>
          {err ? (
            <Text fontSize="xs" color="#FCA5A5" className="inter">
              {err}
            </Text>
          ) : null}
        </Stack>

        {/* Verwaltete Kanäle */}
        {managed.length === 0 ? (
          <Text fontSize="sm" color="var(--color-text-secondary)" className="inter" fontStyle="italic">
            Noch keine Kanäle angelegt. Lege oben deine Quellen (YouTube, Instagram, TikTok …) an.
          </Text>
        ) : (
          <Stack spacing={2}>
            {managed.map((ch) => {
              const stats = statsBySource.get(ch.utm_source);
              const link = buildLink(ch.utm_source, ch.utm_campaign);
              return (
                <Box key={ch.id} bg="#0C0D10" border="1px solid rgba(255,255,255,0.07)" borderRadius="12px" p={4}>
                  <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap={3}>
                    <Stack spacing={1} flex="1" minW="200px">
                      <HStack spacing={2}>
                        <Text className="inter-semibold" color="var(--color-text-primary)">
                          {ch.label}
                        </Text>
                        <Badge
                          bg="rgba(255,255,255,0.06)"
                          color="#9A9AA4"
                          border="1px solid rgba(255,255,255,0.08)"
                          borderRadius="6px"
                          fontSize="10px"
                          px={2}
                          className="jetbrains-mono"
                        >
                          {ch.utm_source}
                        </Badge>
                        {stats?.source_origin ? (
                          <Badge
                            bg="rgba(212,175,55,0.12)"
                            color="var(--color-accent-gold-light, #E8C547)"
                            border="1px solid rgba(212,175,55,0.30)"
                            borderRadius="6px"
                            fontSize="10px"
                            px={2}
                            textTransform="none"
                            className="inter"
                          >
                            {SOURCE_ORIGIN_LABELS[stats.source_origin]}
                          </Badge>
                        ) : null}
                      </HStack>
                      <HStack
                        spacing={2}
                        bg="rgba(255,255,255,0.03)"
                        border="1px solid rgba(255,255,255,0.08)"
                        borderRadius="8px"
                        px={3}
                        py={1.5}
                        maxW="full"
                      >
                        <Text
                          fontSize="xs"
                          color="var(--color-text-secondary)"
                          className="jetbrains-mono"
                          noOfLines={1}
                          flex="1"
                        >
                          {link}
                        </Text>
                        <Button
                          size="xs"
                          variant="ghost"
                          leftIcon={<Copy size={12} />}
                          onClick={() => void copyLink(link, ch.id)}
                          color="var(--color-accent-gold-light, #E8C547)"
                          className="inter"
                        >
                          {copied === ch.id ? "Kopiert" : "Kopieren"}
                        </Button>
                      </HStack>
                    </Stack>
                    <HStack spacing={4} align="center">
                      <ChannelStat label="Besucher" value={stats?.visits ?? 0} />
                      <ChannelStat label="Leads" value={stats?.leads ?? 0} />
                      <ChannelStat label="Joins" value={stats?.joins ?? 0} />
                      <ChannelStat label="Bookings" value={stats?.bookings ?? 0} />
                      <ChannelStat label="Won" value={stats?.closedWon ?? 0} />
                      <ChannelStat label="Revenue" value={eurFromCents(stats?.revenueCents)} />
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => void deleteChannel(ch.id)}
                        color="#FCA5A5"
                        _hover={{ bg: "rgba(229,72,77,0.12)" }}
                        aria-label="Kanal löschen"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </HStack>
                  </HStack>
                </Box>
              );
            })}
          </Stack>
        )}

        {/* Beobachtete, nicht definierte Quellen */}
        {unmanaged.length > 0 ? (
          <Stack spacing={2}>
            <Text
              fontSize="xs"
              letterSpacing="0.12em"
              textTransform="uppercase"
              color="#606068"
              className="inter"
            >
              Weitere beobachtete Quellen
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
              {unmanaged.map((c) => (
                <HStack
                  key={c.utm_source}
                  justify="space-between"
                  bg="#0C0D10"
                  border="1px solid rgba(255,255,255,0.07)"
                  borderRadius="10px"
                  px={3}
                  py={2}
                >
                  <Text fontSize="xs" color="var(--color-text-secondary)" className="jetbrains-mono" noOfLines={1}>
                    {c.utm_source}
                  </Text>
                  <HStack spacing={3}>
                    <ChannelStat label="Besucher" value={c.visits} />
                    <ChannelStat label="Leads" value={c.leads} />
                    <ChannelStat label="Bookings" value={c.bookings} />
                  </HStack>
                </HStack>
              ))}
            </SimpleGrid>
          </Stack>
        ) : null}
      </Stack>
    </SectionCard>
  );
}
