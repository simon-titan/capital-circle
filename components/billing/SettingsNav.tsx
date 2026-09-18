"use client";

import { Button, HStack, Icon, Stack, Text } from "@chakra-ui/react";
import { CreditCard, ReceiptText, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/einstellungen/profil", label: "Profil", short: "Profil", icon: UserRound },
  { href: "/einstellungen/abonnement", label: "Abonnement", short: "Abo", icon: ShieldCheck },
  { href: "/einstellungen/zahlungsmethode", label: "Zahlungsmethode", short: "Zahlung", icon: CreditCard },
  { href: "/einstellungen/abrechnung", label: "Abrechnung", short: "Rechnungen", icon: ReceiptText },
] as const;

/** Aktiver Eintrag wie in der Plattform-Sidebar: Gold-Wash, Gold-Kante, leichter Glow. */
function navItemProps(active: boolean) {
  return {
    bg: active ? "linear-gradient(90deg, rgba(212, 176, 128, 0.16) 0%, rgba(212, 176, 128, 0.03) 100%)" : "transparent",
    borderWidth: "1px",
    borderColor: active ? "var(--cc-gold-line)" : "transparent",
    color: active ? "var(--cc-gold-light)" : "var(--cc-text-2)",
    boxShadow: active ? "0 0 18px rgba(212, 176, 128, 0.1)" : "none",
    _hover: active ? {} : { bg: "rgba(255, 255, 255, 0.04)", color: "var(--cc-text)" },
    borderRadius: "8px",
    fontWeight: 500,
  };
}

/**
 * Unternavigation der Einstellungen — dasselbe Muster wie die Journal-Sidebar:
 * ab `lg` eine klebende Glas-Karte links, darunter eine waagerechte Leiste.
 *
 * Aktiv ist der Eintrag, dessen Pfad ein Präfix des aktuellen ist, damit auch
 * Unterseiten (z. B. eine Kündigungs-Bestätigung) ihren Punkt behalten.
 */
export function SettingsNav() {
  const pathname = usePathname();
  const istAktiv = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Mobil: scrollbare Tableiste über dem Inhalt. */}
      <HStack
        as="nav"
        aria-label="Einstellungen"
        display={{ base: "flex", lg: "none" }}
        gap={1}
        overflowX="auto"
        pb={1}
        mx={-1}
        px={1}
        className="hide-scrollbar"
      >
        {NAV_ITEMS.map((item) => {
          const active = istAktiv(item.href);
          return (
            <Button
              key={item.href}
              as={Link}
              href={item.href}
              size="sm"
              variant="ghost"
              leftIcon={<Icon as={item.icon} boxSize={3.5} />}
              {...navItemProps(active)}
              borderColor={active ? "var(--cc-gold-line)" : "var(--cc-line)"}
              fontSize="xs"
              flexShrink={0}
              aria-current={active ? "page" : undefined}
            >
              {item.short}
            </Button>
          );
        })}
      </HStack>

      {/* Ab lg: linke Spalte als Glas-Karte, klebt beim Scrollen. */}
      <Stack
        as="nav"
        aria-label="Einstellungen"
        display={{ base: "none", lg: "flex" }}
        className="cc-card cc-card--still"
        gap={1.5}
        w="228px"
        p={3}
        flexShrink={0}
        position="sticky"
        top="calc(var(--cc-strip-h) + 24px)"
        alignSelf="flex-start"
      >
        <Text
          fontSize="11px"
          letterSpacing="0.12em"
          textTransform="uppercase"
          color="var(--cc-text-2)"
          fontWeight={500}
          pb={1}
          px={2}
        >
          Dein Konto
        </Text>

        {NAV_ITEMS.map((item) => {
          const active = istAktiv(item.href);
          return (
            <Button
              key={item.href}
              as={Link}
              href={item.href}
              size="sm"
              h="38px"
              variant="ghost"
              justifyContent="flex-start"
              leftIcon={<Icon as={item.icon} boxSize={4} />}
              {...navItemProps(active)}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Button>
          );
        })}
      </Stack>
    </>
  );
}
