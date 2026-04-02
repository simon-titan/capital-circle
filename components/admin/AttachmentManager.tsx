"use client";

import { Box, Button, FormLabel, HStack, IconButton, Progress, Stack, Text } from "@chakra-ui/react";
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
  created_at: string;
};

type AttachmentManagerProps = {
  courseId: string;
  moduleId: string;
  videoId: string;
};

/** XHR-Upload mit Fortschritt — Metadaten als Query-Parameter, Datei als raw Body. */
function uploadAttachmentViaXhr(
  file: File,
  meta: { courseId: string; moduleId: string; videoId: string; attachmentId: string },
  onProgress: (pct: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      folder: "attachments",
      courseId: meta.courseId,
      moduleId: meta.moduleId,
      videoId: meta.videoId,
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

  const isError = !busy && !!status && (status.includes("fehlgeschlagen") || status.includes("Fehler") || status.includes("Bitte"));

  if (loading) {
    return (
      <Text fontSize="sm" color="gray.400" className="inter">
        Anhänge werden geladen…
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
        accept=".pdf,application/pdf,application/*"
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
            Anhänge für Lernende
          </FormLabel>
          <Text fontSize="sm" className="inter" color="gray.400">
            PDFs und andere Dateien zum Download neben dem Video.
          </Text>
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
          Datei hinzufügen
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
          Noch keine Dateien — oben auf &bdquo;Datei hinzufügen&ldquo; klicken.
        </Text>
      ) : (
        <Stack spacing={2}>
          {items.map((a) => (
            <HStack
              key={a.id}
              py={2.5}
              px={3}
              borderRadius="md"
              borderWidth="1px"
              borderColor="whiteAlpha.150"
              bg="whiteAlpha.50"
              justify="space-between"
              align="center"
            >
              <HStack minW={0} spacing={3}>
                <Box as="span" color="blue.300" display="flex" flexShrink={0} aria-hidden>
                  <FileDown size={18} />
                </Box>
                <Box minW={0}>
                  <Text className="inter" fontSize="sm" noOfLines={2} color="gray.100">
                    {a.filename}
                  </Text>
                  {a.size_bytes ? (
                    <Text fontSize="xs" color="gray.500" className="inter">
                      {(a.size_bytes / 1024 / 1024).toFixed(2)} MB
                    </Text>
                  ) : null}
                </Box>
              </HStack>
              <IconButton
                aria-label="Anhang löschen"
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
          ))}
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
