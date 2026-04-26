"use client";

import {
  Box,
  Button,
  FormLabel,
  HStack,
  IconButton,
  Input,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ArticlePreview } from "@/components/admin/ArticlePreview";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { uploadSmallFilePresigned } from "@/lib/admin-upload-presigned";
import { emptyArticleDocJson } from "@/lib/analysis-tiptap-extensions";
import { createClient } from "@/lib/supabase/client";

type NewsRow = {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  cover_image_storage_key: string | null;
  published_at: string;
  created_at: string;
  updated_at: string;
};

async function uploadCover(file: File): Promise<string> {
  return uploadSmallFilePresigned(file, { folder: "covers" });
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

export function NewsManager() {
  const [posts, setPosts] = useState<NewsRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [contentJson, setContentJson] = useState(emptyArticleDocJson);
  const [publishedAt, setPublishedAt] = useState("");
  const [coverKey, setCoverKey] = useState<string | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("news_posts")
      .select("*")
      .order("published_at", { ascending: false });
    setPosts((data as NewsRow[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setExcerpt("");
    setContentJson(emptyArticleDocJson);
    setPublishedAt("");
    setCoverKey(null);
    setStatus(null);
  };

  const startEdit = (p: NewsRow) => {
    setEditingId(p.id);
    setTitle(p.title);
    setExcerpt(p.excerpt ?? "");
    setContentJson(normalizeContentForEditor(p.content ?? ""));
    setPublishedAt(p.published_at ? p.published_at.slice(0, 16) : "");
    setCoverKey(p.cover_image_storage_key);
    setStatus(null);
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

    if (editingId) {
      const { error } = await supabase
        .from("news_posts")
        .update({
          title: title.trim(),
          excerpt: excerptVal,
          content: contentJson,
          published_at: pub,
          cover_image_storage_key: coverKey,
        })
        .eq("id", editingId);
      setBusy(false);
      if (error) {
        setStatus(error.message);
        return;
      }
      setStatus("Beitrag aktualisiert.");
    } else {
      const { error } = await supabase.from("news_posts").insert({
        title: title.trim(),
        excerpt: excerptVal,
        content: contentJson,
        published_at: pub,
        cover_image_storage_key: coverKey,
        created_by: user.id,
      });
      setBusy(false);
      if (error) {
        setStatus(error.message);
        return;
      }
      resetForm();
      setStatus("Beitrag veroeffentlicht.");
    }
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Beitrag loeschen? Alle Likes, Kommentare und Bookmarks werden mitentfernt.")) return;
    const supabase = createClient();
    const { error } = await supabase.from("news_posts").delete().eq("id", id);
    if (!error) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
      if (editingId === id) resetForm();
    } else {
      setStatus(error.message);
    }
  };

  return (
    <Stack gap={10} maxW="1400px">
      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={{ base: 8, xl: 10 }} alignItems="start">
        <Stack gap={4}>
          <HStack justify="space-between" flexWrap="wrap" gap={2}>
            <Text fontSize="xl" className="inter-semibold">
              {editingId ? "Beitrag bearbeiten" : "Neuer News-Beitrag"}
            </Text>
            {editingId ? (
              <Button size="sm" variant="ghost" onClick={resetForm}>
                Neu statt Bearbeiten
              </Button>
            ) : null}
          </HStack>
          <Input
            placeholder="Titel"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            bg="whiteAlpha.50"
          />
          <Textarea
            placeholder="Kurztext fuer die Karten-Ansicht (optional)"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            bg="whiteAlpha.50"
            rows={2}
          />
          <HStack flexWrap="wrap" gap={4}>
            <Box minW="220px">
              <Text fontSize="xs" mb={1} color="gray.400">
                Veroeffentlicht am (leer = jetzt)
              </Text>
              <Input
                type="datetime-local"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
                bg="whiteAlpha.50"
              />
            </Box>
          </HStack>
          <Box>
            <FormLabel fontSize="xs">Titelbild (optional)</FormLabel>
            <HStack gap={3}>
              <Button size="sm" variant="outline" onClick={() => void pickCover()} isLoading={coverBusy}>
                Bild waehlen
              </Button>
              {coverKey ? (
                <>
                  <Text fontSize="xs" color="green.300">
                    Bild gesetzt
                  </Text>
                  <Button size="xs" variant="ghost" onClick={() => setCoverKey(null)}>
                    entfernen
                  </Button>
                </>
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
            <Button
              colorScheme="yellow"
              onClick={() => void savePost()}
              isLoading={busy}
              maxW="280px"
            >
              {editingId ? "Speichern" : "Veroeffentlichen"}
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
          Alle News-Beitraege
        </Text>
        {posts.length === 0 ? (
          <Text fontSize="sm" color="gray.500">
            Noch keine Beitraege.
          </Text>
        ) : null}
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
                {new Date(p.published_at).toLocaleString("de-DE")}
              </Text>
            </Box>
            <HStack>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Pencil size={14} />}
                onClick={() => startEdit(p)}
              >
                Bearbeiten
              </Button>
              <IconButton
                aria-label="Loeschen"
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
