"use client";

import { Box, Button, Divider, HStack, Icon, Menu, MenuButton, MenuItem, MenuList, Stack, Text } from "@chakra-ui/react";
import { BarChart3, Calculator, CalendarDays, ChevronDown, Home, ListOrdered, Plus, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useJournal } from "./JournalProvider";

const NAV_ITEMS = [
  { href: "/trading-journal", label: "Home", short: "Home", icon: Home },
  { href: "/trading-journal/dashboard", label: "Dashboard", short: "Dashboard", icon: BarChart3 },
  { href: "/trading-journal/trades", label: "Trades", short: "Trades", icon: ListOrdered },
  { href: "/trading-journal/tage", label: "Tages Ansicht", short: "Tage", icon: CalendarDays },
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

export function JournalSidebar() {
  const pathname = usePathname();
  const { accounts, activeAccount, setActiveAccountId, openAddTrade } = useJournal();

  /*
   * Der Umschalter erscheint erst ab dem zweiten Konto. Beim ersten Betreten legt
   * der Provider automatisch eines an — ein Dropdown mit einem einzigen Eintrag,
   * dessen Namen der Nutzer nie gewählt hat, erklärt sich niemandem. Trades hängen
   * weiterhin an `account_id`; sobald es eine Oberfläche zum Anlegen weiterer
   * Konten gibt (Prop-Firm vs. Live), kommt der Umschalter von selbst zurück.
   */
  const accountSwitcher = accounts.length > 1 && (
    <Menu placement="bottom-start" isLazy>
      <MenuButton
        as={Button}
        size="sm"
        w={{ base: "auto", lg: "100%" }}
        variant="line"
        leftIcon={<Wallet size={15} />}
        rightIcon={<ChevronDown size={13} />}
        justifyContent="flex-start"
        textAlign="left"
        flexShrink={0}
      >
        <Box as="span" display="block" isTruncated maxW={{ base: "120px", lg: "none" }}>
          {activeAccount?.name ?? "Konto"}
        </Box>
      </MenuButton>
      <MenuList bg="var(--cc-panel-solid)" borderColor="var(--cc-gold-line)" minW="220px" py={1}>
        {accounts.map((account) => (
          <MenuItem
            key={account.id}
            onClick={() => setActiveAccountId(account.id)}
            bg={account.id === activeAccount?.id ? "var(--j-accent-soft)" : "transparent"}
            color={account.id === activeAccount?.id ? "var(--cc-gold-light)" : "var(--cc-text)"}
            _hover={{ bg: "var(--j-accent-soft)" }}
            fontSize="sm"
          >
            {account.name}
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  );

  const addTradeButton = (
    <Button
      onClick={openAddTrade}
      size="sm"
      variant="gold"
      // Ohne Umschalter steht der Button auf Mobil allein in der Zeile.
      w={{ base: accountSwitcher ? "auto" : "100%", lg: "100%" }}
      leftIcon={<Plus size={15} />}
      flexShrink={0}
    >
      Trade hinzufügen
    </Button>
  );

  return (
    <>
      {/* Mobil: Konto + CTA in einer Zeile, darunter eine scrollbare Tableiste. */}
      <Stack display={{ base: "flex", lg: "none" }} gap={3} w="100%">
        <HStack gap={2} justify="space-between">
          {accountSwitcher}
          {addTradeButton}
        </HStack>

        <HStack
          as="nav"
          aria-label="Trading Journal"
          gap={1}
          overflowX="auto"
          pb={1}
          mx={-1}
          px={1}
          sx={{
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Button
                key={item.href}
                as={Link}
                href={item.href}
                size="sm"
                variant="ghost"
                leftIcon={<Icon as={item.icon} boxSize={3.5} />}
                {...navItemProps(active)}
                borderColor={active ? "var(--cc-gold-line)" : "var(--j-line)"}
                fontSize="xs"
                flexShrink={0}
                aria-current={active ? "page" : undefined}
              >
                {item.short}
              </Button>
            );
          })}
          <Button
            as={Link}
            href="/position-rechner"
            size="sm"
            variant="ghost"
            leftIcon={<Calculator size={14} />}
            {...navItemProps(false)}
            borderColor="var(--j-line)"
            fontSize="xs"
            flexShrink={0}
          >
            Rechner
          </Button>
        </HStack>
      </Stack>

      {/* Ab lg: linke Spalte als Glas-Karte, klebt beim Scrollen. */}
      <Stack
        as="nav"
        aria-label="Trading Journal"
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
        {accountSwitcher}
        {addTradeButton}

        <Text
          fontSize="11px"
          letterSpacing="0.12em"
          textTransform="uppercase"
          color="var(--cc-text-2)"
          fontWeight={500}
          pt={4}
          pb={1}
          px={2}
        >
          Dein Trading Journal
        </Text>

        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
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

        <Divider borderColor="var(--j-line)" my={2} />

        <Button
          as={Link}
          href="/position-rechner"
          size="sm"
          h="38px"
          variant="ghost"
          justifyContent="flex-start"
          leftIcon={<Calculator size={16} />}
          {...navItemProps(false)}
        >
          Positionsrechner
        </Button>

        <Text fontSize="xs" color="var(--cc-text-3)" px={2} pt={1} lineHeight="1.5">
          Strategie-Tags?{" "}
          <Box
            as={Link}
            href="/journal-klassisch"
            textDecoration="underline"
            textUnderlineOffset="2px"
            color="var(--cc-text-2)"
            _hover={{ color: "var(--cc-gold-light)" }}
          >
            Klassisches Journal
          </Box>
        </Text>
      </Stack>
    </>
  );
}
