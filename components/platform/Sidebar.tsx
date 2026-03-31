"use client";

import { Box, Button, Circle, Flex, Stack, Text } from "@chakra-ui/react";
import { Logo } from "@/components/brand/Logo";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/events", label: "Events" },
  { href: "/ausbildung", label: "Institut" },
  { href: "/settings", label: "Einstellungen" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [collapsed, setCollapsed] = useState(false);
  const [name, setName] = useState("Mitglied");
  const [discordName, setDiscordName] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name,username,discord_username")
        .eq("id", data.user.id)
        .single();
      if (profile) {
        setName(profile.full_name || profile.username || "Mitglied");
        setDiscordName(profile.discord_username);
      }
    };
    void load();
  }, [supabase]);

  const onLogout = async () => {
    await supabase.auth.signOut();
    router.push("/einsteig");
    router.refresh();
  };

  return (
    <Box w={collapsed ? "60px" : "240px"} minH="100vh" p={4} className="glass-card" transition="width 0.2s ease">
      <Flex justify="space-between" mb={6} align="center" gap={2}>
        {!collapsed ? (
          <Box flex="1" minW={0}>
            <Logo variant="onDark" priority />
          </Box>
        ) : null}
        <Button
          size="xs"
          flexShrink={0}
          ml={collapsed ? "auto" : undefined}
          mr={collapsed ? "auto" : undefined}
          onClick={() => setCollapsed((v) => !v)}
        >
          {collapsed ? ">" : "<"}
        </Button>
      </Flex>
      <Stack gap={2}>
        {links.map((item) => (
          <Button
            as={Link}
            key={item.href}
            href={item.href}
            justifyContent={collapsed ? "center" : "flex-start"}
            variant={pathname?.startsWith(item.href) ? "solid" : "ghost"}
            bg={pathname?.startsWith(item.href) ? "var(--color-accent-blue)" : "transparent"}
          >
            {collapsed ? item.label[0] : item.label}
          </Button>
        ))}
      </Stack>
      <Stack mt={8} pt={4} borderTop="1px solid var(--color-border)" gap={3}>
        {!collapsed ? (
          <Flex align="center" gap={2}>
            <Circle size="8px" bg={discordName ? "green.300" : "gray.500"} />
            <Text fontSize="sm" className="dm-sans">
              {discordName ? `Discord: ${discordName}` : "Discord nicht verbunden"}
            </Text>
          </Flex>
        ) : null}
        {!collapsed ? (
          <Text fontSize="sm" opacity={0.85}>
            {name}
          </Text>
        ) : null}
        <Button size="sm" variant="outline" onClick={onLogout}>
          {collapsed ? "X" : "Logout"}
        </Button>
      </Stack>
    </Box>
  );
}
