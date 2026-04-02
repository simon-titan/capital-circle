"use client";

import { Box, Button, FormLabel, HStack, IconButton, Input, Progress, Select, Stack, Text } from "@chakra-ui/react";
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
  created_at: string;
};

type ArsenalCatRow = {
  id: string;
  name: string;
  kind_scope: string;
  position: number;
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

/** XHR-Upload mit Fortschritt — Metadaten als Query-Parameter, Datei als raw Body. */
function uploadStandaloneViaXhr(
  file: File,
  meta: { attachmentId: string },
  onProgress: (pct: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      folder: "standalone-attachments",
      attachmentId: meta.attachmentId,
    });
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/admin/upload-proxy?${params.toString()}`);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("X-File-Name", encodeURIComponent(file.name));
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) onProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        try {
          const j = JSON.parse(xhr.responseText) as { error?: string };
          reject(new Error(j.error || `Upload fehlgeschlagen (${xhr.status})`));
        } catch {
          reject(new Error(`Upload fehlgeschlagen (${xhr.status})`));
        }
        return;
      }
      try {
        const j = JSON.parse(xhr.responseText) as { ok?: boolean; storageKey?: string; error?: string };
        if (!j.ok || !j.storageKey) reject(new Error(j.error || "Upload fehlgeschlagen"));
        else resolve(j.storageKey);
      } catch {
        reject(new Error("Ungültige Server-Antwort"));
      }
    };
    xhr.onerror = () => reject(new Error("Netzwerkfehler beim Upload"));
    xhr.send(file);
  });
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

  const isError = !busy && !!status && (status.includes("fehlgeschlagen") || status.includes("Fehler") || status.includes("Bitte"));

  if (loading) {
    return (
      <Text fontSize="sm" color="gray.400" className="inter">
        Eigenständige Anhänge werden geladen…
      </Text>
    );
  }

  return (
    <Stack
      spacing={3}
      p={4}
      borderRadius="12px"
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      bg="rgba(0,0,0,0.2)"
    >
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
            mb={1}
            className="inter"
            fontSize="xs"
            textTransform="uppercase"
            letterSpacing="0.06em"
            color="gray.300"
          >
            PDFs &amp; Templates ohne Video
          </FormLabel>
          <Text fontSize="sm" className="inter" color="gray.400">
            Hochladen ohne Zuordnung zu einem Modul oder Video — für das Arsenal und freie Downloads.
          </Text>
        </Box>
      </HStack>
      <HStack flexWrap="wrap" gap={3} align="flex-end">
        <Box>
          <FormLabel fontSize="xs">Art</FormLabel>
          <Select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as "pdf" | "template");
              setCategoryId("");
            }}
            bg="whiteAlpha.50"
            maxW="200px"
            sx={adminSelectStyles.sx}
          >
            <option value="pdf">PDF</option>
            <option value="template">Template</option>
          </Select>
        </Box>
        <Box flex={1} minW="200px">
          <FormLabel fontSize="xs">Kategorie (optional)</FormLabel>
          <Select
            placeholder="—"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            bg="whiteAlpha.50"
            maxW="320px"
            sx={adminSelectStyles.sx}
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
          colorScheme="blue"
          variant="solid"
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
          borderWidth="1px"
          borderColor="rgba(59, 130, 246, 0.4)"
          bg="rgba(30, 58, 138, 0.15)"
        >
          <HStack justify="space-between" mb={1} flexWrap="wrap" gap={1}>
            <Text fontSize="sm" className="inter-semibold" color="blue.200" noOfLines={1} maxW="75%">
              {fileName ?? "Datei…"}
            </Text>
            <Text fontSize="sm" className="jetbrains-mono" color="blue.300" flexShrink={0}>
              {progress}%
            </Text>
          </HStack>
          {fileSize ? (
            <Text fontSize="xs" color="gray.400" className="inter" mb={2}>
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
            colorScheme="blue"
            bg="whiteAlpha.100"
            hasStripe={progress < 100}
            isAnimated={progress < 100}
          />
          {status ? (
            <Text fontSize="xs" color="blue.300" className="inter" mt={2}>{status}</Text>
          ) : null}
        </Box>
      ) : null}

      {items.length === 0 ? (
        <Text fontSize="sm" color="gray.500" className="inter">
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
                borderRadius="md"
                borderWidth="1px"
                borderColor="whiteAlpha.150"
                bg="whiteAlpha.50"
              >
                <HStack justify="space-between" align="center" flexWrap="wrap" gap={2}>
                  <HStack minW={0} spacing={3} flex="1">
                    <Box as="span" color="blue.300" display="flex" flexShrink={0} aria-hidden>
                      <FileDown size={18} />
                    </Box>
                    <Box minW={0}>
                      <Text className="inter" fontSize="sm" noOfLines={2} color="gray.100">
                        {a.filename}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {a.kind}
                        {a.size_bytes ? ` · ${(a.size_bytes / 1024 / 1024).toFixed(2)} MB` : ""}
                        {a.category_id ? ` · ${catLabel ?? `Kat ${a.category_id.slice(0, 8)}…`}` : ""}
                      </Text>
                    </Box>
                  </HStack>
                  <HStack flexShrink={0}>
                    <Button size="xs" variant="outline" onClick={() => startEdit(a)} isDisabled={busy}>
                      Bearbeiten
                    </Button>
                    <IconButton
                      aria-label="Eintrag löschen"
                      size="sm"
                      variant="outline"
                      colorScheme="red"
                      borderColor="red.400"
                      color="red.200"
                      _hover={{ bg: "red.900", borderColor: "red.300" }}
                      icon={<Trash2 size={16} />}
                      onClick={() => void remove(a.id)}
                    />
                  </HStack>
                </HStack>
                {editingId === a.id ? (
                  <Stack spacing={3} pt={1} borderTopWidth="1px" borderColor="whiteAlpha.200">
                    <Box>
                      <FormLabel fontSize="xs">Dateiname (Anzeige)</FormLabel>
                      <Input value={editFilename} onChange={(e) => setEditFilename(e.target.value)} bg="blackAlpha.400" size="sm" />
                    </Box>
                    <HStack flexWrap="wrap" gap={3} align="flex-end">
                      <Box>
                        <FormLabel fontSize="xs">Art</FormLabel>
                        <Select
                          value={editKind}
                          onChange={(e) => {
                            const k = e.target.value as "pdf" | "template";
                            setEditKind(k);
                            setEditCategoryId("");
                            void fetchCategoriesForKind(k).then(setEditCategories);
                          }}
                          bg="blackAlpha.400"
                          maxW="200px"
                          size="sm"
                          sx={adminSelectStyles.sx}
                        >
                          <option value="pdf">PDF</option>
                          <option value="template">Template</option>
                        </Select>
                      </Box>
                      <Box flex={1} minW="180px">
                        <FormLabel fontSize="xs">Kategorie (optional)</FormLabel>
                        <Select
                          placeholder="—"
                          value={editCategoryId}
                          onChange={(e) => setEditCategoryId(e.target.value)}
                          bg="blackAlpha.400"
                          maxW="320px"
                          size="sm"
                          sx={adminSelectStyles.sx}
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
                      <Button size="sm" colorScheme="blue" onClick={() => void saveEdit()} isLoading={busy} isDisabled={!editFilename.trim()}>
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
          })}
        </Stack>
      )}

      {!busy && status ? (
        <Text fontSize="sm" color={isError ? "red.300" : "green.300"} className="inter">
          {status}
        </Text>
      ) : null}
    </Stack>
  );
}
