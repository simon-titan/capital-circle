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

/* v3.2 „Champagner auf Graphit“ (DESIGN.md) — Admin-Formular: Felder, Labels, Zeilen */
const fieldSx = {
  bg: "rgba(255, 255, 255, 0.03)",
  border: "1px solid",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  color: "var(--cc-text)",
  _placeholder: { color: "var(--cc-text-3)" },
  _hover: { borderColor: "rgba(255, 255, 255, 0.22)" },
  _focusVisible: { borderColor: "var(--cc-gold-line)", boxShadow: "0 0 0 1px var(--cc-gold-line)" },
} as const;

const labelSx = { fontSize: "12px", fontWeight: 500, color: "var(--cc-text-2)", mb: 1 } as const;

/** Kartentitel im Label-Schnitt (13px, versal, gesperrt). */
const cardTitleSx = {
  fontSize: "13px",
  lineHeight: "18px",
  fontWeight: 500,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--cc-text-soft)",
} as const;

const ghostSx = {
  color: "var(--cc-text-2)",
  _hover: { bg: "rgba(255, 255, 255, 0.06)", color: "var(--cc-text)" },
} as const;

const dangerIconSx = {
  color: "var(--cc-danger)",
  _hover: { bg: "rgba(248, 113, 113, 0.08)", borderColor: "rgba(248, 113, 113, 0.5)", boxShadow: "none" },
} as const;

const rowSx = {
  p: 3,
  borderRadius: "8px",
  border: "1px solid",
  borderColor: "var(--cc-line)",
  bg: "rgba(255, 255, 255, 0.02)",
  transition: "border-color 150ms var(--cc-ease)",
  _hover: { borderColor: "rgba(255, 255, 255, 0.14)" },
} as const;

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
    if (!confirm("Beitrag löschen? Alle Likes, Kommentare und Bookmarks werden mitentfernt.")) return;
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
    <Stack gap={8} maxW="1400px">
      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={{ base: 8, xl: 10 }} alignItems="start">
        <Stack gap={4} className="cc-card cc-card--still" p={{ base: 5, md: 6 }}>
          <HStack justify="space-between" flexWrap="wrap" gap={2}>
            <Text as="h2" fontSize="18px" fontWeight={600} lineHeight={1.3} color="var(--cc-text)">
              {editingId ? "Beitrag bearbeiten" : "Neuer News-Beitrag"}
            </Text>
            {editingId ? (
              <Button size="sm" variant="ghost" {...ghostSx} onClick={resetForm}>
                Neu statt Bearbeiten
              </Button>
            ) : null}
          </HStack>
          <Input placeholder="Titel" value={title} onChange={(e) => setTitle(e.target.value)} {...fieldSx} />
          <Textarea
            placeholder="Kurztext für die Karten-Ansicht (optional)"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            {...fieldSx}
            rows={2}
          />
          <HStack flexWrap="wrap" gap={4}>
            <Box minW="220px">
              <Text {...labelSx}>Veroeffentlicht am (leer = jetzt)</Text>
              <Input
                type="datetime-local"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
                {...fieldSx}
                className="cc-num"
              />
            </Box>
          </HStack>
          <Box>
            <FormLabel {...labelSx}>Titelbild (optional)</FormLabel>
            <HStack gap={3}>
              <Button size="sm" variant="line" onClick={() => void pickCover()} isLoading={coverBusy}>
                Bild wählen
              </Button>
              {coverKey ? (
                <>
                  <Text fontSize="xs" color="var(--cc-success)">
                    Bild gesetzt
                  </Text>
                  <Button size="xs" variant="ghost" {...ghostSx} onClick={() => setCoverKey(null)}>
                    entfernen
                  </Button>
                </>
              ) : (
                <Text fontSize="xs" color="var(--cc-text-3)">
                  Kein Titelbild
                </Text>
              )}
            </HStack>
          </Box>

          <Box>
            <Text {...labelSx} mb={2}>
              Inhalt
            </Text>
            <RichTextEditor key={editingId ?? "new"} value={contentJson} onChange={setContentJson} />
          </Box>

          <HStack gap={3}>
            <Button variant="gold" onClick={() => void savePost()} isLoading={busy} maxW="280px">
              {editingId ? "Speichern" : "Veroeffentlichen"}
            </Button>
            {status ? (
              <Text fontSize="sm" color="var(--cc-success)" role="status">
                {status}
              </Text>
            ) : null}
          </HStack>
        </Stack>

        <ArticlePreview content={contentJson} />
      </SimpleGrid>

      <Stack gap={3} className="cc-card cc-card--still" p={{ base: 5, md: 6 }}>
        <Text as="h2" {...cardTitleSx}>
          Alle News-Beiträge
        </Text>
        {posts.length === 0 ? (
          <Text fontSize="sm" color="var(--cc-text-3)">
            Noch keine Beiträge.
          </Text>
        ) : null}
        {posts.map((p) => (
          <HStack key={p.id} justify="space-between" align="flex-start" {...rowSx}>
            <Box minW={0}>
              <Text fontWeight={600} color="var(--cc-text)">
                {p.title}
              </Text>
              <Text fontSize="xs" color="var(--cc-text-3)" className="cc-num">
                {new Date(p.published_at).toLocaleString("de-DE")}
              </Text>
            </Box>
            <HStack>
              <Button size="sm" variant="line" leftIcon={<Pencil size={14} />} onClick={() => startEdit(p)}>
                Bearbeiten
              </Button>
              <IconButton
                aria-label="Löschen"
                size="sm"
                variant="line"
                {...dangerIconSx}
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
