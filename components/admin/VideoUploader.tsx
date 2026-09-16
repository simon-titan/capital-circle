"use client";

import { uploadViaPresigned } from "@/lib/admin-upload-presigned";
import { Box, Button, HStack, Progress, Text } from "@chakra-ui/react";
import { useCallback, useRef, useState } from "react";

function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const d = video.duration;
      resolve(Number.isFinite(d) ? Math.floor(d) : null);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
}

/** Presigned PUT direkt zu Hetzner (umgeht Vercel Body-Limit). */
function uploadVideoViaProxy(
  file: File,
  meta: { courseId: string; moduleId: string; videoId: string; subcategoryId?: string | null },
  onProgress: (pct: number) => void,
): Promise<string> {
  return uploadViaPresigned(
    file,
    {
      folder: "videos",
      courseId: meta.courseId,
      moduleId: meta.moduleId,
      videoId: meta.videoId,
      kind: "original",
      ...(meta.subcategoryId ? { subcategoryId: meta.subcategoryId } : {}),
    },
    onProgress,
  );
}

export type VideoUploadedPayload = {
  videoId: string;
  storageKey: string;
  durationSeconds: number | null;
};

type VideoUploaderProps = {
  courseId: string;
  moduleId: string;
  subcategoryId?: string | null;
  onUploaded: (payload: VideoUploadedPayload) => void;
  disabled?: boolean;
};

export function VideoUploader({ courseId, moduleId, subcategoryId, onUploaded, disabled }: VideoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);

  const onPick = useCallback(async () => {
    inputRef.current?.click();
  }, []);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("video/")) {
      setStatus("Bitte eine Videodatei wählen.");
      return;
    }

    setFileName(file.name);
    setFileSize(file.size);
    setBusy(true);
    setProgress(0);
    setStatus("Dauer wird ermittelt…");

    const videoId = crypto.randomUUID();
    const durationSeconds = await readVideoDuration(file);

    try {
      setStatus("Video wird hochgeladen…");
      const storageKey = await uploadVideoViaProxy(
        file,
        { courseId, moduleId, videoId, subcategoryId },
        setProgress,
      );
      setStatus("Fertig.");
      onUploaded({ videoId, storageKey, durationSeconds });
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  const isError = !busy && !!status && (status.includes("fehlgeschlagen") || status.includes("Fehler") || status.includes("Bitte"));

  return (
    <Box p={4} borderRadius="10px" border="1px solid var(--cc-line)" bg="rgba(255, 255, 255, 0.02)">
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        hidden
        onChange={(ev) => void onChange(ev)}
      />
      <Text fontSize="12px" fontWeight={500} textTransform="uppercase" letterSpacing="0.08em" color="var(--cc-text-2)" mb={2}>
        Neues Video hochladen
      </Text>
      <Button
        size="md"
        variant="gold"
        onClick={() => void onPick()}
        isLoading={busy}
        isDisabled={disabled || busy}
      >
        Videodatei auswählen (z. B. MP4)
      </Button>
      <Text mt={2} fontSize="sm" color="var(--cc-text-2)">
        Upload läuft über diese App zum Object Storage (kein direkter Browser-Zugriff auf den Bucket nötig). Danach
        erscheint das Video in der Liste oben.
      </Text>

      {busy ? (
        <Box
          mt={3}
          p={3}
          borderRadius="10px"
          border="1px solid rgba(212, 176, 128, 0.25)"
          bg="rgba(212, 176, 128, 0.06)"
        >
          <HStack justify="space-between" mb={1} flexWrap="wrap" gap={1}>
            <Text fontSize="sm" fontWeight={600} color="var(--cc-text)" noOfLines={1} maxW="75%">
              {fileName ?? "Video…"}
            </Text>
            <Text fontSize="sm" fontWeight={600} className="cc-num" color="var(--cc-gold-light)" flexShrink={0}>
              {progress}%
            </Text>
          </HStack>
          {fileSize ? (
            <Text fontSize="xs" color="var(--cc-text-2)" className="cc-num" mb={2}>
              {(fileSize / 1024 / 1024).toFixed(1)} MB
              {progress > 0 && progress < 100
                ? ` — ${((fileSize / 1024 / 1024) * (progress / 100)).toFixed(1)} MB übertragen`
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
      ) : status ? (
        <Text mt={2} fontSize="sm" color={isError ? "var(--cc-danger)" : "var(--cc-success)"}>
          {status}
        </Text>
      ) : null}
    </Box>
  );
}
