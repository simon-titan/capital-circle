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
  Stack,
  Switch,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { ImagePlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { uploadSmallFilePresigned } from "@/lib/admin-upload-presigned";
import { SubcategoryManager, type SubcategoryRow } from "@/components/admin/SubcategoryManager";
import { VideoManager, type VideoRow } from "@/components/admin/VideoManager";

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

  // ── Zentraler Video- und Subkategorie-State ──
  const [allVideos, setAllVideos] = useState<VideoRow[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryRow[]>([]);
  const [contentLoaded, setContentLoaded] = useState(false);

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
        const storageKey = await uploadSmallFilePresigned(file, { folder: "covers", moduleId, courseId });
        const patch = await fetch("/api/admin/modules", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: moduleId, updates: { thumbnail_storage_key: storageKey } }),
        });
        const pj = (await patch.json()) as { ok?: boolean };
        if (pj.ok) {
          setThumbnailStorageKey(storageKey);
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

      {/* ── Videos direkt im Modul (Drag & Drop) ── */}
      {moduleId && contentLoaded && (
        <Stack
          spacing={5}
          p={{ base: 4, md: 6 }}
          borderRadius="20px"
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          bg="rgba(255,255,255,0.04)"
        >
          <VideoManager
            courseId={courseId}
            moduleId={moduleId}
            subcategoryId={null}
            allSubcategories={subcategories}
            externalVideos={allVideos}
            onExternalVideosChange={setAllVideos}
          />
        </Stack>
      )}

      {/* ── Subkategorien (CRUD) ── */}
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

      {/* ── Videos pro Subkategorie (Drag & Drop) ── */}
      {moduleId && contentLoaded && orderedSubs.map((sub) => (
        <Stack
          key={sub.id}
          spacing={5}
          p={{ base: 4, md: 6 }}
          borderRadius="20px"
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          bg="rgba(255,255,255,0.04)"
        >
          <VideoManager
            courseId={courseId}
            moduleId={moduleId}
            subcategoryId={sub.id}
            allSubcategories={subcategories}
            externalVideos={allVideos}
            onExternalVideosChange={setAllVideos}
          />
        </Stack>
      ))}
    </Stack>
  );
}
