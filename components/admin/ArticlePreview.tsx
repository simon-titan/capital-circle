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
      <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.1em" className="inter-semibold" color="gray.500" mb={3}>
        Vorschau
      </Text>
      <Box
        borderWidth="1px"
        borderRadius="lg"
        borderColor="whiteAlpha.200"
        p={{ base: 4, md: 5 }}
        maxH={{ base: "50vh", lg: "70vh" }}
        overflowY="auto"
        bg="rgba(0,0,0,0.35)"
      >
        <ArticleRenderer content={content} />
      </Box>
    </Box>
  );
}
