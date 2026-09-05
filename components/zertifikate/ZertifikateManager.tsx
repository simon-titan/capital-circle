"use client";

import { Badge, Box, Button, Grid, HStack, Image, Stack, Text, Textarea } from "@chakra-ui/react";
import { UploadCloud } from "lucide-react";
import { useCallback, useRef, useState } from "react";

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

function StatusBadge({ status }: { status: CertificateStatus }) {
  if (status === "approved") {
    return (
      <Badge
        bg="rgba(52,211,153,0.14)"
        color="#34D399"
        border="1px solid rgba(52,211,153,0.4)"
        borderRadius="full"
        px={2}
        py={0.5}
        textTransform="none"
        fontWeight={500}
        className="inter"
      >
        Freigegeben
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge
        bg="rgba(248,113,113,0.14)"
        color="#F87171"
        border="1px solid rgba(248,113,113,0.4)"
        borderRadius="full"
        px={2}
        py={0.5}
        textTransform="none"
        fontWeight={500}
        className="inter"
      >
        Abgelehnt
      </Badge>
    );
  }
  return (
    <Badge
      bg="rgba(245,200,74,0.14)"
      color="#F5C84A"
      border="1px solid rgba(245,200,74,0.4)"
      borderRadius="full"
      px={2}
      py={0.5}
      textTransform="none"
      fontWeight={500}
      className="inter"
    >
      In Pruefung
    </Badge>
  );
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
      setFeedback({ kind: "error", msg: "Bitte zuerst ein Bild auswaehlen." });
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
      setFeedback({ kind: "success", msg: "Nachweis eingereicht. Das Team prueft ihn zeitnah." });
    } catch (e) {
      setFeedback({ kind: "error", msg: e instanceof Error ? e.message : "Unbekannter Fehler." });
    } finally {
      setBusy(false);
    }
  }, [file, caption, pickFile]);

  return (
    <Stack gap={8}>
      <Box
        borderRadius="16px"
        borderWidth="1px"
        borderColor="var(--color-border, rgba(255,255,255,0.08))"
        bg="rgba(255,255,255,0.04)"
        backdropFilter="blur(16px)"
        p={{ base: 5, md: 6 }}
      >
        <Stack gap={4}>
          <Text className="radley-regular" fontSize="lg" color="var(--color-text-primary, #F0F0F2)">
            Neuen Nachweis einreichen
          </Text>

          <HStack align="flex-start" gap={5} flexWrap="wrap">
            <Box
              as="label"
              htmlFor="certificate-file-input"
              cursor="pointer"
              w="160px"
              h="160px"
              flexShrink={0}
              borderRadius="12px"
              borderWidth="1px"
              borderStyle="dashed"
              borderColor="rgba(212,175,55,0.4)"
              display="flex"
              alignItems="center"
              justifyContent="center"
              overflow="hidden"
              bg="rgba(0,0,0,0.25)"
              _hover={{ borderColor: "rgba(212,175,55,0.7)" }}
            >
              {preview ? (
                <Image src={preview} alt="Vorschau" w="100%" h="100%" objectFit="cover" />
              ) : (
                <Stack align="center" gap={1} color="rgba(212,175,55,0.8)">
                  <UploadCloud size={22} />
                  <Text fontSize="xs" className="inter">
                    Bild waehlen
                  </Text>
                </Stack>
              )}
              <input
                id="certificate-file-input"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
            </Box>

            <Stack flex="1" minW="240px" gap={3}>
              <Textarea
                placeholder="Kurze Beschreibung (optional) — z. B. welcher Zeitraum, welches Setup"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                bg="rgba(0,0,0,0.25)"
                borderColor="var(--color-border, rgba(255,255,255,0.08))"
                color="var(--color-text-primary, #F0F0F2)"
                _placeholder={{ color: "rgba(255,255,255,0.35)" }}
                rows={4}
                className="inter"
              />
              <HStack>
                <Button
                  onClick={() => void submit()}
                  isLoading={busy}
                  loadingText="Wird eingereicht"
                  colorScheme="yellow"
                  isDisabled={!file}
                >
                  Nachweis einreichen
                </Button>
              </HStack>
              {feedback ? (
                <Text
                  fontSize="sm"
                  className="inter"
                  color={feedback.kind === "success" ? "#34D399" : "#F87171"}
                >
                  {feedback.msg}
                </Text>
              ) : null}
            </Stack>
          </HStack>
        </Stack>
      </Box>

      <Stack gap={4}>
        <Text className="radley-regular" fontSize="lg" color="var(--color-text-primary, #F0F0F2)">
          Deine Einreichungen
        </Text>
        {items.length === 0 ? (
          <Text fontSize="sm" color="var(--color-text-muted, rgba(255,255,255,0.4))" className="inter">
            Noch keine Nachweise eingereicht.
          </Text>
        ) : (
          <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap={4}>
            {items.map((item) => (
              <Box
                key={item.id}
                borderRadius="14px"
                borderWidth="1px"
                borderColor="var(--color-border, rgba(255,255,255,0.08))"
                bg="rgba(255,255,255,0.03)"
                overflow="hidden"
              >
                <Box w="100%" h="160px" bg="rgba(0,0,0,0.3)">
                  <Image src={item.imageUrl} alt={item.caption ?? "Nachweis"} w="100%" h="100%" objectFit="cover" />
                </Box>
                <Stack p={3} gap={2}>
                  <HStack justify="space-between" align="flex-start">
                    <StatusBadge status={item.status} />
                    {item.status === "approved" && item.isPublic ? (
                      <Text fontSize="xs" color="#D4AF37" className="inter">
                        oeffentlich
                      </Text>
                    ) : null}
                  </HStack>
                  {item.caption ? (
                    <Text fontSize="sm" color="var(--color-text-primary, #F0F0F2)" className="inter" noOfLines={3}>
                      {item.caption}
                    </Text>
                  ) : null}
                  <Text fontSize="xs" color="var(--color-text-muted, rgba(255,255,255,0.4))" className="inter">
                    Eingereicht: {formatDate(item.submittedAt)}
                  </Text>
                </Stack>
              </Box>
            ))}
          </Grid>
        )}
      </Stack>
    </Stack>
  );
}
