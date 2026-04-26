"use client";

import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Stack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";

import { Logo } from "@/components/brand/Logo";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BookMarked,
  BookOpen,
  Calendar,
  ChevronDown,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  MessageCircle,
  Package,
  Radio,
  UserRound,
  X,
} from "lucide-react";

const navItems: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/codex", label: "Codex", icon: BookOpen },
  { href: "/ausbildung", label: "Institut", icon: GraduationCap },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/stream", label: "Live", icon: Radio },
];

const tradingJournalSubLinks = [
  { href: "/trading-journal", label: "Journal" },
  { href: "/trading-journal/position-calculator", label: "Positionsrechner" },
] as const;

const arsenalSubLinks = [
  { href: "/analysis", label: "Analyse" },
  { href: "/live-session", label: "Live Session" },
  { href: "/hausaufgabe", label: "Hausaufgabe & Checkliste" },
  { href: "/arsenal/tools", label: "Tools & Software" },
  { href: "/arsenal/fremdkapital", label: "Fremdkapital" },
  { href: "/arsenal/templates", label: "Templates" },
  { href: "/arsenal/pdfs", label: "PDFs" },
] as const;

function isNavActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function useUnreadNews(pathname: string | null): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/news/unread", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { ok: boolean; count?: number };
        if (!cancelled && json.ok) setCount(json.count ?? 0);
      } catch {
        // still rendern, nur ohne Badge
      }
    };
    void load();
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [pathname]);

  // Wenn der Nutzer die News-Seite oeffnet, wird serverseitig last_seen_at gesetzt.
  // Hier lokal ausblenden, damit die UI sofort reagiert.
  useEffect(() => {
    if (pathname?.startsWith("/news")) setCount(0);
  }, [pathname]);

  return count;
}

const FREE_BANNER_KEY = "cc_free_banner_dismissed";

function useFreeBanner(supabase: ReturnType<typeof createClient>) {
  const [show, setShow] = useState(false);
  // Default true: Stream-Nav ausgeblendet bis Profil geladen ist (verhindert Flackern bei Paid-Usern).
  const [isPaid, setIsPaid] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_paid, step2_application_status")
          .eq("id", user.id)
          .maybeSingle();
        if (!profile) return;
        const paidFlag = Boolean((profile as Record<string, unknown>).is_paid);
        setIsPaid(paidFlag);
        // FreeBanner nur fuer Nicht-Paid-Nutzer ohne Step-2-Bewerbung
        const isFree = !paidFlag;
        const noStep2 = (profile as Record<string, unknown>).step2_application_status == null;
        if (typeof window !== "undefined" && localStorage.getItem(FREE_BANNER_KEY) !== "1") {
          if (isFree && noStep2) setShow(true);
        }
      } catch {
        // silent — Banner optional
      }
    };
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => {
    if (typeof window !== "undefined") localStorage.setItem(FREE_BANNER_KEY, "1");
    setShow(false);
  };

  return { show, dismiss, isPaid };
}

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { isOpen: drawerOpen, onOpen: onDrawerOpen, onClose: onDrawerClose } = useDisclosure();
  const unreadNews = useUnreadNews(pathname);
  const newsActive = !!pathname && pathname.startsWith("/news");
  const { show: showFreeBanner, dismiss: dismissFreeBanner, isPaid } = useFreeBanner(supabase);

  // Stream-Nav (/stream) nur fuer Free-User (nicht is_paid) sichtbar.
  const visibleNavItems = isPaid
    ? navItems.filter((item) => item.href !== "/stream")
    : navItems;

  const tradingJournalActive = !!pathname && pathname.startsWith("/trading-journal");

  const arsenalActive = !!pathname &&
    (pathname.startsWith("/arsenal") ||
      pathname.startsWith("/analysis") ||
      pathname.startsWith("/live-session") ||
      pathname.startsWith("/hausaufgabe"));

  const onLogout = async () => {
    await supabase.auth.signOut();
    router.push("/einsteig");
    router.refresh();
  };

  const NavRow = ({
    onNavigate,
    showActions,
  }: {
    onNavigate?: () => void;
    showActions?: boolean;
  }) => (
    <Stack gap={3} w="100%">
      <Stack gap={2}>
            {visibleNavItems.slice(0, 3).map((item) => {
              const active = isNavActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Button
                  key={item.href}
                  as={Link}
                  href={item.href}
                  onClick={onNavigate}
                  size="sm"
                  variant={active ? "solid" : "ghost"}
                  justifyContent="flex-start"
                  leftIcon={<Icon size={18} strokeWidth={2} />}
                  bg={active ? "rgba(212, 175, 55, 0.35)" : "transparent"}
                  color="var(--color-text-primary)"
                  borderWidth="1px"
                  borderColor={active ? "rgba(212, 175, 55, 0.55)" : "transparent"}
                  _hover={{
                    bg: active ? "rgba(212, 175, 55, 0.45)" : "rgba(255, 255, 255, 0.06)",
                  }}
                  borderRadius="md"
                  className="inter-medium"
                >
                  {item.label}
                </Button>
              );
            })}
        <Text fontSize="xs" color="var(--color-text-tertiary)" className="inter-semibold" pt={1}>
          Trading Journal
        </Text>
        {tradingJournalSubLinks.map((sub) => {
          const posActive = Boolean(pathname?.startsWith("/trading-journal/position-calculator"));
          const journalOnlyActive = pathname === "/trading-journal";
          const subActive =
            sub.href === "/trading-journal/position-calculator" ? posActive : journalOnlyActive;
          return (
            <Button
              key={sub.href}
              as={Link}
              href={sub.href}
              onClick={onNavigate}
              size="sm"
              variant={subActive ? "solid" : "ghost"}
              justifyContent="flex-start"
              pl={6}
              bg={subActive ? "rgba(212, 175, 55, 0.28)" : "transparent"}
              color="var(--color-text-primary)"
              borderWidth="1px"
              borderColor={subActive ? "rgba(212, 175, 55, 0.45)" : "transparent"}
              _hover={{
                bg: subActive ? "rgba(212, 175, 55, 0.38)" : "rgba(255, 255, 255, 0.06)",
              }}
              borderRadius="md"
              className="inter-medium"
            >
              {sub.label}
            </Button>
          );
        })}
        {visibleNavItems.slice(3).map((item) => {
          const active = isNavActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Button
              key={item.href}
              as={Link}
              href={item.href}
              onClick={onNavigate}
              size="sm"
              variant={active ? "solid" : "ghost"}
              justifyContent="flex-start"
              leftIcon={<Icon size={18} strokeWidth={2} />}
              bg={active ? "rgba(212, 175, 55, 0.35)" : "transparent"}
              color="var(--color-text-primary)"
              borderWidth="1px"
              borderColor={active ? "rgba(212, 175, 55, 0.55)" : "transparent"}
              _hover={{
                bg: active ? "rgba(212, 175, 55, 0.45)" : "rgba(255, 255, 255, 0.06)",
              }}
              borderRadius="md"
              className="inter-medium"
            >
              {item.label}
            </Button>
          );
        })}
        <Text fontSize="xs" color="var(--color-text-tertiary)" className="inter-semibold" pt={1}>
          Arsenal
        </Text>
        {arsenalSubLinks.map((sub) => {
          const active = pathname === sub.href || pathname?.startsWith(`${sub.href}/`);
          return (
            <Button
              key={sub.href}
              as={Link}
              href={sub.href}
              onClick={onNavigate}
              size="sm"
              variant={active ? "solid" : "ghost"}
              justifyContent="flex-start"
              pl={6}
              bg={active ? "rgba(212, 175, 55, 0.28)" : "transparent"}
              color="var(--color-text-primary)"
              borderWidth="1px"
              borderColor={active ? "rgba(212, 175, 55, 0.45)" : "transparent"}
              _hover={{
                bg: active ? "rgba(212, 175, 55, 0.38)" : "rgba(255, 255, 255, 0.06)",
              }}
              borderRadius="md"
              className="inter-medium"
            >
              {sub.label}
            </Button>
          );
        })}
      </Stack>
      {showActions ? (
        <Stack gap={2} pt={2} borderTopWidth="1px" borderColor="var(--color-border)">
          <Button
            as={Link}
            href="/news"
            onClick={onNavigate}
            size="sm"
            variant={newsActive ? "solid" : "ghost"}
            justifyContent="flex-start"
            leftIcon={<MessageCircle size={18} />}
            rightIcon={
              unreadNews > 0 ? (
                <Box
                  minW="20px"
                  h="20px"
                  px={1.5}
                  borderRadius="full"
                  bg="#D4AF37"
                  color="#0C0D10"
                  fontSize="10px"
                  className="inter-semibold"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  {unreadNews > 99 ? "99+" : unreadNews}
                </Box>
              ) : undefined
            }
            bg={newsActive ? "rgba(212, 175, 55, 0.22)" : "transparent"}
            borderWidth="1px"
            borderColor={newsActive ? "rgba(212, 175, 55, 0.5)" : "transparent"}
            _hover={{ bg: newsActive ? "rgba(212, 175, 55, 0.3)" : "rgba(255, 255, 255, 0.06)" }}
            className="inter-medium"
          >
            Capital Circle News
          </Button>
          <Button
            as={Link}
            href="/settings"
            onClick={onNavigate}
            size="sm"
            variant="ghost"
            justifyContent="flex-start"
            leftIcon={<UserRound size={18} />}
            className="inter-medium"
          >
            Einstellungen
          </Button>
          <Button
            size="sm"
            variant="ghost"
            justifyContent="flex-start"
            leftIcon={<LogOut size={18} />}
            onClick={() => {
              onNavigate?.();
              void onLogout();
            }}
            className="inter-medium"
            color="#F87171"
          >
            Abmelden
          </Button>
        </Stack>
      ) : null}
    </Stack>
  );

  const navButtonSx = {
    bg: "rgba(212, 175, 55, 0.4)",
    borderColor: "rgba(212, 175, 55, 0.5)",
    _hover: { bg: "rgba(212, 175, 55, 0.5)" },
  };

  const navGhostSx = {
    bg: "transparent",
    borderColor: "transparent",
    _hover: { bg: "rgba(255, 255, 255, 0.07)" },
  };

  return (
    <>
      <Box position="sticky" top={0} zIndex={10001} w="100%">
      {showFreeBanner && (
        <Box
          w="100%"
          bg="linear-gradient(90deg, rgba(12,9,4,0.97) 0%, rgba(20,14,6,0.97) 50%, rgba(12,9,4,0.97) 100%)"
          borderBottom="1px solid rgba(212,175,55,0.28)"
          backdropFilter="blur(16px)"
          sx={{ WebkitBackdropFilter: "blur(16px)" }}
        >
          <Flex
            maxW="1440px"
            mx="auto"
            px={{ base: 3, md: 8 }}
            py={{ base: "9px", md: "10px" }}
            align="center"
            justify="center"
            position="relative"
            gap={{ base: 2, md: 3 }}
          >
            <Box
              display={{ base: "none", md: "flex" }}
              alignItems="center"
              gap={2}
              mr={1}
            >
              <Box
                w="6px"
                h="6px"
                borderRadius="full"
                bg="var(--color-accent-gold)"
                boxShadow="0 0 8px rgba(212,175,55,0.7)"
              />
            </Box>

            <Text
              display={{ base: "none", md: "block" }}
              className="inter"
              fontSize="sm"
              color="rgba(245,236,210,0.82)"
            >
              Sichere dir deinen Platz im Capital Circle —
            </Text>

            <Box
              as="a"
              href="/bewerbung"
              display="inline-flex"
              alignItems="center"
              gap={1.5}
              px={{ base: 3, md: 4 }}
              py={{ base: "5px", md: "6px" }}
              borderRadius="8px"
              bg="linear-gradient(135deg, var(--color-accent-gold-dark) 0%, var(--color-accent-gold-light) 100%)"
              color="#0a0a0a"
              fontSize={{ base: "xs", md: "sm" }}
              className="inter-semibold"
              transition="all 180ms ease"
              _hover={{ filter: "brightness(1.08)", boxShadow: "0 0 18px rgba(212,175,55,0.40)" }}
              textDecoration="none"
              flexShrink={0}
            >
              <Text display={{ base: "inline", md: "none" }} className="inter-semibold" fontSize="xs">
                Jetzt bewerben →
              </Text>
              <Text display={{ base: "none", md: "inline" }} className="inter-semibold" fontSize="sm">
                Jetzt bewerben
              </Text>
            </Box>

            <IconButton
              position="absolute"
              right={{ base: 2, md: 6 }}
              aria-label="Banner schließen"
              icon={<X size={14} strokeWidth={2.5} />}
              size="xs"
              variant="ghost"
              color="rgba(255,255,255,0.45)"
              _hover={{ color: "rgba(255,255,255,0.85)", bg: "rgba(255,255,255,0.06)" }}
              onClick={dismissFreeBanner}
              minW="auto"
              h="auto"
              p={1}
              borderRadius="6px"
            />
          </Flex>
        </Box>
      )}

      <Box
        as="header"
        w="100%"
        borderBottom="1px solid rgba(212, 175, 55, 0.32)"
        bg="rgba(5, 6, 9, 0.88)"
        backdropFilter="blur(20px)"
        sx={{ WebkitBackdropFilter: "blur(20px)" }}
        boxShadow="0 4px 28px rgba(0, 0, 0, 0.55)"
      >
        <Flex
          maxW="1440px"
          mx="auto"
          px={{ base: 4, md: 8 }}
          py={3}
          align="center"
          gap={{ base: 2, md: 2 }}
          flexWrap={{ base: "wrap", md: "nowrap" }}
          justify="space-between"
        >
          <Link href="/dashboard" aria-label="Zum Dashboard" style={{ display: "block", lineHeight: 0 }}>
            <Box maxW={{ base: "130px", sm: "150px", md: "170px" }}>
              <Logo variant="onDark" priority width={170} height={48} knockoutEmbeddedDark />
            </Box>
          </Link>

          <Flex
            display={{ base: "none", md: "flex" }}
            flex="1"
            justify="center"
            align="center"
            gap={1}
            flexWrap="wrap"
            px={1}
          >
            {visibleNavItems.slice(0, 3).map((item) => {
              const active = isNavActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Button
                  key={item.href}
                  as={Link}
                  href={item.href}
                  size="sm"
                  variant={active ? "solid" : "ghost"}
                  leftIcon={<Icon size={18} strokeWidth={2} />}
                  {...(active ? navButtonSx : navGhostSx)}
                  color="var(--color-text-primary)"
                  borderWidth="1px"
                  borderRadius="md"
                  className="inter-medium"
                >
                  {item.label}
                </Button>
              );
            })}
            <Menu placement="bottom" isLazy>
              <MenuButton
                as={Button}
                size="sm"
                variant={tradingJournalActive ? "solid" : "ghost"}
                leftIcon={<BookMarked size={18} strokeWidth={2} />}
                rightIcon={<ChevronDown size={14} />}
                {...(tradingJournalActive ? navButtonSx : navGhostSx)}
                color="var(--color-text-primary)"
                borderWidth="1px"
                borderRadius="md"
                className="inter-medium"
                px={3}
              >
                Trading Journal
              </MenuButton>
              <MenuList
                bg="rgba(12, 13, 16, 0.98)"
                borderColor="rgba(212, 175, 55, 0.35)"
                boxShadow="0 8px 32px rgba(0,0,0,0.5)"
                py={1}
                minW="220px"
              >
                {tradingJournalSubLinks.map((sub) => (
                  <MenuItem
                    key={sub.href}
                    as={Link}
                    href={sub.href}
                    bg="transparent"
                    color="var(--color-text-primary)"
                    _hover={{ bg: "rgba(212, 175, 55, 0.12)" }}
                    className="inter-medium"
                  >
                    {sub.label}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
            {visibleNavItems.slice(3).map((item) => {
              const active = isNavActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Button
                  key={item.href}
                  as={Link}
                  href={item.href}
                  size="sm"
                  variant={active ? "solid" : "ghost"}
                  leftIcon={<Icon size={18} strokeWidth={2} />}
                  {...(active ? navButtonSx : navGhostSx)}
                  color="var(--color-text-primary)"
                  borderWidth="1px"
                  borderRadius="md"
                  className="inter-medium"
                >
                  {item.label}
                </Button>
              );
            })}
            <Menu placement="bottom" isLazy>
              <MenuButton
                as={Button}
                size="sm"
                variant={arsenalActive ? "solid" : "ghost"}
                leftIcon={<Package size={18} strokeWidth={2} />}
                rightIcon={<ChevronDown size={14} />}
                {...(arsenalActive ? navButtonSx : navGhostSx)}
                color="var(--color-text-primary)"
                borderWidth="1px"
                borderRadius="md"
                className="inter-medium"
                px={3}
              >
                Arsenal
              </MenuButton>
              <MenuList
                bg="rgba(12, 13, 16, 0.98)"
                borderColor="rgba(212, 175, 55, 0.35)"
                boxShadow="0 8px 32px rgba(0,0,0,0.5)"
                py={1}
                minW="220px"
              >
                {arsenalSubLinks.map((sub) => (
                  <MenuItem
                    key={sub.href}
                    as={Link}
                    href={sub.href}
                    bg="transparent"
                    color="var(--color-text-primary)"
                    _hover={{ bg: "rgba(212, 175, 55, 0.12)" }}
                    className="inter-medium"
                  >
                    {sub.label}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          </Flex>

          <HStack spacing={1} display={{ base: "none", md: "flex" }}>
            <Box position="relative">
              <IconButton
                as={Link}
                href="/news"
                aria-label={unreadNews > 0 ? `Capital Circle News (${unreadNews} neu)` : "Capital Circle News"}
                icon={<MessageCircle size={22} strokeWidth={2} />}
                variant="ghost"
                borderRadius="md"
                color={newsActive ? "#FEF3C7" : undefined}
                bg={newsActive ? "rgba(212, 175, 55, 0.18)" : undefined}
                _hover={{ bg: "rgba(212, 175, 55, 0.15)" }}
              />
              {unreadNews > 0 ? (
                <Box
                  position="absolute"
                  top="4px"
                  right="4px"
                  minW={unreadNews > 9 ? "18px" : "10px"}
                  h={unreadNews > 9 ? "18px" : "10px"}
                  px={unreadNews > 9 ? 1 : 0}
                  borderRadius="full"
                  bg="#D4AF37"
                  borderWidth="2px"
                  borderColor="rgba(5, 6, 9, 0.95)"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  boxShadow="0 0 12px rgba(212, 175, 55, 0.55)"
                  pointerEvents="none"
                >
                  {unreadNews > 9 ? (
                    <Box as="span" fontSize="10px" className="inter-semibold" color="#0C0D10" lineHeight="1">
                      {unreadNews > 99 ? "99+" : unreadNews}
                    </Box>
                  ) : null}
                </Box>
              ) : null}
            </Box>
            <IconButton
              as={Link}
              href="/settings"
              aria-label="Einstellungen"
              icon={<UserRound size={22} strokeWidth={2} />}
              variant="ghost"
              borderRadius="md"
              _hover={{ bg: "rgba(212, 175, 55, 0.15)" }}
            />
            <IconButton
              aria-label="Abmelden"
              icon={<LogOut size={22} strokeWidth={2} />}
              variant="ghost"
              borderRadius="md"
              color="#F87171"
              onClick={() => void onLogout()}
              _hover={{ bg: "rgba(248, 113, 113, 0.12)" }}
            />
          </HStack>

          <IconButton
            display={{ base: "flex", md: "none" }}
            aria-label="Menü"
            icon={<MenuIcon size={22} />}
            variant="ghost"
            onClick={onDrawerOpen}
          />
        </Flex>
      </Box>
      </Box>{/* end sticky wrapper */}

      <Drawer isOpen={drawerOpen} placement="right" onClose={onDrawerClose} size="xs">
        <DrawerOverlay bg="rgba(7, 8, 10, 0.7)" backdropFilter="blur(6px)" />
        <DrawerContent bg="rgba(12, 13, 16, 0.96)" borderLeftWidth="1px" borderColor="rgba(212, 175, 55, 0.25)">
          <DrawerCloseButton />
          <DrawerHeader className="inter-semibold" fontSize="md">
            Navigation
          </DrawerHeader>
          <DrawerBody>
            <NavRow onNavigate={onDrawerClose} showActions />
            <Text fontSize="xs" opacity={0.5} className="inter" mt={6}>
              Capital Circle Institut
            </Text>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

    </>
  );
}
