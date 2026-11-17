"use client";

import { Box, Flex, HStack, Stack, Text, Tooltip } from "@chakra-ui/react";
import { ChevronLeft, ChevronRight, Clock, Hourglass, Trophy, XCircle } from "lucide-react";
import NextLink from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { OFFENE_PHASEN, PHASEN, type Phase } from "@/config/crm";
import { PRODUKTE, type KassenProdukt } from "@/config/mentoring";
import { fehlerText, naechsteAktivitaet, relativ, stauTage } from "@/lib/crm/anzeige";
import { SeitenKopf } from "./CrmRahmen";
import { AktivitaetHinweis, AktualisierenKnopf, FilterLeiste, Hinweis, closerName, euro, useFilter, useGefiltert, useJetzt, useKontakte, type KontaktZeile, type TeamMitglied } from "./gemeinsam";
import { PhaseDialog, brauchtDialog, setzePhase } from "./PhaseDialog";
import { Avatar, Chip, IconKnopf, Laden, useCrm, useMeldung } from "./ui";

const KARTEN_MAX = 150;

/**
 * Pipeline als Kanban nach dem Vorbild Pipedrive: je offene Phase eine Spalte
 * mit Anzahl und Vertragswert, Karten mit Closer, nächster Aktivität (Termin,
 * Wiedervorlage oder „kein Schritt") und Stau-Markierung nach Tagen ohne
 * Aktivität. Beim Ziehen fahren unten Ablagefelder für Verloren, Später und
 * Gewonnen ein (Gewonnen von Hand nur Admins — sonst setzt es der Kauf).
 * Gewonnen/Verloren als Spalten nur auf Wunsch („Abschlüsse", letzte 30 Tage).
 * Auf dem Handy: Spalten wischen, Karte antippen, Phase im Kontakt setzen.
 */
export function CrmPipeline() {
  const { ichId, istAdmin } = useCrm();
  const { daten, fehler, laedt, abgleichen, setDaten } = useKontakte();
  const { filter, setze } = useFilter("pipeline");
  const gefiltert = useGefiltert(daten?.kontakte, filter, ichId, false);
  const [ziehe, setZiehe] = useState<string | null>(null);
  const [ueber, setUeber] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ kontaktId: string; phase: Phase } | null>(null);
  const [abschluesse, setAbschluesse] = useState(false);
  const meldung = useMeldung();
  const jetzt = useJetzt();
  const grenze = jetzt - 30 * 86_400_000;
  const team = daten?.team ?? [];

  const verschiebe = async (kontaktId: string, phase: Phase, extra: Record<string, unknown> = {}) => {
    const alt = daten?.kontakte.find((k) => k.id === kontaktId);
    if (!alt || alt.phase === phase) return;
    setDaten((d) =>
      d ? { ...d, kontakte: d.kontakte.map((k) => (k.id === kontaktId ? { ...k, phase, ...(extra.wiedervorlage_am ? { wiedervorlage_am: String(extra.wiedervorlage_am) } : {}) } : k)) } : d,
    );
    const err = await setzePhase(kontaktId, { phase, ...extra });
    if (err) {
      meldung.fehler(fehlerText(err));
      setDaten((d) => (d ? { ...d, kontakte: d.kontakte.map((k) => (k.id === kontaktId ? alt : k)) } : d));
    } else meldung.ok(`${alt.name ?? alt.email} → ${PHASEN.find((p) => p.id === phase)?.label}`);
  };

  const ablegen = (phase: Phase, id: string) => {
    setZiehe(null);
    setUeber(null);
    if (phase === "gewonnen" && !istAdmin) {
      meldung.fehler(fehlerText("gewonnen_nur_kauf"));
      return;
    }
    if (daten?.kontakte.find((k) => k.id === id)?.phase === phase) return;
    if (brauchtDialog(phase)) setDialog({ kontaktId: id, phase });
    else void verschiebe(id, phase);
  };

  const dringlichkeit = (k: KontaktZeile) => {
    const n = naechsteAktivitaet(k, jetzt);
    return n.art === "keine" ? Infinity : new Date(n.iso).getTime();
  };
  const sichtbar = PHASEN.filter((p) => abschluesse || OFFENE_PHASEN.includes(p.id));
  const spalten = sichtbar.map((p) => {
    const karten = gefiltert
      .filter((k) => k.phase === p.id && (OFFENE_PHASEN.includes(p.id) || new Date(k.updated_at).getTime() >= grenze))
      .sort((a, b) => dringlichkeit(a) - dringlichkeit(b) || b.updated_at.localeCompare(a.updated_at));
    return { ...p, karten, wert: karten.reduce((s, k) => s + (k.wert_cents ?? 0), 0) };
  });
  const offen = gefiltert.filter((k) => OFFENE_PHASEN.includes(k.phase as Phase));
  const offenWert = offen.reduce((s, k) => s + (k.wert_cents ?? 0), 0);
  const gestaut = offen.filter((k) => stauTage(k, jetzt) !== null).length;

  return (
    <Stack gap={4}>
      <SeitenKopf
        titel="Pipeline"
        unter={
          daten
            ? `${offen.length} offen${offenWert ? ` · ${euro(offenWert)} im Gespräch` : ""}${gestaut ? ` · ${gestaut} ohne Bewegung` : ""}`
            : "Lädt …"
        }
        rechts={
          <>
            <Chip aktiv={abschluesse} icon={Trophy} onClick={() => setAbschluesse((a) => !a)}>
              Abschlüsse (30 T.)
            </Chip>
            <AktualisierenKnopf laedt={laedt} onClick={() => void abgleichen()} />
          </>
        }
      />
      <FilterLeiste filter={filter} setze={setze} team={team} ohnePhase />
      {fehler ? <Hinweis meldung={{ art: "fehler", text: fehler }} /> : null}
      <Text fontSize="12px" color="var(--cc-text-3)" display={{ base: "block", md: "none" }}>
        Spalten wischen. Zum Verschieben eine Karte antippen und die Phase im Kontakt setzen.
      </Text>

      {!daten ? (
        <Flex gap={3} overflow="hidden">
          {[0, 1, 2, 3].map((i) => (
            <Box key={i} w="272px" flexShrink={0}>
              <Laden zeilen={3} hoehe="92px" />
            </Box>
          ))}
        </Flex>
      ) : (
        <Brett
          spalten={spalten}
          team={team}
          jetzt={jetzt}
          ziehe={ziehe}
          ueber={ueber}
          setZiehe={setZiehe}
          setUeber={setUeber}
          ablegen={ablegen}
        />
      )}

      {ziehe ? <Ablage istAdmin={istAdmin} ueber={ueber} setUeber={setUeber} ablegen={(p) => ablegen(p, ziehe)} /> : null}

      <PhaseDialog
        offen={Boolean(dialog)}
        phase={dialog?.phase ?? null}
        onAbbrechen={() => setDialog(null)}
        onBestaetigen={async (body) => {
          if (dialog) await verschiebe(dialog.kontaktId, dialog.phase, body);
          setDialog(null);
        }}
      />
    </Stack>
  );
}

type Spalte = (typeof PHASEN)[number] & { karten: KontaktZeile[]; wert: number };

function Brett({
  spalten,
  team,
  jetzt,
  ziehe,
  ueber,
  setZiehe,
  setUeber,
  ablegen,
}: {
  spalten: Spalte[];
  team: TeamMitglied[];
  jetzt: number;
  ziehe: string | null;
  ueber: string | null;
  setZiehe: (id: string | null) => void;
  setUeber: (id: string | null) => void;
  ablegen: (phase: Phase, id: string) => void;
}) {
  const lauf = useRef<HTMLDivElement>(null);
  const [kanten, setKanten] = useState({ links: false, rechts: false });
  const messen = useCallback(() => {
    const el = lauf.current;
    if (!el) return;
    setKanten({ links: el.scrollLeft > 4, rechts: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    messen();
    window.addEventListener("resize", messen);
    return () => window.removeEventListener("resize", messen);
  }, [messen, spalten.length]);

  return (
    <Box position="relative">
      <HStack position="absolute" top="-46px" right={0} gap={1.5} display={{ base: "none", md: kanten.links || kanten.rechts ? "flex" : "none" }}>
        <IconKnopf icon={ChevronLeft} label="Nach links" onClick={() => lauf.current?.scrollBy({ left: -560 })} />
        <IconKnopf icon={ChevronRight} label="Nach rechts" onClick={() => lauf.current?.scrollBy({ left: 560 })} />
      </HStack>
      <Flex
        ref={lauf}
        className="crm-lauf"
        data-links={kanten.links ? "1" : "0"}
        data-rechts={kanten.rechts ? "1" : "0"}
        onScroll={messen}
        gap={3}
        overflowX="auto"
        pb={3}
        align="flex-start"
        sx={{ scrollSnapType: { base: "x mandatory", md: "none" } }}
        onDragOver={(e) => {
          // Beim Ziehen an den Rand läuft das Brett mit.
          const el = lauf.current;
          if (!el) return;
          const r = el.getBoundingClientRect();
          if (e.clientX < r.left + 80) el.scrollLeft -= 18;
          else if (e.clientX > r.right - 80) el.scrollLeft += 18;
        }}
      >
        {spalten.map((s) => {
          const drauf = ueber === s.id && ziehe !== null;
          const abschluss = s.id === "gewonnen" || s.id === "verloren";
          return (
            <Flex
              key={s.id}
              direction="column"
              w={{ base: "82vw", sm: "272px" }}
              maxW="300px"
              flexShrink={0}
              sx={{ scrollSnapAlign: "start" }}
              onDragOver={(e) => {
                e.preventDefault();
                if (ueber !== s.id) setUeber(s.id);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = ziehe ?? e.dataTransfer.getData("text/plain");
                if (id) ablegen(s.id, id);
              }}
            >
              <Box px={1} pb={2.5} mb={2} borderBottom="2px solid" borderColor={s.id === "angebot" ? "rgba(212,176,128,0.55)" : s.id === "gewonnen" ? "rgba(74,222,128,0.45)" : "var(--cc-line-strong)"}>
                <Flex align="center" gap={2}>
                  <Text fontSize="13px" fontWeight={600} noOfLines={1}>
                    {s.label}
                  </Text>
                  <Box className="cc-num" px="7px" h="18px" lineHeight="18px" borderRadius="full" bg="rgba(255,255,255,0.07)" fontSize="11px" color="var(--cc-text-2)">
                    {s.karten.length}
                  </Box>
                  {s.wert ? (
                    <Text className="cc-num" ml="auto" fontSize="12px" color="var(--cc-text-2)">
                      {euro(s.wert)}
                    </Text>
                  ) : null}
                </Flex>
                <Text fontSize="11px" color="var(--cc-text-3)" noOfLines={1}>
                  {abschluss ? `${s.text} · letzte 30 Tage` : s.text}
                </Text>
              </Box>
              <Stack
                gap={2}
                p={1.5}
                minH="120px"
                maxH={{ base: "62vh", md: "calc(100vh - 320px)" }}
                overflowY="auto"
                borderRadius="12px"
                border="1px dashed"
                borderColor={drauf ? "var(--cc-gold-line)" : "transparent"}
                bg={drauf ? "var(--cc-gold-wash)" : "rgba(255,255,255,0.015)"}
                transition="background 160ms var(--cc-ease), border-color 160ms var(--cc-ease)"
              >
                {s.karten.slice(0, KARTEN_MAX).map((k) => (
                  <Karte
                    key={k.id}
                    k={k}
                    team={team}
                    jetzt={jetzt}
                    zieht={ziehe === k.id}
                    onZiehen={() => setZiehe(k.id)}
                    onEnde={() => {
                      setZiehe(null);
                      setUeber(null);
                    }}
                  />
                ))}
                {s.karten.length === 0 ? (
                  <Text fontSize="12px" color="var(--cc-text-3)" textAlign="center" py={6}>
                    {ziehe ? "Hier ablegen" : "Keine Kontakte"}
                  </Text>
                ) : null}
                {s.karten.length > KARTEN_MAX ? (
                  <Text fontSize="11px" color="var(--cc-text-3)" textAlign="center" py={2}>
                    + {s.karten.length - KARTEN_MAX} weitere — Filter enger stellen
                  </Text>
                ) : null}
              </Stack>
            </Flex>
          );
        })}
      </Flex>
    </Box>
  );
}

function Karte({
  k,
  team,
  jetzt,
  zieht,
  onZiehen,
  onEnde,
}: {
  k: KontaktZeile;
  team: TeamMitglied[];
  jetzt: number;
  zieht: boolean;
  onZiehen: () => void;
  onEnde: () => void;
}) {
  const { pfad } = useCrm();
  const n = naechsteAktivitaet(k, jetzt);
  const stau = stauTage(k, jetzt);
  const closer = closerName(team, k.closer_id);
  const produkt = k.produkt ? PRODUKTE[k.produkt as KassenProdukt]?.name : null;
  return (
    <Box
      as={NextLink}
      href={pfad(`/kontakte/${k.id}`)}
      className="crm-karte"
      data-zieht={zieht ? "1" : "0"}
      draggable
      onDragStart={(e: React.DragEvent) => {
        e.dataTransfer.setData("text/plain", k.id);
        e.dataTransfer.effectAllowed = "move";
        onZiehen();
      }}
      onDragEnd={onEnde}
      display="block"
      p={3}
      borderRadius="10px"
      border="1px solid"
      borderColor={stau !== null ? "rgba(248,113,113,0.35)" : "var(--cc-line)"}
      bg="linear-gradient(180deg, rgba(34,39,46,0.9) 0%, rgba(28,32,38,0.9) 100%)"
      cursor="grab"
      _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px" }}
    >
      <Flex align="flex-start" gap={2}>
        <Text fontSize="14px" fontWeight={500} lineHeight="20px" noOfLines={1} flex="1">
          {k.name ?? k.email}
        </Text>
        {stau !== null ? (
          <Tooltip label={`${stau} ${stau === 1 ? "Tag" : "Tage"} ohne Aktivität und nichts geplant`} hasArrow openDelay={250} bg="var(--cc-surface-2)" color="var(--cc-text)" fontSize="12px">
            <Flex align="center" gap={1} px={1.5} h="18px" borderRadius="full" bg="rgba(248,113,113,0.12)" color="var(--cc-danger)" fontSize="11px" fontWeight={500} className="cc-num" flexShrink={0}>
              <Hourglass size={10} strokeWidth={2} />
              {stau} T.
            </Flex>
          </Tooltip>
        ) : null}
      </Flex>
      {k.wert_cents || produkt ? (
        <Text fontSize="12px" color="var(--cc-text-2)" mt={0.5} noOfLines={1}>
          {k.wert_cents ? (
            <Text as="span" className="cc-num" color="var(--cc-text-soft)" fontWeight={500}>
              {euro(k.wert_cents)}
            </Text>
          ) : null}
          {k.wert_cents && produkt ? " · " : ""}
          {produkt}
        </Text>
      ) : (
        <Text fontSize="12px" color="var(--cc-text-3)" mt={0.5} noOfLines={1}>
          {k.letzte_aktivitaet_am ? `zuletzt ${relativ(k.letzte_aktivitaet_am, jetzt)}` : `neu ${relativ(k.created_at, jetzt)}`}
        </Text>
      )}
      <Flex align="center" gap={2} mt={2.5} pt={2.5} borderTop="1px solid var(--cc-line)">
        <Avatar name={k.closer_id ? closer : null} groesse={20} title={k.closer_id ? closer : "Pool"} />
        <Text fontSize="12px" color="var(--cc-text-3)" noOfLines={1} flex="1">
          {k.closer_id ? closer : "Pool"}
        </Text>
        <AktivitaetHinweis n={n} jetzt={jetzt} />
      </Flex>
    </Box>
  );
}

/** Ablagefelder unten beim Ziehen — wie die Won/Lost-Leiste in Pipedrive. */
function Ablage({
  istAdmin,
  ueber,
  setUeber,
  ablegen,
}: {
  istAdmin: boolean;
  ueber: string | null;
  setUeber: (id: string | null) => void;
  ablegen: (p: Phase) => void;
}) {
  const felder: { phase: Phase; label: string; text: string; icon: typeof Trophy; ton: "danger" | "neutral" | "success"; aus?: boolean }[] = [
    { phase: "verloren", label: "Verloren", text: "mit Grund", icon: XCircle, ton: "danger" },
    { phase: "spaeter", label: "Später", text: "mit Wiedervorlage", icon: Clock, ton: "neutral" },
    { phase: "gewonnen", label: "Gewonnen", text: istAdmin ? "nur Admins" : "setzt der Kauf", icon: Trophy, ton: "success", aus: !istAdmin },
  ];
  const farbe = { danger: "248,113,113", neutral: "255,255,255", success: "74,222,128" } as const;
  return (
    <Flex
      className="crm-ablage"
      position="fixed"
      bottom={{ base: "76px", lg: 6 }}
      left={{ base: 3, lg: "calc(232px + 24px)" }}
      right={{ base: 3, lg: 6 }}
      zIndex={30}
      justify="center"
      gap={3}
      pointerEvents="none"
    >
      {felder.map((f) => {
        const drauf = ueber === `ablage-${f.phase}` && !f.aus;
        return (
          <Flex
            key={f.phase}
            pointerEvents="auto"
            onDragOver={(e) => {
              if (f.aus) return;
              e.preventDefault();
              if (ueber !== `ablage-${f.phase}`) setUeber(`ablage-${f.phase}`);
            }}
            onDragLeave={() => setUeber(null)}
            onDrop={(e) => {
              e.preventDefault();
              if (!f.aus) ablegen(f.phase);
            }}
            align="center"
            gap={3}
            w={{ base: "33%", md: "220px" }}
            h="64px"
            px={4}
            borderRadius="12px"
            border="1px dashed"
            borderColor={`rgba(${farbe[f.ton]}, ${drauf ? 0.8 : 0.35})`}
            bg={`rgba(21, 26, 30, 0.96)`}
            backgroundImage={`linear-gradient(rgba(${farbe[f.ton]}, ${drauf ? 0.14 : 0.05}), rgba(${farbe[f.ton]}, ${drauf ? 0.14 : 0.05}))`}
            boxShadow="0 18px 40px rgba(0,0,0,0.5)"
            color={f.aus ? "var(--cc-text-3)" : f.ton === "danger" ? "var(--cc-danger)" : f.ton === "success" ? "var(--cc-success)" : "var(--cc-text)"}
            opacity={f.aus ? 0.55 : 1}
            transform={drauf ? "scale(1.03)" : "none"}
            transition="transform 140ms var(--cc-ease), background 140ms var(--cc-ease)"
          >
            <f.icon size={20} strokeWidth={1.75} />
            <Box display={{ base: "none", sm: "block" }}>
              <Text fontSize="14px" fontWeight={600}>
                {f.label}
              </Text>
              <Text fontSize="11px" color="var(--cc-text-3)">
                {f.text}
              </Text>
            </Box>
          </Flex>
        );
      })}
    </Flex>
  );
}
