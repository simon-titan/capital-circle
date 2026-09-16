"use client";

import { Button, Flex, HStack, Stack, Text } from "@chakra-ui/react";
import { Download, FileText } from "lucide-react";
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
    <Stack spacing={2}>
      {attachments.map((a) => (
        <HStack
          key={a.id}
          justify="space-between"
          gap={3}
          py={3}
          px={4}
          borderRadius="10px"
          border="1px solid var(--cc-line)"
          bg="rgba(255, 255, 255, 0.03)"
          transition="border-color 150ms var(--cc-ease)"
          _hover={{ borderColor: "var(--cc-gold-line)" }}
        >
          <HStack minW={0} spacing={3}>
            <Flex
              w="36px"
              h="36px"
              flexShrink={0}
              align="center"
              justify="center"
              borderRadius="8px"
              border="1px solid rgba(212, 176, 128, 0.3)"
              bg="rgba(212, 176, 128, 0.07)"
              color="var(--cc-gold-light)"
            >
              <FileText size={17} strokeWidth={1.75} />
            </Flex>
            <Text fontSize="14px" color="var(--cc-text)" isTruncated>
              {a.filename}
            </Text>
          </HStack>
          <Button
            size="sm"
            variant="line"
            leftIcon={<Download size={14} />}
            onClick={() => void download(a.id, a.filename)}
            isLoading={loadingId === a.id}
            flexShrink={0}
          >
            Download
          </Button>
        </HStack>
      ))}
    </Stack>
  );
}
