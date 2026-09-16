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
import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { uploadSmallFilePresigned } from "@/lib/admin-upload-presigned";
import { ImageDropZone } from "@/components/admin/ImageDropZone";
import { ModuleContentManager } from "@/components/admin/ModuleContentManager";
import type { SubcategoryRow } from "@/components/admin/SubcategoryManager";
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
  bg: "rgba(255, 255, 255, 0.03)",
  border: "1px solid",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  color: "var(--cc-text)",
  _placeholder: { color: "var(--cc-text-3)" },
  _hover: { borderColor: "rgba(255, 255, 255, 0.22)" },
  _focusVisible: { borderColor: "var(--cc-gold-line)", boxShadow: "0 0 0 1px var(--cc-gold-line)" },
} as const;

const labelStyles = {
  fontSize: "13px" as const,
  fontWeight: 500 as const,
  color: "var(--cc-text-2)" as const,
};

const switchSx = {
  ".chakra-switch__track": { bg: "var(--cc-track)", boxShadow: "inset 0 0 0 1px var(--cc-line-strong)" },
  ".chakra-switch__track[data-checked]": { bg: "var(--cc-gold)", boxShadow: "none" },
} as const;

const pillBase = {
  borderRadius: "full",
  px: 2.5,
  py: 1,
  fontSize: "12px",
  fontWeight: 500,
  textTransform: "none",
  letterSpacing: "normal",
} as const;

const dangerButton = {
  variant: "line",
  color: "var(--cc-danger)",
  _hover: { bg: "rgba(248, 113, 113, 0.08)", borderColor: "rgba(248, 113, 113, 0.45)", boxShadow: "none" },
} as const;

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
  const [thumbRemoving, setThumbRemoving] = useState(false);

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

  /**
   * Nimmt die Datei entgegen — egal ob hereingezogen oder über den Knopf
   * ausgewählt. Der Dateidialog wird hier bewusst nicht mehr selbst geöffnet;
   * das übernimmt `ImageDropZone`, damit beide Wege dieselbe Logik teilen.
   */
  const onThumbnailDatei = useCallback(
    async (file: File) => {
      if (!moduleId) return;
      setThumbUploading(true);
      setStatus(null);
      try {
        const storageKey = await uploadSmallFilePresigned(file, { folder: "covers", moduleId, courseId });
        const patch = await fetch("/api/admin/modules", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: moduleId, updates: { thumbnail_storage_key: storageKey } }),
        });
        const pj = (await patch.json()) as { ok?: boolean; error?: string };
        if (!pj.ok) {
          setStatus(pj.error ?? "Vorschaubild konnte nicht gespeichert werden.");
          return;
        }
        setThumbnailStorageKey(storageKey);
        setStatus("Vorschaubild gespeichert.");
        router.refresh();
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Fehler beim Hochladen des Vorschaubilds.");
      } finally {
        setThumbUploading(false);
      }
    },
    [courseId, moduleId, router],
  );

  /**
   * Vorschaubild entfernen. Nur der Verweis in der Datenbank wird geleert — die
   * Datei bleibt in R2 liegen. Absicht: Ein versehentliches Löschen ist so ohne
   * erneuten Upload rückgängig zu machen, und dieselbe Datei kann an mehreren
   * Stellen verwendet werden.
   */
  const onRemoveThumbnail = async () => {
    if (!moduleId || !thumbnailStorageKey) return;
    if (!confirm("Vorschaubild entfernen? Das Modul zeigt danach wieder die Standard-Ansicht.")) return;
    setThumbRemoving(true);
    try {
      const patch = await fetch("/api/admin/modules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: moduleId, updates: { thumbnail_storage_key: null } }),
      });
      const pj = (await patch.json()) as { ok?: boolean; error?: string };
      if (!pj.ok) {
        setStatus(pj.error ?? "Vorschaubild konnte nicht entfernt werden.");
        return;
      }
      setThumbnailStorageKey("");
      setStatus("Vorschaubild entfernt.");
      router.refresh();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Fehler beim Entfernen des Vorschaubilds.");
    } finally {
      setThumbRemoving(false);
    }
  };

  return (
    <Stack spacing={8} w="full">
      {/* ── Metadaten-Karte ── */}
      {/*
        Nur das Formular bleibt schmal: Eingabefelder über die volle Schirmbreite
        sind unlesbar. Der Modul-Inhalt darunter nimmt dagegen die ganze Breite,
        weil dort Inhaltsliste und Stapel nebeneinander stehen.
      */}
      <Stack spacing={5} maxW="960px" className="cc-card cc-card--still" p={{ base: 4, md: 6 }}>
        <Box>
          <Text fontSize="18px" fontWeight={600} color="var(--cc-text)">
            Modul-Metadaten
          </Text>
          <Text mt={1} fontSize="14px" color="var(--cc-text-2)">
            Titel, Beschreibung, Slug und Vorschaubild für die Akademie-Karte.
          </Text>
        </Box>

        <Divider borderColor="var(--cc-line)" opacity={1} />

        <FormControl>
          <FormLabel {...labelStyles} mb={1}>
            Vorschaubild (Modul-Karte im Dashboard)
          </FormLabel>
          <Text fontSize="13px" color="var(--cc-text-3)" mb={3}>
            Wird als großes 16:9-Bild auf der Akademie-Karte angezeigt.
            {!moduleId && (
              <Text as="span" color="var(--cc-gold-light)">
                {" "}Erst nach dem Anlegen des Moduls verfügbar.
              </Text>
            )}
          </Text>
          <ImageDropZone
            previewUrl={
              thumbnailStorageKey
                ? `/api/admin/storage-url?key=${encodeURIComponent(thumbnailStorageKey)}`
                : null
            }
            onFile={onThumbnailDatei}
            busy={thumbUploading}
            disabled={!moduleId}
            platzhalter={moduleId ? "Vorschaubild hierher ziehen" : "Erst das Modul anlegen"}
            ecke={
              <Box px={2} py={1} borderRadius="6px" bg="var(--cc-bg-raised)" border="1px solid var(--cc-line-strong)">
                <Text fontSize="10px" fontWeight={500} letterSpacing="0.06em" color="var(--cc-text-2)" textTransform="uppercase">
                  16:9 wie im Institut
                </Text>
              </Box>
            }
            aktionen={
              thumbnailStorageKey ? (
                <Button
                  size="md"
                  variant="line"
                  leftIcon={<Trash2 size={16} />}
                  onClick={() => void onRemoveThumbnail()}
                  isLoading={thumbRemoving}
                  isDisabled={thumbUploading}
                  color="var(--cc-danger)"
                  borderColor="rgba(248, 113, 113, 0.4)"
                  _hover={{ bg: "rgba(248, 113, 113, 0.08)", borderColor: "rgba(248, 113, 113, 0.6)", boxShadow: "none" }}
                >
                  Entfernen
                </Button>
              ) : null
            }
          />
          {thumbnailStorageKey && (
            <Text mt={2} fontSize="12px" className="cc-num" color="var(--cc-text-3)" noOfLines={1}>{thumbnailStorageKey}</Text>
          )}
        </FormControl>

        <Divider borderColor="var(--cc-line)" opacity={1} />

        <FormControl>
          <FormLabel {...labelStyles}>Titel</FormLabel>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} {...fieldStyles} />
        </FormControl>

        <FormControl>
          <FormLabel {...labelStyles}>URL-Slug (optional)</FormLabel>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="z. B. trading-grundlagen" {...fieldStyles} fontSize="sm" />
        </FormControl>

        <FormControl>
          <FormLabel {...labelStyles}>Beschreibung</FormLabel>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} minH="100px" {...fieldStyles} />
        </FormControl>

        <Divider borderColor="var(--cc-line)" opacity={1} />

        <HStack spacing={6} align="center" flexWrap="wrap">
          <FormControl maxW="140px">
            <FormLabel {...labelStyles}>Reihenfolge</FormLabel>
            <Input type="number" min={1} value={orderIndex} onChange={(e) => setOrderIndex(Number(e.target.value))} className="cc-num" {...fieldStyles} />
          </FormControl>
          <FormControl display="flex" alignItems="center" w="auto" pt={5}>
            <FormLabel mb={0} fontSize="14px" color="var(--cc-text-soft)">Veröffentlicht</FormLabel>
            <Switch ml={3} size="lg" isChecked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} sx={switchSx} />
          </FormControl>
          <FormControl display="flex" alignItems="center" w="auto" pt={5}>
            <FormLabel mb={0} fontSize="14px" color="var(--cc-text-soft)">
              Modul sperren
            </FormLabel>
            <Switch ml={3} size="lg" isChecked={isLocked} onChange={(e) => setIsLocked(e.target.checked)} sx={switchSx} />
          </FormControl>
          {moduleId && (
            <Badge
              alignSelf="flex-end"
              mb={1}
              {...pillBase}
              bg={isPublished ? "rgba(74, 222, 128, 0.12)" : "rgba(255, 255, 255, 0.06)"}
              color={isPublished ? "var(--cc-success)" : "var(--cc-text-2)"}
            >
              {isPublished ? "Sichtbar für Mitglieder" : "Versteckt"}
            </Badge>
          )}
        </HStack>

        <Divider borderColor="var(--cc-line)" opacity={1} />

        <HStack spacing={3} flexWrap="wrap">
          <Button size="md" variant="gold" onClick={() => void onSave()} isLoading={saving}>
            {moduleId ? "Änderungen speichern" : "Modul anlegen"}
          </Button>
          <Button as={Link} href={`/admin/kurse/${courseId}`} variant="line" size="md">
            Zurück zur Kursübersicht
          </Button>
          {moduleId && (
            <Button size="md" {...dangerButton} onClick={() => void onDelete()}>
              Modul löschen
            </Button>
          )}
        </HStack>

        {status && (
          <Text fontSize="14px" color={status.includes("fehler") || status.includes("Fehler") ? "var(--cc-danger)" : "var(--cc-text-2)"}>
            {status}
          </Text>
        )}
      </Stack>

      {/* ── Modul-Inhalt: Videos + Subkategorien (einheitliches Drag & Drop) ── */}
      {moduleId && contentLoaded && (
        <Stack spacing={5} className="cc-card cc-card--still" p={{ base: 4, md: 6 }}>
          <ModuleContentManager
            courseId={courseId}
            moduleId={moduleId}
            allVideos={allVideos}
            setAllVideos={setAllVideos}
            subcategories={subcategories}
            setSubcategories={setSubcategories}
            onReload={loadContent}
          />
        </Stack>
      )}
    </Stack>
  );
}
