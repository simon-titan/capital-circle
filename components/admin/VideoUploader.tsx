"use client";

import { uploadFileViaFetchWithProgress } from "@/lib/admin-upload-via-fetch";
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

/** Upload zur App-API (serverseitig → Bucket), Fortschritt per fetch + ReadableStream — kein CORS zum Hetzner-Endpoint. */
function uploadVideoViaProxy(
  file: File,
  meta: { courseId: string; moduleId: string; videoId: string; subcategoryId?: string | null },
  onProgress: (pct: number) => void,
): Promise<string> {
  const params = new URLSearchParams({
    folder: "videos",
    courseId: meta.courseId,
    moduleId: meta.moduleId,
    videoId: meta.videoId,
    kind: "original",
  });
  if (meta.subcategoryId) params.set("subcategoryId", meta.subcategoryId);

  return uploadFileViaFetchWithProgress(
    file,
    `/api/admin/upload-proxy?${params.toString()}`,
    {
      "Content-Type": file.type || "video/mp4",
      "X-File-Name": encodeURIComponent(file.name),
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
    <Box
      p={4}
      borderRadius="12px"
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      bg="rgba(255,255,255,0.04)"
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        hidden
        onChange={(ev) => void onChange(ev)}
      />
      <Text fontSize="xs" className="inter" textTransform="uppercase" letterSpacing="0.06em" color="gray.400" mb={2}>
        Neues Video hochladen
      </Text>
      <Button
        size="md"
        colorScheme="blue"
        variant="solid"
        onClick={() => void onPick()}
        isLoading={busy}
        isDisabled={disabled || busy}
      >
        Videodatei auswählen (z. B. MP4)
      </Button>
      <Text mt={2} fontSize="sm" className="inter" color="gray.400">
        Upload läuft über diese App zum Object Storage (kein direkter Browser-Zugriff auf den Bucket nötig). Danach
        erscheint das Video in der Liste oben.
      </Text>

      {busy ? (
        <Box
          mt={3}
          p={3}
          borderRadius="10px"
          borderWidth="1px"
          borderColor="rgba(59, 130, 246, 0.4)"
          bg="rgba(30, 58, 138, 0.15)"
        >
          <HStack justify="space-between" mb={1} flexWrap="wrap" gap={1}>
            <Text fontSize="sm" className="inter-semibold" color="blue.200" noOfLines={1} maxW="75%">
              {fileName ?? "Video…"}
            </Text>
            <Text fontSize="sm" className="jetbrains-mono" color="blue.300" flexShrink={0}>
              {progress}%
            </Text>
          </HStack>
          {fileSize ? (
            <Text fontSize="xs" color="gray.400" className="inter" mb={2}>
              {(fileSize / 1024 / 1024).toFixed(1)} MB
              {progress > 0 && progress < 100
                ? ` — ${((fileSize / 1024 / 1024) * (progress / 100)).toFixed(1)} MB übertragen`
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
      ) : status ? (
        <Text mt={2} fontSize="sm" className="inter" color={isError ? "red.300" : "green.300"}>
          {status}
        </Text>
      ) : null}
    </Box>
  );
}
