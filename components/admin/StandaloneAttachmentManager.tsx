"use client";

import { uploadViaPresigned } from "@/lib/admin-upload-presigned";
import { Box, Button, FormLabel, HStack, IconButton, Input, Progress, Select, Stack, Switch, Text } from "@chakra-ui/react";
import { FileDown, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type StandaloneAttachmentRow = {
  id: string;
  storage_key: string;
  filename: string;
  content_type: string | null;
  size_bytes: number | null;
  kind: "pdf" | "template";
  category_id: string | null;
  position: number;
  is_free: boolean | null;
  created_at: string;
};

type ArsenalCatRow = {
  id: string;
  name: string;
  kind_scope: string;
  position: number;
};

/** Eingabefelder im Admin (DESIGN.md v3.2): Haarlinie, Fokus in Champagner. */
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

const optionSx = { "& option": { background: "var(--cc-panel-solid)", color: "var(--cc-text)" } };

const switchSx = {
  ".chakra-switch__track": { bg: "var(--cc-track)" },
  ".chakra-switch__track[data-checked]": { bg: "var(--cc-gold)" },
};

const labelProps = { fontSize: "12px", fontWeight: 500, color: "var(--cc-text-2)" } as const;

const dangerIconBtn = {
  variant: "line",
  color: "var(--cc-danger)",
  _hover: { bg: "rgba(248, 113, 113, 0.08)", borderColor: "rgba(248, 113, 113, 0.45)", boxShadow: "none" },
} as const;

/** Presigned PUT direkt zu Hetzner mit Fortschritt. */
function uploadStandaloneViaXhr(
  file: File,
  meta: { attachmentId: string },
  onProgress: (pct: number) => void,
): Promise<string> {
  return uploadViaPresigned(
    file,
    { folder: "standalone-attachments", attachmentId: meta.attachmentId },
    onProgress,
  );
}

export function StandaloneAttachmentManager() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<StandaloneAttachmentRow[]>([]);
  const [categories, setCategories] = useState<ArsenalCatRow[]>([]);
  const [kind, setKind] = useState<"pdf" | "template">("pdf");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFilename, setEditFilename] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editKind, setEditKind] = useState<"pdf" | "template">("pdf");
  const [editCategories, setEditCategories] = useState<ArsenalCatRow[]>([]);
  const [allCategories, setAllCategories] = useState<ArsenalCatRow[]>([]);

  const fetchCategoriesForKind = useCallback(async (k: "pdf" | "template") => {
    const supabase = createClient();
    const orFilter =
      k === "template" ? "kind_scope.eq.both,kind_scope.eq.template" : "kind_scope.eq.both,kind_scope.eq.pdf";
    const { data } = await supabase.from("arsenal_attachment_categories").select("*").or(orFilter).order("name", { ascending: true });
    return ((data as ArsenalCatRow[]) ?? []) as ArsenalCatRow[];
  }, []);

  const loadCategories = useCallback(async () => {
    const supabase = createClient();
    const orFilter =
      kind === "template" ? "kind_scope.eq.both,kind_scope.eq.template" : "kind_scope.eq.both,kind_scope.eq.pdf";
    const { data } = await supabase.from("arsenal_attachment_categories").select("*").or(orFilter).order("name", { ascending: true });
    setCategories((data as ArsenalCatRow[]) ?? []);
  }, [kind]);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/standalone-attachments");
    const json = (await res.json()) as { ok?: boolean; items?: StandaloneAttachmentRow[] };
    if (json.ok && json.items) setItems(json.items);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Supabase: Kategorien nach Art filtern
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from("arsenal_attachment_categories")
      .select("*")
      .order("name", { ascending: true })
      .then(({ data }) => {
        setAllCategories((data as ArsenalCatRow[]) ?? []);
      });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initiale Liste
    void load();
  }, [load]);

  const startEdit = (a: StandaloneAttachmentRow) => {
    setEditingId(a.id);
    setEditFilename(a.filename);
    setEditCategoryId(a.category_id ?? "");
    setEditKind(a.kind);
    void fetchCategoriesForKind(a.kind).then(setEditCategories);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editFilename.trim()) return;
    setBusy(true);
    setStatus(null);
    const res = await fetch("/api/admin/standalone-attachments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingId,
        filename: editFilename.trim(),
        category_id: editCategoryId || null,
        kind: editKind,
      }),
    });
    const json = (await res.json()) as { ok?: boolean; item?: StandaloneAttachmentRow; error?: string };
    setBusy(false);
    if (!json.ok || !json.item) {
      setStatus(json.error || "Speichern fehlgeschlagen.");
      return;
    }
    setItems((prev) => prev.map((x) => (x.id === editingId ? json.item! : x)));
    setEditingId(null);
    setStatus("Gespeichert.");
  };

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
      const storageKey = await uploadStandaloneViaXhr(file, { attachmentId }, setProgress);
      setStatus("In Datenbank speichern…");
      const create = await fetch("/api/admin/standalone-attachments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storage_key: storageKey,
          filename: file.name,
          content_type: file.type || null,
          size_bytes: file.size,
          kind,
          category_id: categoryId || null,
          position: items.length,
        }),
      });
      const cj = (await create.json()) as { ok?: boolean; item?: StandaloneAttachmentRow; error?: string };
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
    if (!confirm("Datei-Eintrag löschen?")) return;
    const res = await fetch(`/api/admin/standalone-attachments?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const json = (await res.json()) as { ok?: boolean };
    if (json.ok) {
      if (editingId === id) setEditingId(null);
      setItems((prev) => prev.filter((x) => x.id !== id));
    }
  };

  const toggleIsFree = async (id: string, nextValue: boolean) => {
    // Optimistic update
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, is_free: nextValue } : x)));
    const res = await fetch("/api/admin/standalone-attachments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_free: nextValue }),
    });
    const json = (await res.json()) as { ok?: boolean; item?: StandaloneAttachmentRow; error?: string };
    if (!json.ok || !json.item) {
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, is_free: !nextValue } : x)));
      setStatus(json.error || "Konnte Free-Flag nicht speichern.");
      return;
    }
    setItems((prev) => prev.map((x) => (x.id === id ? json.item! : x)));
  };

  const isError = !busy && !!status && (status.includes("fehlgeschlagen") || status.includes("Fehler") || status.includes("Bitte"));

  if (loading) {
    return (
      <Text fontSize="sm" color="var(--cc-text-2)">
        Eigenständige Anhänge werden geladen…
      </Text>
    );
  }

  return (
    <Stack spacing={4} p={{ base: 4, md: 5 }} className="cc-card cc-card--still">
      <input
        ref={inputRef}
        type="file"
        accept={kind === "pdf" ? ".pdf,application/pdf" : "application/*,.doc,.docx"}
        hidden
        onChange={(ev) => void onChange(ev)}
      />
      <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap={3}>
        <Box flex="1" minW="200px">
          <FormLabel
            m={0}
            mb={1.5}
            fontSize="13px"
            lineHeight="18px"
            fontWeight={500}
            textTransform="uppercase"
            letterSpacing="0.12em"
            color="var(--cc-text-soft)"
          >
            PDFs &amp; Templates ohne Video
          </FormLabel>
          <Text fontSize="sm" color="var(--cc-text-2)">
            Hochladen ohne Zuordnung zu einem Modul oder Video — für das Arsenal und freie Downloads.
          </Text>
        </Box>
      </HStack>
      <HStack flexWrap="wrap" gap={3} align="flex-end">
        <Box>
          <FormLabel {...labelProps}>Art</FormLabel>
          <Select
            {...fieldSx}
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as "pdf" | "template");
              setCategoryId("");
            }}
            maxW="200px"
            sx={optionSx}
          >
            <option value="pdf">PDF</option>
            <option value="template">Template</option>
          </Select>
        </Box>
        <Box flex={1} minW="200px">
          <FormLabel {...labelProps}>Kategorie (optional)</FormLabel>
          <Select
            {...fieldSx}
            placeholder="—"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            maxW="320px"
            sx={optionSx}
          >
            <option value="">Keine</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Box>
        <Button
          size="md"
          variant="gold"
          onClick={onPick}
          isLoading={busy}
          isDisabled={busy}
          flexShrink={0}
        >
          Datei hochladen
        </Button>
      </HStack>

      {busy ? (
        <Box
          p={3}
          borderRadius="10px"
          border="1px solid rgba(212, 176, 128, 0.25)"
          bg="rgba(212, 176, 128, 0.06)"
        >
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
            borderRadius="full"
            bg="rgba(255, 255, 255, 0.07)"
            sx={{ "& > div": { bg: "var(--cc-gold-bar)" } }}
            hasStripe={progress < 100}
            isAnimated={progress < 100}
            aria-label="Upload-Fortschritt"
          />
          {status ? (
            <Text fontSize="xs" color="var(--cc-gold-light)" mt={2} role="status">
              {status}
            </Text>
          ) : null}
        </Box>
      ) : null}

      {items.length === 0 ? (
        <Text fontSize="sm" color="var(--cc-text-3)">
          Noch keine eigenständigen Dateien.
        </Text>
      ) : (
        <Stack spacing={2}>
          {items.map((a) => {
            const catLabel = allCategories.find((c) => c.id === a.category_id)?.name;
            return (
              <Stack
                key={a.id}
                spacing={2}
                py={2.5}
                px={3}
                borderRadius="10px"
                border="1px solid var(--cc-line)"
                bg="rgba(255, 255, 255, 0.02)"
                transition="border-color 150ms var(--cc-ease)"
                _hover={{ borderColor: "var(--cc-line-strong)" }}
              >
                <HStack justify="space-between" align="center" flexWrap="wrap" gap={2}>
                  <HStack minW={0} spacing={3} flex="1">
                    <Box as="span" color="var(--cc-text-2)" display="flex" flexShrink={0} aria-hidden>
                      <FileDown size={18} strokeWidth={1.75} />
                    </Box>
                    <Box minW={0}>
                      <Text fontSize="sm" noOfLines={2} color="var(--cc-text)">
                        {a.filename}
                      </Text>
                      <Text fontSize="xs" color="var(--cc-text-3)" className="cc-num">
                        {a.kind}
                        {a.size_bytes ? ` · ${(a.size_bytes / 1024 / 1024).toFixed(2)} MB` : ""}
                        {a.category_id ? ` · ${catLabel ?? `Kat ${a.category_id.slice(0, 8)}…`}` : ""}
                      </Text>
                    </Box>
                  </HStack>
                  <HStack flexShrink={0} spacing={3}>
                    <HStack spacing={2}>
                      <Switch
                        size="sm"
                        sx={switchSx}
                        isChecked={Boolean(a.is_free)}
                        onChange={(e) => void toggleIsFree(a.id, e.target.checked)}
                        aria-label="Free-Kurs Zugriff freischalten"
                      />
                      <Text
                        fontSize="11px"
                        fontWeight={600}
                        color={a.is_free ? "var(--cc-gold-light)" : "var(--cc-text-3)"}
                        textTransform="uppercase"
                        letterSpacing="0.08em"
                        minW="32px"
                      >
                        {a.is_free ? "Free" : "Paid"}
                      </Text>
                    </HStack>
                    <Button size="xs" variant="line" onClick={() => startEdit(a)} isDisabled={busy}>
                      Bearbeiten
                    </Button>
                    <IconButton
                      aria-label="Eintrag löschen"
                      size="sm"
                      {...dangerIconBtn}
                      icon={<Trash2 size={16} />}
                      onClick={() => void remove(a.id)}
                    />
                  </HStack>
                </HStack>
                {editingId === a.id ? (
                  <Stack spacing={3} pt={3} borderTop="1px solid var(--cc-line)">
                    <Box>
                      <FormLabel {...labelProps}>Dateiname (Anzeige)</FormLabel>
                      <Input {...fieldSx} value={editFilename} onChange={(e) => setEditFilename(e.target.value)} size="sm" />
                    </Box>
                    <HStack flexWrap="wrap" gap={3} align="flex-end">
                      <Box>
                        <FormLabel {...labelProps}>Art</FormLabel>
                        <Select
                          {...fieldSx}
                          value={editKind}
                          onChange={(e) => {
                            const k = e.target.value as "pdf" | "template";
                            setEditKind(k);
                            setEditCategoryId("");
                            void fetchCategoriesForKind(k).then(setEditCategories);
                          }}
                          maxW="200px"
                          size="sm"
                          sx={optionSx}
                        >
                          <option value="pdf">PDF</option>
                          <option value="template">Template</option>
                        </Select>
                      </Box>
                      <Box flex={1} minW="180px">
                        <FormLabel {...labelProps}>Kategorie (optional)</FormLabel>
                        <Select
                          {...fieldSx}
                          placeholder="—"
                          value={editCategoryId}
                          onChange={(e) => setEditCategoryId(e.target.value)}
                          maxW="320px"
                          size="sm"
                          sx={optionSx}
                        >
                          <option value="">Keine</option>
                          {editCategories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </Select>
                      </Box>
                    </HStack>
                    <HStack>
                      <Button size="sm" variant="gold" onClick={() => void saveEdit()} isLoading={busy} isDisabled={!editFilename.trim()}>
                        Speichern
                      </Button>
                      <Button size="sm" variant="ghost" color="var(--cc-text-2)" onClick={cancelEdit}>
                        Abbrechen
                      </Button>
                    </HStack>
                  </Stack>
                ) : null}
              </Stack>
            );
          })}
        </Stack>
      )}

      {!busy && status ? (
        <Text fontSize="sm" color={isError ? "var(--cc-danger)" : "var(--cc-success)"} role="status">
          {status}
        </Text>
      ) : null}
    </Stack>
  );
}
