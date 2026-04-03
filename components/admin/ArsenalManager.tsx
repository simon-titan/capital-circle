"use client";

import {
  Box,
  Button,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Select,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { uploadSmallFilePresigned } from "@/lib/admin-upload-presigned";
import { DraggableList } from "@/components/admin/DraggableList";
import { createClient } from "@/lib/supabase/client";
import { Star, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";

type ArsenalCard = {
  id: string;
  category: string;
  title: string;
  description: string | null;
  external_url: string | null;
  logo_storage_key: string | null;
  feature_bullets: unknown;
  position: number;
  /** Manuelle Reihenfolge (Admin); fällt auf position zurück wenn nicht gesetzt */
  sort_order?: number;
  is_featured?: boolean;
  logo_bg?: string | null;
};

type ModuleWithCourse = {
  id: string;
  title: string;
  course_id: string;
  course_title: string;
};

type VideoOpt = { id: string; title: string; module_id: string | null };

type ArsenalCatRow = {
  id: string;
  name: string;
  kind_scope: string;
  position: number;
};

type AttRow = {
  id: string;
  filename: string;
  video_id: string;
  arsenal_kind: string | null;
  arsenal_category_id: string | null;
};

const adminSelectStyles = {
  bg: "rgba(7, 8, 10, 0.85)",
  borderColor: "rgba(212, 175, 55, 0.35)",
  color: "gray.100",
  borderRadius: "10px",
  h: "40px",
  _hover: { borderColor: "rgba(212, 175, 55, 0.5)" },
  _focusVisible: { borderColor: "rgba(212, 175, 55, 0.65)", boxShadow: "0 0 0 1px rgba(212, 175, 55, 0.25)" },
  sx: { "& option": { bg: "#0c0d10" } },
};

async function uploadAttachmentForVideo(
  file: File,
  meta: { courseId: string; moduleId: string; videoId: string; attachmentId: string },
): Promise<string> {
  return uploadSmallFilePresigned(file, {
    folder: "attachments",
    courseId: meta.courseId,
    moduleId: meta.moduleId,
    videoId: meta.videoId,
    attachmentId: meta.attachmentId,
  });
}

async function uploadArsenalCardLogo(file: File): Promise<string> {
  return uploadSmallFilePresigned(file, { folder: "covers" });
}

const LOGO_BG_OPTIONS = [
  { value: "transparent", label: "Logo-Hintergrund: neutral" },
  { value: "white", label: "Logo-Hintergrund: hell" },
  { value: "dark", label: "Logo-Hintergrund: dunkel" },
] as const;

function CardsPanel({
  category,
  label,
  enableReorder = false,
}: {
  category: "tools" | "fremdkapital";
  label: string;
  enableReorder?: boolean;
}) {
  const [items, setItems] = useState<ArsenalCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [bulletsText, setBulletsText] = useState("");
  const [newLogoBg, setNewLogoBg] = useState<string>("transparent");
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [pendingLogoPreviewUrl, setPendingLogoPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editExternalUrl, setEditExternalUrl] = useState("");
  const [editBulletsText, setEditBulletsText] = useState("");
  const [editLogoBg, setEditLogoBg] = useState("transparent");

  useEffect(() => {
    if (!pendingLogoFile) {
      setPendingLogoPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(pendingLogoFile);
    setPendingLogoPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [pendingLogoFile]);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("arsenal_cards")
      .select("*")
      .eq("category", category)
      .order("is_featured", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("position", { ascending: true });
    setItems((data as ArsenalCard[]) ?? []);
    setLoading(false);
  }, [category]);

  useEffect(() => {
    void load();
  }, [load]);

  const addCard = async () => {
    if (!title.trim()) return;
    setBusy(true);
    setStatus(null);
    const supabase = createClient();
    const bullets = bulletsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const { data, error } = await supabase
      .from("arsenal_cards")
      .insert({
        category,
        title: title.trim(),
        description: description.trim() || null,
        external_url: externalUrl.trim() || null,
        feature_bullets: bullets,
        position: items.length,
        sort_order: items.length,
        is_featured: false,
        logo_bg: newLogoBg,
      })
      .select("*")
      .single();
    if (error) {
      setBusy(false);
      setStatus(error.message);
      return;
    }
    let inserted = data as ArsenalCard | null;
    if (inserted && pendingLogoFile) {
      try {
        const storageKey = await uploadArsenalCardLogo(pendingLogoFile);
        const { data: updated, error: upErr } = await supabase
          .from("arsenal_cards")
          .update({ logo_storage_key: storageKey })
          .eq("id", inserted.id)
          .select("*")
          .single();
        if (upErr) {
          setBusy(false);
          setStatus(upErr.message);
          return;
        }
        inserted = (updated as ArsenalCard) ?? inserted;
      } catch (e) {
        setBusy(false);
        setStatus(e instanceof Error ? e.message : "Logo-Upload fehlgeschlagen.");
        return;
      }
    }
    setBusy(false);
    if (inserted) setItems((prev) => [...prev, inserted as ArsenalCard]);
    setTitle("");
    setDescription("");
    setExternalUrl("");
    setBulletsText("");
    setPendingLogoFile(null);
    setNewLogoBg("transparent");
    setStatus("Gespeichert.");
  };

  const startEdit = (c: ArsenalCard) => {
    setEditingId(c.id);
    setEditTitle(c.title);
    setEditDescription(c.description ?? "");
    setEditExternalUrl(c.external_url ?? "");
    const bullets = Array.isArray(c.feature_bullets) ? (c.feature_bullets as string[]).join("\n") : "";
    setEditBulletsText(bullets);
    setEditLogoBg(c.logo_bg === "white" || c.logo_bg === "dark" ? c.logo_bg : "transparent");
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editTitle.trim()) return;
    setBusy(true);
    setStatus(null);
    const supabase = createClient();
    const bullets = editBulletsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const { data, error } = await supabase
      .from("arsenal_cards")
      .update({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        external_url: editExternalUrl.trim() || null,
        feature_bullets: bullets,
        logo_bg: editLogoBg,
      })
      .eq("id", editingId)
      .select("*")
      .single();
    setBusy(false);
    if (error) {
      setStatus(error.message);
      return;
    }
    if (data) {
      setItems((prev) => prev.map((x) => (x.id === editingId ? (data as ArsenalCard) : x)));
      setEditingId(null);
      setStatus("Eintrag aktualisiert.");
    }
  };

  const toggleFeatured = async (c: ArsenalCard) => {
    setBusy(true);
    setStatus(null);
    const supabase = createClient();
    const next = !c.is_featured;
    const { data, error } = await supabase
      .from("arsenal_cards")
      .update({ is_featured: next })
      .eq("id", c.id)
      .select("*")
      .single();
    setBusy(false);
    if (error) {
      setStatus(error.message);
      return;
    }
    if (data) {
      setItems((prev) => {
        const mapped = prev.map((x) => (x.id === c.id ? (data as ArsenalCard) : x));
        return [...mapped].sort((a, b) => {
          const fa = a.is_featured ? 1 : 0;
          const fb = b.is_featured ? 1 : 0;
          if (fb !== fa) return fb - fa;
          const sa = a.sort_order ?? a.position;
          const sb = b.sort_order ?? b.position;
          return sa - sb;
        });
      });
      setStatus(next ? "Als Empfohlen markiert." : "Hervorhebung entfernt.");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Eintrag löschen?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("arsenal_cards").delete().eq("id", id);
    if (!error) {
      if (editingId === id) setEditingId(null);
      setItems((prev) => prev.filter((x) => x.id !== id));
    }
  };

  const onReorder = async (orderedIds: string[]) => {
    const next = orderedIds
      .map((id, position) => {
        const row = items.find((x) => x.id === id);
        return row ? { ...row, sort_order: position, position } : null;
      })
      .filter(Boolean) as ArsenalCard[];
    setItems(next);
    await fetch("/api/admin/arsenal", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reorder: true, category, orderedIds }),
    });
  };

  const setCardLogo = async (cardId: string, file: File) => {
    setBusy(true);
    setStatus(null);
    try {
      const storageKey = await uploadArsenalCardLogo(file);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("arsenal_cards")
        .update({ logo_storage_key: storageKey })
        .eq("id", cardId)
        .select("*")
        .single();
      setBusy(false);
      if (error) {
        setStatus(error.message);
        return;
      }
      if (data) {
        setItems((prev) => prev.map((x) => (x.id === cardId ? (data as ArsenalCard) : x)));
        setStatus("Logo gespeichert.");
      }
    } catch (e) {
      setBusy(false);
      setStatus(e instanceof Error ? e.message : "Logo-Upload fehlgeschlagen.");
    }
  };

  const clearCardLogo = async (cardId: string) => {
    setBusy(true);
    setStatus(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("arsenal_cards")
      .update({ logo_storage_key: null })
      .eq("id", cardId)
      .select("*")
      .single();
    setBusy(false);
    if (error) {
      setStatus(error.message);
      return;
    }
    if (data) {
      setItems((prev) => prev.map((x) => (x.id === cardId ? (data as ArsenalCard) : x)));
      setStatus("Logo entfernt.");
    }
  };

  if (loading) {
    return (
      <Text fontSize="sm" color="gray.400">
        Lädt…
      </Text>
    );
  }

  const adminLogoBg = (key: string | null | undefined) => {
    if (key === "white") return "rgba(255,255,255,0.98)";
    if (key === "dark") return "rgba(10,10,12,0.96)";
    return "transparent";
  };

  const renderCardRow = (c: ArsenalCard, dragHandle?: ReactNode) => (
    <Stack w="100%" spacing={0}>
      <HStack
        justify="space-between"
        align="flex-start"
        flexWrap="wrap"
        gap={3}
        p={3}
        borderRadius="md"
        borderWidth="1px"
        borderColor={c.is_featured ? "rgba(212, 175, 55, 0.45)" : "whiteAlpha.200"}
        bg="blackAlpha.300"
      >
        {dragHandle ? <Box flexShrink={0}>{dragHandle}</Box> : null}
        <HStack align="flex-start" gap={3} minW={0} flex="1">
          <Box
            w="120px"
            h="56px"
            position="relative"
            borderRadius="md"
            borderWidth="1px"
            borderColor="rgba(212, 175, 55, 0.42)"
            bg={adminLogoBg(c.logo_bg)}
            overflow="hidden"
            flexShrink={0}
          >
            {c.logo_storage_key?.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/cover-url?key=${encodeURIComponent(c.logo_storage_key.trim())}`}
                alt=""
                style={{
                  display: "block",
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center",
                }}
              />
            ) : (
              <Text fontSize="xs" color="gray.600" position="absolute" inset={0} display="flex" alignItems="center" justifyContent="center">
                —
              </Text>
            )}
          </Box>
          <Box minW={0}>
            <Text fontWeight="600" noOfLines={2}>
              {c.title}
            </Text>
            {c.external_url ? (
              <Text fontSize="xs" color="gray.400" noOfLines={1}>
                {c.external_url}
              </Text>
            ) : null}
          </Box>
        </HStack>
        <HStack flexWrap="wrap" gap={2}>
          <IconButton
            aria-label={c.is_featured ? "Hervorhebung entfernen" : "Als Empfohlen markieren"}
            size="sm"
            variant={c.is_featured ? "solid" : "outline"}
            colorScheme="yellow"
            icon={<Star size={16} fill={c.is_featured ? "currentColor" : "none"} />}
            isDisabled={busy}
            onClick={() => void toggleFeatured(c)}
          />
          <Button size="xs" variant="outline" isDisabled={busy} onClick={() => startEdit(c)}>
            Bearbeiten
          </Button>
          <input
            id={`arsenal-card-logo-${c.id}`}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void setCardLogo(c.id, f);
            }}
          />
          <Button
            size="xs"
            variant="outline"
            isDisabled={busy}
            onClick={() => document.getElementById(`arsenal-card-logo-${c.id}`)?.click()}
          >
            Logo ändern
          </Button>
          {c.logo_storage_key?.trim() ? (
            <Button size="xs" variant="ghost" isDisabled={busy} onClick={() => void clearCardLogo(c.id)}>
              Logo entfernen
            </Button>
          ) : null}
          <IconButton
            aria-label="Löschen"
            size="sm"
            variant="outline"
            colorScheme="red"
            icon={<Trash2 size={16} />}
            onClick={() => void remove(c.id)}
          />
        </HStack>
      </HStack>
      {editingId === c.id ? (
        <Stack
          p={4}
          borderRadius="md"
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          bg="blackAlpha.500"
          spacing={3}
          mt={2}
        >
          <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} bg="whiteAlpha.50" placeholder="Titel" />
          <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} bg="whiteAlpha.50" placeholder="Beschreibung" />
          <Input value={editExternalUrl} onChange={(e) => setEditExternalUrl(e.target.value)} bg="whiteAlpha.50" placeholder="Externe URL" />
          <Box>
            <FormLabel fontSize="sm">Logo-Hintergrund (Mitglieder-Ansicht)</FormLabel>
            <Select value={editLogoBg} onChange={(e) => setEditLogoBg(e.target.value)} bg="whiteAlpha.50" maxW="280px">
              {LOGO_BG_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Box>
          <Box>
            <FormLabel fontSize="sm">Feature-Zeilen (eine pro Zeile)</FormLabel>
            <Textarea value={editBulletsText} onChange={(e) => setEditBulletsText(e.target.value)} bg="whiteAlpha.50" rows={4} />
          </Box>
          <HStack>
            <Button colorScheme="blue" size="sm" onClick={() => void saveEdit()} isLoading={busy} isDisabled={!editTitle.trim()}>
              Speichern
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelEdit}>
              Abbrechen
            </Button>
          </HStack>
        </Stack>
      ) : null}
    </Stack>
  );

  return (
    <Stack gap={6}>
      <Text fontSize="lg" className="inter-semibold">
        {label} — Karten
      </Text>
      <Stack gap={3} maxW="640px">
        <Input placeholder="Titel" value={title} onChange={(e) => setTitle(e.target.value)} bg="whiteAlpha.50" />
        <Box>
          <FormLabel fontSize="sm">Logo / Bild (optional, Hetzner)</FormLabel>
          <HStack flexWrap="wrap" gap={3} align="flex-start">
            <Box
              w="200px"
              maxW="100%"
              h="56px"
              position="relative"
              borderRadius="md"
              borderWidth="1px"
              borderColor="rgba(212, 175, 55, 0.42)"
              bg={newLogoBg === "white" ? "rgba(255,255,255,0.98)" : newLogoBg === "dark" ? "rgba(10,10,12,0.96)" : "transparent"}
              overflow="hidden"
              flexShrink={0}
            >
              {pendingLogoPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pendingLogoPreviewUrl}
                  alt=""
                  style={{
                    display: "block",
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center",
                  }}
                />
              ) : (
                <Text
                  fontSize="xs"
                  color="gray.500"
                  position="absolute"
                  inset={0}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  textAlign="center"
                  px={2}
                >
                  Kein Bild
                </Text>
              )}
            </Box>
            <Stack gap={2}>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const el = document.getElementById(`arsenal-new-card-logo-${category}`) as HTMLInputElement | null;
                  el?.click();
                }}
              >
                Datei wählen
              </Button>
              {pendingLogoFile ? (
                <Button size="sm" variant="ghost" onClick={() => setPendingLogoFile(null)}>
                  Auswahl zurücksetzen
                </Button>
              ) : null}
              <input
                id={`arsenal-new-card-logo-${category}`}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) setPendingLogoFile(f);
                }}
              />
            </Stack>
          </HStack>
        </Box>
        <Textarea
          placeholder="Beschreibung (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          bg="whiteAlpha.50"
        />
        <Input
          placeholder="Externe URL (optional)"
          value={externalUrl}
          onChange={(e) => setExternalUrl(e.target.value)}
          bg="whiteAlpha.50"
        />
        <Box>
          <FormLabel fontSize="sm">Feature-Zeilen (eine pro Zeile)</FormLabel>
          <Textarea value={bulletsText} onChange={(e) => setBulletsText(e.target.value)} bg="whiteAlpha.50" rows={4} />
        </Box>
        <Box>
          <FormLabel fontSize="sm">Logo-Hintergrund (Mitglieder-Ansicht)</FormLabel>
          <Select value={newLogoBg} onChange={(e) => setNewLogoBg(e.target.value)} bg="whiteAlpha.50" maxW="320px">
            {LOGO_BG_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Box>
        <Button colorScheme="blue" onClick={() => void addCard()} isLoading={busy} isDisabled={!title.trim()}>
          Karte hinzufügen
        </Button>
        {status ? (
          <Text fontSize="sm" color="green.300">
            {status}
          </Text>
        ) : null}
      </Stack>

      <Stack gap={2}>
        {enableReorder ? (
          <DraggableList items={items} onReorder={onReorder} renderItem={(c, handle) => renderCardRow(c, handle)} />
        ) : (
          items.map((c) => renderCardRow(c))
        )}
      </Stack>
    </Stack>
  );
}

function CategoriesPanel() {
  const [items, setItems] = useState<ArsenalCatRow[]>([]);
  const [name, setName] = useState("");
  const [kindScope, setKindScope] = useState<"both" | "template" | "pdf">("both");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("arsenal_attachment_categories").select("*").order("name", { ascending: true });
    setItems((data as ArsenalCatRow[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setStatus(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("arsenal_attachment_categories")
      .insert({
        name: name.trim(),
        kind_scope: kindScope,
        position: items.length,
      })
      .select("*")
      .single();
    setBusy(false);
    if (error) {
      setStatus(error.message);
      return;
    }
    if (data) setItems((prev) => [...prev, data as ArsenalCatRow].sort((a, b) => a.name.localeCompare(b.name, "de")));
    setName("");
    setStatus("Kategorie angelegt.");
  };

  const remove = async (id: string) => {
    if (!confirm("Kategorie löschen? Zuordnungen bei Dateien werden entfernt.")) return;
    const supabase = createClient();
    const { error } = await supabase.from("arsenal_attachment_categories").delete().eq("id", id);
    if (!error) setItems((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <Stack gap={6} maxW="720px">
      <Text fontSize="sm" color="gray.400">
        Kategorien gelten für Templates und PDFs im Arsenal. Über „Gültig für“ steuerst du, wo die Kategorie im Admin beim
        Upload wählbar ist.
      </Text>
      <HStack flexWrap="wrap" gap={3} align="flex-end">
        <Box flex={1} minW="200px">
          <FormLabel fontSize="xs">Name</FormLabel>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. TradingView" bg="whiteAlpha.50" />
        </Box>
        <Box minW="160px">
          <FormLabel fontSize="xs">Gültig für</FormLabel>
          <Select
            value={kindScope}
            onChange={(e) => setKindScope(e.target.value as "both" | "template" | "pdf")}
            bg="whiteAlpha.50"
          >
            <option value="both">Templates & PDFs</option>
            <option value="template">Nur Templates</option>
            <option value="pdf">Nur PDFs</option>
          </Select>
        </Box>
        <Button colorScheme="yellow" onClick={() => void add()} isLoading={busy} isDisabled={!name.trim()}>
          Hinzufügen
        </Button>
      </HStack>
      {status ? (
        <Text fontSize="sm" color="green.300">
          {status}
        </Text>
      ) : null}

      <Stack gap={2}>
        {items.map((c) => (
          <HStack
            key={c.id}
            justify="space-between"
            p={3}
            borderRadius="md"
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            bg="blackAlpha.400"
          >
            <Box>
              <Text fontWeight="600">{c.name}</Text>
              <Text fontSize="xs" color="gray.500">
                {c.kind_scope === "both" ? "Templates & PDFs" : c.kind_scope === "template" ? "Nur Templates" : "Nur PDFs"}
              </Text>
            </Box>
            <IconButton
              aria-label="Löschen"
              size="sm"
              variant="outline"
              colorScheme="red"
              icon={<Trash2 size={16} />}
              onClick={() => void remove(c.id)}
            />
          </HStack>
        ))}
      </Stack>
    </Stack>
  );
}

function AttachmentsPanel({ kind, label }: { kind: "template" | "pdf"; label: string }) {
  const [modules, setModules] = useState<ModuleWithCourse[]>([]);
  const [videos, setVideos] = useState<VideoOpt[]>([]);
  const [categories, setCategories] = useState<ArsenalCatRow[]>([]);
  const [moduleId, setModuleId] = useState("");
  const [videoId, setVideoId] = useState("");
  const [uploadCategoryId, setUploadCategoryId] = useState("");
  const [items, setItems] = useState<AttRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    const supabase = createClient();
    const orFilter =
      kind === "template" ? "kind_scope.eq.both,kind_scope.eq.template" : "kind_scope.eq.both,kind_scope.eq.pdf";
    const { data } = await supabase.from("arsenal_attachment_categories").select("*").or(orFilter).order("name", { ascending: true });
    setCategories((data as ArsenalCatRow[]) ?? []);
  }, [kind]);

  const loadAttachments = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("video_attachments")
      .select("id, filename, video_id, arsenal_kind, arsenal_category_id")
      .eq("arsenal_kind", kind);
    setItems((data as AttRow[]) ?? []);
  }, [kind]);

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("modules")
        .select("id, title, course_id, courses ( title )")
        .eq("is_published", true);
      if (error) return;
      const raw = (data ?? []) as unknown[];
      const mapped: ModuleWithCourse[] = raw
        .map((row) => {
          const m = row as {
            id: string;
            title: string;
            course_id: string;
            courses: { title: string } | { title: string }[] | null;
          };
          const c = Array.isArray(m.courses) ? m.courses[0] : m.courses;
          return {
            id: m.id,
            title: m.title,
            course_id: m.course_id,
            course_title: c?.title ?? "Kurs",
          };
        })
        .sort((a, b) => a.course_title.localeCompare(b.course_title, "de") || a.title.localeCompare(b.title, "de"));
      setModules(mapped);
    })();
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (!moduleId) {
      setVideos([]);
      setVideoId("");
      return;
    }
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("videos").select("id, title, module_id").eq("module_id", moduleId).order("title");
      setVideos((data as VideoOpt[]) ?? []);
    })();
  }, [moduleId]);

  useEffect(() => {
    void loadAttachments();
  }, [loadAttachments]);

  const onUpload = async () => {
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod || !videoId) {
      setStatus("Modul und Video wählen.");
      return;
    }
    const courseId = mod.course_id;
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setBusy(true);
      setStatus(null);
      const attachmentId = crypto.randomUUID();
      try {
        const storageKey = await uploadAttachmentForVideo(file, { courseId, moduleId, videoId, attachmentId });
        const res = await fetch("/api/admin/attachments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            video_id: videoId,
            storage_key: storageKey,
            filename: file.name,
            content_type: file.type || null,
            size_bytes: file.size,
            position: 0,
            arsenal_kind: kind,
            arsenal_category_id: uploadCategoryId.trim() || null,
          }),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !json.ok) {
          setStatus(json.error || "Speichern fehlgeschlagen.");
          setBusy(false);
          return;
        }
        setStatus("Hochgeladen.");
        await loadAttachments();
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Fehler.");
      }
      setBusy(false);
    };
    input.click();
  };

  const remove = async (id: string) => {
    if (!confirm("Anhang löschen?")) return;
    const res = await fetch(`/api/admin/attachments?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const json = (await res.json()) as { ok?: boolean };
    if (json.ok) {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }
  };

  const setCategory = async (attachmentId: string, newCat: string) => {
    const res = await fetch("/api/admin/attachments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: attachmentId,
        arsenal_category_id: newCat === "" ? null : newCat,
      }),
    });
    const json = (await res.json()) as { ok?: boolean; item?: AttRow };
    if (res.ok && json.ok && json.item) {
      setItems((prev) => prev.map((x) => (x.id === attachmentId ? (json.item as AttRow) : x)));
    }
  };

  return (
    <Stack gap={6}>
      <Text fontSize="lg" className="inter-semibold">
        {label} — Dateien (erscheinen unter Arsenal für Mitglieder)
      </Text>
      <HStack flexWrap="wrap" gap={3} align="flex-end" maxW="900px">
        <Box flex="1" minW="240px">
          <FormLabel fontSize="xs" color="gray.400">
            Modul (Kurs in Klammern)
          </FormLabel>
          <Select
            placeholder="Modul wählen"
            value={moduleId}
            onChange={(e) => {
              setModuleId(e.target.value);
              setVideoId("");
            }}
            className="inter"
            {...adminSelectStyles}
          >
            <option value="">—</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} ({m.course_title})
              </option>
            ))}
          </Select>
        </Box>
        <Box flex="1" minW="200px">
          <FormLabel fontSize="xs" color="gray.400">
            Video
          </FormLabel>
          <Select
            placeholder="Video"
            value={videoId}
            onChange={(e) => setVideoId(e.target.value)}
            isDisabled={!moduleId}
            className="inter"
            {...adminSelectStyles}
          >
            <option value="">—</option>
            {videos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title}
              </option>
            ))}
          </Select>
        </Box>
        <Box flex="1" minW="200px">
          <FormLabel fontSize="xs" color="gray.400">
            Kategorie (optional)
          </FormLabel>
          <Select
            value={uploadCategoryId}
            onChange={(e) => setUploadCategoryId(e.target.value)}
            className="inter"
            {...adminSelectStyles}
          >
            <option value="">Keine Kategorie</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Box>
      </HStack>
      <Button maxW="280px" colorScheme="teal" onClick={() => void onUpload()} isLoading={busy} isDisabled={!moduleId || !videoId}>
        Datei hochladen ({kind})
      </Button>
      {status ? (
        <Text fontSize="sm" color="blue.200">
          {status}
        </Text>
      ) : null}

      <Stack gap={2}>
        <Text fontSize="sm" color="gray.400">
          Alle {label}-Anhänge
        </Text>
        {items.map((a) => (
          <HStack
            key={a.id}
            justify="space-between"
            align="center"
            flexWrap="wrap"
            gap={2}
            p={3}
            borderWidth="1px"
            borderRadius="md"
            borderColor="whiteAlpha.150"
          >
            <Text fontSize="sm" noOfLines={2} maxW={{ base: "100%", md: "40%" }}>
              {a.filename}
            </Text>
            <Select
              size="sm"
              maxW="220px"
              value={a.arsenal_category_id ?? ""}
              onChange={(e) => void setCategory(a.id, e.target.value)}
              className="inter"
              {...adminSelectStyles}
              h="32px"
            >
              <option value="">Keine Kategorie</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <IconButton
              aria-label="Löschen"
              size="xs"
              variant="outline"
              colorScheme="red"
              icon={<Trash2 size={14} />}
              onClick={() => void remove(a.id)}
            />
          </HStack>
        ))}
      </Stack>
    </Stack>
  );
}

export function ArsenalManager() {
  return (
    <Tabs variant="enclosed" colorScheme="yellow">
      <TabList flexWrap="wrap">
        <Tab>Tools</Tab>
        <Tab>Fremdkapital</Tab>
        <Tab>Kategorien</Tab>
        <Tab>Templates</Tab>
        <Tab>PDFs</Tab>
      </TabList>
      <TabPanels>
        <TabPanel>
          <CardsPanel category="tools" label="Tools & Software" enableReorder />
        </TabPanel>
        <TabPanel>
          <CardsPanel category="fremdkapital" label="Fremdkapital" enableReorder />
        </TabPanel>
        <TabPanel>
          <CategoriesPanel />
        </TabPanel>
        <TabPanel>
          <AttachmentsPanel kind="template" label="Templates" />
        </TabPanel>
        <TabPanel>
          <AttachmentsPanel kind="pdf" label="PDFs" />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}
