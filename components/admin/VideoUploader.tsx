"use client";

import { Box, Button, Progress, Text } from "@chakra-ui/react";
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

/** Upload zur App-API (serverseitig → Bucket), Fortschritt am XMLHttpRequest.upload — kein CORS zum Hetzner-Endpoint. */
function uploadVideoViaProxy(
  file: File,
  meta: { courseId: string; moduleId: string; videoId: string; subcategoryId?: string | null },
  onProgress: (pct: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      folder: "videos",
      courseId: meta.courseId,
      moduleId: meta.moduleId,
      videoId: meta.videoId,
      kind: "original",
    });
    if (meta.subcategoryId) params.set("subcategoryId", meta.subcategoryId);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/admin/upload-proxy?${params.toString()}`);
    xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
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

    setBusy(true);
    setProgress(0);
    setStatus("Vorbereiten…");

    const videoId = crypto.randomUUID();
    const durationSeconds = await readVideoDuration(file);

    try {
      setStatus("Upload…");
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
        Videodatei auswählen (z. B. MP4)
      </Button>
      <Text mt={2} fontSize="sm" className="inter" color="gray.400">
        Upload läuft über diese App zum Object Storage (kein direkter Browser-Zugriff auf den Bucket nötig). Danach
        erscheint das Video in der Liste oben.
      </Text>
      {busy || progress > 0 ? (
        <Progress
          value={progress}
          size="sm"
          mt={3}
          borderRadius="full"
          colorScheme="blue"
          bg="whiteAlpha.100"
        />
      ) : null}
      {status ? (
        <Text mt={2} fontSize="sm" className="inter" color="blue.200">
          {status}
        </Text>
      ) : null}
    </Box>
  );
}
