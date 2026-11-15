"use client";

import { Box, Button, Flex, Grid, HStack, Input, Menu, MenuButton, MenuItem, MenuList, Stack, Switch, Text, Textarea, Tooltip } from "@chakra-ui/react";
import {
  ArrowRightLeft,
  BellRing,
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Cog,
  Copy,
  Link2,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  ShoppingBag,
  StickyNote,
  UserCog,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import NextLink from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { StatusPill, adminInputProps, adminSwitchSx } from "@/components/admin/adminUi";
import { ANRUF_ERGEBNISSE, CALL_GRUENDE, CALL_OUTCOMES, CALL_PRODUKTE, QUELLEN, VERLUSTGRUENDE, type Phase, type Quelle } from "@/config/crm";
import { PRODUKTE, erlaubteRaten, ratenText, type KassenProdukt } from "@/config/mentoring";
import { AKTIVITAET_LABEL, PFAD, TERMIN_STATUS, fehlerText, naechsterSchritt, pfadStelle, relativ, wann, wiedervorlageVorschlaege, type Schritt } from "@/lib/crm/anzeige";
import type { KontaktDetail } from "@/lib/crm/daten";
import { GRUND_LABEL, VORLAGEN, type VorlageId } from "@/lib/mailsystem/vorlagen";
import { BestaetigenDialog, CloserDialog, TextDialog } from "./Dialoge";
import { ErgebnisDialog, type ErgebnisWerte } from "./ErgebnisDialog";
import { Hinweis, PhasePill, closerName, datum, euro, useJetzt, useNeuLadenBeiRueckkehr, whatsappLink } from "./gemeinsam";
import { PhaseDialog, brauchtDialog, setzePhase, zuLokal } from "./PhaseDialog";
import { Abschnitt, Avatar, Chip, Feldlabel, IconKnopf, Laden, dunklesFeld, menuItemProps, menuListProps, useCrm, useMeldung } from "./ui";

type Termin = KontaktDetail["termine"][number];
type Reiter = "anruf" | "notiz" | "wiedervorlage";

/**
 * Ein Kontakt — aufgebaut wie ein Datensatz in HubSpot bzw. Salesforce:
 *   Kopf: Avatar, Name, Kontaktwege, Aktionsleiste (Anrufen, WhatsApp, E-Mail,
 *   Notiz, Wiedervorlage, Kassenlink) und darunter der Phasen-Pfad (klickbar).
 *   Mitte: **ein** nächster Schritt (`naechsterSchritt`), der Composer (Anruf,
 *   Notiz, Wiedervorlage) und der Zeitstrahl — anstehend oben, danach nach Monat,
 *   Mails eingemischt, filterbar.
 *   Links „Über den Kontakt" (inline bearbeitbar), rechts Termine, Kassenlink,
 *   Käufe, Antworten, Training.
 * Alle Rückfragen sind Dialoge, Rückmeldungen Toasts.
 */
export function CrmKontakt({ id }: { id: string }) {
  const { istAdmin, pfad } = useCrm();
  const [d, setD] = useState<KontaktDetail | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [phaseDialog, setPhaseDialog] = useState<Phase | null>(null);
  const [maske, setMaske] = useState<{ terminId: string; modus: "gefuehrt" | "ergebnis" } | null>(null);
  const [closerOffen, setCloserOffen] = useState(false);
  const [pauseOffen, setPauseOffen] = useState(false);
  const [frage, setFrage] = useState<{ titel: string; text: string; knopf: string; los: () => Promise<void> } | null>(null);
  const [kassenProdukt, setKassenProdukt] = useState<KassenProdukt | null>(null);
  const [reiter, setReiter] = useState<Reiter>("anruf");
  const composerRef = useRef<HTMLDivElement>(null);
  const kasseRef = useRef<HTMLDivElement>(null);
  const meldung = useMeldung();
  const jetzt = useJetzt();

  const laden = useCallback(async () => {
    const res = await fetch(`/api/crm/kontakte/${id}`, { cache: "no-store" });
    const json = (await res.json().catch(() => ({ ok: false }))) as KontaktDetail & { ok: boolean; error?: string };
    if (!json.ok) setFehler(fehlerText(json.error));
    else {
      setD(json);
      setFehler(null);
    }
  }, [id]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Kontakt einmal laden
    void laden();
  }, [laden]);
  useNeuLadenBeiRueckkehr(laden);

  const aktion = async (body: Record<string, unknown>, ok?: string) => {
    const res = await fetch(`/api/crm/kontakte/${id}/aktion`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; url?: string };
    if (!json.ok) meldung.fehler(fehlerText(json.error ?? String(res.status)));
    else if (ok) meldung.ok(ok);
    await laden();
    return json;
  };
  const patch = async (body: Record<string, unknown>, ok?: string) => {
    const err = await setzePhase(id, body);
    if (err) meldung.fehler(fehlerText(err));
    else if (ok) meldung.ok(ok);
    await laden();
    return !err;
  };

  const zuComposer = (r: Reiter) => {
    setReiter(r);
    window.setTimeout(() => composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };
  const zuKasse = () => kasseRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  if (fehler && !d) return <Hinweis meldung={{ art: "fehler", text: fehler }} />;
  if (!d) {
    return (
      <Stack gap={4}>
        <Laden zeilen={1} hoehe="150px" />
        <Grid templateColumns={{ base: "1fr", xl: "290px 1fr 340px" }} gap={5}>
          <Laden zeilen={3} hoehe="120px" />
          <Laden zeilen={2} hoehe="200px" />
          <Laden zeilen={3} hoehe="120px" />
        </Grid>
      </Stack>
    );
  }

  const k = d.kontakt;
  const anzeigeName = k.name ?? k.email;
  const vorname = k.name?.split(/\s+/)[0] ?? "";
  const wa = whatsappLink(k.telefon, `Hi ${vorname}, hier ist das Capital-Circle-Team.`);
  const tel = k.telefon ? `tel:${k.telefon.replace(/[^\d+]/g, "")}` : null;
  const schritt = naechsterSchritt(
    {
      phase: k.phase,
      wiedervorlage_am: k.wiedervorlage_am,
      telefon: k.telefon,
      termine: d.termine.map((t) => ({ id: t.id, start_am: t.start_am, status: t.status, join_url: t.join_url, hatErgebnis: Boolean(t.ergebnis) })),
    },
    jetzt,
  );

  const phaseWaehlen = (p: Phase) => {
    if (p === k.phase) return;
    if (p === "gewonnen" && !istAdmin) {
      meldung.fehler(fehlerText("gewonnen_nur_kauf"));
      return;
    }
    if (brauchtDialog(p)) setPhaseDialog(p);
    else void patch({ phase: p }, "Phase gespeichert.");
  };

  const noShow = (t: Termin) =>
    setFrage({
      titel: "No-Show bestätigen",
      text: `${anzeigeName} ist nicht erschienen? Vorher anrufen. Nach 24 Stunden geht die No-Show-Mail (N01) raus.`,
      knopf: "No-Show bestätigen",
      los: async () => {
        await aktion({ art: "termin", terminId: t.id, aktion: "no_show" }, "No-Show festgehalten.");
      },
    });
  const absagen = (t: Termin, a: "abgesagt_kunde" | "kein_interesse" | "abgesagt_team") =>
    setFrage({
      titel: a === "abgesagt_team" ? "Wir sagen ab" : a === "kein_interesse" ? "Kein Interesse" : "Kunde sagt ab",
      text: `Termin ${wann(t.start_am, jetzt)} absagen? Die Bestätigung an ${k.email} geht sofort raus.${a === "kein_interesse" ? " Der Kontakt wird auf „Verloren“ gesetzt." : ""}`,
      knopf: "Absage festhalten",
      los: async () => {
        await aktion({ art: "termin", terminId: t.id, aktion: a }, "Absage festgehalten.");
      },
    });

  return (
    <Stack gap={{ base: 4, md: 5 }}>
      <Flex align="center" gap={1.5} fontSize="13px" color="var(--cc-text-3)">
        <Text as={NextLink} href={pfad("/kontakte")} _hover={{ color: "var(--cc-text)" }}>
          Kontakte
        </Text>
        <ChevronRight size={13} />
        <Text color="var(--cc-text-2)" noOfLines={1}>
          {anzeigeName}
        </Text>
      </Flex>

      {/* ── Kopf ─────────────────────────────────────────────── */}
      <Box className="cc-card cc-card--still" p={{ base: 4, md: 6 }}>
        <Flex gap={{ base: 4, md: 5 }} direction={{ base: "column", lg: "row" }} align={{ base: "stretch", lg: "center" }}>
          <Flex gap={4} align="center" flex="1" minW={0}>
            <Avatar name={anzeigeName} groesse={60} gold />
            <Box minW={0}>
              <Flex align="center" gap={2.5} wrap="wrap">
                <Text as="h1" fontSize={{ base: "22px", md: "26px" }} fontWeight={600} lineHeight={1.2} letterSpacing="-0.01em">
                  {anzeigeName}
                </Text>
                <PhasePill phase={k.phase} />
                {d.pause ? <StatusPill tone="attention">Kontaktpause</StatusPill> : null}
              </Flex>
              <Flex gap={{ base: 2, md: 4 }} mt={1.5} fontSize="13px" color="var(--cc-text-2)" wrap="wrap" align="center">
                <Kontaktweg icon={Mail} text={k.email} />
                {k.telefon ? <Kontaktweg icon={Phone} text={k.telefon} /> : <Text color="var(--cc-text-3)">Keine Telefonnummer</Text>}
              </Flex>
            </Box>
          </Flex>
          <HStack gap={{ base: 1, md: 2 }} justify={{ base: "space-between", sm: "flex-start" }} flexShrink={0}>
            <Aktion icon={Phone} label="Anrufen" href={tel} gold onClick={() => window.setTimeout(() => zuComposer("anruf"), 400)} />
            <Aktion icon={MessageCircle} label="WhatsApp" href={wa} extern onClick={() => void aktion({ art: "whatsapp", text: "WhatsApp geöffnet" })} />
            <Aktion icon={Mail} label="E-Mail" href={`mailto:${k.email}`} nurAbSm />
            <Aktion icon={StickyNote} label="Notiz" onClick={() => zuComposer("notiz")} />
            <Aktion icon={BellRing} label="Wiedervorlage" onClick={() => zuComposer("wiedervorlage")} />
            <Aktion icon={Link2} label="Kassenlink" onClick={zuKasse} />
          </HStack>
        </Flex>
        <Box mt={{ base: 4, md: 5 }} pt={{ base: 4, md: 5 }} borderTop="1px solid var(--cc-line)">
          <Pfad phase={k.phase} istAdmin={istAdmin} onWahl={phaseWaehlen} />
        </Box>
      </Box>

      <Grid
        templateColumns={{ base: "minmax(0, 1fr)", lg: "minmax(0, 1fr) 340px", xl: "290px minmax(0, 1fr) 340px" }}
        templateAreas={{ base: `"mitte" "ueber" "rechts"`, lg: `"mitte ueber" "mitte rechts"`, xl: `"ueber mitte rechts"` }}
        gap={{ base: 4, md: 5 }}
        alignItems="start"
      >
        {/* ── Über den Kontakt ─────────────────────────────── */}
        <Stack gridArea="ueber" gap={{ base: 4, md: 5 }}>
          <Abschnitt titel="Über den Kontakt">
            <Stack gap={0}>
              <Eigenschaft label="Name">
                <InlineFeld key={`n-${k.name ?? ""}`} wert={k.name ?? ""} platzhalter="Name ergänzen" onSpeichern={(v) => patch({ name: v, telefon: k.telefon ?? "" }, "Name gespeichert.")} />
              </Eigenschaft>
              <Eigenschaft label="Telefon">
                <InlineFeld key={`t-${k.telefon ?? ""}`} wert={k.telefon ?? ""} platzhalter="Nummer ergänzen" typ="tel" onSpeichern={(v) => patch({ name: k.name ?? "", telefon: v }, "Telefon gespeichert.")} />
              </Eigenschaft>
              <Eigenschaft label="Closer">
                <Flex as="button" type="button" onClick={() => setCloserOffen(true)} align="center" gap={2} _hover={{ color: "var(--cc-gold-light)" }} title="Closer wechseln">
                  <Avatar name={k.closer_id ? closerName(d.team, k.closer_id) : null} groesse={22} />
                  <Text fontSize="13px">{closerName(d.team, k.closer_id)}</Text>
                  <ArrowRightLeft size={12} color="var(--cc-text-3)" />
                </Flex>
              </Eigenschaft>
              <Eigenschaft label="Wiedervorlage">
                {k.wiedervorlage_am ? (
                  <Text as="button" type="button" onClick={() => zuComposer("wiedervorlage")} fontSize="13px" color={new Date(k.wiedervorlage_am).getTime() <= jetzt ? "var(--cc-danger)" : "var(--cc-text)"}>
                    {wann(k.wiedervorlage_am, jetzt)}
                  </Text>
                ) : (
                  <Text as="button" type="button" onClick={() => zuComposer("wiedervorlage")} fontSize="13px" color="var(--cc-text-3)" _hover={{ color: "var(--cc-gold-light)" }}>
                    Keine — setzen
                  </Text>
                )}
              </Eigenschaft>
              <Eigenschaft label="Quelle">
                <Text fontSize="13px">{k.quellen.map((q) => QUELLEN[q as Quelle] ?? q).join(", ")}</Text>
              </Eigenschaft>
              {k.kanal ? (
                <Eigenschaft label="Kanal">
                  <Text fontSize="13px" textTransform="capitalize">
                    {k.kanal}
                  </Text>
                </Eigenschaft>
              ) : null}
              <Eigenschaft label="Angelegt">
                <Text fontSize="13px" title={datum(k.created_at)}>
                  {datum(k.created_at, false)}
                </Text>
              </Eigenschaft>
              <Eigenschaft label="Zuletzt aktiv">
                <Text fontSize="13px">{relativ(k.letzte_aktivitaet_am, jetzt)}</Text>
              </Eigenschaft>
              {k.phase === "verloren" && k.verlust_grund ? (
                <Eigenschaft label="Verlustgrund">
                  <Text fontSize="13px">
                    {VERLUSTGRUENDE.find((g) => g.id === k.verlust_grund)?.label}
                    {k.verlust_notiz ? ` — ${k.verlust_notiz}` : ""}
                  </Text>
                </Eigenschaft>
              ) : null}
            </Stack>
            <Flex mt={4} pt={4} borderTop="1px solid var(--cc-line)" align="center" gap={3}>
              <Box flex="1">
                <Text fontSize="13px" fontWeight={500}>
                  Kontaktpause
                </Text>
                <Text fontSize="12px" color="var(--cc-text-3)">
                  Stoppt automatische Lern- und Verkaufsmails.
                </Text>
              </Box>
              <Switch isChecked={d.pause} onChange={() => setPauseOffen(true)} sx={adminSwitchSx} aria-label="Kontaktpause" />
            </Flex>
          </Abschnitt>

          {d.training ? (
            <Abschnitt titel="Free Training">
              <Stack gap={0}>
                <Eigenschaft label="Bewerbung">
                  <Text fontSize="13px">{d.training.bewerbungStatus ?? "—"}</Text>
                </Eigenschaft>
                <Eigenschaft label="Gestartet">
                  <Text fontSize="13px">{datum(d.training.gestartetAm, false)}</Text>
                </Eigenschaft>
                <Eigenschaft label="Zugang bis">
                  <Text fontSize="13px">{datum(d.training.endeAm, false)}</Text>
                </Eigenschaft>
              </Stack>
            </Abschnitt>
          ) : null}
        </Stack>

        {/* ── Mitte: nächster Schritt, Composer, Zeitstrahl ── */}
        <Stack gridArea="mitte" gap={{ base: 4, md: 5 }} minW={0}>
          <NaechsterSchritt
            schritt={schritt}
            tel={tel}
            wa={wa}
            onGefuehrt={(tid) => setMaske({ terminId: tid, modus: "gefuehrt" })}
            onErgebnis={(tid) => setMaske({ terminId: tid, modus: "ergebnis" })}
            onNoShow={(tid) => noShow(d.termine.find((t) => t.id === tid)!)}
            onFesthalten={() => zuComposer("anruf")}
          />

          <div ref={composerRef}>
            <Composer
              key={`c-${k.wiedervorlage_am ?? ""}`}
              reiter={reiter}
              setReiter={setReiter}
              wiedervorlage={k.wiedervorlage_am}
              jetzt={jetzt}
              onAnruf={(b) => aktion({ art: "anruf", ...b }, "Anruf festgehalten.")}
              onNotiz={(t) => aktion({ art: "notiz", text: t }, "Notiz gespeichert.")}
              onWiedervorlage={(iso) => patch({ wiedervorlage_am: iso }, iso ? `Wiedervorlage ${wann(iso, Date.now())}.` : "Wiedervorlage entfernt.")}
            />
          </div>

          <Zeitstrahl d={d} jetzt={jetzt} />
        </Stack>

        {/* ── Rechts: Termine, Kassenlink, Käufe, Antworten ─ */}
        <Stack gridArea="rechts" gap={{ base: 4, md: 5 }}>
          <Abschnitt titel="Termine" zahl={d.termine.length}>
            {d.termine.length === 0 ? (
              <Text fontSize="13px" color="var(--cc-text-3)">
                Kein Termin gebucht.
              </Text>
            ) : (
              <Stack gap={2.5}>
                {d.termine.map((t) => (
                  <TerminKarte
                    key={t.id}
                    t={t}
                    jetzt={jetzt}
                    onGefuehrt={() => setMaske({ terminId: t.id, modus: "gefuehrt" })}
                    onErgebnis={() => setMaske({ terminId: t.id, modus: "ergebnis" })}
                    onNoShow={() => noShow(t)}
                    onAbsagen={(a) => absagen(t, a)}
                    onZuruecknehmen={() => void aktion({ art: "termin", terminId: t.id, aktion: "gebucht" }, "No-Show zurückgenommen.")}
                  />
                ))}
              </Stack>
            )}
          </Abschnitt>

          <div ref={kasseRef}>
            <KassenlinkKarte
              key={`kl-${kassenProdukt ?? "x"}`}
              start={kassenProdukt}
              vorname={vorname}
              telefon={k.telefon}
              onAnlegen={(b) => aktion({ art: "kassenlink", ...b }, "Kassenlink angelegt — jetzt schicken.")}
              links={d.kassenlinks}
            />
          </div>

          {d.kaeufe.length ? (
            <Abschnitt titel="Käufe" zahl={d.kaeufe.length}>
              <Stack gap={2}>
                {d.kaeufe.map((x) => (
                  <Flex key={x.id} align="center" gap={3} p={3} borderRadius="10px" bg="rgba(74,222,128,0.05)" border="1px solid rgba(74,222,128,0.2)">
                    <ShoppingBag size={16} color="var(--cc-success)" />
                    <Box flex="1" minW={0}>
                      <Text fontSize="13px" fontWeight={500}>
                        {PRODUKTE[x.produkt as KassenProdukt]?.name ?? x.produkt}
                      </Text>
                      <Text fontSize="12px" color="var(--cc-text-3)">
                        {x.zahlweise === "raten" ? `${x.raten_gesamt ?? "?"} Raten` : "Einmalzahlung"} · {x.status} · {datum(x.gekauft_am, false)}
                      </Text>
                    </Box>
                    <Text className="cc-num" fontSize="14px" fontWeight={600}>
                      {euro(x.soll_cents)}
                    </Text>
                  </Flex>
                ))}
              </Stack>
            </Abschnitt>
          ) : null}

          <Abschnitt titel="Antworten">
            {d.antworten.length === 0 ? (
              <Text fontSize="13px" color="var(--cc-text-3)">
                Keine Formularantworten.
              </Text>
            ) : (
              <Stack gap={5}>
                {d.antworten.map((a, i) => (
                  <Box key={i}>
                    <Text fontSize="11px" letterSpacing="0.06em" textTransform="uppercase" color="var(--cc-gold-light)" mb={2.5}>
                      {a.quelle === "icp" ? "Onboarding-Fragen (ICP)" : (QUELLEN[a.quelle as Quelle] ?? a.quelle)} · {datum(a.am, false)}
                    </Text>
                    <Stack gap={3}>
                      {a.eintraege.map((e) => (
                        <Box key={e.frage}>
                          <Text fontSize="12px" color="var(--cc-text-3)">
                            {e.frage}
                          </Text>
                          <Text fontSize="13px" whiteSpace="pre-wrap" color="var(--cc-text)">
                            {e.antwort}
                          </Text>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Abschnitt>
        </Stack>
      </Grid>

      {maske ? (
        <ErgebnisDialog
          key={`${maske.terminId}:${maske.modus}`}
          offen
          titel={maske.modus === "gefuehrt" ? "Gespräch geführt — Ergebnis" : "Ergebnis des Gesprächs"}
          vorher={d.termine.find((t) => t.id === maske.terminId)?.ergebnis ?? null}
          // „Nicht erschienen" nur aus einem gebuchten Termin — ein No-Show ist schon einer.
          mitNoShow={maske.modus === "gefuehrt" && d.termine.find((t) => t.id === maske.terminId)?.status === "gebucht"}
          onAbbrechen={() => setMaske(null)}
          onSpeichern={async (w: ErgebnisWerte) => {
            const json = await aktion(
              maske.modus === "gefuehrt"
                ? { art: "termin", terminId: maske.terminId, aktion: "gefuehrt", ergebnis: w }
                : { art: "ergebnis", terminId: maske.terminId, ergebnis: w },
              w.outcome === "won_payment_pending" ? "Ergebnis gespeichert. Kassenlink ist vorbereitet — anlegen und schicken." : "Ergebnis gespeichert.",
            );
            if (!json.ok) return json.error ?? "fehler";
            setMaske(null);
            // Zusage: Kassenlink mit dem besprochenen Produkt vorbereiten.
            if (w.outcome === "won_payment_pending" && (w.produkt === "main" || w.produkt === "premium" || w.produkt === "ausbildung")) {
              setKassenProdukt(w.produkt);
              window.setTimeout(zuKasse, 200);
            }
            return null;
          }}
        />
      ) : null}

      <PhaseDialog
        offen={Boolean(phaseDialog)}
        phase={phaseDialog}
        onAbbrechen={() => setPhaseDialog(null)}
        onBestaetigen={async (body) => {
          await patch(body, "Phase gespeichert.");
          setPhaseDialog(null);
        }}
      />

      <CloserDialog
        offen={closerOffen}
        team={d.team}
        aktuell={k.closer_id}
        onAbbrechen={() => setCloserOffen(false)}
        onBestaetigen={async (closerId, grund) => {
          const ok = await patch({ closer_id: closerId, zuweisung_grund: grund }, `Jetzt bei ${closerName(d.team, closerId)}.`);
          if (ok) setCloserOffen(false);
        }}
      />

      <TextDialog
        key={`pause-${d.pause}`}
        offen={pauseOffen}
        onAbbrechen={() => setPauseOffen(false)}
        titel={d.pause ? "Kontaktpause aufheben" : "Kontaktpause setzen"}
        beschreibung={
          d.pause
            ? "Danach laufen die automatischen Mails wieder. Halte fest, wie es weitergeht."
            : "Solange die Pause läuft, gehen keine automatischen Lern- und Verkaufsmails an diesen Kontakt."
        }
        label={d.pause ? "Nächster Schritt" : "Grund"}
        vorschlaege={d.pause ? ["Automatik läuft weiter", "Termin vereinbart", "Kein Interesse mehr"] : ["Im persönlichen Gespräch", "Entscheidet bis Ende der Woche", "Wünscht keine Mails"]}
        knopf={d.pause ? "Aufheben" : "Pause setzen"}
        onBestaetigen={async (t) => {
          const json = await aktion(
            d.pause ? { art: "pause", aktiv: false, naechsterSchritt: t } : { art: "pause", aktiv: true, grund: t },
            d.pause ? "Kontaktpause aufgehoben." : "Kontaktpause gesetzt.",
          );
          if (json.ok) setPauseOffen(false);
        }}
      />

      <BestaetigenDialog
        offen={Boolean(frage)}
        titel={frage?.titel ?? ""}
        text={frage?.text ?? ""}
        knopf={frage?.knopf ?? "OK"}
        onAbbrechen={() => setFrage(null)}
        onBestaetigen={async () => {
          await frage?.los();
          setFrage(null);
        }}
      />
    </Stack>
  );
}

/* ─── Kopf ──────────────────────────────────────────────────────────────── */

function Kontaktweg({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  const [kopiert, setKopiert] = useState(false);
  return (
    <Flex
      as="button"
      type="button"
      align="center"
      gap={1.5}
      title="Kopieren"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setKopiert(true);
          window.setTimeout(() => setKopiert(false), 1500);
        });
      }}
      _hover={{ color: "var(--cc-text)" }}
      minW={0}
    >
      <Icon size={14} strokeWidth={1.75} color="var(--cc-text-3)" />
      <Text className="cc-num" noOfLines={1}>
        {text}
      </Text>
      {kopiert ? <Check size={13} color="var(--cc-gold-light)" /> : <Copy size={12} color="var(--cc-text-3)" />}
    </Flex>
  );
}

/** Rundes Icon mit Beschriftung darunter — die Aktionsleiste im Kopf (HubSpot). */
function Aktion({
  icon: Icon,
  label,
  href,
  extern,
  gold,
  onClick,
  nurAbSm = false,
}: {
  icon: LucideIcon;
  label: string;
  href?: string | null;
  extern?: boolean;
  gold?: boolean;
  onClick?: () => void;
  nurAbSm?: boolean;
}) {
  const aus = href === null;
  return (
    <Flex
      as={href ? "a" : "button"}
      {...(href ? { href, ...(extern ? { target: "_blank", rel: "noopener noreferrer" } : {}) } : { type: "button", disabled: aus })}
      onClick={aus ? undefined : onClick}
      display={nurAbSm ? { base: "none", sm: "flex" } : "flex"}
      direction="column"
      align="center"
      gap={1.5}
      w={{ base: "60px", md: "64px" }}
      opacity={aus ? 0.4 : 1}
      cursor={aus ? "not-allowed" : "pointer"}
      role="group"
      aria-label={label}
      title={aus ? `${label}: keine Nummer` : label}
    >
      <Flex
        w={{ base: "40px", md: "44px" }}
        h={{ base: "40px", md: "44px" }}
        borderRadius="full"
        align="center"
        justify="center"
        bg={gold ? "var(--cc-gold-grad)" : "rgba(255,255,255,0.03)"}
        border={gold ? "none" : "1px solid var(--cc-line-strong)"}
        color={gold ? "var(--cc-on-gold)" : "var(--cc-text-soft)"}
        boxShadow={gold ? "0 6px 18px rgba(212,176,128,0.22), inset 0 1px 0 rgba(255,255,255,0.35)" : "none"}
        transition="all 160ms var(--cc-ease)"
        _groupHover={aus ? undefined : gold ? { boxShadow: "0 0 24px rgba(212,176,128,0.45)" } : { borderColor: "var(--cc-gold-line)", color: "var(--cc-gold-light)", bg: "var(--cc-gold-wash)" }}
      >
        <Icon size={18} strokeWidth={1.75} />
      </Flex>
      <Text fontSize="11px" color="var(--cc-text-2)" whiteSpace="nowrap" _groupHover={aus ? undefined : { color: "var(--cc-text)" }}>
        {label}
      </Text>
    </Flex>
  );
}

/** Phasen-Pfad wie der Path in Salesforce: erledigt in Datentinte, aktuell in Gold, klickbar. */
function Pfad({ phase, istAdmin, onWahl }: { phase: string; istAdmin: boolean; onWahl: (p: Phase) => void }) {
  const stelle = pfadStelle(phase);
  const lauf = useRef<HTMLDivElement>(null);
  // Auf dem Handy läuft der Pfad seitlich: die aktuelle Station in die Mitte holen.
  useEffect(() => {
    const el = lauf.current;
    const seg = el?.children[stelle.index] as HTMLElement | undefined;
    if (el && seg && el.scrollWidth > el.clientWidth) el.scrollLeft = seg.offsetLeft - el.clientWidth / 2 + seg.clientWidth / 2;
  }, [stelle.index]);
  return (
    <Flex align="center" gap={3} direction={{ base: "column", md: "row" }}>
      <Flex ref={lauf} flex="1" w="100%" overflowX="auto" className="hide-scrollbar" pb={0.5}>
        {PFAD.map((p, i) => {
          const aktuell = i === stelle.index;
          const erledigt = i < stelle.index;
          const label = aktuell && stelle.label ? stelle.label : p.label;
          let bg = "rgba(255,255,255,0.045)";
          let farbe = "var(--cc-text-3)";
          if (erledigt) {
            bg = "rgba(209,208,212,0.13)";
            farbe = "var(--cc-text-soft)";
          }
          if (aktuell) {
            if (stelle.ton === "gewonnen") {
              bg = "rgba(74,222,128,0.22)";
              farbe = "var(--cc-success)";
            } else if (stelle.ton === "verloren") {
              bg = "rgba(248,113,113,0.16)";
              farbe = "var(--cc-danger)";
            } else if (stelle.ton === "warnung") {
              bg = phase === "no_show" ? "rgba(248,113,113,0.16)" : "rgba(212,176,128,0.16)";
              farbe = phase === "no_show" ? "var(--cc-danger)" : "var(--cc-gold-light)";
            } else {
              bg = "var(--cc-gold-grad)";
              farbe = "var(--cc-on-gold)";
            }
          }
          const inhalt = (
            <Flex align="center" justify="center" gap={1.5} w="100%" h="100%" px={5}>
              {erledigt ? <Check size={13} strokeWidth={2.25} /> : null}
              <Text as="span" fontSize="13px" fontWeight={aktuell ? 600 : 500} whiteSpace="nowrap">
                {label}
              </Text>
              {p.id === "abschluss" ? <ChevronDown size={13} /> : null}
            </Flex>
          );
          const segmentProps = {
            className: "crm-pfad-segment",
            flex: "1",
            minW: "112px",
            h: "38px",
            ml: i === 0 ? 0 : "-8px",
            bg,
            color: farbe,
            cursor: aktuell && p.id !== "abschluss" ? "default" : "pointer",
            transition: "filter 140ms var(--cc-ease)",
            _hover: aktuell && p.id !== "abschluss" ? undefined : { filter: "brightness(1.25)" },
            title: aktuell ? "Aktuelle Phase" : `Phase auf „${p.label}“ setzen`,
          } as const;
          if (p.id === "abschluss") {
            return (
              <Menu key={p.id} placement="bottom-end" isLazy>
                <MenuButton as={Box} role="button" tabIndex={0} {...segmentProps}>
                  {inhalt}
                </MenuButton>
                <MenuList {...menuListProps}>
                  <MenuItem {...menuItemProps} isDisabled={!istAdmin || phase === "gewonnen"} onClick={() => onWahl("gewonnen")}>
                    Gewonnen {istAdmin ? "" : "(setzt der Kauf)"}
                  </MenuItem>
                  <MenuItem {...menuItemProps} isDisabled={phase === "verloren"} onClick={() => onWahl("verloren")}>
                    Verloren …
                  </MenuItem>
                </MenuList>
              </Menu>
            );
          }
          return (
            <Box key={p.id} as="button" type="button" onClick={() => !aktuell && onWahl(p.id as Phase)} {...segmentProps}>
              {inhalt}
            </Box>
          );
        })}
      </Flex>
      <Menu placement="bottom-end" isLazy>
        <MenuButton as={Button} size="sm" variant="line" rightIcon={<ChevronDown size={14} />} flexShrink={0} alignSelf={{ base: "flex-end", md: "center" }}>
          Abzweig
        </MenuButton>
        <MenuList {...menuListProps}>
          <MenuItem {...menuItemProps} icon={<Clock size={14} />} isDisabled={phase === "spaeter"} onClick={() => onWahl("spaeter")}>
            Auf später legen …
          </MenuItem>
          <MenuItem {...menuItemProps} icon={<X size={14} />} isDisabled={phase === "no_show"} onClick={() => onWahl("no_show")}>
            No-Show
          </MenuItem>
          <MenuItem {...menuItemProps} icon={<X size={14} />} isDisabled={phase === "verloren"} onClick={() => onWahl("verloren")}>
            Verloren …
          </MenuItem>
        </MenuList>
      </Menu>
    </Flex>
  );
}

/* ─── Über den Kontakt ──────────────────────────────────────────────────── */

function Eigenschaft({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Flex align="center" gap={3} minH="40px" py={1.5} borderBottom="1px solid var(--cc-line)" _last={{ borderBottom: "none" }}>
      <Text fontSize="12px" color="var(--cc-text-3)" w="96px" flexShrink={0}>
        {label}
      </Text>
      <Box flex="1" minW={0} color="var(--cc-text)">
        {children}
      </Box>
    </Flex>
  );
}

/** Wert zum Anklicken, wird zum Feld; Enter speichert, Escape bricht ab. */
function InlineFeld({ wert, platzhalter, typ = "text", onSpeichern }: { wert: string; platzhalter: string; typ?: string; onSpeichern: (v: string) => Promise<boolean> }) {
  const [bearbeiten, setBearbeiten] = useState(false);
  const [v, setV] = useState(wert);
  const [laeuft, setLaeuft] = useState(false);
  if (!bearbeiten) {
    return (
      <Flex as="button" type="button" onClick={() => setBearbeiten(true)} align="center" gap={2} w="100%" textAlign="left" role="group" title="Bearbeiten">
        <Text fontSize="13px" color={wert ? "var(--cc-text)" : "var(--cc-text-3)"} noOfLines={1} className={typ === "tel" ? "cc-num" : undefined}>
          {wert || platzhalter}
        </Text>
        <Box opacity={0} _groupHover={{ opacity: 1 }} color="var(--cc-text-3)" transition="opacity 120ms ease">
          <Pencil size={12} />
        </Box>
      </Flex>
    );
  }
  const speichern = async () => {
    if (v.trim() === wert) return setBearbeiten(false);
    setLaeuft(true);
    const ok = await onSpeichern(v.trim());
    setLaeuft(false);
    if (ok) setBearbeiten(false);
  };
  return (
    <Flex gap={1.5} align="center">
      <Input
        size="sm"
        h="30px"
        type={typ}
        value={v}
        autoFocus
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void speichern();
          if (e.key === "Escape") {
            setV(wert);
            setBearbeiten(false);
          }
        }}
        {...adminInputProps}
      />
      <IconKnopf icon={Check} label="Speichern" groesse="xs" gold onClick={() => void speichern()} />
      {!laeuft ? (
        <IconKnopf
          icon={X}
          label="Abbrechen"
          groesse="xs"
          onClick={() => {
            setV(wert);
            setBearbeiten(false);
          }}
        />
      ) : null}
    </Flex>
  );
}

/* ─── Mitte ─────────────────────────────────────────────────────────────── */

function NaechsterSchritt({
  schritt,
  tel,
  wa,
  onGefuehrt,
  onErgebnis,
  onNoShow,
  onFesthalten,
}: {
  schritt: Schritt;
  tel: string | null;
  wa: string | null;
  onGefuehrt: (terminId: string) => void;
  onErgebnis: (terminId: string) => void;
  onNoShow: (terminId: string) => void;
  onFesthalten: () => void;
}) {
  const rot = schritt.ton === "danger";
  const gruen = schritt.ton === "success";
  return (
    <Flex
      className={schritt.ton === "attention" ? "cc-card cc-card--hero cc-card--still" : "cc-card cc-card--still"}
      gap={4}
      p={{ base: 4, md: 5 }}
      align={{ base: "flex-start", md: "center" }}
      direction={{ base: "column", md: "row" }}
      borderColor={rot ? "rgba(248,113,113,0.4) !important" : gruen ? "rgba(74,222,128,0.35) !important" : undefined}
    >
      <Box flex="1">
        <Text fontSize="11px" letterSpacing="0.12em" textTransform="uppercase" color={rot ? "var(--cc-danger)" : gruen ? "var(--cc-success)" : "var(--cc-gold-light)"} mb={1}>
          Nächster Schritt
        </Text>
        <Text fontSize="17px" fontWeight={600}>
          {schritt.titel}
        </Text>
        <Text fontSize="13px" color="var(--cc-text-2)" mt={0.5}>
          {schritt.text}
        </Text>
      </Box>
      <HStack gap={2} wrap="wrap">
        {schritt.joinUrl ? (
          <Button as="a" href={schritt.joinUrl} target="_blank" rel="noopener noreferrer" size="sm" variant="gold" leftIcon={<Video size={14} />}>
            Einwählen
          </Button>
        ) : null}
        {schritt.art === "termin_vorbei" && schritt.terminId ? (
          <>
            <Button size="sm" variant="gold" onClick={() => onGefuehrt(schritt.terminId!)}>
              Geführt …
            </Button>
            {tel ? (
              <Button as="a" href={tel} size="sm" variant="line" leftIcon={<Phone size={14} />}>
                Anrufen
              </Button>
            ) : null}
            <Button size="sm" variant="line" onClick={() => onNoShow(schritt.terminId!)}>
              No-Show
            </Button>
          </>
        ) : null}
        {schritt.art === "ergebnis_fehlt" && schritt.terminId ? (
          <Button size="sm" variant="gold" onClick={() => onErgebnis(schritt.terminId!)}>
            Ergebnis erfassen
          </Button>
        ) : null}
        {["wiedervorlage", "erstkontakt", "no_show", "angebot", "offen"].includes(schritt.art) ? (
          <>
            {tel && schritt.art !== "angebot" ? (
              <Button as="a" href={tel} size="sm" variant="gold" leftIcon={<Phone size={14} />} onClick={() => window.setTimeout(onFesthalten, 400)}>
                Anrufen
              </Button>
            ) : null}
            {wa && (schritt.art === "angebot" || schritt.art === "no_show") ? (
              <Button as="a" href={wa} target="_blank" rel="noopener noreferrer" size="sm" variant={schritt.art === "angebot" ? "gold" : "line"} leftIcon={<MessageCircle size={14} />}>
                WhatsApp
              </Button>
            ) : null}
            <Button size="sm" variant="line" onClick={onFesthalten}>
              Festhalten
            </Button>
          </>
        ) : null}
      </HStack>
    </Flex>
  );
}

/** Composer wie in Salesforce/HubSpot: Anruf, Notiz oder Wiedervorlage in einer Karte. */
function Composer({
  reiter,
  setReiter,
  wiedervorlage,
  jetzt,
  onAnruf,
  onNotiz,
  onWiedervorlage,
}: {
  reiter: Reiter;
  setReiter: (r: Reiter) => void;
  wiedervorlage: string | null;
  jetzt: number;
  onAnruf: (b: { ergebnis: string; text: string }) => Promise<{ ok?: boolean }>;
  onNotiz: (t: string) => Promise<{ ok?: boolean }>;
  onWiedervorlage: (iso: string | null) => Promise<boolean>;
}) {
  const [ergebnis, setErgebnis] = useState("");
  const [text, setText] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [nachfrage, setNachfrage] = useState(false);
  const [wv, setWv] = useState(zuLokal(wiedervorlage));
  const reiterListe: { id: Reiter; label: string; icon: LucideIcon }[] = [
    { id: "anruf", label: "Anruf", icon: Phone },
    { id: "notiz", label: "Notiz", icon: StickyNote },
    { id: "wiedervorlage", label: "Wiedervorlage", icon: BellRing },
  ];
  const speichern = async () => {
    setLaeuft(true);
    const r = reiter === "anruf" ? await onAnruf({ ergebnis, text }) : await onNotiz(text);
    setLaeuft(false);
    if (r.ok) {
      // Nach einem Anruf, der nicht in einem Termin endete, fast immer: Wann wieder?
      setNachfrage(reiter === "anruf" && ergebnis !== "termin_vereinbart");
      setErgebnis("");
      setText("");
    }
  };
  const wvSetzen = async (iso: string | null) => {
    setLaeuft(true);
    const ok = await onWiedervorlage(iso);
    setLaeuft(false);
    if (ok) {
      setNachfrage(false);
      setWv(zuLokal(iso));
    }
  };

  return (
    <Box className="cc-card cc-card--still" overflow="hidden">
      <Flex borderBottom="1px solid var(--cc-line)" px={{ base: 2, md: 3 }}>
        {reiterListe.map((r) => {
          const an = reiter === r.id;
          return (
            <Flex
              key={r.id}
              as="button"
              type="button"
              onClick={() => setReiter(r.id)}
              aria-pressed={an}
              align="center"
              gap={2}
              px={3}
              h="46px"
              fontSize="13px"
              fontWeight={an ? 500 : 400}
              color={an ? "var(--cc-gold-light)" : "var(--cc-text-2)"}
              borderBottom="2px solid"
              borderColor={an ? "var(--cc-gold)" : "transparent"}
              mb="-1px"
              _hover={{ color: an ? undefined : "var(--cc-text)" }}
            >
              <r.icon size={15} strokeWidth={1.75} />
              {r.label}
            </Flex>
          );
        })}
      </Flex>
      <Box p={{ base: 4, md: 5 }}>
        {reiter === "wiedervorlage" ? (
          <Stack gap={3}>
            <Text fontSize="13px" color="var(--cc-text-2)">
              {wiedervorlage ? (
                <>
                  Aktuell:{" "}
                  <Text as="span" color={new Date(wiedervorlage).getTime() <= jetzt ? "var(--cc-danger)" : "var(--cc-text)"} fontWeight={500}>
                    {wann(wiedervorlage, jetzt)}
                  </Text>{" "}
                  ({relativ(wiedervorlage, jetzt)})
                </>
              ) : (
                "Keine Wiedervorlage gesetzt."
              )}
            </Text>
            <Flex wrap="wrap" gap={1.5}>
              {wiedervorlageVorschlaege(jetzt).map((s) => (
                <Chip key={s.label} icon={Clock} onClick={() => void wvSetzen(s.iso)}>
                  {s.label}
                </Chip>
              ))}
            </Flex>
            <Flex gap={2} wrap="wrap">
              <Input size="sm" h="34px" maxW="240px" type="datetime-local" value={wv} onChange={(e) => setWv(e.target.value)} {...adminInputProps} {...dunklesFeld} aria-label="Wiedervorlage Datum und Uhrzeit" />
              <Button size="sm" variant="gold" isDisabled={!wv || wv === zuLokal(wiedervorlage)} isLoading={laeuft} onClick={() => void wvSetzen(new Date(wv).toISOString())}>
                Setzen
              </Button>
              {wiedervorlage ? (
                <Button size="sm" variant="ghost" onClick={() => void wvSetzen(null)}>
                  Entfernen
                </Button>
              ) : null}
            </Flex>
          </Stack>
        ) : (
          <Stack gap={3}>
            {reiter === "anruf" ? (
              <Box>
                <Feldlabel>Ergebnis</Feldlabel>
                <Flex wrap="wrap" gap={1.5}>
                  {ANRUF_ERGEBNISSE.map((e) => (
                    <Chip key={e.id} aktiv={ergebnis === e.id} onClick={() => setErgebnis(e.id)}>
                      {e.label}
                    </Chip>
                  ))}
                </Flex>
              </Box>
            ) : null}
            <Textarea
              rows={reiter === "notiz" ? 4 : 3}
              fontSize="14px"
              placeholder={reiter === "anruf" ? "Was wurde besprochen? (optional)" : "Notiz für das Team …"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              {...adminInputProps}
            />
            <Flex justify="flex-end">
              <Button size="sm" variant="gold" isDisabled={reiter === "anruf" ? !ergebnis : !text.trim()} isLoading={laeuft} onClick={() => void speichern()}>
                {reiter === "anruf" ? "Anruf speichern" : "Notiz speichern"}
              </Button>
            </Flex>
            {nachfrage ? (
              <Box p={3} borderRadius="10px" border="1px solid var(--cc-gold-line)" bg="var(--cc-gold-wash)">
                <Text fontSize="13px" color="var(--cc-gold-light)" mb={2}>
                  Wann meldest du dich wieder?
                </Text>
                <Flex wrap="wrap" gap={1.5} align="center">
                  {wiedervorlageVorschlaege(jetzt).map((v) => (
                    <Chip key={v.label} klein onClick={() => void wvSetzen(v.iso)}>
                      {v.label}
                    </Chip>
                  ))}
                  <Box as="button" type="button" fontSize="12px" color="var(--cc-text-3)" ml={1} _hover={{ color: "var(--cc-text)" }} onClick={() => setNachfrage(false)}>
                    Nicht nötig
                  </Box>
                </Flex>
              </Box>
            ) : null}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

type Eintrag = { id: string; art: string; am: string; titel: string; text: string | null; von: string | null; anstehend?: boolean; ton?: "danger" | "success" };

const ART_ICON: Record<string, LucideIcon> = {
  anruf: Phone,
  notiz: StickyNote,
  whatsapp: MessageCircle,
  phase: ArrowRightLeft,
  zuweisung: UserCog,
  termin: CalendarCheck,
  ergebnis: ClipboardCheck,
  kassenlink: Link2,
  kauf: ShoppingBag,
  mail: Mail,
  wiedervorlage: BellRing,
  system: Cog,
};

const FILTER: { id: string; label: string; arten: string[] | null }[] = [
  { id: "alle", label: "Alle", arten: null },
  { id: "gespraeche", label: "Anrufe & Notizen", arten: ["anruf", "notiz", "whatsapp", "ergebnis"] },
  { id: "termine", label: "Termine", arten: ["termin"] },
  { id: "mails", label: "Mails", arten: ["mail"] },
  { id: "system", label: "System", arten: ["phase", "zuweisung", "kassenlink", "kauf", "system"] },
];

/** Zeitstrahl: anstehend oben (Termine, Wiedervorlage), darunter nach Monat — Aktivitäten und Mails zusammen. */
function Zeitstrahl({ d, jetzt }: { d: KontaktDetail; jetzt: number }) {
  const [filter, setFilter] = useState("alle");
  const eintraege = useMemo(() => {
    const liste: Eintrag[] = [];
    for (const t of d.termine) {
      if (t.status === "gebucht" && new Date(t.start_am).getTime() > jetzt) {
        liste.push({ id: `t-${t.id}`, art: "termin", am: t.start_am, titel: `Analysegespräch ${wann(t.start_am, jetzt)}`, text: t.berater_name ? `mit ${t.berater_name}` : null, von: null, anstehend: true });
      }
    }
    if (d.kontakt.wiedervorlage_am) {
      const faellig = new Date(d.kontakt.wiedervorlage_am).getTime() <= jetzt;
      liste.push({
        id: "wv",
        art: "wiedervorlage",
        am: d.kontakt.wiedervorlage_am,
        titel: faellig ? `Wiedervorlage fällig (${relativ(d.kontakt.wiedervorlage_am, jetzt)})` : `Wiedervorlage ${wann(d.kontakt.wiedervorlage_am, jetzt)}`,
        text: null,
        von: null,
        anstehend: true,
        ton: faellig ? "danger" : undefined,
      });
    }
    for (const a of d.aktivitaeten) {
      const ergebnis = a.ergebnis ? ANRUF_ERGEBNISSE.find((e) => e.id === a.ergebnis)?.label ?? a.ergebnis : null;
      liste.push({ id: a.id, art: a.art, am: a.am, titel: `${AKTIVITAET_LABEL[a.art] ?? a.art}${ergebnis ? ` · ${ergebnis}` : ""}`, text: a.text, von: a.von });
    }
    for (const [i, m] of d.mails.entries()) {
      const titel = VORLAGEN[m.vorlage as VorlageId]?.titel;
      liste.push({
        id: `m-${i}`,
        art: "mail",
        am: m.gesendet_am ?? m.created_at,
        titel: `Mail ${m.vorlage}${titel ? ` · ${titel}` : ""}`,
        text: m.status === "gesendet" ? null : `Nicht gesendet: ${GRUND_LABEL[m.grund ?? ""] ?? m.status}`,
        von: null,
      });
    }
    return liste;
  }, [d, jetzt]);

  const arten = FILTER.find((f) => f.id === filter)?.arten ?? null;
  const passend = eintraege.filter((e) => !arten || arten.includes(e.art));
  const anstehend = passend.filter((e) => e.anstehend).sort((a, b) => a.am.localeCompare(b.am));
  const vergangen = passend.filter((e) => !e.anstehend).sort((a, b) => b.am.localeCompare(a.am));
  const monate = new Map<string, Eintrag[]>();
  for (const e of vergangen) {
    const m = new Date(e.am).toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "Europe/Berlin" });
    monate.set(m, [...(monate.get(m) ?? []), e]);
  }

  return (
    <Abschnitt titel="Zeitstrahl" zahl={eintraege.length}>
      <Flex gap={1.5} wrap="wrap" mb={4}>
        {FILTER.map((f) => (
          <Chip key={f.id} klein aktiv={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </Chip>
        ))}
      </Flex>
      {anstehend.length ? (
        <Gruppe titel="Anstehend">
          {anstehend.map((e) => (
            <ZeitEintrag key={e.id} e={e} d={d} jetzt={jetzt} />
          ))}
        </Gruppe>
      ) : null}
      {[...monate.entries()].map(([monat, liste]) => (
        <Gruppe key={monat} titel={monat}>
          {liste.map((e) => (
            <ZeitEintrag key={e.id} e={e} d={d} jetzt={jetzt} />
          ))}
        </Gruppe>
      ))}
      {!passend.length ? (
        <Text fontSize="13px" color="var(--cc-text-3)">
          Noch nichts in diesem Filter.
        </Text>
      ) : null}
    </Abschnitt>
  );
}

function Gruppe({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <Box mb={4} _last={{ mb: 0 }}>
      <Text fontSize="11px" fontWeight={500} letterSpacing="0.1em" textTransform="uppercase" color="var(--cc-text-3)" mb={2}>
        {titel}
      </Text>
      <Box>{children}</Box>
    </Box>
  );
}

function ZeitEintrag({ e, d, jetzt }: { e: Eintrag; d: KontaktDetail; jetzt: number }) {
  const Icon = ART_ICON[e.art] ?? Cog;
  const von = e.von ? closerName(d.team, e.von) : null;
  const notiz = e.art === "notiz" || e.art === "anruf";
  return (
    <Flex gap={3} position="relative" pb={4} _last={{ pb: 0 }} sx={{ "&:last-of-type .crm-schiene": { display: "none" } }}>
      <Box className="crm-schiene" position="absolute" left="15px" top="34px" bottom="2px" w="1px" bg="var(--cc-line)" />
      <Flex
        w="32px"
        h="32px"
        flexShrink={0}
        borderRadius="full"
        align="center"
        justify="center"
        border="1px solid"
        borderColor={e.ton === "danger" ? "rgba(248,113,113,0.45)" : e.anstehend ? "var(--cc-gold-line)" : "var(--cc-line-strong)"}
        bg={e.anstehend ? "var(--cc-gold-wash)" : "rgba(255,255,255,0.02)"}
        color={e.ton === "danger" ? "var(--cc-danger)" : e.anstehend ? "var(--cc-gold-light)" : "var(--cc-text-2)"}
      >
        <Icon size={14} strokeWidth={1.75} />
      </Flex>
      <Box flex="1" minW={0} pt={1}>
        <Flex align="baseline" gap={2} wrap="wrap">
          <Text fontSize="13px" fontWeight={500} color={e.ton === "danger" ? "var(--cc-danger)" : "var(--cc-text)"}>
            {e.titel}
          </Text>
          {von && von !== "—" ? (
            <Text fontSize="12px" color="var(--cc-text-3)">
              {von}
            </Text>
          ) : null}
          <Tooltip label={datum(e.am)} hasArrow openDelay={300} bg="var(--cc-surface-2)" color="var(--cc-text)" fontSize="12px">
            <Text fontSize="12px" color="var(--cc-text-3)" ml="auto" className="cc-num" whiteSpace="nowrap">
              {relativ(e.am, jetzt)}
            </Text>
          </Tooltip>
        </Flex>
        {e.text ? (
          notiz ? (
            <Text fontSize="13px" color="var(--cc-text-soft)" mt={1.5} px={3} py={2} borderRadius="8px" bg="rgba(255,255,255,0.025)" border="1px solid var(--cc-line)" whiteSpace="pre-wrap">
              {e.text}
            </Text>
          ) : (
            <Text fontSize="12px" color="var(--cc-text-2)" mt={0.5}>
              {e.text}
            </Text>
          )
        ) : null}
      </Box>
    </Flex>
  );
}

/* ─── Rechts ────────────────────────────────────────────────────────────── */

function TerminKarte({
  t,
  jetzt,
  onGefuehrt,
  onErgebnis,
  onNoShow,
  onAbsagen,
  onZuruecknehmen,
}: {
  t: Termin;
  jetzt: number;
  onGefuehrt: () => void;
  onErgebnis: () => void;
  onNoShow: () => void;
  onAbsagen: (a: "abgesagt_kunde" | "kein_interesse" | "abgesagt_team") => void;
  onZuruecknehmen: () => void;
}) {
  const start = new Date(t.start_am);
  const vorbei = start.getTime() <= jetzt;
  const st = TERMIN_STATUS[t.status] ?? { label: t.status, ton: "neutral" as const };
  const tag = start.toLocaleDateString("de-DE", { day: "2-digit", timeZone: "Europe/Berlin" });
  const monat = start.toLocaleDateString("de-DE", { month: "short", timeZone: "Europe/Berlin" }).replace(".", "");
  return (
    <Box p={3} borderRadius="10px" border="1px solid var(--cc-line)" bg="rgba(255,255,255,0.02)">
      <Flex gap={3} align="center">
        <Flex direction="column" align="center" justify="center" w="44px" h="46px" borderRadius="8px" border="1px solid var(--cc-line-strong)" flexShrink={0} bg="rgba(255,255,255,0.02)">
          <Text className="cc-num" fontSize="16px" fontWeight={600} lineHeight={1}>
            {tag}
          </Text>
          <Text fontSize="10px" textTransform="uppercase" letterSpacing="0.06em" color="var(--cc-text-3)" mt={0.5}>
            {monat}
          </Text>
        </Flex>
        <Box flex="1" minW={0}>
          <Text className="cc-num" fontSize="13px" fontWeight={500}>
            {wann(t.start_am, jetzt)}
          </Text>
          <Text fontSize="12px" color="var(--cc-text-3)" noOfLines={1}>
            {t.berater_name ?? "—"}
          </Text>
        </Box>
        <StatusPill tone={st.ton}>{st.label}</StatusPill>
      </Flex>
      {t.status === "gefuehrt" ? (
        t.ergebnis ? (
          <Text fontSize="12px" color="var(--cc-text-2)" mt={2.5} pt={2.5} borderTop="1px solid var(--cc-line)">
            {CALL_OUTCOMES.find((o) => o.id === t.ergebnis!.outcome)?.label}
            {t.ergebnis.produkt !== "none" ? ` · ${CALL_PRODUKTE.find((p) => p.id === t.ergebnis!.produkt)?.label}` : ""}
            {t.ergebnis.grund ? ` · ${CALL_GRUENDE.find((g) => g.id === t.ergebnis!.grund)?.label}` : ""}
            {t.ergebnis.follow_up_am ? ` · Follow-up ${wann(t.ergebnis.follow_up_am, jetzt)}` : ""}
            {t.ergebnis.notiz ? ` — ${t.ergebnis.notiz}` : ""}
          </Text>
        ) : (
          <Text fontSize="12px" color="var(--cc-danger)" mt={2.5} pt={2.5} borderTop="1px solid var(--cc-line)">
            Ergebnis fehlt
          </Text>
        )
      ) : null}
      {t.status === "gebucht" || t.status === "gefuehrt" || t.status === "no_show" ? (
        <HStack gap={1.5} mt={3} wrap="wrap">
          {t.status === "gebucht" && t.join_url && !vorbei ? (
            <Button as="a" href={t.join_url} target="_blank" rel="noopener noreferrer" size="xs" variant="line" leftIcon={<Video size={12} />}>
              Einwahl
            </Button>
          ) : null}
          {t.status === "gebucht" && vorbei ? (
            <>
              <Button size="xs" variant="gold" onClick={onGefuehrt}>
                Geführt …
              </Button>
              <Button size="xs" variant="line" onClick={onNoShow}>
                No-Show
              </Button>
            </>
          ) : null}
          {t.status === "gebucht" && !vorbei ? (
            <Menu placement="bottom-start" isLazy>
              <MenuButton as={Button} size="xs" variant="line" rightIcon={<ChevronDown size={12} />}>
                Absagen
              </MenuButton>
              <MenuList {...menuListProps}>
                <MenuItem {...menuItemProps} onClick={() => onAbsagen("abgesagt_kunde")}>
                  Kunde sagt ab
                </MenuItem>
                <MenuItem {...menuItemProps} onClick={() => onAbsagen("kein_interesse")}>
                  Kein Interesse
                </MenuItem>
                <MenuItem {...menuItemProps} onClick={() => onAbsagen("abgesagt_team")}>
                  Wir sagen ab
                </MenuItem>
              </MenuList>
            </Menu>
          ) : null}
          {t.status === "gefuehrt" ? (
            <Button size="xs" variant={t.ergebnis ? "line" : "gold"} onClick={onErgebnis}>
              {t.ergebnis ? "Ergebnis ändern" : "Ergebnis erfassen"}
            </Button>
          ) : null}
          {t.status === "no_show" ? (
            <>
              <Button size="xs" variant="line" onClick={onGefuehrt}>
                Doch geführt …
              </Button>
              <Button size="xs" variant="ghost" onClick={onZuruecknehmen}>
                Zurücknehmen
              </Button>
            </>
          ) : null}
        </HStack>
      ) : null}
    </Box>
  );
}

function KassenlinkKarte({
  start,
  vorname,
  telefon,
  onAnlegen,
  links,
}: {
  start: KassenProdukt | null;
  vorname: string;
  telefon: string | null;
  onAnlegen: (b: Record<string, unknown>) => Promise<{ ok?: boolean; url?: string }>;
  links: KontaktDetail["kassenlinks"];
}) {
  const [produkt, setProdukt] = useState<KassenProdukt>(start ?? "main");
  const [raten, setRaten] = useState(1);
  const [url, setUrl] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [kopiert, setKopiert] = useState(false);
  const p = PRODUKTE[produkt];
  const nachricht = url ? `Hi ${vorname}, wie besprochen hier dein persönlicher Link für ${p.name}: ${url} — bei Fragen melde dich jederzeit.` : "";
  const wa = url ? whatsappLink(telefon, nachricht) : null;
  return (
    <Abschnitt titel="Kassenlink" hero={Boolean(start)} rechts={start ? <StatusPill tone="attention">vorbereitet</StatusPill> : undefined}>
      {!url ? (
        <Stack gap={3}>
          <Stack gap={1.5} role="radiogroup" aria-label="Produkt">
            {(["main", "premium", "ausbildung"] as const).map((x) => {
              const an = produkt === x;
              return (
                <Flex
                  key={x}
                  as="button"
                  type="button"
                  role="radio"
                  aria-checked={an}
                  onClick={() => {
                    setProdukt(x);
                    setRaten(1);
                  }}
                  align="center"
                  gap={3}
                  px={3}
                  py={2.5}
                  borderRadius="10px"
                  border="1px solid"
                  borderColor={an ? "var(--cc-gold-line)" : "var(--cc-line)"}
                  bg={an ? "var(--cc-gold-wash)" : "rgba(255,255,255,0.02)"}
                  textAlign="left"
                  _hover={an ? undefined : { borderColor: "var(--cc-line-strong)" }}
                >
                  <Box w="14px" h="14px" borderRadius="full" border="1.5px solid" borderColor={an ? "var(--cc-gold)" : "var(--cc-text-3)"} display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                    {an ? <Box w="6px" h="6px" borderRadius="full" bg="var(--cc-gold)" /> : null}
                  </Box>
                  <Text fontSize="13px" fontWeight={500} flex="1" color={an ? "var(--cc-gold-light)" : "var(--cc-text)"}>
                    {PRODUKTE[x].name}
                  </Text>
                  <Text className="cc-num" fontSize="13px" color="var(--cc-text-2)">
                    {(PRODUKTE[x].preisCents / 100).toLocaleString("de-DE")} €
                  </Text>
                </Flex>
              );
            })}
          </Stack>
          <Box>
            <Feldlabel>Zahlweise</Feldlabel>
            <Flex wrap="wrap" gap={1.5}>
              {erlaubteRaten(produkt).map((n) => (
                <Chip key={n} klein aktiv={raten === n} onClick={() => setRaten(n)}>
                  {n === 1 ? "Einmal" : `${n} Raten`}
                </Chip>
              ))}
            </Flex>
            {raten > 1 ? (
              <Text fontSize="12px" color="var(--cc-text-3)" mt={1.5}>
                {ratenText(p.preisCents, raten)}
              </Text>
            ) : null}
          </Box>
          <Button
            size="sm"
            variant="gold"
            isLoading={laeuft}
            onClick={async () => {
              setLaeuft(true);
              const r = await onAnlegen({ produkt, raten });
              setLaeuft(false);
              if (r.ok && r.url) setUrl(r.url);
            }}
          >
            Kassenlink anlegen
          </Button>
        </Stack>
      ) : (
        <Stack gap={2.5}>
          <Text fontSize="13px" color="var(--cc-text-2)">
            Angelegt für <b>{p.name}</b>
            {raten > 1 ? ` in ${raten} Raten` : ""}. Jetzt schicken:
          </Text>
          <Flex gap={1.5}>
            <Input size="sm" readOnly value={url} {...adminInputProps} onFocus={(e) => e.target.select()} aria-label="Kassenlink" className="cc-num" />
            <IconKnopf
              icon={kopiert ? Check : Copy}
              label="Link kopieren"
              onClick={() =>
                void navigator.clipboard.writeText(url).then(() => {
                  setKopiert(true);
                  window.setTimeout(() => setKopiert(false), 1500);
                })
              }
            />
          </Flex>
          {wa ? (
            <Button as="a" href={wa} target="_blank" rel="noopener noreferrer" size="sm" variant="gold" leftIcon={<MessageCircle size={14} />}>
              Per WhatsApp schicken
            </Button>
          ) : null}
          <Flex gap={2}>
            <Button size="sm" variant="line" flex="1" leftIcon={<Copy size={13} />} onClick={() => void navigator.clipboard.writeText(nachricht)}>
              Text kopieren
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setUrl(null)}>
              Neu
            </Button>
          </Flex>
        </Stack>
      )}
      {links.length ? (
        <Box mt={4} pt={3} borderTop="1px solid var(--cc-line)">
          <Text fontSize="11px" letterSpacing="0.1em" textTransform="uppercase" color="var(--cc-text-3)" mb={1.5}>
            Bisher
          </Text>
          <Stack gap={1}>
            {links.slice(0, 5).map((l) => (
              <Flex key={l.id} fontSize="12px" color="var(--cc-text-2)" gap={2}>
                <Text flex="1" noOfLines={1}>
                  {PRODUKTE[l.produkt as KassenProdukt]?.name ?? l.produkt} · {l.raten === 1 ? "einmal" : `${l.raten} Raten`}
                </Text>
                <Text color="var(--cc-text-3)">{datum(l.created_at, false)}</Text>
                <Text color={l.status === "bezahlt" ? "var(--cc-success)" : "var(--cc-text-3)"}>{l.status}</Text>
              </Flex>
            ))}
          </Stack>
        </Box>
      ) : null}
    </Abschnitt>
  );
}
