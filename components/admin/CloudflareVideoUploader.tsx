"use client";

import { uploadVideoToCloudflare } from "@/lib/admin-upload-cloudflare";
import { Box, Button, HStack, Progress, Stack, Text } from "@chakra-ui/react";
import { CheckCircle2, CloudUpload, XCircle } from "lucide-react";
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

/** Dateiname ohne Endung — Vorgabe für den Videotitel, besser als „Neues Video“. */
function titelAusDateiname(name: string): string {
  return name.replace(/\.[a-z0-9]{2,4}$/i, "").trim() || "Neues Video";
}

export type CloudflareVideoUploadedPayload = {
  videoId: string;
  cloudflareUid: string;
  durationSeconds: number | null;
  /** Dateiname ohne Endung — die Aufrufer setzen ihn als Titel. */
  fileName: string;
};

type WarteschlangenEintrag = {
  id: string;
  name: string;
  sizeBytes: number;
  status: "wartet" | "laeuft" | "fertig" | "fehler";
  progress: number;
  fehler?: string;
};

type CloudflareVideoUploaderProps = {
  /** Wird pro hochgeladener Datei einmal aufgerufen — bei Mehrfachauswahl mehrfach. */
  onUploaded: (payload: CloudflareVideoUploadedPayload) => void | Promise<void>;
  disabled?: boolean;
};

export function CloudflareVideoUploader({ onUploaded, disabled }: CloudflareVideoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [warteschlange, setWarteschlange] = useState<WarteschlangenEintrag[]>([]);
  const [busy, setBusy] = useState(false);
  const [hinweis, setHinweis] = useState<string | null>(null);

  // Dragenter/-leave feuern auch für Kindelemente. Ein Zähler statt eines Booleans
  // verhindert, dass die Zone beim Überfahren innerer Knoten flackert.
  const dragTiefe = useRef(0);
  const [dragAktiv, setDragAktiv] = useState(false);

  const setzeEintrag = useCallback((id: string, patch: Partial<WarteschlangenEintrag>) => {
    setWarteschlange((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const verarbeite = useCallback(
    async (dateien: File[]) => {
      const videos = dateien.filter((f) => f.type.startsWith("video/") || /\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(f.name));
      const verworfen = dateien.length - videos.length;

      if (videos.length === 0) {
        setHinweis("Keine Videodatei dabei — bitte MP4, MOV, WEBM o. Ä. ablegen.");
        return;
      }
      setHinweis(verworfen > 0 ? `${verworfen} Datei(en) übersprungen — keine Videos.` : null);

      const neue: WarteschlangenEintrag[] = videos.map((f) => ({
        id: crypto.randomUUID(),
        name: f.name,
        sizeBytes: f.size,
        status: "wartet",
        progress: 0,
      }));
      setWarteschlange((prev) => [...prev, ...neue]);
      setBusy(true);

      // Bewusst nacheinander: parallele Uploads teilen sich die Leitung und die
      // Fortschrittsanzeige wird unbrauchbar. Ein Fehler stoppt die Reihe nicht.
      for (let i = 0; i < videos.length; i++) {
        const file = videos[i];
        const eintrag = neue[i];
        setzeEintrag(eintrag.id, { status: "laeuft", progress: 0 });

        try {
          const durationSeconds = await readVideoDuration(file);
          const { uid } = await uploadVideoToCloudflare(
            file,
            { name: file.name, maxDurationSeconds: durationSeconds ? durationSeconds + 60 : undefined },
            (pct) => setzeEintrag(eintrag.id, { progress: pct }),
          );
          setzeEintrag(eintrag.id, { status: "fertig", progress: 100 });
          await onUploaded({
            videoId: crypto.randomUUID(),
            cloudflareUid: uid,
            durationSeconds,
            fileName: titelAusDateiname(file.name),
          });
        } catch (err) {
          setzeEintrag(eintrag.id, {
            status: "fehler",
            fehler: err instanceof Error ? err.message : "Upload fehlgeschlagen.",
          });
        }
      }

      setBusy(false);
    },
    [onUploaded, setzeEintrag],
  );

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateien = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (dateien.length > 0) void verarbeite(dateien);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragTiefe.current = 0;
    setDragAktiv(false);
    if (disabled || busy) return;
    const dateien = Array.from(e.dataTransfer.files ?? []);
    if (dateien.length > 0) void verarbeite(dateien);
  };

  const gesperrt = Boolean(disabled) || busy;
  const offen = warteschlange.filter((e) => e.status === "wartet" || e.status === "laeuft").length;
  const fertig = warteschlange.filter((e) => e.status === "fertig").length;

  return (
    <Box
      onDragEnter={(e) => {
        e.preventDefault();
        if (gesperrt) return;
        dragTiefe.current += 1;
        setDragAktiv(true);
      }}
      onDragOver={(e) => {
        // Ohne preventDefault übernimmt der Browser den Drop und öffnet die Datei.
        e.preventDefault();
        if (!gesperrt) e.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        dragTiefe.current = Math.max(0, dragTiefe.current - 1);
        if (dragTiefe.current === 0) setDragAktiv(false);
      }}
      onDrop={onDrop}
      p={{ base: 4, md: 6 }}
      borderRadius="10px"
      border="1px dashed"
      borderColor={dragAktiv ? "var(--cc-gold-line)" : "var(--cc-line-strong)"}
      bg={dragAktiv ? "rgba(212, 176, 128, 0.07)" : "rgba(255, 255, 255, 0.02)"}
      boxShadow={dragAktiv ? "0 0 0 1px var(--cc-gold-line), 0 0 28px rgba(212, 176, 128, 0.14)" : "none"}
      transition="border-color 160ms var(--cc-ease), background-color 160ms var(--cc-ease), box-shadow 160ms var(--cc-ease)"
      textAlign="center"
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        multiple
        hidden
        onChange={onChange}
      />

      <Box
        as={CloudUpload}
        aria-hidden
        mx="auto"
        mb={2}
        boxSize="28px"
        color={dragAktiv ? "var(--cc-gold-light)" : "var(--cc-text-3)"}
        transition="color 160ms var(--cc-ease)"
      />

      <Text fontSize="15px" fontWeight={600} color="var(--cc-text)">
        {dragAktiv ? "Loslassen zum Hochladen" : "Videos hierher ziehen"}
      </Text>
      <Text mt={1} fontSize="13px" color="var(--cc-text-2)">
        Mehrere Dateien gleichzeitig möglich — sie werden nacheinander direkt zu Cloudflare Stream übertragen.
      </Text>

      <Button
        mt={3}
        size="sm"
        variant="line"
        onClick={() => inputRef.current?.click()}
        isDisabled={gesperrt}
      >
        …oder Dateien auswählen
      </Button>

      {hinweis ? (
        <Text mt={2} fontSize="13px" color="var(--cc-danger)">
          {hinweis}
        </Text>
      ) : null}

      {warteschlange.length > 0 ? (
        <Stack mt={4} spacing={2} textAlign="left">
          <Text
            fontSize="12px"
            fontWeight={500}
            textTransform="uppercase"
            letterSpacing="0.08em"
            color="var(--cc-text-2)"
          >
            {offen > 0 ? (
              <>
                Upload läuft — <Box as="span" className="cc-num">{fertig}</Box> von{" "}
                <Box as="span" className="cc-num">{warteschlange.length}</Box> fertig
              </>
            ) : (
              <>
                <Box as="span" className="cc-num">{warteschlange.length}</Box> Datei(en) verarbeitet
              </>
            )}
          </Text>

          {warteschlange.map((e) => (
            <Box
              key={e.id}
              px={3}
              py={2}
              borderRadius="8px"
              border="1px solid"
              borderColor={
                e.status === "fehler"
                  ? "rgba(248, 113, 113, 0.35)"
                  : e.status === "fertig"
                    ? "rgba(74, 222, 128, 0.28)"
                    : "rgba(212, 176, 128, 0.25)"
              }
              bg={
                e.status === "fehler"
                  ? "rgba(248, 113, 113, 0.06)"
                  : e.status === "fertig"
                    ? "rgba(74, 222, 128, 0.05)"
                    : "rgba(212, 176, 128, 0.05)"
              }
            >
              <HStack justify="space-between" spacing={2} mb={e.status === "laeuft" ? 1.5 : 0}>
                <HStack spacing={2} minW={0}>
                  {e.status === "fertig" ? (
                    <Box as={CheckCircle2} boxSize="15px" color="var(--cc-success)" flexShrink={0} aria-hidden />
                  ) : e.status === "fehler" ? (
                    <Box as={XCircle} boxSize="15px" color="var(--cc-danger)" flexShrink={0} aria-hidden />
                  ) : null}
                  <Text fontSize="13px" fontWeight={500} color="var(--cc-text)" noOfLines={1}>
                    {e.name}
                  </Text>
                </HStack>
                <Text
                  fontSize="12px"
                  fontWeight={600}
                  className="cc-num"
                  flexShrink={0}
                  color={
                    e.status === "fehler"
                      ? "var(--cc-danger)"
                      : e.status === "fertig"
                        ? "var(--cc-success)"
                        : "var(--cc-gold-light)"
                  }
                >
                  {e.status === "wartet"
                    ? "wartet"
                    : e.status === "laeuft"
                      ? `${e.progress}%`
                      : e.status === "fertig"
                        ? "fertig"
                        : "Fehler"}
                </Text>
              </HStack>

              {e.status === "laeuft" ? (
                <>
                  <Progress
                    value={e.progress}
                    size="sm"
                    aria-label={`Upload-Fortschritt ${e.name}`}
                    borderRadius="full"
                    bg="rgba(255, 255, 255, 0.07)"
                    sx={{ "& > div": { bg: "var(--cc-gold-bar)" } }}
                  />
                  <Text mt={1} fontSize="11px" color="var(--cc-text-3)" className="cc-num">
                    {(e.sizeBytes / 1024 / 1024).toFixed(1)} MB
                    {e.progress > 0 && e.progress < 100
                      ? ` — ${((e.sizeBytes / 1024 / 1024) * (e.progress / 100)).toFixed(1)} MB übertragen`
                      : ""}
                  </Text>
                </>
              ) : null}

              {e.status === "fehler" && e.fehler ? (
                <Text mt={1} fontSize="12px" color="var(--cc-danger)">
                  {e.fehler}
                </Text>
              ) : null}
            </Box>
          ))}

          {offen === 0 ? (
            <Button size="xs" variant="line" alignSelf="flex-start" onClick={() => setWarteschlange([])}>
              Liste leeren
            </Button>
          ) : null}
        </Stack>
      ) : null}

      <Text mt={3} fontSize="12px" color="var(--cc-text-3)">
        Nach dem Upload läuft die Verarbeitung bei Cloudflare — die Videos erscheinen sofort in der Liste oben mit
        Status &bdquo;Verarbeitung…&ldquo;.
      </Text>
    </Box>
  );
}
