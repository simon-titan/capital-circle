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
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { Logo } from "@/components/brand/Logo";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  BookOpen,
  Calendar,
  ChevronDown,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu as MenuIcon,
  Package,
  Radio,
  Search,
  UserRound,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/ausbildung", label: "Institut", icon: GraduationCap },
  { href: "/codex", label: "Codex", icon: BookOpen },
  { href: "/live-session", label: "Live Session", icon: Radio },
  { href: "/analysis", label: "Analyse", icon: LineChart },
] as const;

const arsenalSubLinks = [
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

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { isOpen: drawerOpen, onOpen: onDrawerOpen, onClose: onDrawerClose } = useDisclosure();
  const { isOpen: searchOpen, onOpen: onSearchOpen, onClose: onSearchClose } = useDisclosure();

  const arsenalActive = pathname?.startsWith("/arsenal") ?? false;

  const onLogout = async () => {
    await supabase.auth.signOut();
    router.push("/einsteig");
    router.refresh();
  };

  const openSearchAfterDrawer = () => {
    onDrawerClose();
    window.setTimeout(() => onSearchOpen(), 200);
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
        {navItems.map((item) => {
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
            leftIcon={<Search size={18} />}
            onClick={() => openSearchAfterDrawer()}
            className="inter-medium"
          >
            Suche
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
      <Box
        as="header"
        position="sticky"
        top={0}
        zIndex={100}
        w="100%"
        borderBottom="1px solid rgba(212, 175, 55, 0.32)"
        bg="rgba(5, 6, 9, 0.88)"
        backdropFilter="blur(20px)"
        sx={{ WebkitBackdropFilter: "blur(20px)" }}
        boxShadow="0 4px 28px rgba(0, 0, 0, 0.55)"
      >
        <Flex
          maxW="1200px"
          mx="auto"
          px={{ base: 4, md: 8 }}
          py={3}
          align="center"
          gap={{ base: 2, md: 2 }}
          flexWrap="wrap"
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
            {navItems.map((item) => {
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
              aria-label="Suche"
              icon={<Search size={22} strokeWidth={2} />}
              variant="ghost"
              borderRadius="md"
              onClick={onSearchOpen}
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

      <Modal isOpen={searchOpen} onClose={onSearchClose} isCentered>
        <ModalOverlay bg="rgba(7, 8, 10, 0.75)" backdropFilter="blur(8px)" />
        <ModalContent className="glass-card-highlight" mx={4}>
          <ModalHeader className="inter-semibold" fontWeight={600}>
            Suche
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Text className="inter" fontSize="sm" color="var(--color-text-muted)">
              Die globale Suche ist in Kürze verfügbar. Bis dahin findest du Inhalte über Dashboard, Events und Institut.
            </Text>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
