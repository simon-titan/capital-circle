"use client";

import { Button, HStack, Stack, Text } from "@chakra-ui/react";
import { FileDown } from "lucide-react";
import { useCallback, useState } from "react";

export type VideoAttachmentItem = {
  id: string;
  filename: string;
  content_type: string | null;
};

type VideoAttachmentsProps = {
  attachments: VideoAttachmentItem[];
};

export function VideoAttachments({ attachments }: VideoAttachmentsProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const download = useCallback(async (id: string, filename: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/attachment-url?id=${encodeURIComponent(id)}`);
      const json = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!json.ok || !json.url) {
        console.error(json.error);
        return;
      }
      const a = document.createElement("a");
      a.href = json.url;
      a.download = filename;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setLoadingId(null);
    }
  }, []);

  if (!attachments.length) return null;

  return (
    <Stack spacing={3} mt={6}>
      <Text className="inter" fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="var(--color-text-muted)">
        Materialien
      </Text>
      <Stack spacing={2}>
        {attachments.map((a) => (
          <HStack
            key={a.id}
            as="div"
            justify="space-between"
            py={2}
            px={3}
            borderRadius="12px"
            borderWidth="1px"
            borderColor="rgba(255,255,255,0.1)"
            bg="rgba(255,255,255,0.03)"
          >
            <HStack minW={0} spacing={2}>
              <FileDown size={18} color="var(--color-accent-gold)" />
              <Text className="inter" fontSize="sm" color="var(--color-text-primary)" noOfLines={1}>
                {a.filename}
              </Text>
            </HStack>
            <Button
              size="sm"
              variant="outline"
              borderColor="rgba(212,175,55,0.45)"
              color="var(--color-accent-gold)"
              onClick={() => void download(a.id, a.filename)}
              isLoading={loadingId === a.id}
            >
              Download
            </Button>
          </HStack>
        ))}
      </Stack>
    </Stack>
  );
}
