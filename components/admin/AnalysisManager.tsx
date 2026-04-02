"use client";

import {
  Box,
  Button,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { ArticlePreview } from "@/components/admin/ArticlePreview";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { createClient } from "@/lib/supabase/client";
import { emptyArticleDocJson } from "@/lib/analysis-tiptap-extensions";
import { Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type PostRow = {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  image_storage_key: string | null;
  cover_image_storage_key: string | null;
  post_type: string;
  analysis_date: string | null;
  published_at: string;
};

async function uploadCover(file: File): Promise<string> {
  const params = new URLSearchParams({ folder: "covers" });
  const res = await fetch(`/api/admin/upload-proxy?${params}`, {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-File-Name": encodeURIComponent(file.name),
    },
    body: file,
  });
  const json = (await res.json()) as { ok?: boolean; storageKey?: string; error?: string };
  if (!res.ok || !json.ok || !json.storageKey) {
    throw new Error(json.error || "Upload fehlgeschlagen.");
  }
  return json.storageKey;
}

function normalizeContentForEditor(raw: string): string {
  const t = raw?.trim();
  if (!t) return emptyArticleDocJson;
  try {
    const j = JSON.parse(raw) as { type?: string };
    if (j?.type === "doc") return raw;
  } catch {
    /* Klartext-Legacy */
  }
  return JSON.stringify({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: raw }] }],
  });
}

export function AnalysisManager() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [contentJson, setContentJson] = useState(emptyArticleDocJson);
  const [postType, setPostType] = useState<"weekly" | "daily">("weekly");
  const [analysisDate, setAnalysisDate] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [coverKey, setCoverKey] = useState<string | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("analysis_posts").select("*").order("published_at", { ascending: false });
    setPosts((data as PostRow[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setExcerpt("");
    setContentJson(emptyArticleDocJson);
    setPostType("weekly");
    setAnalysisDate("");
    setPublishedAt("");
    setCoverKey(null);
    setStatus(null);
  };

  const startEdit = (p: PostRow) => {
    setEditingId(p.id);
    setTitle(p.title);
    setExcerpt(p.excerpt ?? "");
    setContentJson(normalizeContentForEditor(p.content ?? ""));
    setPostType(p.post_type === "daily" ? "daily" : "weekly");
    setAnalysisDate(p.analysis_date ?? "");
    setPublishedAt(p.published_at ? p.published_at.slice(0, 16) : "");
    setCoverKey(p.cover_image_storage_key);
  };

  const pickCover = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setCoverBusy(true);
      setStatus(null);
      try {
        const key = await uploadCover(file);
        setCoverKey(key);
        setStatus("Titelbild hochgeladen.");
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Upload-Fehler.");
      }
      setCoverBusy(false);
    };
    input.click();
  };

  const savePost = async () => {
    if (!title.trim()) {
      setStatus("Titel fehlt.");
      return;
    }
    setBusy(true);
    setStatus(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setStatus("Nicht eingeloggt.");
      setBusy(false);
      return;
    }
    const pub = publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString();
    const excerptVal = excerpt.trim() || null;
    const analysisDateVal = analysisDate.trim() || null;

    if (editingId) {
      const { error } = await supabase
        .from("analysis_posts")
        .update({
          title: title.trim(),
          excerpt: excerptVal,
          content: contentJson,
          post_type: postType,
          analysis_date: analysisDateVal,
          published_at: pub,
          cover_image_storage_key: coverKey,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId);
      setBusy(false);
      if (error) {
        setStatus(error.message);
        return;
      }
      setStatus("Beitrag aktualisiert.");
    } else {
      const { error } = await supabase.from("analysis_posts").insert({
        title: title.trim(),
        excerpt: excerptVal,
        content: contentJson,
        post_type: postType,
        analysis_date: analysisDateVal,
        published_at: pub,
        cover_image_storage_key: coverKey,
        image_storage_key: null,
        created_by: user.id,
      });
      setBusy(false);
      if (error) {
        setStatus(error.message);
        return;
      }
      resetForm();
      setStatus("Beitrag veröffentlicht.");
    }
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Beitrag löschen?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("analysis_posts").delete().eq("id", id);
    if (!error) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
      if (editingId === id) resetForm();
    }
  };

  return (
    <Stack gap={10} maxW="1400px">
      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={{ base: 8, xl: 10 }} alignItems="start">
        <Stack gap={4}>
          <HStack justify="space-between" flexWrap="wrap" gap={2}>
            <Text fontSize="xl" className="inter-semibold">
              {editingId ? "Beitrag bearbeiten" : "Neuer Artikel"}
            </Text>
            {editingId ? (
              <Button size="sm" variant="ghost" onClick={resetForm}>
                Neu statt Bearbeiten
              </Button>
            ) : null}
          </HStack>
          <Input placeholder="Titel" value={title} onChange={(e) => setTitle(e.target.value)} bg="whiteAlpha.50" />
          <Textarea
            placeholder="Kurztext für die Karten-Ansicht (optional)"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            bg="whiteAlpha.50"
            rows={2}
          />
          <HStack flexWrap="wrap" gap={4}>
            <Box minW="160px">
              <Text fontSize="xs" mb={1} color="gray.400">
                Typ
              </Text>
              <Select value={postType} onChange={(e) => setPostType(e.target.value as "weekly" | "daily")} bg="whiteAlpha.50">
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
              </Select>
            </Box>
            <Box minW="180px">
              <Text fontSize="xs" mb={1} color="gray.400">
                Analyse-Datum (Sortierung)
              </Text>
              <Input
                type="date"
                value={analysisDate}
                onChange={(e) => setAnalysisDate(e.target.value)}
                bg="whiteAlpha.50"
                placeholder="JJJJ-MM-TT"
              />
            </Box>
            <Box minW="200px">
              <Text fontSize="xs" mb={1} color="gray.400">
                Veröffentlicht am (leer = jetzt)
              </Text>
              <Input type="datetime-local" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} bg="whiteAlpha.50" />
            </Box>
          </HStack>
          <Box>
            <FormLabel fontSize="xs">Titelbild (Karte + Kopf in der Detailansicht)</FormLabel>
            <HStack gap={3}>
              <Button size="sm" variant="outline" onClick={() => void pickCover()} isLoading={coverBusy}>
                Bild wählen
              </Button>
              {coverKey ? (
                <Text fontSize="xs" color="green.300">
                  Bild gesetzt
                </Text>
              ) : (
                <Text fontSize="xs" color="gray.500">
                  Kein Titelbild
                </Text>
              )}
            </HStack>
          </Box>

          <Box>
            <Text fontSize="sm" className="inter-semibold" mb={2}>
              Inhalt
            </Text>
            <RichTextEditor key={editingId ?? "new"} value={contentJson} onChange={setContentJson} />
          </Box>

          <HStack gap={3}>
            <Button colorScheme="blue" onClick={() => void savePost()} isLoading={busy} maxW="280px">
              {editingId ? "Speichern" : "Veröffentlichen"}
            </Button>
            {status ? (
              <Text fontSize="sm" color="green.300">
                {status}
              </Text>
            ) : null}
          </HStack>
        </Stack>

        <ArticlePreview content={contentJson} />
      </SimpleGrid>

      <Stack gap={2}>
        <Text fontSize="lg" className="inter-semibold">
          Alle Artikel
        </Text>
        {posts.map((p) => (
          <HStack
            key={p.id}
            justify="space-between"
            p={3}
            borderRadius="md"
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            align="flex-start"
          >
            <Box minW={0}>
              <Text fontWeight="600">{p.title}</Text>
              <Text fontSize="xs" color="gray.500">
                {p.post_type} · {new Date(p.published_at).toLocaleString("de-DE")}
              </Text>
            </Box>
            <HStack>
              <Button size="sm" variant="outline" leftIcon={<Pencil size={14} />} onClick={() => startEdit(p)}>
                Bearbeiten
              </Button>
              <IconButton
                aria-label="Löschen"
                size="sm"
                variant="outline"
                colorScheme="red"
                icon={<Trash2 size={16} />}
                onClick={() => void remove(p.id)}
              />
            </HStack>
          </HStack>
        ))}
      </Stack>
    </Stack>
  );
}
