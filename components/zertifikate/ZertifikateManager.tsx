"use client";

import { Box, Button, Flex, Image, SimpleGrid, Stack, Text, Textarea, VisuallyHiddenInput } from "@chakra-ui/react";
import { UploadCloud } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { DashCard, Meta, clampLines } from "@/components/platform/dashboard/primitives";

export type CertificateStatus = "pending" | "approved" | "rejected";

export type CertificateItem = {
  id: string;
  caption: string | null;
  status: CertificateStatus;
  isPublic: boolean;
  submittedAt: string;
  reviewedAt: string | null;
  imageUrl: string;
};

type Props = {
  initial: CertificateItem[];
};

const dateFormatter = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" });

function formatDate(iso: string): string {
  try {
    return dateFormatter.format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Eingabefeld im Schema v3.2: Haarlinie, Gold-Kante bei Fokus. */
const fieldSx = {
  bg: "rgba(255, 255, 255, 0.03)",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  color: "var(--cc-text)",
  fontSize: "15px",
  _placeholder: { color: "var(--cc-text-3)" },
  _hover: { borderColor: "rgba(212, 176, 128, 0.35)" },
  _focusVisible: { borderColor: "var(--cc-gold-line)", boxShadow: "0 0 0 1px var(--cc-gold-line)" },
};

/** Freigabe/Ablehnung sind Bedeutung (Grün/Rot); „In Prüfung“ bleibt neutral. */
const STATUS: Record<CertificateStatus, { label: string; color: string; border: string; bg: string }> = {
  approved: {
    label: "Freigegeben",
    color: "var(--cc-success)",
    border: "rgba(74, 222, 128, 0.35)",
    bg: "rgba(74, 222, 128, 0.08)",
  },
  rejected: {
    label: "Abgelehnt",
    color: "var(--cc-danger)",
    border: "rgba(248, 113, 113, 0.35)",
    bg: "rgba(248, 113, 113, 0.08)",
  },
  pending: {
    label: "In Prüfung",
    color: "var(--cc-text-soft)",
    border: "var(--cc-line-strong)",
    bg: "rgba(255, 255, 255, 0.03)",
  },
};

function StatusBadge({ status }: { status: CertificateStatus }) {
  const s = STATUS[status];
  return (
    <Box
      as="span"
      display="inline-flex"
      alignItems="center"
      px={2.5}
      py={0.5}
      borderRadius="full"
      border="1px solid"
      borderColor={s.border}
      bg={s.bg}
      color={s.color}
      fontSize="12px"
      lineHeight="18px"
      fontWeight={500}
      whiteSpace="nowrap"
    >
      {s.label}
    </Box>
  );
}

function riseDelay(i: number) {
  return { animationDelay: `${80 + Math.min(i, 10) * 70}ms` };
}

async function fetchPresign(file: File): Promise<{ presignedUrl: string; storageKey: string }> {
  const params = new URLSearchParams({
    fileName: file.name,
    contentType: file.type || "image/jpeg",
  });
  const res = await fetch(`/api/certificates/presign-upload?${params.toString()}`);
  const json = (await res.json()) as {
    ok?: boolean;
    presignedUrl?: string;
    storageKey?: string;
    error?: string;
  };
  if (!res.ok || !json.ok || !json.presignedUrl || !json.storageKey) {
    throw new Error(json.error || `Presign fehlgeschlagen (${res.status})`);
  }
  return { presignedUrl: json.presignedUrl, storageKey: json.storageKey };
}

async function putFile(presignedUrl: string, file: File): Promise<void> {
  const res = await fetch(presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "image/jpeg" },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`Upload fehlgeschlagen (${res.status})`);
  }
}

export function ZertifikateManager({ initial }: Props) {
  const [items, setItems] = useState<CertificateItem[]>(initial);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickFile = useCallback((f: File | null) => {
    setFile(f);
    setFeedback(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  }, [preview]);

  const submit = useCallback(async () => {
    if (!file) {
      setFeedback({ kind: "error", msg: "Bitte zuerst ein Bild auswählen." });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const { presignedUrl, storageKey } = await fetchPresign(file);
      await putFile(presignedUrl, file);

      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ storageKey, caption: caption.trim() || undefined }),
      });
      const json = (await res.json()) as { ok?: boolean; item?: CertificateItem; error?: string };
      if (!res.ok || !json.ok || !json.item) {
        throw new Error(json.error || `Einreichen fehlgeschlagen (${res.status})`);
      }

      setItems((prev) => [json.item as CertificateItem, ...prev]);
      pickFile(null);
      setCaption("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFeedback({ kind: "success", msg: "Nachweis eingereicht. Das Team prüft ihn zeitnah." });
    } catch (e) {
      setFeedback({ kind: "error", msg: e instanceof Error ? e.message : "Unbekannter Fehler." });
    } finally {
      setBusy(false);
    }
  }, [file, caption, pickFile]);

  return (
    <Stack gap={8}>
      <DashCard label="Neuen Nachweis einreichen" labelId="cert-submit" className="cc-card--still cc-rise" style={riseDelay(0)}>
        <Flex direction={{ base: "column", sm: "row" }} align={{ base: "stretch", sm: "flex-start" }} gap={5}>
          {/* Die Kachel ist das Label des (visuell versteckten, aber fokussierbaren) Datei-Inputs. */}
          <Box
            as="label"
            htmlFor="certificate-file-input"
            cursor="pointer"
            w={{ base: "100%", sm: "160px" }}
            h="160px"
            flexShrink={0}
            borderRadius="10px"
            border="1px dashed var(--cc-line-strong)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            overflow="hidden"
            bg="rgba(255, 255, 255, 0.02)"
            transition="border-color 180ms var(--cc-ease), background-color 180ms var(--cc-ease)"
            _hover={{ borderColor: "var(--cc-gold-line)", bg: "var(--cc-gold-wash)" }}
            _focusWithin={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px" }}
          >
            {preview ? (
              <Image src={preview} alt="Vorschau" w="100%" h="100%" objectFit="cover" />
            ) : (
              <Stack align="center" gap={1.5} color="var(--cc-text-2)">
                <UploadCloud size={22} strokeWidth={1.5} aria-hidden />
                <Text fontSize="13px">Bild wählen</Text>
              </Stack>
            )}
            <VisuallyHiddenInput
              id="certificate-file-input"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </Box>

          <Stack flex="1" minW={0} gap={3}>
            <Textarea
              aria-label="Kurze Beschreibung (optional)"
              placeholder="Kurze Beschreibung (optional) — z. B. welcher Zeitraum, welches Setup"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              {...fieldSx}
            />
            <Box>
              <Button
                variant="gold"
                onClick={() => void submit()}
                isLoading={busy}
                loadingText="Wird eingereicht"
                isDisabled={!file}
              >
                Nachweis einreichen
              </Button>
            </Box>
            {feedback ? (
              <Text
                role={feedback.kind === "error" ? "alert" : "status"}
                fontSize="14px"
                color={feedback.kind === "success" ? "var(--cc-success)" : "var(--cc-danger)"}
              >
                {feedback.msg}
              </Text>
            ) : null}
          </Stack>
        </Flex>
      </DashCard>

      <Box as="section" aria-labelledby="cert-list-title">
        <Box
          as="h2"
          id="cert-list-title"
          fontSize="13px"
          lineHeight="18px"
          fontWeight={500}
          letterSpacing="0.12em"
          textTransform="uppercase"
          color="var(--cc-text-soft)"
          mb={4}
        >
          Deine Einreichungen
        </Box>
        {items.length === 0 ? (
          <Meta>Noch keine Nachweise eingereicht.</Meta>
        ) : (
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={5}>
            {items.map((item, i) => (
              <Box
                as="article"
                key={item.id}
                className="cc-card cc-card--still cc-rise"
                style={riseDelay(i + 1)}
                display="flex"
                flexDirection="column"
                minW={0}
              >
                {/* Bild oben; die Gold-Kante der Karte bleibt sichtbar (overflow nur am Bild). */}
                <Box
                  h="160px"
                  borderTopRadius="11px"
                  overflow="hidden"
                  borderBottom="1px solid var(--cc-line)"
                  bg="var(--cc-surface-2)"
                >
                  <Image src={item.imageUrl} alt={item.caption ?? "Nachweis"} w="100%" h="100%" objectFit="cover" />
                </Box>
                <Stack p={4} gap={2}>
                  <Flex justify="space-between" align="center" gap={2}>
                    <StatusBadge status={item.status} />
                    {item.status === "approved" && item.isPublic ? (
                      <Text fontSize="12px" fontWeight={500} color="var(--cc-gold-light)">
                        öffentlich
                      </Text>
                    ) : null}
                  </Flex>
                  {item.caption ? (
                    <Text fontSize="15px" lineHeight={1.5} color="var(--cc-text)" sx={clampLines(3)}>
                      {item.caption}
                    </Text>
                  ) : null}
                  <Meta fontSize="13px" className="cc-num">
                    Eingereicht: {formatDate(item.submittedAt)}
                  </Meta>
                </Stack>
              </Box>
            ))}
          </SimpleGrid>
        )}
      </Box>
    </Stack>
  );
}
