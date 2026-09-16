"use client";

import { uploadViaPresigned } from "@/lib/admin-upload-presigned";
import { Box, Button, FormLabel, HStack, IconButton, Progress, Stack, Switch, Text } from "@chakra-ui/react";
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
  created_at: string;
};

/** Schalter-Spur in Champagner statt Chakra-Palette (v3.2). */
const switchSx = {
  ".chakra-switch__track": { bg: "var(--cc-track)" },
  ".chakra-switch__track[data-checked]": { bg: "var(--cc-gold)" },
};

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
            PDFs und andere Dateien zum Download neben dem Video.
          </Text>
        </Box>
        <Button size="sm" variant="line" onClick={onPick} isLoading={busy} isDisabled={busy} flexShrink={0}>
          Datei hinzufügen
        </Button>
      </HStack>

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
                  {a.size_bytes ? (
                    <Text fontSize="xs" color="var(--cc-text-3)" className="cc-num">
                      {(a.size_bytes / 1024 / 1024).toFixed(2)} MB
                    </Text>
                  ) : null}
                </Box>
              </HStack>
              <HStack spacing={3} flexShrink={0}>
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
