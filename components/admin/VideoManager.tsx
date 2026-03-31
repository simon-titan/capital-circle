"use client";

import {
  Badge,
  Box,
  Button,
  Divider,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { ImagePlus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
};

export function VideoManager({ courseId, moduleId, subcategoryId = null, allSubcategories }: VideoManagerProps) {
  const [items, setItems] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [allSubsState, setAllSubsState] = useState<SubcategoryRow[]>(allSubcategories ?? []);

  const qs =
    subcategoryId != null
      ? `subcategoryId=${encodeURIComponent(subcategoryId)}`
      : `moduleId=${encodeURIComponent(moduleId)}`;

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/videos?${qs}`);
    const json = (await res.json()) as { ok?: boolean; items?: VideoRow[] };
    if (json.ok && json.items) setItems(json.items);
    setLoading(false);
  }, [qs]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const onUploaded = async (payload: VideoUploadedPayload) => {
    const body = {
      id: payload.videoId,
      title: "Neues Video",
      position: items.length,
      storage_key: payload.storageKey,
      duration_seconds: payload.durationSeconds,
      is_published: false,
      ...(subcategoryId ? { subcategory_id: subcategoryId, module_id: null } : { module_id: moduleId, subcategory_id: null }),
    };
    const res = await fetch("/api/admin/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { ok?: boolean; item?: VideoRow };
    if (json.ok && json.item) setItems((prev) => [...prev, json.item!]);
  };

  const patch = async (id: string, updates: Record<string, unknown>) => {
    const res = await fetch("/api/admin/videos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, updates }),
    });
    const json = (await res.json()) as { ok?: boolean; item?: VideoRow };
    if (json.ok && json.item) {
      setItems((prev) => prev.map((v) => (v.id === id ? json.item! : v)));
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
        const params = new URLSearchParams({
          folder: "videos",
          courseId,
          moduleId,
          videoId: item.id,
          kind: "thumbnail",
        });
        if (item.subcategory_id) params.set("subcategoryId", item.subcategory_id);
        const res = await fetch(`/api/admin/upload-proxy?${params.toString()}`, {
          method: "POST",
          headers: {
            "Content-Type": file.type || "image/jpeg",
            "X-File-Name": encodeURIComponent(file.name),
          },
          body: file,
        });
        const json = (await res.json()) as { ok?: boolean; storageKey?: string; error?: string };
        if (!res.ok || !json.ok || !json.storageKey) return;
        await patch(item.id, { thumbnail_key: json.storageKey });
      } catch {
        // bleibt stabil; optional: Toast
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

    setItems((prev) => {
      if (subcategoryId == null) {
        if (json.item?.subcategory_id) return prev.filter((x) => x.id !== item.id);
        return prev.map((x) => (x.id === item.id ? json.item! : x));
      }
      if (json.item?.subcategory_id !== subcategoryId) return prev.filter((x) => x.id !== item.id);
      return prev.map((x) => (x.id === item.id ? json.item! : x));
    });
  };

  const orderedSubOptions = useMemo(
    () => [...allSubsState].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [allSubsState],
  );

  const remove = async (id: string) => {
    if (!confirm("Video löschen?")) return;
    const res = await fetch(`/api/admin/videos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const json = (await res.json()) as { ok?: boolean };
    if (json.ok) setItems((prev) => prev.filter((x) => x.id !== id));
  };

  const onReorder = async (orderedIds: string[]) => {
    const next = orderedIds
      .map((id, position) => {
        const row = items.find((x) => x.id === id);
        return row ? { ...row, position } : null;
      })
      .filter(Boolean) as VideoRow[];
    setItems(next);
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
          Reihenfolge per Griff links ändern. Pro Video: Zuordnung, Vorschaubild, Veröffentlichung und Dateien.
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
          renderItem={(item, handle) => (
            <Stack
              key={item.id}
              spacing={0}
              py={4}
              px={{ base: 3, md: 5 }}
              mb={3}
              borderRadius="16px"
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              bg="rgba(255,255,255,0.05)"
            >
              <Stack
                direction={{ base: "column", lg: "row" }}
                align={{ base: "stretch", lg: "flex-start" }}
                spacing={4}
              >
                <HStack align="flex-start" spacing={0} flex={1} minW={0}>
                  {handle}
                  <Stack flex={1} spacing={4} minW={0}>
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
                      <Box position="relative" w="100%" maxW="360px" borderRadius="xl" overflow="hidden" role="img">
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
                          <Text fontSize="10px" className="inter-medium" color="gray.300" textTransform="uppercase">
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
                          setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, title: v } : x)));
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
                          setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, description: v } : x)));
                        }}
                        onBlur={() =>
                          void patch(item.id, { description: item.description?.trim() ? item.description.trim() : null })
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

                    <Divider borderColor="whiteAlpha.150" />

                    <Stack spacing={3} direction={{ base: "column", sm: "row" }} align={{ sm: "flex-end" }} flexWrap="wrap">
                      <FormControl flex={1} minW={{ base: "100%", sm: "240px" }} maxW="md">
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
                        >
                          <option value="__direct__">Direkt im Modul (ohne Subkategorie)</option>
                          {orderedSubOptions.map((s) => (
                            <option key={s.id} value={s.id}>
                              Subkategorie: {s.title}
                            </option>
                          ))}
                        </Select>
                      </FormControl>
                      <Badge
                        px={3}
                        py={2}
                        borderRadius="md"
                        variant="subtle"
                        colorScheme="blue"
                        fontSize="sm"
                        className="inter"
                        alignSelf="flex-start"
                      >
                        Dauer: {item.duration_seconds != null ? `${item.duration_seconds}s` : "unbekannt"}
                      </Badge>
                    </Stack>

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
                          setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, is_published } : x)));
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
            </Stack>
          )}
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
