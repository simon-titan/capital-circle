"use client";

import {
  Box,
  Button,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
} from "@chakra-ui/react";
import { BarChart3, CalendarCheck, Columns3, Plus, Search, Shield, UserCog, Users, X, type LucideIcon } from "lucide-react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { adminInputProps, adminModalHeaderProps, adminModalProps, adminOverlayProps } from "@/components/admin/adminUi";
import { fehlerText, passtZurSuche } from "@/lib/crm/anzeige";
import type { KontaktZeile } from "@/lib/crm/daten";
import { PhasePill } from "./gemeinsam";
import { Avatar, CrmProvider, Feldlabel, useCrm } from "./ui";

type Punkt = { pfad: string; label: string; icon: LucideIcon; nurAdmin?: boolean };
const PUNKTE: Punkt[] = [
  { pfad: "", label: "Heute", icon: CalendarCheck },
  { pfad: "/pipeline", label: "Pipeline", icon: Columns3 },
  { pfad: "/kontakte", label: "Kontakte", icon: Users },
  { pfad: "/auswertung", label: "Auswertung", icon: BarChart3 },
  { pfad: "/team", label: "Team", icon: UserCog, nurAdmin: true },
];

/**
 * Rahmen des CRM: links eine Seitenleiste wie in Plattform und Admin (ab `lg`),
 * oben eine Glasleiste mit globaler Suche (Strg+K) und „Kontakt anlegen", auf dem
 * Handy unten eine Tab-Leiste — Closer arbeiten oft vom Telefon aus. Setzt
 * `data-crm` (dunkle Scrollleisten, Kalender-Icons) und den Himmel.
 */
export function CrmRahmen({
  basis = "/crm",
  ichId,
  istAdmin,
  name,
  children,
}: {
  basis?: string;
  ichId: string | null;
  istAdmin: boolean;
  name: string;
  children: ReactNode;
}) {
  const wert = useMemo(() => ({ basis, ichId, istAdmin, name }), [basis, ichId, istAdmin, name]);
  return (
    <CrmProvider wert={wert}>
      <Box data-platform data-crm position="relative" minH="100vh" bg="var(--cc-bg)" color="var(--cc-text)" overflowX="clip">
        <Box className="cc-stars" aria-hidden />
        <Box className="cc-goldlight" aria-hidden />
        <Flex position="relative" zIndex={1} minH="100vh">
          <Seitenleiste />
          <Box flex="1" minW={0}>
            <Kopfleiste />
            <Box as="main" maxW="1440px" mx="auto" px={{ base: 3, md: 6, xl: 8 }} pt={{ base: 4, md: 6 }} pb={{ base: "96px", lg: 12 }}>
              {children}
            </Box>
          </Box>
        </Flex>
        <TabLeiste />
      </Box>
    </CrmProvider>
  );
}

function useAktiv() {
  const pfadname = usePathname();
  const { basis } = useCrm();
  return useCallback(
    (p: string) => {
      const ziel = `${basis}${p}`;
      return p === "" ? pfadname === basis || pfadname === `${basis}/` : pfadname === ziel || pfadname.startsWith(`${ziel}/`);
    },
    [pfadname, basis],
  );
}

function Seitenleiste() {
  const { pfad, istAdmin, name } = useCrm();
  const aktiv = useAktiv();
  return (
    <Box
      as="nav"
      aria-label="CRM"
      display={{ base: "none", lg: "flex" }}
      flexDirection="column"
      w="232px"
      flexShrink={0}
      position="sticky"
      top={0}
      h="100vh"
      bg="var(--cc-bg-raised)"
      backdropFilter="blur(18px)"
      borderRight="1px solid var(--cc-line)"
      px={3}
      py={5}
    >
      <Box px={3} mb={7}>
        <Text fontSize="12px" letterSpacing="0.3em" color="var(--cc-text-soft)" textTransform="uppercase">
          Capital Circle
        </Text>
        <Text fontSize="11px" letterSpacing="0.18em" color="var(--cc-gold-light)" textTransform="uppercase" mt={1}>
          Vertrieb · CRM
        </Text>
      </Box>
      <Stack gap={1.5} flex="1">
        {PUNKTE.filter((p) => !p.nurAdmin || istAdmin).map((p) => {
          const an = aktiv(p.pfad);
          return (
            <Flex
              key={p.pfad}
              as={NextLink}
              href={pfad(p.pfad)}
              aria-current={an ? "page" : undefined}
              align="center"
              gap={3}
              h="44px"
              px={3}
              borderRadius="8px"
              border="1px solid"
              borderColor={an ? "var(--cc-gold-line)" : "transparent"}
              bg={an ? "linear-gradient(90deg, rgba(212,176,128,0.16) 0%, rgba(212,176,128,0.03) 100%)" : "transparent"}
              boxShadow={an ? "0 0 18px rgba(212,176,128,0.12)" : "none"}
              color={an ? "var(--cc-gold-light)" : "var(--cc-text-soft)"}
              fontSize="14px"
              fontWeight={an ? 500 : 400}
              transition="background 160ms var(--cc-ease), color 160ms var(--cc-ease)"
              _hover={an ? undefined : { bg: "rgba(255,255,255,0.04)", color: "var(--cc-text)" }}
              _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px" }}
            >
              <p.icon size={18} strokeWidth={1.75} />
              {p.label}
            </Flex>
          );
        })}
      </Stack>
      <Box borderTop="1px solid var(--cc-line)" pt={4} px={2}>
        <Flex align="center" gap={2.5}>
          <Avatar name={name} groesse={32} gold />
          <Box minW={0} flex="1">
            <Text fontSize="13px" fontWeight={500} noOfLines={1}>
              {name || "Team"}
            </Text>
            <Text fontSize="11px" color="var(--cc-text-3)">
              {istAdmin ? "Admin" : "Closer"}
            </Text>
          </Box>
          {istAdmin ? (
            <Box
              as={NextLink}
              href="/admin"
              title="Zum Admin-Bereich"
              aria-label="Zum Admin-Bereich"
              color="var(--cc-text-3)"
              p={1.5}
              borderRadius="6px"
              _hover={{ color: "var(--cc-text)", bg: "rgba(255,255,255,0.05)" }}
            >
              <Shield size={16} strokeWidth={1.75} />
            </Box>
          ) : null}
        </Flex>
      </Box>
    </Box>
  );
}

function Kopfleiste() {
  const [anlegen, setAnlegen] = useState(false);
  const [suche, setSuche] = useState(false);
  return (
    <Box position="sticky" top={0} zIndex={20} bg="var(--cc-bg-raised)" backdropFilter="blur(16px)" borderBottom="1px solid rgba(212,176,128,0.14)">
      <Flex maxW="1440px" mx="auto" h={{ base: "56px", md: "60px" }} px={{ base: 3, md: 6, xl: 8 }} align="center" gap={3}>
        <Text display={{ base: "block", lg: "none" }} fontSize="12px" letterSpacing="0.22em" textTransform="uppercase" color="var(--cc-gold-light)" flexShrink={0}>
          CRM
        </Text>
        <Box flex="1" maxW="520px" display={{ base: "none", md: "block" }}>
          <GlobaleSuche />
        </Box>
        <Box flex="1" display={{ base: "block", md: "none" }} />
        <Button display={{ base: "inline-flex", md: "none" }} size="sm" variant="line" px={0} minW="36px" aria-label="Suchen" onClick={() => setSuche(true)}>
          <Search size={16} strokeWidth={1.75} />
        </Button>
        <Button size="sm" variant="gold" leftIcon={<Plus size={15} strokeWidth={2} />} onClick={() => setAnlegen(true)} flexShrink={0}>
          <Box as="span" display={{ base: "none", sm: "inline" }}>
            Kontakt anlegen
          </Box>
          <Box as="span" display={{ base: "inline", sm: "none" }}>
            Neu
          </Box>
        </Button>
      </Flex>
      <KontaktAnlegenDialog offen={anlegen} onSchliessen={() => setAnlegen(false)} />
      <Modal isOpen={suche} onClose={() => setSuche(false)} size="full" motionPreset="slideInBottom">
        <ModalOverlay {...adminOverlayProps} />
        <ModalContent bg="var(--cc-panel-solid)" color="var(--cc-text)" data-crm>
          <Flex p={3} gap={2} align="center" borderBottom="1px solid var(--cc-line)">
            <Box flex="1">
              <GlobaleSuche autoFokus onGewaehlt={() => setSuche(false)} offenImmer />
            </Box>
            <Button size="sm" variant="ghost" onClick={() => setSuche(false)} aria-label="Suche schließen" px={0} minW="36px">
              <X size={18} />
            </Button>
          </Flex>
        </ModalContent>
      </Modal>
    </Box>
  );
}

/** Mobile Tab-Leiste unten (unterhalb `lg`). */
function TabLeiste() {
  const { pfad } = useCrm();
  const aktiv = useAktiv();
  return (
    <Flex
      as="nav"
      aria-label="CRM"
      display={{ base: "flex", lg: "none" }}
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      zIndex={25}
      bg="rgba(17, 21, 25, 0.94)"
      backdropFilter="blur(18px)"
      borderTop="1px solid rgba(212,176,128,0.16)"
      pb="env(safe-area-inset-bottom)"
    >
      {PUNKTE.filter((p) => !p.nurAdmin).map((p) => {
        const an = aktiv(p.pfad);
        return (
          <Flex
            key={p.pfad}
            as={NextLink}
            href={pfad(p.pfad)}
            aria-current={an ? "page" : undefined}
            flex="1"
            direction="column"
            align="center"
            justify="center"
            gap={1}
            h="60px"
            color={an ? "var(--cc-gold-light)" : "var(--cc-text-3)"}
            fontSize="11px"
            fontWeight={an ? 500 : 400}
            position="relative"
          >
            {an ? <Box position="absolute" top={0} left="28%" right="28%" h="2px" borderRadius="full" bg="var(--cc-gold-bar)" boxShadow="0 0 10px rgba(212,176,128,0.5)" /> : null}
            <p.icon size={20} strokeWidth={1.75} />
            {p.label}
          </Flex>
        );
      })}
    </Flex>
  );
}

/* ─── Globale Suche ────────────────────────────────────────────────────── */

let kontakteZwischenspeicher: { am: number; liste: KontaktZeile[] } | null = null;

function GlobaleSuche({ autoFokus = false, onGewaehlt, offenImmer = false }: { autoFokus?: boolean; onGewaehlt?: () => void; offenImmer?: boolean }) {
  const { pfad } = useCrm();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [offen, setOffen] = useState(false);
  const [liste, setListe] = useState<KontaktZeile[] | null>(kontakteZwischenspeicher?.liste ?? null);
  const [markiert, setMarkiert] = useState(0);
  const feld = useRef<HTMLInputElement>(null);

  const laden = useCallback(async () => {
    if (kontakteZwischenspeicher && Date.now() - kontakteZwischenspeicher.am < 60_000) {
      setListe(kontakteZwischenspeicher.liste);
      return;
    }
    const j = (await fetch("/api/crm/kontakte", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null)) as { ok?: boolean; kontakte?: KontaktZeile[] } | null;
    if (j?.ok && j.kontakte) {
      kontakteZwischenspeicher = { am: Date.now(), liste: j.kontakte };
      setListe(j.kontakte);
    }
  }, []);

  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        feld.current?.focus();
      }
    };
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, []);

  const treffer = useMemo(() => (q.trim() && liste ? liste.filter((k) => passtZurSuche(k, q)).slice(0, 8) : []), [q, liste]);
  const zeigen = (offen || offenImmer) && q.trim().length > 0;

  const oeffne = (k: KontaktZeile) => {
    router.push(pfad(`/kontakte/${k.id}`));
    setQ("");
    setOffen(false);
    onGewaehlt?.();
  };

  return (
    <Box position="relative">
      <InputGroup size="sm">
        <InputLeftElement pointerEvents="none" h="36px" color="var(--cc-text-3)">
          <Search size={15} strokeWidth={1.75} />
        </InputLeftElement>
        <Input
          ref={feld}
          h="36px"
          value={q}
          autoFocus={autoFokus}
          placeholder="Kontakt suchen — Name, E-Mail, Telefon"
          aria-label="Kontakt suchen"
          onFocus={() => {
            setOffen(true);
            void laden();
          }}
          onBlur={() => window.setTimeout(() => setOffen(false), 150)}
          onChange={(e) => {
            setQ(e.target.value);
            setMarkiert(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setMarkiert((m) => Math.min(m + 1, treffer.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setMarkiert((m) => Math.max(m - 1, 0));
            } else if (e.key === "Enter" && treffer[markiert]) {
              oeffne(treffer[markiert]!);
            } else if (e.key === "Escape") {
              setQ("");
              (e.target as HTMLInputElement).blur();
            }
          }}
          {...adminInputProps}
          borderRadius="10px"
          pr="64px"
        />
        <Text position="absolute" right={3} top="50%" transform="translateY(-50%)" fontSize="11px" color="var(--cc-text-3)" display={{ base: "none", md: "block" }} pointerEvents="none">
          Strg K
        </Text>
      </InputGroup>
      {zeigen ? (
        <Box
          position={offenImmer ? "static" : "absolute"}
          top="calc(100% + 6px)"
          left={0}
          right={0}
          mt={offenImmer ? 2 : 0}
          bg="var(--cc-panel-solid)"
          border="1px solid rgba(212,176,128,0.22)"
          borderRadius="12px"
          boxShadow="0 24px 64px rgba(0,0,0,0.55)"
          py={1.5}
          zIndex={40}
          role="listbox"
        >
          {liste === null ? (
            <Text px={3} py={2} fontSize="13px" color="var(--cc-text-3)">
              Lädt …
            </Text>
          ) : treffer.length === 0 ? (
            <Text px={3} py={2} fontSize="13px" color="var(--cc-text-3)">
              Kein Kontakt gefunden.
            </Text>
          ) : (
            treffer.map((k, i) => (
              <Flex
                key={k.id}
                role="option"
                aria-selected={i === markiert}
                onMouseDown={(e) => {
                  e.preventDefault();
                  oeffne(k);
                }}
                onMouseEnter={() => setMarkiert(i)}
                align="center"
                gap={3}
                px={3}
                py={2}
                cursor="pointer"
                bg={i === markiert ? "rgba(255,255,255,0.05)" : "transparent"}
              >
                <Avatar name={k.name ?? k.email} groesse={28} />
                <Box flex="1" minW={0}>
                  <Text fontSize="13px" fontWeight={500} noOfLines={1}>
                    {k.name ?? k.email}
                  </Text>
                  <Text fontSize="12px" color="var(--cc-text-3)" noOfLines={1}>
                    {k.name ? k.email : ""}
                    {k.telefon ? `${k.name ? " · " : ""}${k.telefon}` : ""}
                  </Text>
                </Box>
                <PhasePill phase={k.phase} />
              </Flex>
            ))
          )}
        </Box>
      ) : null}
    </Box>
  );
}

/* ─── Kontakt anlegen ──────────────────────────────────────────────────── */

export function KontaktAnlegenDialog({ offen, onSchliessen }: { offen: boolean; onSchliessen: () => void }) {
  const { pfad } = useCrm();
  const router = useRouter();
  const [w, setW] = useState({ email: "", name: "", telefon: "" });
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const zu = () => {
    setW({ email: "", name: "", telefon: "" });
    setFehler(null);
    onSchliessen();
  };
  return (
    <Modal isOpen={offen} onClose={zu} isCentered>
      <ModalOverlay {...adminOverlayProps} />
      <ModalContent
        {...adminModalProps}
        mx={3}
        as="form"
        data-crm
        onSubmit={async (e: React.FormEvent) => {
          e.preventDefault();
          setLaeuft(true);
          setFehler(null);
          const res = await fetch("/api/crm/kontakte", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(w) });
          const j = (await res.json().catch(() => ({ ok: false }))) as { ok: boolean; id?: string; error?: string };
          setLaeuft(false);
          if (j.ok && j.id) {
            kontakteZwischenspeicher = null;
            zu();
            router.push(pfad(`/kontakte/${j.id}`));
          } else setFehler(fehlerText(j.error));
        }}
      >
        <ModalHeader {...adminModalHeaderProps}>Kontakt anlegen</ModalHeader>
        <ModalBody>
          <Stack gap={3}>
            <Box>
              <Feldlabel>E-Mail</Feldlabel>
              <Input type="email" required autoFocus value={w.email} onChange={(e) => setW({ ...w, email: e.target.value })} {...adminInputProps} />
            </Box>
            <Flex gap={3} direction={{ base: "column", sm: "row" }}>
              <Box flex="1">
                <Feldlabel>Name</Feldlabel>
                <Input value={w.name} onChange={(e) => setW({ ...w, name: e.target.value })} {...adminInputProps} />
              </Box>
              <Box flex="1">
                <Feldlabel>Telefon</Feldlabel>
                <Input type="tel" placeholder="+49 151 …" value={w.telefon} onChange={(e) => setW({ ...w, telefon: e.target.value })} {...adminInputProps} />
              </Box>
            </Flex>
            <Text fontSize="12px" color="var(--cc-text-3)">
              Gibt es die Adresse schon, öffnet sich der bestehende Kontakt. Neu angelegte Kontakte gehören dir.
            </Text>
            {fehler ? (
              <Text fontSize="13px" color="var(--cc-danger)">
                {fehler}
              </Text>
            ) : null}
          </Stack>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="line" size="sm" onClick={zu}>
            Abbrechen
          </Button>
          <Button variant="gold" size="sm" type="submit" isLoading={laeuft}>
            Anlegen
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/** Für Seitenköpfe: Titel links, Aktionen rechts. */
export function SeitenKopf({ titel, unter, rechts }: { titel: ReactNode; unter?: ReactNode; rechts?: ReactNode }) {
  return (
    <Flex align={{ base: "flex-start", md: "flex-end" }} justify="space-between" gap={3} wrap="wrap" mb={{ base: 4, md: 5 }}>
      <Box>
        <Text as="h1" fontSize={{ base: "24px", md: "28px" }} fontWeight={600} lineHeight={1.15} letterSpacing="-0.01em">
          {titel}
        </Text>
        {unter ? (
          <Text fontSize="14px" color="var(--cc-text-2)" mt={1}>
            {unter}
          </Text>
        ) : null}
      </Box>
      {rechts ? (
        <Flex gap={2} align="center" wrap="wrap">
          {rechts}
        </Flex>
      ) : null}
    </Flex>
  );
}
