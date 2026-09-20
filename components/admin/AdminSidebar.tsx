"use client";

import { Box, Collapse, Flex, Stack, Text } from "@chakra-ui/react";
import {
  Award,
  BookOpen,
  CalendarDays,
  ChartColumn,
  ChartLine,
  ChevronRight,
  CreditCard,
  FileX,
  Funnel,
  LayoutDashboard,
  LifeBuoy,
  Link2,
  ListChecks,
  MessageSquare,
  Newspaper,
  NotebookPen,
  Package,
  Route,
  ShieldCheck,
  Star,
  Ticket,
  Truck,
  Undo2,
  Users,
  Video,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useMemo, useSyncExternalStore, type ReactNode } from "react";

type AdminLink = { href: string; label: string; icon: LucideIcon };
type AdminGroup = { label: string | null; links: AdminLink[] };

/** Gruppiert und auf-/zuklappbar statt einer langen Liste — 21 Punkte bleiben so scanbar. */
const groups: AdminGroup[] = [
  {
    label: null,
    links: [{ href: "/admin", label: "Übersicht", icon: LayoutDashboard }],
  },
  // Am 16.09.2026 auf Wunsch aus der Navigation genommen — die Seiten bleiben
  // über ihre URL erreichbar und unverändert funktionsfähig:
  //   /admin/applications, /admin/ht-applications, /admin/step2-applications
  //   /admin/free-kurs
  //   /admin/stream
  {
    label: "Auswertung",
    links: [
      { href: "/admin/dashboard", label: "Analytics", icon: ChartColumn },
      // Der Weg zum Kauf: Besuche, Verweildauer, Scrolltiefe, Klicks, Kasse,
      // Zahlungen. Getrennt von „Analytics", weil dort das Geschaeft steht
      // (MRR, Umsatz, Churn) und hier der Weg dorthin.
      { href: "/admin/kaufweg", label: "Kaufweg", icon: Route },
    ],
  },
  {
    label: "Inhalte",
    links: [
      { href: "/admin/kurse", label: "Kurse & Module", icon: BookOpen },
      { href: "/admin/quiz", label: "Quiz", icon: ListChecks },
      { href: "/admin/events", label: "Events", icon: CalendarDays },
      { href: "/admin/hausaufgaben", label: "Hausaufgaben", icon: NotebookPen },
      { href: "/admin/arsenal", label: "Arsenal", icon: Package },
      { href: "/admin/live-sessions", label: "Live Sessions", icon: Video },
      // Markt-Analysen für Mitglieder — inhaltlich Content, nicht Auswertung.
      { href: "/admin/analysis", label: "Analyse", icon: ChartLine },
      { href: "/admin/news", label: "News", icon: Newspaper },
    ],
  },
  {
    label: "Community",
    links: [
      { href: "/admin/mitglieder", label: "Mitglieder", icon: Users },
      { href: "/admin/discord", label: "Discord", icon: MessageSquare },
      { href: "/admin/reviews", label: "Bewertungen", icon: Star },
      { href: "/admin/tickets", label: "Support-Tickets", icon: LifeBuoy },
      { href: "/admin/zertifikate", label: "Zertifikate", icon: Award },
    ],
  },
  {
    label: "Vertrieb",
    links: [
      { href: "/admin/tracking", label: "Tracking Links", icon: Link2 },
      { href: "/admin/discord-funnel", label: "Discord Funnel", icon: Funnel },
      // Die letzten Whop-Zahler holen (`config/whop-umzug.ts`). Nur Ansicht —
      // verschickt wird über `npm run whop:umzug`.
      { href: "/admin/whop-umzug", label: "Whop-Umzug", icon: Truck },
      { href: "/admin/gutscheine", label: "Gutscheine", icon: Ticket },
      { href: "/admin/zahlungsstoerungen", label: "Zahlungsstörungen", icon: CreditCard },
      // Eingänge über den Kündigungsbutton `/kuendigen` (§ 312k BGB).
      { href: "/admin/kuendigungen", label: "Kündigungen", icon: FileX },
      // Eingänge über die Widerrufsfunktion `/widerrufen` (§ 356a BGB).
      { href: "/admin/widerrufe", label: "Widerrufe", icon: Undo2 },
    ],
  },
  {
    label: "System",
    links: [
      { href: "/admin/team", label: "Team", icon: ShieldCheck },
      { href: "/admin/wartung", label: "Wartungsmodus", icon: Wrench },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  // „/admin“ ist Präfix aller Routen — nur exakt aktiv.
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Wie der aktive Nav-Punkt der Plattform-Sidebar, nur dichter (Arbeitswerkzeug). */
function rowProps(active: boolean) {
  return {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    w: "100%",
    h: "38px",
    px: "12px",
    borderRadius: "var(--cc-radius)",
    border: "1px solid",
    borderColor: active ? "var(--cc-gold-line)" : "transparent",
    bg: active ? "linear-gradient(90deg, rgba(212, 176, 128, 0.16) 0%, rgba(212, 176, 128, 0.03) 100%)" : "transparent",
    boxShadow: active ? "0 0 18px rgba(212, 176, 128, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.04)" : "none",
    color: active ? "var(--cc-gold-light)" : "var(--cc-text-soft)",
    fontSize: "14px",
    fontWeight: active ? 500 : 400,
    lineHeight: 1,
    transition:
      "background-color 150ms var(--cc-ease), color 150ms var(--cc-ease), border-color 150ms var(--cc-ease)",
    _hover: active ? undefined : { bg: "rgba(255, 255, 255, 0.04)", color: "var(--cc-text)" },
  };
}

/* ── Zugeklappte Gruppen: im localStorage, pro Browser, nicht pro Konto ──────
 *
 * Als externer Store statt als `useState` + `useEffect`: Der Server kennt den
 * localStorage nicht, `useSyncExternalStore` liefert ihm deshalb den leeren
 * Server-Schnappschuss (alles offen) und dem Client den echten Stand — ohne
 * abweichenden ersten Render und ohne `setState` in einem Effect.
 */
const SPEICHER_SCHLUESSEL = "cc-admin-nav-zu";
const AENDERUNGS_EREIGNIS = "cc-admin-nav-aenderung";
/** Alles offen. Als Konstante, damit die Referenz stabil bleibt. */
const LEER = "[]";

function abonniere(melde: () => void): () => void {
  // Eigenes Ereignis fürs selbe Tab, `storage` für parallel geöffnete Tabs.
  window.addEventListener(AENDERUNGS_EREIGNIS, melde);
  window.addEventListener("storage", melde);
  return () => {
    window.removeEventListener(AENDERUNGS_EREIGNIS, melde);
    window.removeEventListener("storage", melde);
  };
}

/** Muss denselben String zurückgeben, solange sich nichts ändert — sonst Render-Schleife. */
function leseStand(): string {
  try {
    return window.localStorage.getItem(SPEICHER_SCHLUESSEL) ?? LEER;
  } catch {
    // Privater Modus oder blockierte Site-Daten — dann eben immer alles offen.
    return LEER;
  }
}

function leseServerStand(): string {
  return LEER;
}

export function AdminSidebar() {
  const pathname = usePathname() ?? "";

  const stand = useSyncExternalStore(abonniere, leseStand, leseServerStand);

  const zugeklappt = useMemo(() => {
    try {
      const wert: unknown = JSON.parse(stand);
      return new Set(Array.isArray(wert) ? wert.filter((x): x is string => typeof x === "string") : []);
    } catch {
      return new Set<string>();
    }
  }, [stand]);

  /**
   * Enthält diese Gruppe die aktuelle Seite? Nur für die Beschriftung, wenn die
   * Gruppe zu ist — aufgeklappt wird nichts erzwungen. Ein erzwungenes
   * Offenhalten hätte den Klick auf die eigene Kopfzeile wirkungslos gemacht,
   * und ein Knopf, der nichts tut, ist schlimmer als eine zugeklappte Gruppe.
   */
  const aktiveGruppe = useMemo(
    () => groups.find((g) => g.label && g.links.some((l) => isActive(pathname, l.href)))?.label ?? null,
    [pathname],
  );

  const schalte = useCallback(
    (label: string) => {
      const next = new Set(zugeklappt);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      try {
        window.localStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify([...next]));
      } catch {
        // Nicht speicherbar — dann bleibt die Navigation eben immer aufgeklappt.
      }
      window.dispatchEvent(new Event(AENDERUNGS_EREIGNIS));
    },
    [zugeklappt],
  );

  return (
    <Flex
      as="aside"
      direction="column"
      w="248px"
      flexShrink={0}
      position="sticky"
      top={0}
      h="100dvh"
      overflowY="auto"
      className="hide-scrollbar"
      bg="var(--cc-bg-raised)"
      borderRight="1px solid var(--cc-line)"
      px={3}
      pt={7}
      pb={6}
      zIndex={2}
    >
      <Box px="12px" mb={7}>
        {/*
          Wortmarke als freigestelltes Bild (seit 20.09.2026). Feste Hoehe,
          Breite automatisch — so bleibt sie in einer Flucht mit dem
          Betriebs-Punkt darunter.
        */}
        <Box
          as={Link}
          href="/admin"
          aria-label="Capital Circle Admin, zur Übersicht"
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
            style={{ height: "17px", width: "auto" }}
          />
        </Box>
        <Flex align="center" gap={2} mt={2.5}>
          <Box
            w="6px"
            h="6px"
            borderRadius="full"
            bg="var(--cc-gold-light)"
            boxShadow="0 0 8px rgba(232, 192, 148, 0.6)"
            aria-hidden
          />
          <Text fontSize="11px" fontWeight={500} letterSpacing="0.12em" textTransform="uppercase" color="var(--cc-text-2)">
            Admin Panel
          </Text>
        </Flex>
      </Box>

      <Box as="nav" aria-label="Admin-Navigation">
        <Stack spacing={5}>
          {groups.map((group) => (
            <NavGroup
              key={group.label ?? "start"}
              label={group.label}
              offen={!group.label || !zugeklappt.has(group.label)}
              anzahl={group.links.length}
              enthaeltAktive={group.label != null && group.label === aktiveGruppe}
              onSchalten={group.label ? () => schalte(group.label!) : undefined}
            >
              {group.links.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Box as="li" key={item.href}>
                    <Box
                      as={Link}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      {...rowProps(active)}
                    >
                      <Icon size={18} strokeWidth={1.5} aria-hidden />
                      <Box as="span" flex="1" minW={0} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                        {item.label}
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </NavGroup>
          ))}
        </Stack>
      </Box>
    </Flex>
  );
}

function NavGroup({
  label,
  offen,
  anzahl,
  enthaeltAktive,
  onSchalten,
  children,
}: {
  label: string | null;
  offen: boolean;
  /** Zahl neben dem Titel, wenn die Gruppe zu ist — sonst sieht man nicht, was drinsteckt. */
  anzahl: number;
  /** Zugeklappt und die aktuelle Seite liegt darin: Goldpunkt statt Zahl. */
  enthaeltAktive?: boolean;
  /** Fehlt bei der Gruppe ohne Überschrift — die bleibt immer offen. */
  onSchalten?: () => void;
  children: ReactNode;
}) {
  const listeId = label ? `admin-nav-${label.toLowerCase().replace(/[^a-z]+/g, "-")}` : undefined;

  const liste = (
    <Stack as="ul" id={listeId} spacing="2px" listStyleType="none">
      {children}
    </Stack>
  );

  if (!label || !onSchalten) return <Box>{liste}</Box>;

  return (
    <Box>
      <Box
        as="button"
        type="button"
        onClick={onSchalten}
        aria-expanded={offen}
        aria-controls={listeId}
        display="flex"
        alignItems="center"
        gap={1.5}
        w="100%"
        px="12px"
        mb={1.5}
        bg="transparent"
        color={!offen && enthaeltAktive ? "var(--cc-gold-light)" : "var(--cc-text-3)"}
        transition="color 150ms var(--cc-ease)"
        _hover={{ color: !offen && enthaeltAktive ? "var(--cc-gold-light)" : "var(--cc-text-2)" }}
        title={offen ? `${label} zuklappen` : `${label} aufklappen`}
        _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px", borderRadius: "4px" }}
      >
        <Box
          as={ChevronRight}
          boxSize="13px"
          flexShrink={0}
          aria-hidden
          transform={offen ? "rotate(90deg)" : "rotate(0deg)"}
          transition="transform 180ms var(--cc-ease)"
        />
        <Text
          as="span"
          fontSize="11px"
          fontWeight={500}
          letterSpacing="0.12em"
          textTransform="uppercase"
          lineHeight={1.4}
        >
          {label}
        </Text>
        {!offen ? (
          enthaeltAktive ? (
            // Die aktuelle Seite steckt in dieser zugeklappten Gruppe — sonst
            // verlöre man beim Zuklappen jeden Hinweis darauf, wo man ist.
            <Box
              as="span"
              ml="auto"
              w="6px"
              h="6px"
              borderRadius="full"
              bg="var(--cc-gold-light)"
              boxShadow="0 0 8px rgba(232, 192, 148, 0.6)"
              aria-label="enthält die aktuelle Seite"
            />
          ) : (
            <Text as="span" ml="auto" fontSize="11px" className="cc-num" color="var(--cc-text-3)">
              {anzahl}
            </Text>
          )
        ) : null}
      </Box>
      {/*
        `unmountOnExit`: Eine zugeklappte Gruppe verschwindet komplett aus dem DOM.
        Ohne das bliebe sie nur optisch eingeklappt, und die Tastatur würde
        weiterhin durch unsichtbare Links laufen.
      */}
      <Collapse in={offen} animateOpacity unmountOnExit>
        {liste}
      </Collapse>
    </Box>
  );
}

/**
 * Rahmen des Admin-Bereichs: Graphitgrund mit weichem Champagner-Licht,
 * Sidebar links, Inhalt rechts. Client-Komponente wie `PlatformFrame`, damit
 * Emotion auf Server und Client dasselbe Markup erzeugt. `data-platform` holt
 * die Plattform-Regeln aus globals.css (Inter-Überschriften, Gold-Fokus).
 */
export function AdminFrame({ children }: { children: ReactNode }) {
  return (
    <Box data-platform position="relative" display="flex" minH="100vh" bg="var(--cc-bg)" overflowX="clip">
      <Box className="cc-goldlight" aria-hidden />
      <AdminSidebar />
      <Box
        as="main"
        position="relative"
        zIndex={1}
        flex="1"
        minW={0}
        px={{ base: 4, md: 6, xl: 8 }}
        pt={{ base: 6, md: 8 }}
        pb={16}
      >
        {children}
      </Box>
    </Box>
  );
}
