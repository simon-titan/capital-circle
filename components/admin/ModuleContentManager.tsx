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
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  VStack,
  useDisclosure,
} from "@chakra-ui/react";
import { ChevronDown, ChevronRight, Clock, ImagePlus, Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { uploadSmallFilePresigned } from "@/lib/admin-upload-presigned";
import { AttachmentManager } from "@/components/admin/AttachmentManager";
import { DraggableList } from "@/components/admin/DraggableList";
import type { SubcategoryRow } from "@/components/admin/SubcategoryManager";
import { VideoManager, type VideoRow } from "@/components/admin/VideoManager";
import { VideoUploader, type VideoUploadedPayload } from "@/components/admin/VideoUploader";

export type MergedRow =
  | { dndId: string; kind: "video"; video: VideoRow }
  | { dndId: string; kind: "subcategory"; sub: SubcategoryRow };

function buildMergedRows(allVideos: VideoRow[], subcategories: SubcategoryRow[]): MergedRow[] {
  const direct = allVideos.filter((v) => v.subcategory_id == null);
  const union: Array<
    | { pos: number; kind: "video"; video: VideoRow }
    | { pos: number; kind: "sub"; sub: SubcategoryRow }
  > = [
    ...direct.map((v) => ({ pos: v.position ?? 0, kind: "video" as const, video: v })),
    ...subcategories.map((s) => ({ pos: s.position ?? 0, kind: "sub" as const, sub: s })),
  ];
  union.sort((a, b) => a.pos - b.pos);
  return union.map((u) =>
    u.kind === "video"
      ? { dndId: `v:${u.video.id}`, kind: "video" as const, video: u.video }
      : { dndId: `s:${u.sub.id}`, kind: "subcategory" as const, sub: u.sub },
  );
}

function parseDndId(dndId: string): { type: "video" | "subcategory"; id: string } | null {
  if (dndId.startsWith("v:")) return { type: "video", id: dndId.slice(2) };
  if (dndId.startsWith("s:")) return { type: "subcategory", id: dndId.slice(2) };
  return null;
}

type ModuleContentManagerProps = {
  courseId: string;
  moduleId: string;
  allVideos: VideoRow[];
  setAllVideos: React.Dispatch<React.SetStateAction<VideoRow[]>>;
  subcategories: SubcategoryRow[];
  setSubcategories: React.Dispatch<React.SetStateAction<SubcategoryRow[]>>;
  /** Nach Löschen von Subkategorien o. Ä. Daten neu laden */
  onReload?: () => void | Promise<void>;
};

const fieldStyles = {
  bg: "rgba(255,255,255,0.06)",
  borderColor: "whiteAlpha.300",
  color: "gray.100",
  _placeholder: { color: "gray.500" },
  _focus: { borderColor: "blue.400", boxShadow: "0 0 0 1px rgba(59,130,246,0.45)" },
} as const;

export function ModuleContentManager({
  courseId,
  moduleId,
  allVideos,
  setAllVideos,
  subcategories,
  setSubcategories,
  onReload,
}: ModuleContentManagerProps) {
  const mergedRows = useMemo(
    () => buildMergedRows(allVideos, subcategories),
    [allVideos, subcategories],
  );

  const draggableItems = useMemo(
    () => mergedRows.map((r) => ({ ...r, id: r.dndId })),
    [mergedRows],
  );

  const orderedSubOptions = useMemo(
    () => [...subcategories].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [subcategories],
  );

  const [expandedVideoIds, setExpandedVideoIds] = useState<Set<string>>(new Set());
  const [expandedSubIds, setExpandedSubIds] = useState<Set<string>>(new Set());
  const [detectingDuration, setDetectingDuration] = useState<Set<string>>(new Set());

  const { isOpen: isCreateSubOpen, onOpen: onCreateSubOpen, onClose: onCreateSubClose } = useDisclosure();
  const [newSubTitle, setNewSubTitle] = useState("");
  const [newSubSaving, setNewSubSaving] = useState(false);

  const {
    isOpen: isEditSubOpen,
    onOpen: onEditSubOpen,
    onClose: onEditSubClose,
  } = useDisclosure();
  const [editSubId, setEditSubId] = useState<string | null>(null);
  const [editSubTitle, setEditSubTitle] = useState("");
  const [editSubDescription, setEditSubDescription] = useState("");
  const [editSubSaving, setEditSubSaving] = useState(false);

  const toggleVideo = (id: string) => {
    setExpandedVideoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSub = (id: string) => {
    setExpandedSubIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const patchVideo = useCallback(
    async (id: string, updates: Record<string, unknown>) => {
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
    },
    [setAllVideos],
  );

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
    setAllVideos((prev) => prev.map((x) => (x.id === item.id ? json.item! : x)));
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
        await patchVideo(item.id, { thumbnail_key: storageKey });
      } catch {
        // ignore
      }
    };
    picker.click();
  };

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
      await patchVideo(item.id, { duration_seconds: dur });
    } finally {
      setDetectingDuration((prev) => {
        const n = new Set(prev);
        n.delete(item.id);
        return n;
      });
    }
  };

  const removeVideo = async (id: string) => {
    if (!confirm("Video löschen?")) return;
    const res = await fetch(`/api/admin/videos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const json = (await res.json()) as { ok?: boolean };
    if (json.ok) setAllVideos((prev) => prev.filter((v) => v.id !== id));
  };

  const onUnifiedReorder = async (orderedDndIds: string[]) => {
    const orderedItems = orderedDndIds
      .map((dndId) => parseDndId(dndId))
      .filter((x): x is NonNullable<typeof x> => x != null)
      .map((x) => ({
        type: x.type === "video" ? ("video" as const) : ("subcategory" as const),
        id: x.id,
      }));

    setAllVideos((prev) => {
      const posByVideoId = new Map<string, number>();
      orderedDndIds.forEach((dndId, i) => {
        const p = parseDndId(dndId);
        if (p?.type === "video") posByVideoId.set(p.id, i);
      });
      return prev.map((v) => {
        if (v.subcategory_id != null) return v;
        const ni = posByVideoId.get(v.id);
        return ni !== undefined ? { ...v, position: ni } : v;
      });
    });
    setSubcategories((prev) => {
      const posBySubId = new Map<string, number>();
      orderedDndIds.forEach((dndId, i) => {
        const p = parseDndId(dndId);
        if (p?.type === "subcategory") posBySubId.set(p.id, i);
      });
      return prev.map((s) => {
        const ni = posBySubId.get(s.id);
        return ni !== undefined ? { ...s, position: ni } : s;
      });
    });

    const res = await fetch("/api/admin/module-content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId, orderedItems }),
    });
    const json = (await res.json()) as { ok?: boolean };
    if (!json.ok) void onReload?.();
  };

  const onDirectVideoUploaded = async (payload: VideoUploadedPayload) => {
    const tail = mergedRows.length;
    const body = {
      id: payload.videoId,
      title: "Neues Video",
      position: tail,
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

  const addSubcategory = async () => {
    if (!newSubTitle.trim()) return;
    setNewSubSaving(true);
    const res = await fetch("/api/admin/subcategories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        module_id: moduleId,
        title: newSubTitle.trim(),
        position: mergedRows.length,
      }),
    });
    const json = (await res.json()) as { ok?: boolean; item?: SubcategoryRow };
    setNewSubSaving(false);
    if (json.ok && json.item) {
      setSubcategories((prev) => [...prev, json.item!]);
      setNewSubTitle("");
      onCreateSubClose();
    }
  };

  const removeSubcategory = async (id: string) => {
    if (!confirm("Subkategorie wirklich löschen? Zugehörige Videos werden mit gelöscht.")) return;
    const res = await fetch(`/api/admin/subcategories?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const json = (await res.json()) as { ok?: boolean };
    if (json.ok) {
      setSubcategories((prev) => prev.filter((x) => x.id !== id));
      setAllVideos((prev) => prev.filter((v) => v.subcategory_id !== id));
      void onReload?.();
    }
  };

  const openEditSub = (row: SubcategoryRow) => {
    setEditSubId(row.id);
    setEditSubTitle(row.title);
    setEditSubDescription(row.description ?? "");
    onEditSubOpen();
  };

  const saveEditSub = async () => {
    if (!editSubId || !editSubTitle.trim()) return;
    setEditSubSaving(true);
    const res = await fetch("/api/admin/subcategories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editSubId,
        updates: { title: editSubTitle.trim(), description: editSubDescription.trim() || null },
      }),
    });
    const json = (await res.json()) as { ok?: boolean; item?: SubcategoryRow };
    setEditSubSaving(false);
    if (json.ok && json.item) {
      setSubcategories((prev) => prev.map((x) => (x.id === json.item!.id ? (json.item as SubcategoryRow) : x)));
      onEditSubClose();
      setEditSubId(null);
    }
  };

  const renderDirectVideoCard = (item: VideoRow, handle: ReactNode) => {
    const isExpanded = expandedVideoIds.has(item.id);
    return (
      <Stack
        key={`direct-video-${item.id}`}
        spacing={0}
        mb={3}
        borderRadius="16px"
        borderWidth="1px"
        borderColor={isExpanded ? "rgba(212,175,55,0.3)" : "whiteAlpha.200"}
        bg="rgba(255,255,255,0.05)"
        overflow="hidden"
        transition="border-color 0.15s"
      >
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
          {handle}
          <Box flex={1} minW={0}>
            <HStack spacing={2} flexWrap="wrap">
              <Text className="inter" fontSize="sm" fontWeight="600" color="gray.100" noOfLines={1} flex={1} minW={0}>
                {item.title}
              </Text>
              <Badge fontSize="10px" colorScheme="gray" variant="subtle" px={2} py={0.5} borderRadius="md" flexShrink={0}>
                Direkt im Modul
              </Badge>
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
                <Badge fontSize="10px" colorScheme="blue" variant="subtle" px={2} py={0.5} borderRadius="md" flexShrink={0}>
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
              toggleVideo(item.id);
            }}
            flexShrink={0}
          />
        </HStack>

        <Collapse in={isExpanded} animateOpacity>
          <Box px={{ base: 3, md: 5 }} pt={1} pb={5} borderTopWidth="1px" borderColor="whiteAlpha.100">
            <Stack direction={{ base: "column", lg: "row" }} align={{ base: "stretch", lg: "flex-start" }} spacing={4} pt={4}>
              <HStack align="flex-start" spacing={0} flex={1} minW={0}>
                <Stack flex={1} spacing={4} minW={0}>
                  <FormControl>
                    <FormLabel className="inter" fontSize="xs" textTransform="uppercase" letterSpacing="0.07em" color="gray.300" mb={1}>
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
                    <FormLabel className="inter" fontSize="xs" textTransform="uppercase" letterSpacing="0.07em" color="gray.300" mb={1}>
                      Vorschaubild (Dashboard &amp; Institut-Karte)
                    </FormLabel>
                    <Text fontSize="sm" color="gray.500" className="inter" mb={3}>
                      Entspricht der großen Bildfläche auf der Modulkarte.
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
                    </Box>
                    <Button mt={3} size="md" colorScheme="blue" leftIcon={<ImagePlus size={18} />} onClick={() => void onUploadThumbnail(item)}>
                      Vorschaubild hochladen oder ersetzen
                    </Button>
                  </FormControl>

                  <FormControl>
                    <FormLabel className="inter" fontSize="xs" textTransform="uppercase" letterSpacing="0.07em" color="gray.300" mb={2}>
                      Titel
                    </FormLabel>
                    <Input
                      size="md"
                      value={item.title}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAllVideos((prev) => prev.map((x) => (x.id === item.id ? { ...x, title: v } : x)));
                      }}
                      onBlur={() => void patchVideo(item.id, { title: item.title })}
                      {...fieldStyles}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel className="inter" fontSize="xs" textTransform="uppercase" letterSpacing="0.07em" color="gray.300">
                      Beschreibung (für Lernende)
                    </FormLabel>
                    <Textarea
                      size="md"
                      rows={3}
                      placeholder="Kurz erklären, worum es im Video geht…"
                      value={item.description ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAllVideos((prev) => prev.map((x) => (x.id === item.id ? { ...x, description: v } : x)));
                      }}
                      onBlur={() =>
                        void patchVideo(item.id, {
                          description: item.description?.trim() ? item.description.trim() : null,
                        })
                      }
                      {...fieldStyles}
                      fontSize="sm"
                      className="inter"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel className="inter" fontSize="xs" textTransform="uppercase" letterSpacing="0.07em" color="gray.300">
                      Speicherort (Object Storage)
                    </FormLabel>
                    <Text fontSize="xs" className="jetbrains-mono" color="gray.500" title={item.storage_key} noOfLines={2} wordBreak="break-all">
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
                        setAllVideos((prev) => prev.map((x) => (x.id === item.id ? { ...x, is_published } : x)));
                        void patchVideo(item.id, { is_published });
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
                  onClick={() => void removeVideo(item.id)}
                >
                  Video löschen
                </Button>
              </VStack>
            </Stack>
          </Box>
        </Collapse>
      </Stack>
    );
  };

  const renderSubcategoryCard = (sub: SubcategoryRow, handle: ReactNode) => {
    const isExpanded = expandedSubIds.has(sub.id);
    return (
      <Stack
        key={`s:${sub.id}`}
        spacing={0}
        mb={3}
        borderRadius="16px"
        borderWidth="1px"
        borderColor={isExpanded ? "rgba(147,51,234,0.35)" : "whiteAlpha.200"}
        bg="rgba(255,255,255,0.05)"
        overflow="hidden"
      >
        <HStack
          px={{ base: 3, md: 4 }}
          py={3}
          spacing={2}
          cursor="pointer"
          onClick={() => toggleSub(sub.id)}
          _hover={{ bg: "whiteAlpha.50" }}
          transition="background 0.12s"
          role="button"
          aria-expanded={isExpanded}
        >
          {handle}
          <Box flex={1} minW={0}>
            <HStack spacing={2} flexWrap="wrap">
              <Text className="inter" fontSize="sm" fontWeight="600" color="gray.100" noOfLines={1} flex={1} minW={0}>
                {sub.title}
              </Text>
              <Badge fontSize="10px" colorScheme="purple" variant="subtle" px={2} py={0.5} borderRadius="md">
                Subkategorie
              </Badge>
            </HStack>
          </Box>
          <Button
            size="sm"
            variant="outline"
            borderColor="whiteAlpha.400"
            color="gray.100"
            leftIcon={<Pencil size={14} />}
            onClick={(e) => {
              e.stopPropagation();
              openEditSub(sub);
            }}
          >
            Bearbeiten
          </Button>
          <Button
            size="sm"
            variant="outline"
            colorScheme="red"
            borderWidth="2px"
            borderColor="red.400"
            color="red.100"
            leftIcon={<Trash2 size={14} />}
            onClick={(e) => {
              e.stopPropagation();
              void removeSubcategory(sub.id);
            }}
          >
            Löschen
          </Button>
          <IconButton
            aria-label={isExpanded ? "Einklappen" : "Ausklappen"}
            icon={isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            size="sm"
            variant="ghost"
            color="gray.400"
            onClick={(e) => {
              e.stopPropagation();
              toggleSub(sub.id);
            }}
          />
        </HStack>

        <Collapse in={isExpanded} animateOpacity>
          <Box px={{ base: 3, md: 5 }} pt={2} pb={5} borderTopWidth="1px" borderColor="whiteAlpha.100">
            <Text fontSize="sm" color="gray.500" className="inter" mb={4}>
              {sub.description?.trim() ? sub.description : "Keine Beschreibung."}
            </Text>
            <VideoManager
              courseId={courseId}
              moduleId={moduleId}
              subcategoryId={sub.id}
              allSubcategories={subcategories}
              externalVideos={allVideos}
              onExternalVideosChange={setAllVideos}
            />
          </Box>
        </Collapse>
      </Stack>
    );
  };

  return (
    <Stack spacing={5}>
      <Box>
        <Text className="radley-regular" fontSize="xl" color="whiteAlpha.950">
          Inhalt des Moduls
        </Text>
        <Text mt={1} fontSize="sm" className="inter" color="gray.400">
          Videos und Subkategorien frei per Griff sortieren. Reihenfolge wird gespeichert. In Subkategorien: Videos separat sortieren.
        </Text>
      </Box>

      {draggableItems.length === 0 ? (
        <Text fontSize="sm" color="gray.400" className="inter">
          Noch keine direkten Videos und keine Subkategorien — unten hochladen oder Subkategorie anlegen.
        </Text>
      ) : (
        <DraggableList
          items={draggableItems}
          onReorder={onUnifiedReorder}
          renderItem={(row, handle) => {
            if (row.kind === "video") {
              return renderDirectVideoCard(row.video, handle);
            }
            return renderSubcategoryCard(row.sub, handle);
          }}
        />
      )}

      <HStack spacing={3} flexWrap="wrap">
        <Button size="md" colorScheme="blue" variant="solid" onClick={onCreateSubOpen}>
          Subkategorie anlegen
        </Button>
      </HStack>

      <VideoUploader courseId={courseId} moduleId={moduleId} subcategoryId={null} onUploaded={onDirectVideoUploaded} />

      <Modal isOpen={isCreateSubOpen} onClose={onCreateSubClose} isCentered>
        <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(4px)" />
        <ModalContent bg="rgba(10, 11, 14, 0.96)" border="1px solid rgba(255,255,255,0.09)" borderRadius="24px" mx={4}>
          <ModalHeader className="radley-regular" fontWeight={400}>
            Neue Subkategorie
          </ModalHeader>
          <ModalBody>
            <Input
              placeholder="Titel"
              value={newSubTitle}
              onChange={(e) => setNewSubTitle(e.target.value)}
              borderColor="whiteAlpha.200"
              _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 3px rgba(59,130,246,0.12)" }}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCreateSubClose}>
              Abbrechen
            </Button>
            <Button colorScheme="blue" onClick={() => void addSubcategory()} isLoading={newSubSaving} isDisabled={!newSubTitle.trim()}>
              Anlegen
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isEditSubOpen} onClose={() => { onEditSubClose(); setEditSubId(null); }} isCentered>
        <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(4px)" />
        <ModalContent bg="rgba(10, 11, 14, 0.96)" border="1px solid rgba(255,255,255,0.09)" borderRadius="24px" mx={4}>
          <ModalHeader className="radley-regular" fontWeight={400}>
            Subkategorie bearbeiten
          </ModalHeader>
          <ModalBody>
            <Stack spacing={3}>
              <Input
                placeholder="Titel"
                value={editSubTitle}
                onChange={(e) => setEditSubTitle(e.target.value)}
                borderColor="whiteAlpha.200"
                _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 3px rgba(59,130,246,0.12)" }}
              />
              <Textarea
                placeholder="Beschreibung (optional)"
                value={editSubDescription}
                onChange={(e) => setEditSubDescription(e.target.value)}
                rows={4}
                borderColor="whiteAlpha.200"
                _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 3px rgba(59,130,246,0.12)" }}
              />
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => { onEditSubClose(); setEditSubId(null); }}>
              Abbrechen
            </Button>
            <Button colorScheme="blue" onClick={() => void saveEditSub()} isLoading={editSubSaving} isDisabled={!editSubTitle.trim()}>
              Speichern
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}
