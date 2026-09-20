"use client";

import {
  Badge,
  Box,
  Button,
  Collapse,
  Divider,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { ArrowRightLeft, ChevronDown, ChevronRight, Clock, ImagePlus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { uploadSmallFilePresigned } from "@/lib/admin-upload-presigned";
import { AttachmentManager } from "@/components/admin/AttachmentManager";
import { DraggableList } from "@/components/admin/DraggableList";
import { VideoMoveModal } from "@/components/admin/VideoMoveModal";
import {
  CloudflareVideoUploader,
  type CloudflareVideoUploadedPayload,
} from "@/components/admin/CloudflareVideoUploader";
import type { SubcategoryRow } from "@/components/admin/SubcategoryManager";

export type VideoRow = {
  id: string;
  module_id: string | null;
  subcategory_id: string | null;
  title: string;
  description: string | null;
  position: number;
  storage_key: string | null;
  cloudflare_uid: string | null;
  cloudflare_status: string;
  cloudflare_error: string | null;
  thumbnail_key: string | null;
  duration_seconds: number | null;
  is_published: boolean;
  created_at: string;
};

const CLOUDFLARE_POLL_INTERVAL_MS = 8_000;
const CLOUDFLARE_POLL_MAX_MS = 5 * 60 * 1000;

/* ── v3.2 „Champagner auf Graphit“: Felder, Labels, Schalter, Pills ── */
const fieldStyles = {
  bg: "rgba(255, 255, 255, 0.03)",
  border: "1px solid",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  color: "var(--cc-text)",
  _placeholder: { color: "var(--cc-text-3)" },
  _hover: { borderColor: "rgba(255, 255, 255, 0.22)" },
  _focusVisible: { borderColor: "var(--cc-gold-line)", boxShadow: "0 0 0 1px var(--cc-gold-line)" },
} as const;

const labelSx = {
  fontSize: "12px",
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--cc-text-2)",
} as const;

const switchSx = {
  ".chakra-switch__track": { bg: "var(--cc-track)" },
  ".chakra-switch__track[data-checked]": { bg: "var(--cc-gold)" },
};

const optionStyle = { background: "var(--cc-panel-solid)" };

type PillTone = "success" | "danger" | "neutral" | "gold";

const PILL_TONES: Record<PillTone, { bg: string; color: string }> = {
  success: { bg: "rgba(74, 222, 128, 0.12)", color: "var(--cc-success)" },
  danger: { bg: "rgba(248, 113, 113, 0.12)", color: "var(--cc-danger)" },
  neutral: { bg: "rgba(255, 255, 255, 0.06)", color: "var(--cc-text-2)" },
  gold: { bg: "rgba(212, 176, 128, 0.12)", color: "var(--cc-gold-light)" },
};

function pillProps(tone: PillTone) {
  return {
    ...PILL_TONES[tone],
    fontSize: "11px",
    fontWeight: 500,
    textTransform: "none",
    borderRadius: "full",
    px: 2,
    py: 0.5,
    flexShrink: 0,
  } as const;
}

/** Cloudflare: bereit = grün, Fehler = rot, alles andere läuft noch = Champagner. */
function cloudflareTone(status: string): PillTone {
  return status === "ready" ? "success" : status === "error" ? "danger" : "gold";
}

const dangerLineProps = {
  variant: "line",
  color: "var(--cc-danger)",
  borderColor: "rgba(248, 113, 113, 0.4)",
  _hover: { bg: "rgba(248, 113, 113, 0.08)", borderColor: "rgba(248, 113, 113, 0.6)", boxShadow: "none" },
} as const;

type VideoManagerProps = {
  courseId: string;
  moduleId: string;
  subcategoryId?: string | null;
  allSubcategories?: SubcategoryRow[];
  /** Wenn gesetzt: externer State-Modus — VideoManager lädt keine eigenen Videos */
  externalVideos?: VideoRow[];
  onExternalVideosChange?: (updater: (prev: VideoRow[]) => VideoRow[]) => void;
  /** Nach modulübergreifendem Verschieben: Modul-Inhalte neu laden */
  onReload?: () => void | Promise<void>;
};

export function VideoManager({
  courseId,
  moduleId,
  subcategoryId = null,
  allSubcategories,
  externalVideos,
  onExternalVideosChange,
  onReload,
}: VideoManagerProps) {
  const isExternal = externalVideos !== undefined && onExternalVideosChange !== undefined;

  const [internalItems, setInternalItems] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(!isExternal);
  const [allSubsState, setAllSubsState] = useState<SubcategoryRow[]>(allSubcategories ?? []);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [moveVideo, setMoveVideo] = useState<VideoRow | null>(null);

  // Im externen Modus: filtere nur die Videos dieser Subkategorie (oder direkte Modul-Videos)
  const items: VideoRow[] = useMemo(() => {
    const filtered = isExternal
      ? (externalVideos ?? []).filter((v) =>
          subcategoryId != null ? v.subcategory_id === subcategoryId : v.subcategory_id == null,
        )
      : internalItems;
    return [...filtered].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [isExternal, externalVideos, subcategoryId, internalItems]);

  const setItems = useMemo(
    () =>
      isExternal
        ? (updater: (prev: VideoRow[]) => VideoRow[]) => onExternalVideosChange!(updater)
        : setInternalItems,
    [isExternal, onExternalVideosChange],
  );

  const qs =
    subcategoryId != null
      ? `subcategoryId=${encodeURIComponent(subcategoryId)}`
      : `moduleId=${encodeURIComponent(moduleId)}`;

  const load = useCallback(async () => {
    if (isExternal) return;
    const res = await fetch(`/api/admin/videos?${qs}`);
    const json = (await res.json()) as { ok?: boolean; items?: VideoRow[] };
    if (json.ok && json.items) setInternalItems(json.items);
    setLoading(false);
  }, [qs, isExternal]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (allSubcategories) {
      setAllSubsState(allSubcategories);
      return;
    }
    const fetchSubs = async () => {
      const res = await fetch(`/api/admin/subcategories?moduleId=${encodeURIComponent(moduleId)}`);
      const json = (await res.json()) as { ok?: boolean; items?: SubcategoryRow[] };
      if (json.ok && json.items) setAllSubsState(json.items);
    };
    void fetchSubs();
  }, [allSubcategories, moduleId]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /**
   * Nächste freie Position. Bei Mehrfach-Upload läuft `onUploaded` mehrmals
   * hintereinander innerhalb derselben Closure — `items.length` wäre dabei für
   * jede Datei gleich und alle bekämen dieselbe Position.
   */
  const naechstePositionRef = useRef(0);

  const onUploaded = async (payload: CloudflareVideoUploadedPayload) => {
    // Das Maximum aus beidem: `items.length` holt auf, sobald der State nachzieht —
    // dadurch heilt sich der Zähler nach jedem Batch von selbst.
    const position = Math.max(items.length, naechstePositionRef.current);
    naechstePositionRef.current = position + 1;

    const body = {
      id: payload.videoId,
      title: payload.fileName,
      position,
      cloudflare_uid: payload.cloudflareUid,
      cloudflare_status: "processing",
      duration_seconds: payload.durationSeconds,
      is_published: false,
      ...(subcategoryId
        ? { subcategory_id: subcategoryId, module_id: null }
        : { module_id: moduleId, subcategory_id: null }),
    };
    const res = await fetch("/api/admin/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { ok?: boolean; item?: VideoRow };
    if (json.ok && json.item) {
      const newItem = json.item;
      setItems((prev) => [...prev, newItem]);
      setExpandedIds((prev) => new Set(prev).add(newItem.id));
    }
  };

  const pollStartedAtRef = useRef<Map<string, number>>(new Map());

  const pollCloudflareStatus = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/admin/videos/${id}/cloudflare-status`);
      const json = (await res.json()) as { ok?: boolean; item?: VideoRow };
      if (json.ok && json.item) {
        const updated = json.item;
        setItems((prev) => prev.map((v) => (v.id === id ? updated : v)));
      }
    },
    [setItems],
  );

  useEffect(() => {
    const pending = items.filter((v) => v.cloudflare_status === "uploading" || v.cloudflare_status === "processing");
    if (pending.length === 0) return;

    const now = Date.now();
    for (const v of pending) {
      if (!pollStartedAtRef.current.has(v.id)) pollStartedAtRef.current.set(v.id, now);
    }

    const timer = setInterval(() => {
      for (const v of pending) {
        const startedAt = pollStartedAtRef.current.get(v.id) ?? Date.now();
        if (Date.now() - startedAt > CLOUDFLARE_POLL_MAX_MS) continue;
        void pollCloudflareStatus(v.id);
      }
    }, CLOUDFLARE_POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [items, pollCloudflareStatus]);

  const patch = async (id: string, updates: Record<string, unknown>) => {
    const res = await fetch("/api/admin/videos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, updates }),
    });
    const json = (await res.json()) as { ok?: boolean; item?: VideoRow };
    if (json.ok && json.item) {
      const updated = json.item;
      setItems((prev) => prev.map((v) => (v.id === id ? updated : v)));
    }
  };

  const onUploadThumbnail = async (item: VideoRow) => {
    const picker = document.createElement("input");
    picker.type = "file";
    picker.accept = "image/jpeg,image/png,image/webp";
    picker.onchange = async () => {
      const file = picker.files?.[0];
      if (!file) return;
      try {
        const storageKey = await uploadSmallFilePresigned(file, {
          folder: "videos",
          courseId,
          moduleId,
          videoId: item.id,
          kind: "thumbnail",
          ...(item.subcategory_id ? { subcategoryId: item.subcategory_id } : {}),
        });
        await patch(item.id, { thumbnail_key: storageKey });
      } catch {
        // bleibt stabil
      }
    };
    picker.click();
  };

  const onMoveVideo = async (item: VideoRow, target: string) => {
    const updates =
      target === "__direct__"
        ? { module_id: moduleId, subcategory_id: null }
        : { module_id: null, subcategory_id: target };

    const res = await fetch("/api/admin/videos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, updates }),
    });
    const json = (await res.json()) as { ok?: boolean; item?: VideoRow };
    if (!json.ok || !json.item) return;

    const moved = json.item;
    // Im externen Modus: Video in globalem State aktualisieren (bleibt sichtbar in der neuen Gruppe)
    setItems((prev) => prev.map((x) => (x.id === item.id ? moved : x)));
  };

  const onVideoMoved = useCallback(async () => {
    if (onReload) {
      await onReload();
      return;
    }
    if (!isExternal) {
      await load();
      return;
    }
    // Externer Modus ohne Reload: verschobenes Video aus der lokalen Gruppe entfernen
    const movedId = moveVideo?.id;
    if (movedId) setItems((prev) => prev.filter((v) => v.id !== movedId));
  }, [onReload, isExternal, load, moveVideo, setItems]);

  const orderedSubOptions = useMemo(
    () => [...allSubsState].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [allSubsState],
  );

  const [detectingDuration, setDetectingDuration] = useState<Set<string>>(new Set());

  const onDetectDuration = async (item: VideoRow) => {
    const key = item.cloudflare_uid ?? item.storage_key;
    if (!key) return;
    setDetectingDuration((prev) => new Set(prev).add(item.id));
    try {
      const res = await fetch(`/api/video-url?key=${encodeURIComponent(key)}`);
      const json = (await res.json()) as { ok?: boolean; url?: string };
      if (!json.ok || !json.url) return;
      const dur = await new Promise<number | null>((resolve) => {
        const vid = document.createElement("video");
        vid.preload = "metadata";
        vid.onloadedmetadata = () => resolve(Number.isFinite(vid.duration) ? Math.floor(vid.duration) : null);
        vid.onerror = () => resolve(null);
        vid.src = json.url!;
      });
      if (dur == null) return;
      await patch(item.id, { duration_seconds: dur });
    } finally {
      setDetectingDuration((prev) => { const n = new Set(prev); n.delete(item.id); return n; });
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Video löschen?")) return;
    const res = await fetch(`/api/admin/videos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const json = (await res.json()) as { ok?: boolean };
    if (json.ok) setItems((prev) => prev.filter((x) => x.id !== id));
  };

  const onReorder = async (orderedIds: string[]) => {
    // Im externen Modus: gefilterte Gruppe neu ordnen und ans Ende des globalen Arrays hängen (korrekte Array-Reihenfolge)
    if (isExternal) {
      const visibleIds = new Set(orderedIds);
      setItems((prev) => {
        const reordered = orderedIds
          .map((id, position) => {
            const row = prev.find((x) => x.id === id);
            return row ? { ...row, position } : null;
          })
          .filter(Boolean) as VideoRow[];
        const rest = prev.filter((x) => !visibleIds.has(x.id));
        return [...rest, ...reordered];
      });
    } else {
      const next = orderedIds
        .map((id, position) => {
          const row = internalItems.find((x) => x.id === id);
          return row ? { ...row, position } : null;
        })
        .filter(Boolean) as VideoRow[];
      setInternalItems(next);
    }
    await fetch("/api/admin/videos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reorder: true,
        moduleId: subcategoryId ? undefined : moduleId,
        subcategoryId: subcategoryId || undefined,
        orderedVideoIds: orderedIds,
      }),
    });
  };

  if (loading) {
    return (
      <Text fontSize="sm" color="var(--cc-text-2)">
        Videos werden geladen…
      </Text>
    );
  }

  return (
    <Stack spacing={5}>
      <Box>
        <Text fontSize="md" fontWeight={600} color="var(--cc-text)">
          {subcategoryId ? "Videos in dieser Subkategorie" : "Videos direkt im Modul"}
        </Text>
        <Text mt={1} fontSize="sm" color="var(--cc-text-2)">
          Reihenfolge per Griff links ändern. Auf den Titel klicken zum Auf-/Einklappen.
        </Text>
      </Box>

      {items.length === 0 ? (
        <Text fontSize="sm" color="var(--cc-text-2)">
          Noch keine Videos. Unten eine Videodatei hochladen.
        </Text>
      ) : (
        <DraggableList
          items={items}
          // Eindeutiger Name je Subkategorie: Mehrere aufgeklappte Subkategorien
          // liegen in derselben DragUmgebung und wuerden sich sonst gegenseitig
          // aus deren Listen-Register werfen.
          listenName={subcategoryId ? `sub:${subcategoryId}` : `modul:${moduleId}`}
          onReorder={onReorder}
          renderItem={(item, handle) => {
            const isExpanded = expandedIds.has(item.id);
            const subLabel = item.subcategory_id
              ? orderedSubOptions.find((s) => s.id === item.subcategory_id)?.title
              : null;

            return (
              <Stack
                key={item.id}
                spacing={0}
                mb={3}
                borderRadius="10px"
                border="1px solid"
                borderColor={isExpanded ? "rgba(212, 176, 128, 0.3)" : "var(--cc-line)"}
                bg="rgba(255, 255, 255, 0.02)"
                overflow="hidden"
                transition="border-color 0.15s"
              >
                {/* ── Kollabierbare Header-Zeile ── */}
                <HStack
                  px={{ base: 3, md: 4 }}
                  py={3}
                  spacing={2}
                  cursor="pointer"
                  onClick={() => toggleExpanded(item.id)}
                  _hover={{ bg: "rgba(255, 255, 255, 0.03)" }}
                  transition="background 0.12s"
                  role="button"
                  aria-expanded={isExpanded}
                >
                  {handle}
                  <Box flex={1} minW={0}>
                    <HStack spacing={2} flexWrap="wrap">
                      <Text
                        fontSize="sm"
                        fontWeight={600}
                        color="var(--cc-text)"
                        noOfLines={1}
                        flex={1}
                        minW={0}
                      >
                        {item.title}
                      </Text>
                      {subLabel && <Badge {...pillProps("neutral")}>{subLabel}</Badge>}
                      <Badge {...pillProps(item.is_published ? "success" : "neutral")}>
                        {item.is_published ? "Veröffentlicht" : "Entwurf"}
                      </Badge>
                      {item.cloudflare_uid && (
                        <Badge
                          {...pillProps(cloudflareTone(item.cloudflare_status))}
                          title={item.cloudflare_error ?? undefined}
                        >
                          {item.cloudflare_status === "ready"
                            ? "Cloudflare: Bereit"
                            : item.cloudflare_status === "error"
                              ? "Cloudflare: Fehler"
                              : "Cloudflare: Verarbeitung…"}
                        </Badge>
                      )}
                      {item.duration_seconds != null && (
                        <Badge {...pillProps("neutral")} className="cc-num">
                          {item.duration_seconds}s
                        </Badge>
                      )}
                    </HStack>
                  </Box>
                  <IconButton
                    aria-label={isExpanded ? "Einklappen" : "Ausklappen"}
                    icon={isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    size="sm"
                    variant="ghost"
                    color="var(--cc-text-2)"
                    _hover={{ color: "var(--cc-text)", bg: "transparent" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpanded(item.id);
                    }}
                    flexShrink={0}
                  />
                </HStack>

                {/* ── Ausgeklappter Inhalt ── */}
                <Collapse in={isExpanded} animateOpacity>
                  <Box
                    px={{ base: 3, md: 5 }}
                    pt={1}
                    pb={5}
                    borderTop="1px solid var(--cc-line)"
                  >
                    <Stack
                      direction={{ base: "column", lg: "row" }}
                      align={{ base: "stretch", lg: "flex-start" }}
                      spacing={4}
                      pt={4}
                    >
                      <HStack align="flex-start" spacing={0} flex={1} minW={0}>
                        <Stack flex={1} spacing={4} minW={0}>
                          {/* Subkategorie-Zuordnung — prominent oben */}
                          <FormControl>
                            <FormLabel
                              {...labelSx}
                              mb={1}
                            >
                              Zuordnung
                            </FormLabel>
                            <Select
                              size="md"
                              value={item.subcategory_id ?? "__direct__"}
                              onChange={(e) => void onMoveVideo(item, e.target.value)}
                              {...fieldStyles}
                              maxW="md"
                            >
                              <option value="__direct__" style={optionStyle}>Direkt im Modul (ohne Subkategorie)</option>
                              {orderedSubOptions.map((s) => (
                                <option key={s.id} value={s.id} style={optionStyle}>
                                  Subkategorie: {s.title}
                                </option>
                              ))}
                            </Select>
                          </FormControl>

                          <Divider borderColor="var(--cc-line)" />

                          <FormControl>
                            <FormLabel
                              {...labelSx}
                              mb={1}
                            >
                              Vorschaubild (Dashboard &amp; Institut-Karte)
                            </FormLabel>
                            <Text fontSize="sm" color="var(--cc-text-2)" mb={3}>
                              Entspricht der großen Bildfläche auf der Modulkarte, nicht nur der kleinen Liste in der
                              Videowiedergabe.
                            </Text>
                            <Box
                              position="relative"
                              w="100%"
                              maxW="360px"
                              borderRadius="10px"
                              border="1px solid var(--cc-line-strong)"
                              overflow="hidden"
                              role="img"
                            >
                              <Box position="relative" w="100%" pt="56.25%" bg="var(--cc-surface-2)">
                                {item.thumbnail_key ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={`/api/admin/storage-url?key=${encodeURIComponent(item.thumbnail_key)}`}
                                    alt=""
                                    style={{
                                      position: "absolute",
                                      inset: 0,
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                      display: "block",
                                    }}
                                  />
                                ) : (
                                  <Box
                                    position="absolute"
                                    inset={0}
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    bg="radial-gradient(circle at 100% 0%, rgba(212, 176, 128, 0.14), transparent 60%)"
                                  >
                                    <Text fontSize="sm" textAlign="center" px={4} color="var(--cc-text-2)">
                                      Noch kein Vorschaubild
                                    </Text>
                                  </Box>
                                )}
                              </Box>
                              <Box
                                position="absolute"
                                top={2}
                                right={2}
                                px={2}
                                py={1}
                                borderRadius="6px"
                                bg="rgba(8, 10, 12, 0.75)"
                                border="1px solid var(--cc-line-strong)"
                              >
                                <Text
                                  fontSize="10px"
                                  fontWeight={500}
                                  letterSpacing="0.06em"
                                  color="var(--cc-text-soft)"
                                  textTransform="uppercase"
                                  className="cc-num"
                                >
                                  16:9 wie im Dashboard
                                </Text>
                              </Box>
                            </Box>
                            <Button
                              mt={3}
                              size="md"
                              variant="line"
                              leftIcon={<ImagePlus size={18} />}
                              onClick={() => void onUploadThumbnail(item)}
                            >
                              Vorschaubild hochladen oder ersetzen
                            </Button>
                          </FormControl>

                          <FormControl>
                            <FormLabel
                              {...labelSx}
                              mb={2}
                            >
                              Titel
                            </FormLabel>
                            <Input
                              size="md"
                              value={item.title}
                              onChange={(e) => {
                                const v = e.target.value;
                                setItems((prev) =>
                                  prev.map((x) => (x.id === item.id ? { ...x, title: v } : x)),
                                );
                              }}
                              onBlur={() => void patch(item.id, { title: item.title })}
                              {...fieldStyles}
                            />
                          </FormControl>

                          <FormControl>
                            <FormLabel
                              {...labelSx}
                            >
                              Beschreibung (für Lernende)
                            </FormLabel>
                            <Textarea
                              size="md"
                              rows={3}
                              placeholder="Kurz erklären, worum es im Video geht…"
                              value={item.description ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                setItems((prev) =>
                                  prev.map((x) => (x.id === item.id ? { ...x, description: v } : x)),
                                );
                              }}
                              onBlur={() =>
                                void patch(item.id, {
                                  description: item.description?.trim() ? item.description.trim() : null,
                                })
                              }
                              {...fieldStyles}
                              fontSize="sm"
                            />
                          </FormControl>

                          <FormControl>
                            <FormLabel
                              {...labelSx}
                            >
                              Speicherort
                            </FormLabel>
                            {item.cloudflare_uid ? (
                              <Text
                                fontSize="xs"
                                className="cc-num"
                                color="var(--cc-text-2)"
                                title={item.cloudflare_uid}
                                noOfLines={2}
                                wordBreak="break-all"
                              >
                                Cloudflare Stream · {item.cloudflare_uid}
                              </Text>
                            ) : null}
                            {item.storage_key ? (
                              <Text
                                fontSize="xs"
                                className="cc-num"
                                color="var(--cc-text-3)"
                                title={item.storage_key}
                                noOfLines={2}
                                wordBreak="break-all"
                                mt={item.cloudflare_uid ? 1 : 0}
                              >
                                {item.cloudflare_uid ? "Legacy (Hetzner): " : ""}
                                {item.storage_key}
                              </Text>
                            ) : null}
                          </FormControl>

                          <AttachmentManager courseId={courseId} moduleId={moduleId} videoId={item.id} />
                        </Stack>
                      </HStack>

                      <VStack
                        align="stretch"
                        spacing={3}
                        minW={{ base: "100%", lg: "200px" }}
                        pl={{ base: 0, lg: 2 }}
                        borderLeftWidth={{ base: 0, lg: "1px" }}
                        borderColor="var(--cc-line)"
                        pt={{ base: 2, lg: 0 }}
                      >
                        <FormControl>
                          <FormLabel fontSize="sm" fontWeight={500} color="var(--cc-text-soft)" mb={1}>
                            Veröffentlicht
                          </FormLabel>
                          <HStack spacing={3}>
                            <Switch
                              size="lg"
                              isChecked={item.is_published}
                              onChange={(e) => {
                                const is_published = e.target.checked;
                                setItems((prev) =>
                                  prev.map((x) => (x.id === item.id ? { ...x, is_published } : x)),
                                );
                                void patch(item.id, { is_published });
                              }}
                              sx={switchSx}
                            />
                            <Text fontSize="sm" color="var(--cc-text-2)">
                              Sichtbar in der Plattform
                            </Text>
                          </HStack>
                        </FormControl>
                        <Button
                          size="md"
                          variant="line"
                          leftIcon={<Clock size={18} />}
                          isLoading={detectingDuration.has(item.id)}
                          loadingText="Ermittle…"
                          isDisabled={Boolean(item.cloudflare_uid) && item.cloudflare_status !== "ready"}
                          onClick={() => void onDetectDuration(item)}
                        >
                          {item.duration_seconds != null ? "Dauer neu ermitteln" : "Dauer ermitteln"}
                        </Button>
                        <Button
                          size="md"
                          variant="line"
                          leftIcon={<ArrowRightLeft size={18} />}
                          onClick={() => setMoveVideo(item)}
                        >
                          In anderes Modul verschieben
                        </Button>
                        <Button
                          size="md"
                          {...dangerLineProps}
                          leftIcon={<Trash2 size={18} />}
                          onClick={() => void remove(item.id)}
                        >
                          Video löschen
                        </Button>
                      </VStack>
                    </Stack>
                  </Box>
                </Collapse>
              </Stack>
            );
          }}
        />
      )}

      <CloudflareVideoUploader onUploaded={onUploaded} />

      <VideoMoveModal
        isOpen={moveVideo != null}
        onClose={() => setMoveVideo(null)}
        video={moveVideo ? { id: moveVideo.id, title: moveVideo.title } : null}
        currentCourseId={courseId}
        currentModuleId={moduleId}
        onMoved={onVideoMoved}
      />
    </Stack>
  );
}
