"use client";

import {
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
import {
  AdminLabel,
  adminDangerButtonProps,
  adminInputProps,
  adminInsetProps,
} from "@/components/admin/adminUi";
import { SOURCE_ORIGIN_LABELS, type ChannelRow, type PerChannelRow } from "./types";
import { eurFromCents, FieldLabel, SectionCard, TagBadge } from "./primitives";

function ChannelStat({ label, value }: { label: string; value: string | number }) {
  return (
    <Stack spacing={0} align="center" minW="52px">
      <Text className="cc-num" fontSize="14px" fontWeight={600} color="var(--cc-text)">
        {value}
      </Text>
      <Text fontSize="10px" color="var(--cc-text-3)" textTransform="uppercase" letterSpacing="0.06em">
        {label}
      </Text>
    </Stack>
  );
}

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
        <Stack spacing={3} {...adminInsetProps} p={4}>
          <Text fontSize="14px" fontWeight={600} color="var(--cc-text)">
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
                {...adminInputProps}
              />
            </Stack>
            <Stack spacing={1} flex="1" minW="140px">
              <FieldLabel>utm_source</FieldLabel>
              <Input
                size="sm"
                value={utmSource}
                onChange={(e) => setUtmSource(e.target.value)}
                placeholder="z. B. youtube"
                fontWeight={500}
                {...adminInputProps}
              />
            </Stack>
            <Stack spacing={1} flex="1" minW="140px">
              <FieldLabel>utm_campaign (optional)</FieldLabel>
              <Input
                size="sm"
                value={utmCampaign}
                onChange={(e) => setUtmCampaign(e.target.value)}
                placeholder="z. B. launch-juni"
                fontWeight={500}
                {...adminInputProps}
              />
            </Stack>
            <Button
              size="sm"
              variant="gold"
              onClick={() => void addChannel()}
              isLoading={busy}
              leftIcon={<Plus size={14} />}
            >
              Anlegen
            </Button>
          </HStack>
          {err ? (
            <Text fontSize="12px" color="var(--cc-danger)">
              {err}
            </Text>
          ) : null}
        </Stack>

        {/* Verwaltete Kanäle */}
        {managed.length === 0 ? (
          <Text fontSize="14px" color="var(--cc-text-2)">
            Noch keine Kanäle angelegt. Lege oben deine Quellen (YouTube, Instagram, TikTok …) an.
          </Text>
        ) : (
          <Stack spacing={2}>
            {managed.map((ch) => {
              const stats = statsBySource.get(ch.utm_source);
              const link = buildLink(ch.utm_source, ch.utm_campaign);
              return (
                <Box key={ch.id} {...adminInsetProps} p={4}>
                  <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap={3}>
                    <Stack spacing={1.5} flex="1" minW="200px">
                      <HStack spacing={2} flexWrap="wrap">
                        <Text fontSize="14px" fontWeight={600} color="var(--cc-text)">
                          {ch.label}
                        </Text>
                        <TagBadge>{ch.utm_source}</TagBadge>
                        {stats?.source_origin ? (
                          <TagBadge tone="gold">{SOURCE_ORIGIN_LABELS[stats.source_origin]}</TagBadge>
                        ) : null}
                      </HStack>
                      <HStack
                        spacing={2}
                        bg="rgba(255, 255, 255, 0.03)"
                        border="1px solid var(--cc-line)"
                        borderRadius="8px"
                        pl={3}
                        pr={1}
                        py={1}
                        maxW="full"
                      >
                        <Text fontSize="12px" fontWeight={500} color="var(--cc-text-2)" noOfLines={1} flex="1">
                          {link}
                        </Text>
                        <Button
                          size="xs"
                          variant="line"
                          leftIcon={<Copy size={12} />}
                          onClick={() => void copyLink(link, ch.id)}
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
                        {...adminDangerButtonProps}
                        onClick={() => void deleteChannel(ch.id)}
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
            <AdminLabel>Weitere beobachtete Quellen</AdminLabel>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
              {unmanaged.map((c) => (
                <HStack key={c.utm_source} justify="space-between" {...adminInsetProps} px={3} py={2}>
                  <Text fontSize="12px" fontWeight={500} color="var(--cc-text-2)" noOfLines={1}>
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
