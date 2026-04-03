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
import { ChevronDown, ChevronRight, Clock, ImagePlus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { uploadSmallFilePresigned } from "@/lib/admin-upload-presigned";
import { AttachmentManager } from "@/components/admin/AttachmentManager";
import { DraggableList } from "@/components/admin/DraggableList";
import { VideoUploader, type VideoUploadedPayload } from "@/components/admin/VideoUploader";
import type { SubcategoryRow } from "@/components/admin/SubcategoryManager";

export type VideoRow = {
  id: string;
  module_id: string | null;
  subcategory_id: string | null;
  title: string;
  description: string | null;
  position: number;
  storage_key: string;
  thumbnail_key: string | null;
  duration_seconds: number | null;
  is_published: boolean;
  created_at: string;
};

type VideoManagerProps = {
  courseId: string;
  moduleId: string;
  subcategoryId?: string | null;
  allSubcategories?: SubcategoryRow[];
  /** Wenn gesetzt: externer State-Modus — VideoManager lädt keine eigenen Videos */
  externalVideos?: VideoRow[];
  onExternalVideosChange?: (updater: (prev: VideoRow[]) => VideoRow[]) => void;
};

export function VideoManager({
  courseId,
  moduleId,
  subcategoryId = null,
  allSubcategories,
  externalVideos,
  onExternalVideosChange,
}: VideoManagerProps) {
  const isExternal = externalVideos !== undefined && onExternalVideosChange !== undefined;

  const [internalItems, setInternalItems] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(!isExternal);
  const [allSubsState, setAllSubsState] = useState<SubcategoryRow[]>(allSubcategories ?? []);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Im externen Modus: filtere nur die Videos dieser Subkategorie (oder direkte Modul-Videos)
  const items: VideoRow[] = isExternal
    ? (externalVideos ?? []).filter((v) =>
        subcategoryId != null ? v.subcategory_id === subcategoryId : v.subcategory_id == null,
      )
    : internalItems;

  const setItems = isExternal
    ? (updater: (prev: VideoRow[]) => VideoRow[]) => onExternalVideosChange!(updater)
    : setInternalItems;

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

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (allSubcategories) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const onUploaded = async (payload: VideoUploadedPayload) => {
    const body = {
      id: payload.videoId,
      title: "Neues Video",
      position: items.length,
      storage_key: payload.storageKey,
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

  const orderedSubOptions = useMemo(
    () => [...allSubsState].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [allSubsState],
  );

  const [detectingDuration, setDetectingDuration] = useState<Set<string>>(new Set());

  const onDetectDuration = async (item: VideoRow) => {
    setDetectingDuration((prev) => new Set(prev).add(item.id));
    try {
      const res = await fetch(`/api/video-url?key=${encodeURIComponent(item.storage_key)}`);
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
    // Im externen Modus: nur die sichtbaren (gefilterten) Items neu sortieren
    if (isExternal) {
      const visibleIds = new Set(orderedIds);
      setItems((prev) => {
        const reordered = orderedIds
          .map((id, position) => {
            const row = prev.find((x) => x.id === id);
            return row ? { ...row, position } : null;
          })
          .filter(Boolean) as VideoRow[];
        return prev.map((x) => {
          const updated = reordered.find((r) => r.id === x.id);
          return updated ?? x;
        }).filter((x) => !visibleIds.has(x.id) || reordered.some((r) => r.id === x.id));
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
      <Text fontSize="sm" color="gray.500" className="inter">
        Videos werden geladen…
      </Text>
    );
  }

  const fieldStyles = {
    bg: "rgba(255,255,255,0.06)",
    borderColor: "whiteAlpha.300",
    color: "gray.100",
    _placeholder: { color: "gray.500" },
    _focus: { borderColor: "blue.400", boxShadow: "0 0 0 1px rgba(59,130,246,0.45)" },
  } as const;

  return (
    <Stack spacing={5}>
      <Box>
        <Text className="radley-regular" fontSize="lg" color="whiteAlpha.950">
          {subcategoryId ? "Videos in dieser Subkategorie" : "Videos direkt im Modul"}
        </Text>
        <Text mt={1} fontSize="sm" className="inter" color="gray.400">
          Reihenfolge per Griff links ändern. Auf den Titel klicken zum Auf-/Einklappen.
        </Text>
      </Box>

      {items.length === 0 ? (
        <Text fontSize="sm" color="gray.400" className="inter">
          Noch keine Videos — unten eine Videodatei hochladen.
        </Text>
      ) : (
        <DraggableList
          items={items}
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
                borderRadius="16px"
                borderWidth="1px"
                borderColor={isExpanded ? "rgba(212,175,55,0.3)" : "whiteAlpha.200"}
                bg="rgba(255,255,255,0.05)"
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
                  _hover={{ bg: "whiteAlpha.50" }}
                  transition="background 0.12s"
                  role="button"
                  aria-expanded={isExpanded}
                >
                  {handle}
                  <Box flex={1} minW={0}>
                    <HStack spacing={2} flexWrap="wrap">
                      <Text
                        className="inter"
                        fontSize="sm"
                        fontWeight="600"
                        color="gray.100"
                        noOfLines={1}
                        flex={1}
                        minW={0}
                      >
                        {item.title}
                      </Text>
                      {subLabel && (
                        <Badge
                          fontSize="10px"
                          colorScheme="purple"
                          variant="subtle"
                          px={2}
                          py={0.5}
                          borderRadius="md"
                          flexShrink={0}
                        >
                          {subLabel}
                        </Badge>
                      )}
                      <Badge
                        fontSize="10px"
                        colorScheme={item.is_published ? "green" : "gray"}
                        variant="subtle"
                        px={2}
                        py={0.5}
                        borderRadius="md"
                        flexShrink={0}
                      >
                        {item.is_published ? "Veröffentlicht" : "Entwurf"}
                      </Badge>
                      {item.duration_seconds != null && (
                        <Badge
                          fontSize="10px"
                          colorScheme="blue"
                          variant="subtle"
                          px={2}
                          py={0.5}
                          borderRadius="md"
                          flexShrink={0}
                        >
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
                    color="gray.400"
                    _hover={{ color: "gray.100", bg: "transparent" }}
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
                    borderTopWidth="1px"
                    borderColor="whiteAlpha.100"
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
                              className="inter"
                              fontSize="xs"
                              textTransform="uppercase"
                              letterSpacing="0.07em"
                              color="gray.300"
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
                              <option value="__direct__">Direkt im Modul (ohne Subkategorie)</option>
                              {orderedSubOptions.map((s) => (
                                <option key={s.id} value={s.id}>
                                  Subkategorie: {s.title}
                                </option>
                              ))}
                            </Select>
                          </FormControl>

                          <Divider borderColor="whiteAlpha.100" />

                          <FormControl>
                            <FormLabel
                              className="inter"
                              fontSize="xs"
                              textTransform="uppercase"
                              letterSpacing="0.07em"
                              color="gray.300"
                              mb={1}
                            >
                              Vorschaubild (Dashboard &amp; Institut-Karte)
                            </FormLabel>
                            <Text fontSize="sm" color="gray.500" className="inter" mb={3}>
                              Entspricht der großen Bildfläche auf der Modulkarte — nicht nur der kleinen Liste in der
                              Videowiedergabe.
                            </Text>
                            <Box
                              position="relative"
                              w="100%"
                              maxW="360px"
                              borderRadius="xl"
                              overflow="hidden"
                              role="img"
                            >
                              <Box position="relative" w="100%" pt="56.25%" bg="rgba(0,0,0,0.35)">
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
                                    bg="linear-gradient(145deg, rgba(212,175,55,0.15) 0%, rgba(15,23,42,0.9) 60%)"
                                  >
                                    <Text fontSize="sm" textAlign="center" px={4} color="gray.400" className="inter">
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
                                borderRadius="md"
                                bg="rgba(8,10,14,0.75)"
                                borderWidth="1px"
                                borderColor="whiteAlpha.200"
                              >
                                <Text
                                  fontSize="10px"
                                  className="inter-medium"
                                  color="gray.300"
                                  textTransform="uppercase"
                                >
                                  16:9 wie im Dashboard
                                </Text>
                              </Box>
                            </Box>
                            <Button
                              mt={3}
                              size="md"
                              colorScheme="blue"
                              leftIcon={<ImagePlus size={18} />}
                              onClick={() => void onUploadThumbnail(item)}
                            >
                              Vorschaubild hochladen oder ersetzen
                            </Button>
                          </FormControl>

                          <FormControl>
                            <FormLabel
                              className="inter"
                              fontSize="xs"
                              textTransform="uppercase"
                              letterSpacing="0.07em"
                              color="gray.300"
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
                              className="inter"
                              fontSize="xs"
                              textTransform="uppercase"
                              letterSpacing="0.07em"
                              color="gray.300"
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
                              className="inter"
                            />
                          </FormControl>

                          <FormControl>
                            <FormLabel
                              className="inter"
                              fontSize="xs"
                              textTransform="uppercase"
                              letterSpacing="0.07em"
                              color="gray.300"
                            >
                              Speicherort (Object Storage)
                            </FormLabel>
                            <Text
                              fontSize="xs"
                              className="jetbrains-mono"
                              color="gray.500"
                              title={item.storage_key}
                              noOfLines={2}
                              wordBreak="break-all"
                            >
                              {item.storage_key}
                            </Text>
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
                        borderColor="whiteAlpha.150"
                        pt={{ base: 2, lg: 0 }}
                      >
                        <FormControl>
                          <FormLabel className="inter" fontSize="sm" color="gray.200" mb={1}>
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
                              colorScheme="blue"
                            />
                            <Text fontSize="sm" color="gray.400" className="inter">
                              Sichtbar in der Plattform
                            </Text>
                          </HStack>
                        </FormControl>
                        <Button
                          size="md"
                          variant="outline"
                          colorScheme="blue"
                          leftIcon={<Clock size={18} />}
                          isLoading={detectingDuration.has(item.id)}
                          loadingText="Ermittle…"
                          onClick={() => void onDetectDuration(item)}
                        >
                          {item.duration_seconds != null ? "Dauer neu ermitteln" : "Dauer ermitteln"}
                        </Button>
                        <Button
                          size="md"
                          variant="outline"
                          colorScheme="red"
                          leftIcon={<Trash2 size={18} />}
                          borderWidth="2px"
                          borderColor="red.400"
                          color="red.100"
                          _hover={{ bg: "rgba(254, 178, 178, 0.12)" }}
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

      <VideoUploader
        courseId={courseId}
        moduleId={moduleId}
        subcategoryId={subcategoryId}
        onUploaded={onUploaded}
      />
    </Stack>
  );
}
