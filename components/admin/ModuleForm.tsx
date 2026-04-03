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
import { ChevronDown, ChevronRight, ImagePlus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AttachmentManager } from "@/components/admin/AttachmentManager";
import { SubcategoryManager, type SubcategoryRow } from "@/components/admin/SubcategoryManager";
import { VideoUploader, type VideoUploadedPayload } from "@/components/admin/VideoUploader";
import type { VideoRow } from "@/components/admin/VideoManager";

type ModuleFormProps = {
  courseId: string;
  moduleId?: string;
  initialModule?: {
    id: string;
    title: string;
    description: string | null;
    order_index: number;
    is_published: boolean;
    is_locked?: boolean;
    slug: string | null;
    thumbnail_storage_key: string | null;
  };
};

const fieldStyles = {
  bg: "rgba(255,255,255,0.06)",
  borderColor: "whiteAlpha.300",
  color: "gray.100",
  _placeholder: { color: "gray.500" },
  _focus: { borderColor: "blue.400", boxShadow: "0 0 0 1px rgba(59,130,246,0.45)" },
} as const;

const labelStyles = {
  className: "inter" as const,
  fontSize: "xs" as const,
  textTransform: "uppercase" as const,
  letterSpacing: "0.07em" as const,
  color: "gray.300" as const,
};

export function ModuleForm({ courseId, moduleId, initialModule }: ModuleFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialModule?.title ?? "");
  const [description, setDescription] = useState(initialModule?.description ?? "");
  const [slug, setSlug] = useState(initialModule?.slug ?? "");
  const [thumbnailStorageKey, setThumbnailStorageKey] = useState(
    initialModule?.thumbnail_storage_key ?? "",
  );
  const [orderIndex, setOrderIndex] = useState(initialModule?.order_index ?? 1);
  const [isPublished, setIsPublished] = useState(initialModule?.is_published ?? false);
  const [isLocked, setIsLocked] = useState(initialModule?.is_locked ?? false);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [thumbUploading, setThumbUploading] = useState(false);
  /** Feedback für Video-Thumbnail-Uploads (pro Video-ID) */
  const [videoThumbStatus, setVideoThumbStatus] = useState<Record<string, string>>({});

  // ── Zentraler Video- und Subkategorie-State ──
  const [allVideos, setAllVideos] = useState<VideoRow[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryRow[]>([]);
  const [contentLoaded, setContentLoaded] = useState(false);
  const [expandedVideoIds, setExpandedVideoIds] = useState<Set<string>>(new Set());

  const loadContent = useCallback(async () => {
    if (!moduleId) return;
    const [vRes, sRes] = await Promise.all([
      fetch(`/api/admin/videos?moduleId=${encodeURIComponent(moduleId)}&allForModule=1`),
      fetch(`/api/admin/subcategories?moduleId=${encodeURIComponent(moduleId)}`),
    ]);
    const vJson = (await vRes.json()) as { ok?: boolean; items?: VideoRow[] };
    const sJson = (await sRes.json()) as { ok?: boolean; items?: SubcategoryRow[] };
    if (vJson.ok && vJson.items) setAllVideos(vJson.items);
    if (sJson.ok && sJson.items) setSubcategories(sJson.items);
    setContentLoaded(true);
  }, [moduleId]);

  useEffect(() => { void loadContent(); }, [loadContent]);

  const orderedSubs = useMemo(
    () => [...subcategories].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [subcategories],
  );

  const toggleVideo = (id: string) => {
    setExpandedVideoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const patchVideo = async (id: string, updates: Record<string, unknown>) => {
    const res = await fetch("/api/admin/videos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, updates }),
    });
    const json = (await res.json()) as { ok?: boolean; item?: VideoRow };
    if (json.ok && json.item) {
      const updated = json.item;
      setAllVideos((prev) => prev.map((v) => (v.id === id ? updated : v)));
    }
  };

  const moveVideo = async (videoId: string, target: string) => {
    const updates =
      target === "__direct__"
        ? { module_id: moduleId, subcategory_id: null }
        : { module_id: null, subcategory_id: target };
    await patchVideo(videoId, updates);
  };

  const removeVideo = async (id: string) => {
    if (!confirm("Video löschen?")) return;
    const res = await fetch(`/api/admin/videos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const json = (await res.json()) as { ok?: boolean };
    if (json.ok) setAllVideos((prev) => prev.filter((v) => v.id !== id));
  };

  const onUploadThumbnailForVideo = async (item: VideoRow) => {
    const picker = document.createElement("input");
    picker.type = "file";
    picker.accept = "image/jpeg,image/png,image/webp";
    picker.onchange = async () => {
      const file = picker.files?.[0];
      if (!file || !moduleId) return;
      setVideoThumbStatus((prev) => ({ ...prev, [item.id]: "Wird hochgeladen…" }));
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
        if (!res.ok || !json.ok || !json.storageKey) {
          setVideoThumbStatus((prev) => ({ ...prev, [item.id]: json.error || "Upload fehlgeschlagen." }));
          return;
        }
        await patchVideo(item.id, { thumbnail_key: json.storageKey });
        setVideoThumbStatus((prev) => ({ ...prev, [item.id]: "Gespeichert." }));
      } catch (e) {
        setVideoThumbStatus((prev) => ({ ...prev, [item.id]: e instanceof Error ? e.message : "Fehler." }));
      }
    };
    picker.click();
  };

  const onVideoUploaded = async (payload: VideoUploadedPayload) => {
    if (!moduleId) return;
    const body = {
      id: payload.videoId,
      title: "Neues Video",
      position: allVideos.length,
      storage_key: payload.storageKey,
      duration_seconds: payload.durationSeconds,
      is_published: false,
      module_id: moduleId,
      subcategory_id: null,
    };
    const res = await fetch("/api/admin/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { ok?: boolean; item?: VideoRow };
    if (json.ok && json.item) {
      setAllVideos((prev) => [...prev, json.item!]);
      setExpandedVideoIds((prev) => new Set(prev).add(json.item!.id));
    }
  };

  // ── Modul-Metadaten ──
  const onSave = async () => {
    if (!title.trim()) {
      setStatus("Titel erforderlich.");
      return;
    }
    setSaving(true);
    setStatus(null);
    const payload = {
      course_id: courseId,
      title: title.trim(),
      description: description.trim() || null,
      order_index: orderIndex,
      is_published: isPublished,
      is_locked: isLocked,
      slug: slug.trim() || null,
      thumbnail_storage_key: thumbnailStorageKey.trim() || null,
    };

    if (moduleId) {
      const res = await fetch("/api/admin/modules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: moduleId, updates: payload }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      setSaving(false);
      setStatus(json.ok ? "Gespeichert." : json.error || "Fehler.");
      if (json.ok) router.refresh();
      return;
    }

    const res = await fetch("/api/admin/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as { ok?: boolean; item?: { id: string }; error?: string };
    setSaving(false);
    if (!json.ok || !json.item) {
      setStatus(json.error || "Anlegen fehlgeschlagen.");
      return;
    }
    router.push(`/admin/kurse/${courseId}/module/${json.item.id}`);
    router.refresh();
  };

  const onDelete = useCallback(async () => {
    if (!moduleId) return;
    if (!confirm("Modul wirklich löschen?")) return;
    const res = await fetch(`/api/admin/modules?id=${encodeURIComponent(moduleId)}`, {
      method: "DELETE",
    });
    const json = (await res.json()) as { ok?: boolean };
    if (json.ok) {
      router.push(`/admin/kurse/${courseId}`);
      router.refresh();
    }
  }, [courseId, moduleId, router]);

  const onUploadThumbnail = () => {
    if (!moduleId) return;
    const picker = document.createElement("input");
    picker.type = "file";
    picker.accept = "image/jpeg,image/png,image/webp";
    picker.onchange = async () => {
      const file = picker.files?.[0];
      if (!file) return;
      setThumbUploading(true);
      try {
        const params = new URLSearchParams({ folder: "covers", moduleId, courseId, fileName: file.name });
        const res = await fetch(`/api/admin/upload-proxy?${params.toString()}`, {
          method: "POST",
          headers: {
            "Content-Type": file.type || "image/jpeg",
            "X-File-Name": encodeURIComponent(file.name),
          },
          body: file,
        });
        const json = (await res.json()) as { ok?: boolean; storageKey?: string; error?: string };
        if (!res.ok || !json.ok || !json.storageKey) {
          setStatus(json.error || "Thumbnail-Upload fehlgeschlagen.");
          return;
        }
        const patch = await fetch("/api/admin/modules", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: moduleId, updates: { thumbnail_storage_key: json.storageKey } }),
        });
        const pj = (await patch.json()) as { ok?: boolean };
        if (pj.ok) {
          setThumbnailStorageKey(json.storageKey);
          setStatus("Thumbnail gespeichert.");
          router.refresh();
        }
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Fehler beim Thumbnail-Upload.");
      } finally {
        setThumbUploading(false);
      }
    };
    picker.click();
  };

  const videoFieldStyles = {
    bg: "rgba(255,255,255,0.06)",
    borderColor: "whiteAlpha.300",
    color: "gray.100",
    _placeholder: { color: "gray.500" },
    _focus: { borderColor: "blue.400", boxShadow: "0 0 0 1px rgba(59,130,246,0.45)" },
  } as const;

  return (
    <Stack spacing={8} maxW="960px">
      {/* ── Metadaten-Karte ── */}
      <Stack
        spacing={5}
        p={{ base: 4, md: 6 }}
        borderRadius="20px"
        borderWidth="1px"
        borderColor="whiteAlpha.200"
        bg="rgba(255,255,255,0.04)"
      >
        <Box>
          <Text className="radley-regular" fontSize="xl" color="whiteAlpha.950">
            Modul-Metadaten
          </Text>
          <Text mt={1} fontSize="sm" className="inter" color="gray.400">
            Titel, Beschreibung, Slug und Vorschaubild für die Akademie-Karte.
          </Text>
        </Box>

        <Divider borderColor="whiteAlpha.150" />

        <FormControl>
          <FormLabel {...labelStyles} mb={1}>
            Vorschaubild (Modul-Karte im Dashboard)
          </FormLabel>
          <Text fontSize="sm" color="gray.500" className="inter" mb={3}>
            Wird als großes 16:9-Bild auf der Akademie-Karte angezeigt.
            {!moduleId && (
              <Text as="span" color="yellow.400">
                {" "}Erst nach dem Anlegen des Moduls verfügbar.
              </Text>
            )}
          </Text>
          <Box position="relative" w="100%" maxW="400px" borderRadius="xl" overflow="hidden">
            <Box position="relative" w="100%" pt="56.25%" bg="rgba(0,0,0,0.35)">
              {thumbnailStorageKey ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/admin/storage-url?key=${encodeURIComponent(thumbnailStorageKey)}`}
                  alt=""
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <Box
                  position="absolute" inset={0} display="flex" alignItems="center" justifyContent="center"
                  bg="linear-gradient(145deg, rgba(212,175,55,0.15) 0%, rgba(15,23,42,0.9) 60%)"
                >
                  <Text fontSize="sm" textAlign="center" px={4} color="gray.400" className="inter">
                    Noch kein Vorschaubild
                  </Text>
                </Box>
              )}
              <Box position="absolute" top={2} right={2} px={2} py={1} borderRadius="md" bg="rgba(8,10,14,0.75)" borderWidth="1px" borderColor="whiteAlpha.200">
                <Text fontSize="10px" className="inter-medium" color="gray.300" textTransform="uppercase">16:9 wie im Dashboard</Text>
              </Box>
            </Box>
          </Box>
          <Button mt={3} size="md" colorScheme="blue" leftIcon={<ImagePlus size={18} />} onClick={onUploadThumbnail} isLoading={thumbUploading} isDisabled={!moduleId || thumbUploading}>
            Vorschaubild hochladen oder ersetzen
          </Button>
          {thumbnailStorageKey && (
            <Text mt={2} fontSize="xs" className="jetbrains-mono" color="gray.600" noOfLines={1}>{thumbnailStorageKey}</Text>
          )}
        </FormControl>

        <Divider borderColor="whiteAlpha.150" />

        <FormControl>
          <FormLabel {...labelStyles}>Titel</FormLabel>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} {...fieldStyles} />
        </FormControl>

        <FormControl>
          <FormLabel {...labelStyles}>URL-Slug (optional)</FormLabel>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="z. B. trading-grundlagen" {...fieldStyles} className="jetbrains-mono" fontSize="sm" />
        </FormControl>

        <FormControl>
          <FormLabel {...labelStyles}>Beschreibung</FormLabel>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} minH="100px" {...fieldStyles} className="inter" />
        </FormControl>

        <Divider borderColor="whiteAlpha.150" />

        <HStack spacing={6} align="center" flexWrap="wrap">
          <FormControl maxW="140px">
            <FormLabel {...labelStyles}>Reihenfolge</FormLabel>
            <Input type="number" min={1} value={orderIndex} onChange={(e) => setOrderIndex(Number(e.target.value))} {...fieldStyles} />
          </FormControl>
          <FormControl display="flex" alignItems="center" w="auto" pt={5}>
            <FormLabel mb={0} className="inter" fontSize="sm" color="gray.200">Veröffentlicht</FormLabel>
            <Switch ml={3} size="lg" isChecked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} colorScheme="blue" />
          </FormControl>
          <FormControl display="flex" alignItems="center" w="auto" pt={5}>
            <FormLabel mb={0} className="inter" fontSize="sm" color="gray.200">
              Modul sperren
            </FormLabel>
            <Switch ml={3} size="lg" isChecked={isLocked} onChange={(e) => setIsLocked(e.target.checked)} colorScheme="orange" />
          </FormControl>
          {moduleId && (
            <Badge alignSelf="flex-end" mb={1} px={3} py={1.5} borderRadius="md" colorScheme={isPublished ? "green" : "gray"} variant="subtle" fontSize="sm" className="inter">
              {isPublished ? "Sichtbar für Mitglieder" : "Versteckt"}
            </Badge>
          )}
        </HStack>

        <Divider borderColor="whiteAlpha.150" />

        <HStack spacing={3} flexWrap="wrap">
          <Button size="md" colorScheme="blue" onClick={() => void onSave()} isLoading={saving}>
            {moduleId ? "Änderungen speichern" : "Modul anlegen"}
          </Button>
          <Button as={Link} href={`/admin/kurse/${courseId}`} variant="outline" size="md" borderColor="whiteAlpha.300" color="gray.200">
            Zurück zur Kursübersicht
          </Button>
          {moduleId && (
            <Button size="md" variant="outline" colorScheme="red" borderWidth="2px" borderColor="red.400" color="red.100" _hover={{ bg: "rgba(254,178,178,0.1)" }} onClick={() => void onDelete()}>
              Modul löschen
            </Button>
          )}
        </HStack>

        {status && (
          <Text fontSize="sm" className="inter" color={status.includes("fehler") || status.includes("Fehler") ? "red.300" : "blue.200"}>
            {status}
          </Text>
        )}
      </Stack>

      {/* ── Videos (alle, flach, mit Zuordnungs-Dropdown) ── */}
      {moduleId && contentLoaded && (
        <Stack
          spacing={5}
          p={{ base: 4, md: 6 }}
          borderRadius="20px"
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          bg="rgba(255,255,255,0.04)"
        >
          <Box>
            <Text className="radley-regular" fontSize="xl" color="whiteAlpha.950">
              Videos
            </Text>
            <Text mt={1} fontSize="sm" className="inter" color="gray.400">
              Alle Videos dieses Moduls. Zuordnung (direkt oder Subkategorie) per Dropdown ändern.
            </Text>
          </Box>

          {allVideos.length === 0 ? (
            <Text fontSize="sm" color="gray.400" className="inter">
              Noch keine Videos — unten eine Datei hochladen.
            </Text>
          ) : (
            <Stack spacing={2}>
              {allVideos.map((item) => {
                const isExpanded = expandedVideoIds.has(item.id);
                const subLabel = item.subcategory_id
                  ? orderedSubs.find((s) => s.id === item.subcategory_id)?.title
                  : null;

                return (
                  <Stack
                    key={item.id}
                    spacing={0}
                    borderRadius="16px"
                    borderWidth="1px"
                    borderColor={isExpanded ? "rgba(212,175,55,0.3)" : "whiteAlpha.200"}
                    bg="rgba(255,255,255,0.05)"
                    overflow="hidden"
                    transition="border-color 0.15s"
                  >
                    {/* Header */}
                    <HStack
                      px={{ base: 3, md: 4 }}
                      py={3}
                      spacing={2}
                      cursor="pointer"
                      onClick={() => toggleVideo(item.id)}
                      _hover={{ bg: "whiteAlpha.50" }}
                      transition="background 0.12s"
                      role="button"
                      aria-expanded={isExpanded}
                    >
                      <Box flex={1} minW={0}>
                        <HStack spacing={2} flexWrap="wrap">
                          <Text className="inter" fontSize="sm" fontWeight="600" color="gray.100" noOfLines={1} flex={1} minW={0}>
                            {item.title}
                          </Text>
                          {subLabel ? (
                            <Badge fontSize="10px" colorScheme="purple" variant="subtle" px={2} py={0.5} borderRadius="md" flexShrink={0}>
                              {subLabel}
                            </Badge>
                          ) : (
                            <Badge fontSize="10px" colorScheme="gray" variant="subtle" px={2} py={0.5} borderRadius="md" flexShrink={0}>
                              Direkt im Modul
                            </Badge>
                          )}
                          <Badge fontSize="10px" colorScheme={item.is_published ? "green" : "gray"} variant="subtle" px={2} py={0.5} borderRadius="md" flexShrink={0}>
                            {item.is_published ? "Veröffentlicht" : "Entwurf"}
                          </Badge>
                        </HStack>
                      </Box>
                      <IconButton
                        aria-label={isExpanded ? "Einklappen" : "Ausklappen"}
                        icon={isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        size="sm"
                        variant="ghost"
                        color="gray.400"
                        _hover={{ color: "gray.100", bg: "transparent" }}
                        onClick={(e) => { e.stopPropagation(); toggleVideo(item.id); }}
                        flexShrink={0}
                      />
                    </HStack>

                    {/* Detail */}
                    <Collapse in={isExpanded} animateOpacity>
                      <Box px={{ base: 3, md: 5 }} pt={1} pb={5} borderTopWidth="1px" borderColor="whiteAlpha.100">
                        <Stack direction={{ base: "column", lg: "row" }} align={{ base: "stretch", lg: "flex-start" }} spacing={4} pt={4}>
                          <Stack flex={1} spacing={4} minW={0}>

                            {/* Zuordnung — ganz oben und prominent */}
                            <FormControl>
                              <FormLabel {...labelStyles} mb={1}>Zuordnung</FormLabel>
                              <Select
                                size="md"
                                value={item.subcategory_id ?? "__direct__"}
                                onChange={(e) => void moveVideo(item.id, e.target.value)}
                                {...videoFieldStyles}
                                maxW="md"
                              >
                                <option value="__direct__">Direkt im Modul (ohne Subkategorie)</option>
                                {orderedSubs.map((s) => (
                                  <option key={s.id} value={s.id}>Subkategorie: {s.title}</option>
                                ))}
                              </Select>
                            </FormControl>

                            <Divider borderColor="whiteAlpha.100" />

                            {/* Vorschaubild */}
                            <FormControl>
                              <FormLabel {...labelStyles} mb={1}>Vorschaubild</FormLabel>
                              <Box position="relative" w="100%" maxW="320px" borderRadius="xl" overflow="hidden" role="img">
                                <Box position="relative" w="100%" pt="56.25%" bg="rgba(0,0,0,0.35)">
                                  {item.thumbnail_key ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={`/api/admin/storage-url?key=${encodeURIComponent(item.thumbnail_key)}`}
                                      alt=""
                                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                    />
                                  ) : (
                                    <Box position="absolute" inset={0} display="flex" alignItems="center" justifyContent="center" bg="linear-gradient(145deg, rgba(212,175,55,0.15) 0%, rgba(15,23,42,0.9) 60%)">
                                      <Text fontSize="sm" textAlign="center" px={4} color="gray.400" className="inter">Noch kein Vorschaubild</Text>
                                    </Box>
                                  )}
                                </Box>
                              </Box>
                              <Button mt={2} size="sm" colorScheme="blue" leftIcon={<ImagePlus size={16} />} onClick={() => void onUploadThumbnailForVideo(item)}
                                isLoading={videoThumbStatus[item.id] === "Wird hochgeladen…"}
                                isDisabled={videoThumbStatus[item.id] === "Wird hochgeladen…"}
                              >
                                Vorschaubild hochladen
                              </Button>
                              {videoThumbStatus[item.id] && videoThumbStatus[item.id] !== "Wird hochgeladen…" ? (
                                <Text
                                  mt={1}
                                  fontSize="xs"
                                  className="inter"
                                  color={videoThumbStatus[item.id].includes("fehlgeschlagen") || videoThumbStatus[item.id].includes("Fehler") ? "red.300" : "green.300"}
                                >
                                  {videoThumbStatus[item.id]}
                                </Text>
                              ) : null}
                            </FormControl>

                            {/* Titel */}
                            <FormControl>
                              <FormLabel {...labelStyles} mb={1}>Titel</FormLabel>
                              <Input
                                size="md"
                                value={item.title}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setAllVideos((prev) => prev.map((x) => (x.id === item.id ? { ...x, title: v } : x)));
                                }}
                                onBlur={() => void patchVideo(item.id, { title: item.title })}
                                {...videoFieldStyles}
                              />
                            </FormControl>

                            {/* Beschreibung */}
                            <FormControl>
                              <FormLabel {...labelStyles}>Beschreibung (für Lernende)</FormLabel>
                              <Textarea
                                size="md"
                                rows={3}
                                placeholder="Kurz erklären, worum es im Video geht…"
                                value={item.description ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setAllVideos((prev) => prev.map((x) => (x.id === item.id ? { ...x, description: v } : x)));
                                }}
                                onBlur={() => void patchVideo(item.id, { description: item.description?.trim() || null })}
                                {...videoFieldStyles}
                                fontSize="sm"
                                className="inter"
                              />
                            </FormControl>

                            {/* Storage Key */}
                            <FormControl>
                              <FormLabel {...labelStyles}>Speicherort</FormLabel>
                              <Text fontSize="xs" className="jetbrains-mono" color="gray.500" noOfLines={2} wordBreak="break-all">{item.storage_key}</Text>
                            </FormControl>

                            <AttachmentManager courseId={courseId} moduleId={moduleId} videoId={item.id} />
                          </Stack>

                          <VStack align="stretch" spacing={3} minW={{ base: "100%", lg: "200px" }} pl={{ base: 0, lg: 2 }} borderLeftWidth={{ base: 0, lg: "1px" }} borderColor="whiteAlpha.150" pt={{ base: 2, lg: 0 }}>
                            <FormControl>
                              <FormLabel className="inter" fontSize="sm" color="gray.200" mb={1}>Veröffentlicht</FormLabel>
                              <HStack spacing={3}>
                                <Switch
                                  size="lg"
                                  isChecked={item.is_published}
                                  onChange={(e) => {
                                    const is_published = e.target.checked;
                                    setAllVideos((prev) => prev.map((x) => (x.id === item.id ? { ...x, is_published } : x)));
                                    void patchVideo(item.id, { is_published });
                                  }}
                                  colorScheme="blue"
                                />
                                <Text fontSize="sm" color="gray.400" className="inter">Sichtbar</Text>
                              </HStack>
                            </FormControl>
                            <Button size="md" variant="outline" colorScheme="red" leftIcon={<Trash2 size={18} />} borderWidth="2px" borderColor="red.400" color="red.100" _hover={{ bg: "rgba(254,178,178,0.12)" }} onClick={() => void removeVideo(item.id)}>
                              Video löschen
                            </Button>
                          </VStack>
                        </Stack>
                      </Box>
                    </Collapse>
                  </Stack>
                );
              })}
            </Stack>
          )}

          <VideoUploader courseId={courseId} moduleId={moduleId} subcategoryId={null} onUploaded={onVideoUploaded} />
        </Stack>
      )}

      {/* ── Subkategorien (CRUD, kein Video-Manager mehr darin) ── */}
      {moduleId && contentLoaded && (
        <Stack
          spacing={4}
          p={{ base: 4, md: 6 }}
          borderRadius="20px"
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          bg="rgba(255,255,255,0.04)"
        >
          <SubcategoryManager
            moduleId={moduleId}
            subcategories={subcategories}
            onSubcategoriesChange={setSubcategories}
          />
        </Stack>
      )}
    </Stack>
  );
}
