"use client";

import { Box, Text } from "@chakra-ui/react";
import { ArticleRenderer } from "@/components/platform/ArticleRenderer";

type ArticlePreviewProps = {
  content: string;
};

/** Live-Vorschau wie auf der Mitglieder-Detailseite (read-only TipTap). */
export function ArticlePreview({ content }: ArticlePreviewProps) {
  return (
    <Box>
      <Text fontSize="12px" fontWeight={500} textTransform="uppercase" letterSpacing="0.08em" color="var(--cc-text-2)" mb={3}>
        Vorschau
      </Text>
      {/* Graphitgrund wie auf der Mitgliederseite, damit die Vorschau dem Ergebnis entspricht. */}
      <Box
        border="1px solid var(--cc-line-strong)"
        borderRadius="10px"
        p={{ base: 4, md: 5 }}
        maxH={{ base: "50vh", lg: "70vh" }}
        overflowY="auto"
        bg="var(--cc-bg)"
      >
        <ArticleRenderer content={content} />
      </Box>
    </Box>
  );
}
