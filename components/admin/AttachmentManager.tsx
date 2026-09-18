"use client";

import { uploadViaPresigned } from "@/lib/admin-upload-presigned";
import { createClient } from "@/lib/supabase/client";
import { Box, Button, FormLabel, HStack, IconButton, Progress, Select, Stack, Switch, Text } from "@chakra-ui/react";
import { FileDown, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type AttachmentRow = {
  id: string;
  video_id: string;
  storage_key: string;
  filename: string;
  content_type: string | null;
  size_bytes: number | null;
  position: number;
  is_free: boolean | null;
  arsenal_kind: "template" | "pdf" | null;
  arsenal_category_id: string | null;
  created_at: string;
};

type ArsenalCategory = { id: string; name: string };

/** Schalter-Spur in Champagner statt Chakra-Palette (v3.2). */
const switchSx = {
  ".chakra-switch__track": { bg: "var(--cc-track)" },
  ".chakra-switch__track[data-checked]": { bg: "var(--cc-gold)" },
};

/** Select im Admin-Stil (DESIGN.md v3.2): Haarlinie, Fokus in Champagner. */
const selectSx = {
  bg: "rgba(255, 255, 255, 0.03)",
  border: "1px solid",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  color: "var(--cc-text)",
  _hover: { borderColor: "rgba(255, 255, 255, 0.22)" },
  _focusVisible: { borderColor: "var(--cc-gold-line)", boxShadow: "0 0 0 1px var(--cc-gold-line)" },
  sx: { "& option": { background: "var(--cc-panel-solid)", color: "var(--cc-text)" } },
} as const;

/**
 * Warum das Feld hier überhaupt gesetzt wird: `/arsenal/pdfs` und
 * `/arsenal/templates` filtern über `arsenal_kind`. Wer eine Datei an einer
 * Lektion hochlädt, will sie dort ebenfalls finden — bis 17.09.2026 schickte
 * dieser Uploader das Feld aber gar nicht mit, und die Datei blieb in beiden
 * Listen unsichtbar.
 */
function arsenalKindForFile(file: File): "template" | "pdf" {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  return isPdf ? "pdf" : "template";
}

type AttachmentManagerProps = {
  courseId: string;
  moduleId: string;
  videoId: string;
};

/** Presigned PUT direkt zu Hetzner mit Fortschritt. */
function uploadAttachmentViaXhr(
  file: File,
  meta: { courseId: string; moduleId: string; videoId: string; attachmentId: string },
  onProgress: (pct: number) => void,
): Promise<string> {
  return uploadViaPresigned(
    file,
    {
      folder: "attachments",
      courseId: meta.courseId,
      moduleId: meta.moduleId,
      videoId: meta.videoId,
      attachmentId: meta.attachmentId,
    },
    onProgress,
  );
}

export function AttachmentManager({ courseId, moduleId, videoId }: AttachmentManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<AttachmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [categories, setCategories] = useState<ArsenalCategory[]>([]);
  /** Gilt für den nächsten Upload; bestehende Anhänge haben ihr eigenes Feld. */
  const [uploadCategoryId, setUploadCategoryId] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/attachments?videoId=${encodeURIComponent(videoId)}`);
    const json = (await res.json()) as { ok?: boolean; items?: AttachmentRow[] };
    if (json.ok && json.items) setItems(json.items);
    setLoading(false);
  }, [videoId]);

  /* eslint-disable react-hooks/set-state-in-effect -- initiale Anhang-Liste laden */
  useEffect(() => {
    void load();
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Kategorien für die Arsenal-Zuordnung; ohne sie bleiben die Auswahlfelder leer.
  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("arsenal_attachment_categories")
        .select("id, name")
        .order("name", { ascending: true });
      setCategories((data as ArsenalCategory[]) ?? []);
    })();
  }, []);

  const onPick = () => {
    inputRef.current?.click();
  };

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setFileName(file.name);
    setFileSize(file.size);
    setBusy(true);
    setProgress(0);
    setStatus("Datei wird hochgeladen…");

    const attachmentId = crypto.randomUUID();
    try {
      const storageKey = await uploadAttachmentViaXhr(
        file,
        { courseId, moduleId, videoId, attachmentId },
        setProgress,
      );
      setStatus("In Datenbank speichern…");
      const create = await fetch("/api/admin/attachments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: videoId,
          storage_key: storageKey,
          filename: file.name,
          content_type: file.type || null,
          size_bytes: file.size,
          position: items.length,
          arsenal_kind: arsenalKindForFile(file),
          arsenal_category_id: uploadCategoryId || null,
        }),
      });
      const cj = (await create.json()) as { ok?: boolean; item?: AttachmentRow; error?: string };
      if (!cj.ok || !cj.item) {
        setStatus(cj.error || "DB-Eintrag fehlgeschlagen.");
        setBusy(false);
        return;
      }
      setItems((prev) => [...prev, cj.item!]);
      setStatus("Hochgeladen.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Fehler.");
    }
    setBusy(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Anhang löschen?")) return;
    const res = await fetch(`/api/admin/attachments?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const json = (await res.json()) as { ok?: boolean };
    if (json.ok) setItems((prev) => prev.filter((x) => x.id !== id));
  };

  const toggleIsFree = async (id: string, nextValue: boolean) => {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, is_free: nextValue } : x)));
    const res = await fetch("/api/admin/attachments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_free: nextValue }),
    });
    const json = (await res.json()) as { ok?: boolean; item?: AttachmentRow; error?: string };
    if (!json.ok || !json.item) {
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, is_free: !nextValue } : x)));
      setStatus(json.error || "Konnte Free-Flag nicht speichern.");
      return;
    }
    setItems((prev) => prev.map((x) => (x.id === id ? json.item! : x)));
  };

  /** Nachpflegen an bestehenden Anhängen — ohne das bliebe der Altbestand unsortiert. */
  const setCategory = async (id: string, nextValue: string) => {
    const vorher = items.find((x) => x.id === id)?.arsenal_category_id ?? null;
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, arsenal_category_id: nextValue || null } : x)));
    const res = await fetch("/api/admin/attachments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, arsenal_category_id: nextValue || null }),
    });
    const json = (await res.json()) as { ok?: boolean; item?: AttachmentRow; error?: string };
    if (!json.ok || !json.item) {
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, arsenal_category_id: vorher } : x)));
      setStatus(json.error || "Konnte Kategorie nicht speichern.");
      return;
    }
    setItems((prev) => prev.map((x) => (x.id === id ? json.item! : x)));
  };

  const isError = !busy && !!status && (status.includes("fehlgeschlagen") || status.includes("Fehler") || status.includes("Bitte"));

  if (loading) {
    return (
      <Text fontSize="sm" color="var(--cc-text-2)">
        Anhänge werden geladen…
      </Text>
    );
  }

  return (
    <Stack spacing={3} p={4} borderRadius="10px" border="1px solid var(--cc-line)" bg="rgba(255, 255, 255, 0.02)">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf,application/*"
        hidden
        onChange={(ev) => void onChange(ev)}
      />
      <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap={3}>
        <Box flex="1" minW="200px">
          <FormLabel
            m={0}
            mb={1}
            fontSize="12px"
            fontWeight={500}
            textTransform="uppercase"
            letterSpacing="0.08em"
            color="var(--cc-text-2)"
          >
            Anhänge für Lernende
          </FormLabel>
          <Text fontSize="sm" color="var(--cc-text-2)">
            PDFs und andere Dateien zum Download neben dem Video. PDFs erscheinen
            zusätzlich unter Ressourcen &rarr; PDFs, alles andere unter Templates.
          </Text>
        </Box>
        <Button size="sm" variant="line" onClick={onPick} isLoading={busy} isDisabled={busy} flexShrink={0}>
          Datei hinzufügen
        </Button>
      </HStack>

      {categories.length > 0 ? (
        <Box maxW="320px">
          <FormLabel
            m={0}
            mb={1}
            fontSize="12px"
            fontWeight={500}
            color="var(--cc-text-2)"
            htmlFor={`att-cat-${videoId}`}
          >
            Arsenal-Kategorie für den nächsten Upload
          </FormLabel>
          <Select
            id={`att-cat-${videoId}`}
            size="sm"
            value={uploadCategoryId}
            onChange={(e) => setUploadCategoryId(e.target.value)}
            {...selectSx}
          >
            <option value="">Keine Kategorie</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Box>
      ) : null}

      {busy ? (
        <Box p={3} borderRadius="10px" border="1px solid rgba(212, 176, 128, 0.25)" bg="rgba(212, 176, 128, 0.06)">
          <HStack justify="space-between" mb={1} flexWrap="wrap" gap={1}>
            <Text fontSize="sm" fontWeight={600} color="var(--cc-text)" noOfLines={1} maxW="75%">
              {fileName ?? "Datei…"}
            </Text>
            <Text fontSize="sm" fontWeight={600} className="cc-num" color="var(--cc-gold-light)" flexShrink={0}>
              {progress}%
            </Text>
          </HStack>
          {fileSize ? (
            <Text fontSize="xs" color="var(--cc-text-2)" className="cc-num" mb={2}>
              {(fileSize / 1024 / 1024).toFixed(2)} MB
              {progress > 0 && progress < 100
                ? ` — ${((fileSize / 1024 / 1024) * (progress / 100)).toFixed(2)} MB übertragen`
                : ""}
            </Text>
          ) : null}
          <Progress
            value={progress}
            size="sm"
            aria-label="Upload-Fortschritt"
            borderRadius="full"
            bg="rgba(255, 255, 255, 0.07)"
            sx={{ "& > div": { bg: "var(--cc-gold-bar)" } }}
          />
          {status ? (
            <Text fontSize="xs" color="var(--cc-text-2)" mt={2}>{status}</Text>
          ) : null}
        </Box>
      ) : null}

      {items.length === 0 ? (
        <Text fontSize="sm" color="var(--cc-text-3)">
          Noch keine Dateien — oben auf &bdquo;Datei hinzufügen&ldquo; klicken.
        </Text>
      ) : (
        <Stack spacing={2}>
          {items.map((a) => (
            <HStack
              key={a.id}
              py={2.5}
              px={3}
              borderRadius="8px"
              border="1px solid var(--cc-line)"
              bg="rgba(255, 255, 255, 0.02)"
              justify="space-between"
              align="center"
            >
              <HStack minW={0} spacing={3}>
                <Box as="span" color="var(--cc-text-2)" display="flex" flexShrink={0} aria-hidden>
                  <FileDown size={18} strokeWidth={1.75} />
                </Box>
                <Box minW={0}>
                  <Text fontSize="sm" noOfLines={2} color="var(--cc-text)">
                    {a.filename}
                  </Text>
                  <HStack spacing={2} color="var(--cc-text-3)">
                    <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.06em">
                      {a.arsenal_kind === "pdf" ? "PDF" : a.arsenal_kind === "template" ? "Template" : "Nicht zugeordnet"}
                    </Text>
                    {a.size_bytes ? (
                      <Text fontSize="xs" className="cc-num">
                        · {(a.size_bytes / 1024 / 1024).toFixed(2)} MB
                      </Text>
                    ) : null}
                  </HStack>
                </Box>
              </HStack>
              <HStack spacing={3} flexShrink={0}>
                {categories.length > 0 ? (
                  <Select
                    size="sm"
                    h="32px"
                    maxW="200px"
                    value={a.arsenal_category_id ?? ""}
                    onChange={(e) => void setCategory(a.id, e.target.value)}
                    aria-label={`Arsenal-Kategorie für ${a.filename}`}
                    {...selectSx}
                  >
                    <option value="">Keine Kategorie</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                ) : null}
                <HStack spacing={2}>
                  <Switch
                    size="sm"
                    sx={switchSx}
                    isChecked={Boolean(a.is_free)}
                    onChange={(e) => void toggleIsFree(a.id, e.target.checked)}
                    aria-label="Free-Kurs Zugriff freischalten"
                  />
                  <Text
                    fontSize="xs"
                    fontWeight={600}
                    color={a.is_free ? "var(--cc-gold-light)" : "var(--cc-text-3)"}
                    textTransform="uppercase"
                    letterSpacing="0.06em"
                  >
                    {a.is_free ? "Free" : "Paid"}
                  </Text>
                </HStack>
                <IconButton
                  aria-label="Anhang löschen"
                  size="sm"
                  variant="line"
                  color="var(--cc-danger)"
                  _hover={{ bg: "rgba(248, 113, 113, 0.08)", borderColor: "rgba(248, 113, 113, 0.5)", boxShadow: "none" }}
                  icon={<Trash2 size={16} />}
                  onClick={() => void remove(a.id)}
                />
              </HStack>
            </HStack>
          ))}
        </Stack>
      )}

      {!busy && status ? (
        <Text fontSize="sm" color={isError ? "var(--cc-danger)" : "var(--cc-success)"}>
          {status}
        </Text>
      ) : null}
    </Stack>
  );
}
