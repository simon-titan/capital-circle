"use client";

import { Box, HStack, Text } from "@chakra-ui/react";
import { Panel } from "./Panel";

/**
 * Einheitlicher Karten-Kopf wie auf dem Dashboard: Versaltitel links, optionaler
 * Kennwert rechts, darunter eine Haarlinie über die volle Breite.
 */
export function SectionCard({
  title,
  hint,
  action,
  children,
  padded = true,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  padded?: boolean;
}) {
  return (
    <Panel p={{ base: padded ? 4 : 3, md: padded ? 6 : 4 }}>
      <HStack justify="space-between" align="center" gap={3} pb={3} mb={5} borderBottom="1px solid var(--j-line)">
        <Text
          as="h2"
          fontSize="13px"
          lineHeight="18px"
          fontWeight={500}
          letterSpacing="0.12em"
          textTransform="uppercase"
          color="var(--cc-text-soft)"
          isTruncated
        >
          {title}
        </Text>
        <Box flexShrink={0}>
          {action ?? (hint && (
            <Text fontSize="xs" color="var(--cc-text-2)" className="cc-num" whiteSpace="nowrap">
              {hint}
            </Text>
          ))}
        </Box>
      </HStack>
      {children}
    </Panel>
  );
}
