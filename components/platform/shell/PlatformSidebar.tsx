"use client";

import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  Flex,
  IconButton,
  Stack,
  Text,
  VisuallyHidden,
  useDisclosure,
} from "@chakra-ui/react";
import { Lock, LogOut, Menu as MenuIcon, MessageCircle, Settings, UserRound, X, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { RechtsLinks } from "@/components/legal/RechtsFusszeile";
import { DiscordGlyph } from "@/components/platform/DiscordBanner";
import { getDiscordAuthUrl } from "@/lib/discord";
import { createClient } from "@/lib/supabase/client";
import { NAV_GROUPS, type NavChild, type NavGroup } from "./nav";

type Viewer = {
  isPaid: boolean;
  isPending: boolean;
  /** Free-Mitglied mit freigeschalteter Bewerbung, Step 2 noch offen. */
  showApplyCta: boolean;
};

// Standard „bezahlt“: gesperrte Punkte erscheinen erst, wenn das Profil sicher
// Free meldet — zahlende Mitglieder sehen so nie kurz Schlösser aufblitzen.
const DEFAULT_VIEWER: Viewer = { isPaid: true, isPending: false, showApplyCta: false };

function useViewer(): Viewer {
  const [viewer, setViewer] = useState<Viewer>(DEFAULT_VIEWER);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_paid, application_status, step2_application_status")
          .eq("id", user.id)
          .maybeSingle();
        if (!profile || cancelled) return;
        const p = profile as Record<string, unknown>;
        const isPaid = Boolean(p.is_paid);
        setViewer({
          isPaid,
          // Zahlende sperrt eine offene Bewerbung nicht (Regel wie in `proxy.ts`) —
          // sonst stünde ein Käufer mit Altbewerbung vor einer komplett gesperrten Navigation.
          isPending: !isPaid && p.application_status === "pending",
          showApplyCta: !isPaid && p.application_status === "approved" && p.step2_application_status == null,
        });
      } catch {
        // Navigation bleibt im Standardzustand.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return viewer;
}

function useUnreadNews(pathname: string): number {
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
        // ohne Badge weiter
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

  // Beim Öffnen der News setzt der Server last_seen_at — lokal sofort ausblenden.
  useEffect(() => {
    if (!pathname.startsWith("/news")) return;
    const timeout = window.setTimeout(() => setCount(0), 0);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  return count;
}

type DiscordStatus = { eligible: boolean; connected: boolean; username: string | null };

/**
 * Discord-Zustand für den Konto-Block. Am 17.09.2026 aus den Dashboard-Kacheln
 * hierher gewandert: die Verknüpfung gehört zum Konto und soll von jeder Seite
 * aus erreichbar sein, nicht nur von der Tagesübersicht.
 *
 * `null` heißt „noch nicht bekannt“ — solange bleibt die Zeile aus, statt
 * kurz „Nicht verbunden“ zu behaupten und dann umzuspringen.
 *
 * Kein Intervall wie bei den News: der Zustand ändert sich nur durch den
 * OAuth-Rundgang zu Discord (danach lädt die Seite ohnehin neu) oder auf der
 * Profilseite. Das Nachladen beim Fokus fängt beides ab.
 */
function useDiscordStatus(): DiscordStatus | null {
  const [status, setStatus] = useState<DiscordStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/discord/status", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as {
          ok: boolean;
          eligible?: boolean;
          connected?: boolean;
          username?: string | null;
        };
        if (cancelled || !json.ok) return;
        setStatus({
          eligible: Boolean(json.eligible),
          connected: Boolean(json.connected),
          username: json.username ?? null,
        });
      } catch {
        // ohne Discord-Zeile weiter
      }
    };
    void load();
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return status;
}

function matches(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function childVisible(child: NavChild, viewer: Viewer): boolean {
  return child.access === "free-only" ? !viewer.isPaid : true;
}

function childLocked(child: NavChild, viewer: Viewer): boolean {
  return viewer.isPending || (child.access === "paid" && !viewer.isPaid);
}

function groupActive(group: NavGroup, pathname: string): boolean {
  return matches(pathname, group.href) || (group.children ?? []).some((c) => matches(pathname, c.href));
}

/** Ziel des Bereichs: erster freigeschalteter Unterpunkt; null = komplett gesperrt. */
function groupTarget(group: NavGroup, viewer: Viewer): string | null {
  if (!group.children) return viewer.isPending ? null : group.href;
  return group.children.find((c) => childVisible(c, viewer) && !childLocked(c, viewer))?.href ?? null;
}

function rowProps(active: boolean, height = "52px") {
  return {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    w: "100%",
    h: height,
    px: "14px",
    borderRadius: "var(--cc-radius)",
    border: "1px solid",
    borderColor: active ? "var(--cc-gold-line)" : "transparent",
    bg: active ? "linear-gradient(90deg, rgba(212, 176, 128, 0.16) 0%, rgba(212, 176, 128, 0.03) 100%)" : "transparent",
    boxShadow: active ? "0 0 22px rgba(212, 176, 128, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.04)" : "none",
    color: active ? "var(--cc-gold-light)" : "var(--cc-text-soft)",
    fontSize: "15px",
    fontWeight: 400,
    lineHeight: 1,
    textAlign: "left" as const,
    transition:
      "background-color 150ms var(--cc-ease), color 150ms var(--cc-ease), border-color 150ms var(--cc-ease)",
    _hover: active ? undefined : { bg: "rgba(255, 255, 255, 0.04)", color: "var(--cc-text)" },
  };
}

function RowInner({ icon: Icon, label, trailing }: { icon: LucideIcon; label: string; trailing?: ReactNode }) {
  return (
    <>
      <Icon size={24} strokeWidth={1.5} aria-hidden />
      <Box as="span" flex="1" minW={0}>
        {label}
      </Box>
      {trailing}
    </>
  );
}

/**
 * Wortmarke als Bild (Zeichen + Schrift), seit 20.09.2026 statt gesperrtem
 * Text. Die Datei ist freigestellt und weiß, sie passt damit auf den Graphit
 * der Schale und braucht keinen Filter.
 *
 * Feste Höhe statt fester Breite: Das Seitenverhältnis liegt bei rund 8:1,
 * über die Höhe bleibt sie in einer Flucht mit den Zeilen darunter. `width`
 * und `height` tragen nur das Verhältnis für den Platzhalter — die Anzeige
 * steuert `style`.
 */
function Wordmark({ compact = false }: { compact?: boolean }) {
  const hoehe = compact ? 16 : 19;
  return (
    <Box
      as={Link}
      href="/dashboard"
      aria-label="Capital Circle — zum Dashboard"
      display="inline-flex"
      alignItems="center"
      lineHeight={1}
    >
      <Image
        src="/logo/cc-wortmarke-weiss.png"
        alt=""
        width={1585}
        height={199}
        priority
        style={{ height: `${hoehe}px`, width: "auto" }}
      />
    </Box>
  );
}

function SubList({
  items,
  pathname,
  viewer,
  onNavigate,
}: {
  items: NavChild[];
  pathname: string;
  viewer: Viewer;
  onNavigate?: () => void;
}) {
  return (
    <Box as="ul" listStyleType="none" ml="24px" mt={1} mb={2} borderLeft="1px solid var(--cc-line)">
      {items.map((child) => {
        const locked = childLocked(child, viewer);
        const active = !locked && matches(pathname, child.href);
        return (
          <Box as="li" key={child.href} position="relative">
            {active ? (
              <Box
                position="absolute"
                left="-1px"
                top="7px"
                bottom="7px"
                w="1px"
                bg="var(--cc-gold-light)"
                boxShadow="0 0 8px rgba(232, 192, 148, 0.8)"
                aria-hidden
              />
            ) : null}
            {locked ? (
              <Flex
                h="34px"
                pl="18px"
                pr="8px"
                align="center"
                justify="space-between"
                gap={2}
                fontSize="14px"
                color="var(--cc-text-3)"
                cursor="not-allowed"
                aria-disabled="true"
                title="Nur für Mitglieder"
              >
                <span>
                  {child.label}
                  <VisuallyHidden> (nur für Mitglieder)</VisuallyHidden>
                </span>
                <Lock size={12} strokeWidth={1.75} aria-hidden />
              </Flex>
            ) : (
              <Box
                as={Link}
                href={child.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                display="flex"
                alignItems="center"
                h="34px"
                pl="18px"
                fontSize="14px"
                fontWeight={active ? 500 : 400}
                color={active ? "var(--cc-text)" : "var(--cc-text-2)"}
                transition="color 150ms var(--cc-ease)"
                _hover={{ color: "var(--cc-text)" }}
              >
                {child.label}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

function NavList({ pathname, viewer, onNavigate }: { pathname: string; viewer: Viewer; onNavigate?: () => void }) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <Stack as="ul" spacing={3} listStyleType="none">
      {NAV_GROUPS.map((group) => {
        const active = groupActive(group, pathname);
        const target = groupTarget(group, viewer);
        const children = (group.children ?? []).filter((c) => childVisible(c, viewer));
        const expanded = children.length > 0 && (active || openKey === group.key);

        return (
          <Box as="li" key={group.key}>
            {target ? (
              <Box
                as={Link}
                href={target}
                onClick={onNavigate}
                aria-current={pathname === target ? "page" : undefined}
                {...rowProps(active)}
              >
                <RowInner icon={group.icon} label={group.label} />
              </Box>
            ) : (
              <Box
                as="button"
                type="button"
                aria-expanded={children.length > 0 ? expanded : undefined}
                disabled={children.length === 0}
                onClick={() => setOpenKey((k) => (k === group.key ? null : group.key))}
                {...rowProps(false)}
                color="var(--cc-text-3)"
                cursor={children.length === 0 ? "not-allowed" : "pointer"}
              >
                <RowInner
                  icon={group.icon}
                  label={group.label}
                  trailing={<Lock size={13} strokeWidth={1.75} aria-hidden />}
                />
              </Box>
            )}
            {expanded ? <SubList items={children} pathname={pathname} viewer={viewer} onNavigate={onNavigate} /> : null}
          </Box>
        );
      })}
    </Stack>
  );
}

/**
 * Discord-Zeile im Konto-Block.
 *
 * Nicht verbunden: `getDiscordAuthUrl()` als gewöhnlicher Anker — /api/discord/connect
 * ist eine Server-Route, die zu Discord weiterleitet, der Next-Router darf sie
 * nicht abfangen. Verbunden: kein zweiter Verbinden-Weg, sondern der Zustand
 * samt Namen; der Klick führt dorthin, wo man ihn lösen kann.
 */
function DiscordRow({ status, onNavigate }: { status: DiscordStatus; onNavigate?: () => void }) {
  const raw = status.username?.trim() ?? "";
  const handle = raw ? (raw.startsWith("@") ? raw : `@${raw}`) : null;
  /*
   * Die Wortmarke ist gefüllt statt Linie und trägt 22 statt 24px, sonst steht
   * sie schwerer da als ihre Nachbarn. Die 24px-Spur darum hält die Beschriftungen
   * trotzdem auf einer Flucht mit den Lucide-Zeilen.
   */
  const glyph = (
    <Flex w="24px" flexShrink={0} align="center" justify="center">
      <DiscordGlyph size={22} />
    </Flex>
  );

  if (status.connected) {
    return (
      <Box
        as={Link}
        href="/einstellungen/profil"
        onClick={onNavigate}
        title={handle ? `Discord verbunden als ${handle} — im Profil verwalten` : "Discord verbunden — im Profil verwalten"}
        {...rowProps(false, "48px")}
      >
        {glyph}
        <Box as="span" flex="1" minW={0}>
          Discord
        </Box>
        <Flex align="center" gap="6px" flexShrink={0} fontSize="12px" color="var(--cc-text-2)">
          <Box w="7px" h="7px" borderRadius="full" bg="var(--cc-success)" aria-hidden />
          Verbunden
          {handle ? <VisuallyHidden> als {handle}</VisuallyHidden> : null}
        </Flex>
      </Box>
    );
  }

  return (
    <Box as="a" href={getDiscordAuthUrl()} onClick={onNavigate} {...rowProps(false, "48px")}>
      {glyph}
      <Box as="span" flex="1" minW={0}>
        Discord
      </Box>
      <Box as="span" flexShrink={0} fontSize="12px" color="var(--cc-gold-light)">
        Verbinden
      </Box>
    </Box>
  );
}

function AccountList({
  pathname,
  unreadNews,
  discord,
  onNavigate,
  onLogout,
}: {
  pathname: string;
  unreadNews: number;
  discord: DiscordStatus | null;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  const newsActive = pathname.startsWith("/news");
  // `/settings` leitet seit dem 17.09.2026 auf `/einstellungen/profil` um. Wer
  // nur auf den alten Pfad prueft, sieht auf der Profilseite „Einstellungen"
  // leuchten statt „Profil" — beide Eintraege liegen jetzt unter derselben
  // Adresse, also muessen sie sich gegenseitig ausschliessen.
  const profileActive = pathname.startsWith("/einstellungen/profil") || pathname.startsWith("/settings");
  const settingsActive = pathname.startsWith("/einstellungen") && !profileActive;
  const badge =
    unreadNews > 0 ? (
      <Box
        as="span"
        className="cc-num"
        minW="20px"
        h="20px"
        px="6px"
        borderRadius="full"
        bg="rgba(255, 255, 255, 0.1)"
        color="var(--cc-text)"
        fontSize="11px"
        fontWeight={500}
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
      >
        {unreadNews > 99 ? "99+" : unreadNews}
        <VisuallyHidden> neue Beiträge</VisuallyHidden>
      </Box>
    ) : null;

  return (
    <Stack as="ul" spacing={1} listStyleType="none">
      <Box as="li">
        <Box as={Link} href="/news" onClick={onNavigate} aria-current={newsActive ? "page" : undefined} {...rowProps(newsActive, "48px")}>
          <RowInner icon={MessageCircle} label="News" trailing={badge} />
        </Box>
      </Box>
      {/* Nur für zahlende Mitglieder — /api/discord/connect weist Free ab. */}
      {discord?.eligible ? (
        <Box as="li">
          <DiscordRow status={discord} onNavigate={onNavigate} />
        </Box>
      ) : null}
      <Box as="li">
        <Box
          as={Link}
          // Direkt auf das Ziel, nicht auf die Weiterleitung: `/settings` waere
          // ein zusaetzlicher Sprung bei jedem Klick.
          href="/einstellungen/profil"
          onClick={onNavigate}
          aria-current={profileActive ? "page" : undefined}
          {...rowProps(profileActive, "48px")}
        >
          <RowInner icon={UserRound} label="Profil" />
        </Box>
      </Box>
      {/*
        Konto-Bereich: „Profil“ zeigt auf /einstellungen/profil, „Einstellungen“
        auf den Bereich daneben mit Zahlungsmethode, Rechnungen und Abonnement.
      */}
      <Box as="li">
        <Box
          as={Link}
          href="/einstellungen"
          onClick={onNavigate}
          aria-current={settingsActive ? "page" : undefined}
          {...rowProps(settingsActive, "48px")}
        >
          <RowInner icon={Settings} label="Einstellungen" />
        </Box>
      </Box>
      <Box as="li">
        <Box as="button" type="button" onClick={onLogout} {...rowProps(false, "48px")}>
          <RowInner icon={LogOut} label="Logout" />
        </Box>
      </Box>
    </Stack>
  );
}

function ApplyCta({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Box mt={6} p={4} border="1px solid var(--cc-line)" borderRadius="var(--cc-radius-lg)" flexShrink={0}>
      <Text fontSize="14px" fontWeight={500} color="var(--cc-text)" lineHeight={1.4}>
        Voller Zugang zum Capital Circle
      </Text>
      <Text fontSize="13px" color="var(--cc-text-2)" lineHeight={1.5} mt={1}>
        Journal, Analysen und Live-Sessions mit der Community.
      </Text>
      <Button
        as={Link}
        href="/bewerbung"
        onClick={onNavigate}
        variant="line"
        size="sm"
        w="full"
        mt={3}
        color="var(--cc-gold)"
        borderColor="var(--cc-gold-line)"
      >
        Jetzt bewerben
      </Button>
    </Box>
  );
}

/**
 * Plattform-Navigation: ab `lg` feste linke Sidebar, darunter eine schmale
 * Kopfzeile mit Menü-Button, die dieselbe Liste als Drawer öffnet.
 */
export function PlatformSidebar() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const viewer = useViewer();
  const unreadNews = useUnreadNews(pathname);
  const discord = useDiscordStatus();
  const drawer = useDisclosure();
  // Fokus beim Öffnen auf „Schließen“ statt auf die Wortmarke (erster Link).
  const closeRef = useRef<HTMLButtonElement>(null);

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/einsteig");
    router.refresh();
  };

  const panel = (onNavigate?: () => void) => (
    <>
      <Box as="nav" aria-label="Hauptnavigation" flex="1">
        <NavList pathname={pathname} viewer={viewer} onNavigate={onNavigate} />
      </Box>
      {viewer.showApplyCta ? <ApplyCta onNavigate={onNavigate} /> : null}
      <Box h="1px" bg="var(--cc-line)" my={5} flexShrink={0} />
      <Box as="nav" aria-label="Konto" flexShrink={0}>
        <AccountList
          pathname={pathname}
          unreadNews={unreadNews}
          discord={discord}
          onNavigate={onNavigate}
          onLogout={() => {
            onNavigate?.();
            void logout();
          }}
        />
      </Box>
      {/*
        Rechtstexte und der Kündigungsbutton (§ 312k BGB) — dezent am Fuß der
        Navigation, damit sie von jeder Seite des Mitgliederbereichs aus
        erreichbar sind. Der Klick schließt im Drawer das Menü (bubbelt zum
        `onClick` hier).
      */}
      <Box mt={5} px="14px" flexShrink={0} onClick={onNavigate}>
        <RechtsLinks kompakt />
      </Box>
    </>
  );

  return (
    <>
      <Flex
        as="header"
        display={{ base: "flex", lg: "none" }}
        position="sticky"
        top={0}
        zIndex={20}
        h="56px"
        px={4}
        align="center"
        justify="space-between"
        bg="var(--cc-bg-raised)"
        backdropFilter="blur(16px)"
        borderBottom="1px solid var(--cc-line)"
      >
        <Wordmark compact />
        <IconButton
          aria-label="Menü öffnen"
          icon={<MenuIcon size={22} strokeWidth={1.5} />}
          variant="ghost"
          color="var(--cc-text)"
          _hover={{ bg: "rgba(255, 255, 255, 0.05)" }}
          onClick={drawer.onOpen}
        />
      </Flex>

      <Flex
        as="aside"
        display={{ base: "none", lg: "flex" }}
        direction="column"
        w="var(--cc-sidebar-w)"
        flexShrink={0}
        position="sticky"
        top="var(--cc-strip-h)"
        h="calc(100dvh - var(--cc-strip-h))"
        overflowY="auto"
        className="hide-scrollbar"
        bg="var(--cc-bg-raised)"
        backdropFilter="blur(18px)"
        borderRight="1px solid var(--cc-line)"
        px={5}
        pt={9}
        pb={6}
        zIndex={10}
      >
        {/*
          Waagerecht mittig in der Spalte (Wunsch Simon, 20.09.2026): Vorher
          stand die Marke links auf der Flucht der Zeilen, dadurch blieb rechts
          sichtbar mehr Luft. Die Zeilen darunter bleiben linksbündig — die
          Marke ist Kopf, keine Zeile.
        */}
        <Flex justify="center" mb={10}>
          <Wordmark />
        </Flex>
        {panel()}
      </Flex>

      {/*
        Lichtlinie an der Sidebar-Kante. Der wandernde Funken (`.cc-spark`) ist am
        16.09.2026 auf Nutzerwunsch entfernt worden — er lief dauerhaft im
        Augenwinkel und lenkte von der Navigation ab. Die ruhige Linie bleibt.
      */}
      <Box
        display={{ base: "none", lg: "block" }}
        position="fixed"
        top="var(--cc-strip-h)"
        bottom={0}
        left="calc(var(--cc-sidebar-w) - 1px)"
        w="1px"
        zIndex={11}
        pointerEvents="none"
        bg="linear-gradient(180deg, transparent 0%, rgba(255, 255, 255, 0.12) 18%, rgba(212, 176, 128, 0.4) 50%, rgba(255, 255, 255, 0.12) 82%, transparent 100%)"
        aria-hidden
      />

      <Drawer isOpen={drawer.isOpen} placement="left" onClose={drawer.onClose} initialFocusRef={closeRef}>
        <DrawerOverlay bg="rgba(8, 10, 12, 0.72)" />
        <DrawerContent bg="var(--cc-panel-solid)" borderRight="1px solid var(--cc-line)" maxW="300px" data-platform>
          <DrawerBody display="flex" flexDirection="column" px={5} pt={5} pb={6}>
            <Flex align="center" justify="space-between" mb={8} pl="14px">
              <Wordmark compact />
              <IconButton
                ref={closeRef}
                aria-label="Menü schließen"
                icon={<X size={20} strokeWidth={1.5} />}
                variant="ghost"
                size="sm"
                color="var(--cc-text-2)"
                _hover={{ bg: "rgba(255, 255, 255, 0.05)", color: "var(--cc-text)" }}
                onClick={drawer.onClose}
              />
            </Flex>
            {panel(drawer.onClose)}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
