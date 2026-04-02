"use client";

import { Box, Button, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";

const links = [
  { href: "/admin", label: "Uebersicht" },
  { href: "/admin/kurse", label: "Kurse & Module" },
  { href: "/admin/quiz", label: "Quiz" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/hausaufgaben", label: "Hausaufgaben" },
  { href: "/admin/mitglieder", label: "Mitglieder" },
  { href: "/admin/discord", label: "Discord" },
  { href: "/admin/arsenal", label: "Arsenal" },
  { href: "/admin/live-sessions", label: "Live Sessions" },
  { href: "/admin/analysis", label: "Analyse" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <Box
      w="250px"
      minH="100vh"
      p={4}
      borderRight="1px solid var(--color-border-default)"
      bg="rgba(7, 8, 10, 0.96)"
      backdropFilter="blur(20px)"
    >
      <Box mb={5} maxW="200px">
        <Logo variant="onDark" priority />
      </Box>
      <Text
        mb={3}
        fontSize="xs"
        letterSpacing="0.08em"
        textTransform="uppercase"
        color="var(--color-text-tertiary)"
        className="inter-semibold"
      >
        Admin Panel
      </Text>
      <Stack gap={2}>
        {links.map((item) => (
          <Button
            key={item.href}
            as={Link}
            href={item.href}
            variant="ghost"
            justifyContent="flex-start"
            className="inter"
            bg={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "rgba(212,175,55,0.12)" : "transparent"}
            color={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "var(--color-accent-light)" : "var(--color-text-secondary)"}
            border="1px solid"
            borderColor={
              pathname === item.href || pathname.startsWith(`${item.href}/`)
                ? "rgba(212,175,55,0.45)"
                : "transparent"
            }
            _hover={{
              bg: "rgba(255,255,255,0.06)",
              color: "var(--color-text-primary)",
            }}
          >
            {item.label}
          </Button>
        ))}
      </Stack>
    </Box>
  );
}
