"use client";

import { Box, Text, VStack } from "@chakra-ui/react";
import NextLink from "next/link";
import type { AcademyModuleRow } from "@/lib/server-data";
import { moduleHref } from "@/lib/module-route";
import { Lock } from "lucide-react";

type AcademyModuleSidebarProps = {
  modules: AcademyModuleRow[];
  currentModuleId: string;
};

export function AcademyModuleSidebar({ modules, currentModuleId }: AcademyModuleSidebarProps) {
  if (modules.length <= 1) return null;

  return (
    <VStack align="stretch" spacing={3}>
      <Text className="inter" fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="var(--color-text-muted)">
        Alle Module
      </Text>
      <VStack align="stretch" spacing={2} maxH={{ lg: "420px" }} overflowY="auto">
        {modules.map((m) => {
          const href = moduleHref({ id: m.id, slug: m.slug });
          const active = m.id === currentModuleId;
          const locked = !m.courseUnlocked || !m.unlocked || m.isLocked;
          const shellProps = {
            px: 3,
            py: 2.5,
            borderRadius: "12px",
            borderWidth: "1px",
            borderColor: active ? "rgba(212, 175, 55, 0.45)" : "rgba(255,255,255,0.08)",
            bg: active ? "rgba(212, 175, 55, 0.08)" : "rgba(255,255,255,0.03)",
            opacity: locked ? 0.55 : 1,
            cursor: locked ? "not-allowed" : "pointer",
            pointerEvents: locked ? "none" : "auto",
            _hover: locked ? undefined : { borderColor: "rgba(212, 175, 55, 0.35)", bg: "rgba(255,255,255,0.05)" },
          } as const;
          const inner = (
            <>
              <Text className="inter-medium" fontSize="sm" color="var(--color-text-primary)" noOfLines={2}>
                {m.title}
              </Text>
              {m.courseTitle ? (
                <Text className="inter" fontSize="xs" color="var(--color-text-muted)" mt={1} noOfLines={1}>
                  {m.courseTitle}
                </Text>
              ) : null}
              {locked ? (
                <Box display="flex" alignItems="center" gap={1} mt={1} color="rgba(240,240,242,0.45)">
                  <Lock size={12} aria-hidden />
                  <Text fontSize="xs" className="inter">
                    Gesperrt
                  </Text>
                </Box>
              ) : null}
            </>
          );
          if (locked) {
            return (
              <Box key={m.id} {...shellProps}>
                {inner}
              </Box>
            );
          }
          return (
            <Box key={m.id} as={NextLink} href={href} scroll={false} {...shellProps}>
              {inner}
            </Box>
          );
        })}
      </VStack>
    </VStack>
  );
}
