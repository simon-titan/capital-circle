"use client";

import { Box, Button, FormLabel, HStack, IconButton, Stack, Text } from "@chakra-ui/react";
import { FileDown, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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

/** Upload über die App-API (serverseitig → S3) — Metadaten als Query-Parameter, Datei als raw Body. */
async function uploadAttachmentProxy(
  file: File,
  meta: { courseId: string; moduleId: string; videoId: string; attachmentId: string },
): Promise<string> {
  const params = new URLSearchParams({
    folder: "attachments",
    courseId: meta.courseId,
    moduleId: meta.moduleId,
    videoId: meta.videoId,
    attachmentId: meta.attachmentId,
  });
  const res = await fetch(`/api/admin/upload-proxy?${params.toString()}`, {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-File-Name": encodeURIComponent(file.name),
    },
    body: file,
  });
  const json = (await res.json()) as { ok?: boolean; storageKey?: string; error?: string };
  if (!res.ok || !json.ok || !json.storageKey) {
    throw new Error(json.error || `Upload fehlgeschlagen (${res.status}).`);
  }
  return json.storageKey;
}

export function AttachmentManager({ courseId, moduleId, videoId }: AttachmentManagerProps) {
  const [items, setItems] = useState<AttachmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/attachments?videoId=${encodeURIComponent(videoId)}`);
    const json = (await res.json()) as { ok?: boolean; items?: AttachmentRow[] };
    if (json.ok && json.items) setItems(json.items);
    setLoading(false);
  }, [videoId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onPick = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,application/pdf,application/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setBusy(true);
      setStatus(null);
      const attachmentId = crypto.randomUUID();
      try {
        const storageKey = await uploadAttachmentProxy(file, {
          courseId,
          moduleId,
          videoId,
          attachmentId,
        });
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
    input.click();
  };

  const remove = async (id: string) => {
    if (!confirm("Anhang löschen?")) return;
    const res = await fetch(`/api/admin/attachments?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const json = (await res.json()) as { ok?: boolean };
    if (json.ok) setItems((prev) => prev.filter((x) => x.id !== id));
  };

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
          onClick={() => void onPick()}
          isLoading={busy}
          isDisabled={busy}
          flexShrink={0}
        >
          Datei hinzufügen
        </Button>
      </HStack>
      {items.length === 0 ? (
        <Text fontSize="sm" color="gray.500" className="inter">
          Noch keine Dateien — oben auf „Datei hinzufügen“ klicken.
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
                <Text className="inter" fontSize="sm" noOfLines={2} color="gray.100">
                  {a.filename}
                </Text>
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
      {status ? (
        <Box>
          <Text fontSize="sm" color="blue.200" className="inter">
            {status}
          </Text>
        </Box>
      ) : null}
    </Stack>
  );
}
