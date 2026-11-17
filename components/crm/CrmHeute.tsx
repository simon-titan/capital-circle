"use client";

import { Box, Button, Flex, Grid, HStack, Stack, StackDivider, Text } from "@chakra-ui/react";
import { AlertCircle, BellRing, CalendarClock, CircleCheck, Coffee, Phone, Sparkles, UserPlus, Video } from "lucide-react";
import NextLink from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { StatusPill } from "@/components/admin/adminUi";
import { NO_SHOW_ANRUF_MINUTEN, OFFENE_PHASEN, type Phase } from "@/config/crm";
import { berlinTag, fehlerText, gruss, relativ, uhrzeit, wann } from "@/lib/crm/anzeige";
import type { TerminKurz } from "@/lib/crm/daten";
import { SeitenKopf } from "./CrmRahmen";
import { AktualisierenKnopf, Hinweis, PhasePill, closerName, useJetzt, useKontakte, useNeuLadenBeiRueckkehr, type KontaktZeile, type TeamMitglied } from "./gemeinsam";
import { Abschnitt, Avatar, Chip, IconKnopf, Kennzahl, Laden, LeerZustand, useCrm, useMeldung } from "./ui";

const STD = 3_600_000;

/**
 * „Heute" — die Arbeitsliste eines Closers, nach Dringlichkeit (wie die
 * Home-Seite in Salesforce bzw. die Aktivitätenliste in Pipedrive):
 *   1. Jetzt handeln: laufende Termine, verpasste Termine ohne Status
 *      (No-Show-Anruf nach 15 Minuten), Gespräche ohne Ergebnis, überfällige
 *      Wiedervorlagen — als Hero-Karte, denn das ist der nächste Schritt.
 *   2. Tagesplan als Zeitleiste mit „Jetzt"-Linie.
 *   3. Rechts: neue Leads (Speed to Lead, „Übernehmen"), Wiedervorlagen später
 *      heute, Termine der nächsten Tage nach Tag gruppiert.
 * Lädt beim Zurückkehren in den Tab und alle 2 Minuten neu; die Uhr tickt.
 */
export function CrmHeute() {
  const { ichId, name, pfad } = useCrm();
  const { daten, fehler, laedt, laden, abgleichen, setDaten } = useKontakte();
  const [termine, setTermine] = useState<TerminKurz[] | null>(null);
  const [ohneErgebnis, setOhneErgebnis] = useState<TerminKurz[]>([]);
  const [nurMeine, setNurMeine] = useState(Boolean(ichId));
  const meldung = useMeldung();
  const jetzt = useJetzt();

  const ladeTermine = useCallback(async () => {
    const j = (await fetch("/api/crm/heute", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null)) as { ok: boolean; termine?: TerminKurz[]; ohneErgebnis?: TerminKurz[] } | null;
    if (!j?.ok) return;
    setTermine(j.termine ?? []);
    setOhneErgebnis(j.ohneErgebnis ?? []);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Termine einmal laden
    void ladeTermine();
  }, [ladeTermine]);
  useNeuLadenBeiRueckkehr(ladeTermine);

  const team = useMemo(() => daten?.team ?? [], [daten]);
  const kontakte = useMemo(() => daten?.kontakte ?? [], [daten]);
  const meins = useCallback((closerId: string | null) => !nurMeine || closerId === ichId, [nurMeine, ichId]);
  const heute = berlinTag(jetzt);

  const sicht = useMemo(() => {
    const t = (termine ?? []).filter((x) => meins(x.closerId));
    const start = (x: TerminKurz) => new Date(x.start_am).getTime();
    const heuteT = t.filter((x) => berlinTag(start(x)) === heute).sort((a, b) => start(a) - start(b));
    const spaeterT = t.filter((x) => x.status === "gebucht" && berlinTag(start(x)) > heute).sort((a, b) => start(a) - start(b));
    const laeuft = heuteT.filter((x) => x.status === "gebucht" && start(x) <= jetzt && jetzt < start(x) + NO_SHOW_ANRUF_MINUTEN * 60_000);
    const verpasst = t.filter((x) => x.status === "gebucht" && jetzt >= start(x) + NO_SHOW_ANRUF_MINUTEN * 60_000);
    const offen = (k: KontaktZeile) => OFFENE_PHASEN.includes(k.phase as Phase);
    const wv = (k: KontaktZeile) => (k.wiedervorlage_am ? new Date(k.wiedervorlage_am).getTime() : null);
    const wvUeberfaellig = kontakte.filter((k) => offen(k) && meins(k.closer_id) && wv(k) !== null && wv(k)! <= jetzt).sort((a, b) => wv(a)! - wv(b)!);
    const wvHeute = kontakte
      .filter((k) => offen(k) && meins(k.closer_id) && wv(k) !== null && wv(k)! > jetzt && berlinTag(wv(k)!) === heute)
      .sort((a, b) => wv(a)! - wv(b)!);
    const neu = kontakte.filter((k) => k.phase === "neu" && (!k.closer_id || meins(k.closer_id))).sort((a, b) => b.created_at.localeCompare(a.created_at));
    return { heuteT, spaeterT, laeuft, verpasst, ergebnis: ohneErgebnis.filter((x) => meins(x.closerId)), wvUeberfaellig, wvHeute, neu };
  }, [termine, ohneErgebnis, kontakte, meins, heute, jetzt]);

  const dringend = sicht.laeuft.length + sicht.verpasst.length + sicht.ergebnis.length + sicht.wvUeberfaellig.length;
  const kontaktLink = (id: string | null) => (id ? pfad(`/kontakte/${id}`) : null);

  const uebernehmen = async (k: KontaktZeile) => {
    if (!ichId) return;
    setDaten((d) => (d ? { ...d, kontakte: d.kontakte.map((x) => (x.id === k.id ? { ...x, closer_id: ichId } : x)) } : d));
    const res = await fetch(`/api/crm/kontakte/${k.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closer_id: ichId, zuweisung_grund: "Übernommen aus dem Pool" }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!json.ok) {
      meldung.fehler(fehlerText(json.error));
      void laden();
    } else meldung.ok(`${k.name ?? k.email} gehört jetzt dir.`);
  };

  const vorname = name.split(/[\s@]/)[0] ?? "";
  const datumText = new Date(jetzt).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Berlin" });
  const bereit = Boolean(daten) && termine !== null;

  return (
    <Stack gap={5}>
      <SeitenKopf
        titel={
          <>
            {gruss(jetzt)}
            {vorname ? (
              <>
                ,{" "}
                <Text as="span" color="var(--cc-gold-light)">
                  {vorname}
                </Text>
              </>
            ) : null}
            .
          </>
        }
        unter={`${datumText}${bereit ? (dringend ? ` · ${dringend} ${dringend === 1 ? "Sache braucht" : "Dinge brauchen"} dich jetzt` : " · nichts Dringendes offen") : ""}`}
        rechts={
          <>
            {ichId ? (
              <HStack gap={1.5}>
                <Chip aktiv={nurMeine} onClick={() => setNurMeine(true)}>
                  Meine
                </Chip>
                <Chip aktiv={!nurMeine} onClick={() => setNurMeine(false)}>
                  Ganzes Team
                </Chip>
              </HStack>
            ) : null}
            <AktualisierenKnopf
              laedt={laedt}
              onClick={async () => {
                await abgleichen();
                await ladeTermine();
              }}
            />
          </>
        }
      />
      {fehler ? <Hinweis meldung={{ art: "fehler", text: fehler }} /> : null}
      {daten?.migrationFehlt ? <Hinweis meldung={{ art: "fehler", text: "Migration 112 (CRM) ist in der Datenbank noch nicht eingespielt." }} /> : null}

      <Grid templateColumns={{ base: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" }} gap={{ base: 3, md: 4 }}>
        <Kennzahl icon={AlertCircle} label="Jetzt handeln" wert={bereit ? dringend : "–"} ton={dringend ? "danger" : "neutral"} />
        <Kennzahl icon={CalendarClock} label="Termine heute" wert={bereit ? sicht.heuteT.filter((t) => t.status !== "no_show").length : "–"} />
        <Kennzahl icon={Sparkles} label="Neue Leads" wert={bereit ? sicht.neu.length : "–"} ton={sicht.neu.length ? "gold" : "neutral"} />
        <Kennzahl icon={BellRing} label="Wiedervorlagen" wert={bereit ? sicht.wvUeberfaellig.length + sicht.wvHeute.length : "–"} />
      </Grid>

      <Grid templateColumns={{ base: "minmax(0, 1fr)", xl: "minmax(0, 1.55fr) minmax(0, 1fr)" }} gap={{ base: 4, md: 5 }} alignItems="start">
        <Stack gap={{ base: 4, md: 5 }}>
          {!bereit ? (
            <Abschnitt titel="Jetzt handeln">
              <Laden zeilen={3} />
            </Abschnitt>
          ) : dringend ? (
            <Abschnitt titel="Jetzt handeln" zahl={dringend} unter="Von oben nach unten abarbeiten." hero>
              <Stack gap={0} divider={<StackDivider borderColor="var(--cc-line)" />}>
                {sicht.laeuft.map((t) => (
                  <ArbeitsZeile
                    key={`l-${t.id}`}
                    name={t.name ?? t.email}
                    href={kontaktLink(t.kontaktId)}
                    badge={<StatusPill tone="success">läuft jetzt</StatusPill>}
                    unter={`Termin seit ${uhrzeit(t.start_am)} Uhr · ${closerName(team, t.closerId)}`}
                    aktionen={t.join_url ? <Button as="a" href={t.join_url} target="_blank" rel="noopener noreferrer" size="sm" variant="gold" leftIcon={<Video size={14} />}>Einwählen</Button> : null}
                  />
                ))}
                {sicht.verpasst.map((t) => (
                  <ArbeitsZeile
                    key={`v-${t.id}`}
                    name={t.name ?? t.email}
                    href={kontaktLink(t.kontaktId)}
                    badge={<StatusPill tone="danger">Status fehlt</StatusPill>}
                    unter={`Termin ${wann(t.start_am, jetzt)} · nicht erschienen? Erst anrufen, dann No-Show setzen`}
                    aktionen={
                      <>
                        <AnrufKnopf telefon={t.telefon} />
                        {kontaktLink(t.kontaktId) ? (
                          <Button as={NextLink} href={kontaktLink(t.kontaktId)!} size="sm" variant="gold">
                            Status setzen
                          </Button>
                        ) : null}
                      </>
                    }
                  />
                ))}
                {sicht.ergebnis.map((t) => (
                  <ArbeitsZeile
                    key={`e-${t.id}`}
                    name={t.name ?? t.email}
                    href={kontaktLink(t.kontaktId)}
                    badge={<StatusPill tone="danger">Ergebnis fehlt</StatusPill>}
                    unter={`Gespräch ${wann(t.start_am, jetzt)} · ${closerName(team, t.closerId)}`}
                    aktionen={
                      kontaktLink(t.kontaktId) ? (
                        <Button as={NextLink} href={kontaktLink(t.kontaktId)!} size="sm" variant="gold">
                          Ergebnis erfassen
                        </Button>
                      ) : null
                    }
                  />
                ))}
                {sicht.wvUeberfaellig.map((k) => (
                  <ArbeitsZeile
                    key={`w-${k.id}`}
                    name={k.name ?? k.email}
                    href={kontaktLink(k.id)}
                    badge={<StatusPill tone="attention">Wiedervorlage</StatusPill>}
                    unter={`fällig ${relativ(k.wiedervorlage_am, jetzt)} · ${closerName(team, k.closer_id)}`}
                    aktionen={<AnrufKnopf telefon={k.telefon} mitText />}
                  />
                ))}
              </Stack>
            </Abschnitt>
          ) : (
            <Abschnitt titel="Jetzt handeln">
              <Flex align="center" gap={3} py={1}>
                <Flex w="36px" h="36px" borderRadius="full" align="center" justify="center" bg="rgba(74,222,128,0.08)" color="var(--cc-success)">
                  <CircleCheck size={18} strokeWidth={1.75} />
                </Flex>
                <Box>
                  <Text fontSize="14px" fontWeight={500}>
                    Alles erledigt.
                  </Text>
                  <Text fontSize="13px" color="var(--cc-text-2)">
                    Zeit für neue Leads oder die Wiedervorlagen der nächsten Tage.
                  </Text>
                </Box>
              </Flex>
            </Abschnitt>
          )}

          <Abschnitt titel="Tagesplan" zahl={bereit ? sicht.heuteT.length : undefined}>
            {!bereit ? (
              <Laden zeilen={3} />
            ) : sicht.heuteT.length === 0 ? (
              <LeerZustand icon={Coffee} titel={`Heute keine Termine${nurMeine ? " für dich" : ""}.`} text="Neue Termine aus Calendly erscheinen hier automatisch." />
            ) : (
              <Tagesplan termine={sicht.heuteT} jetzt={jetzt} team={team} link={kontaktLink} />
            )}
          </Abschnitt>
        </Stack>

        <Stack gap={{ base: 4, md: 5 }}>
          <Abschnitt titel="Neue Leads" zahl={bereit ? sicht.neu.length : undefined} unter="Neueste zuerst. Wer im Pool zuerst anruft, übernimmt.">
            {!daten ? (
              <Laden zeilen={3} hoehe="44px" />
            ) : sicht.neu.length === 0 ? (
              <LeerZustand icon={UserPlus} titel="Keine neuen Leads." />
            ) : (
              <Stack gap={0} maxH="440px" overflowY="auto" mx={-2} px={2} divider={<StackDivider borderColor="var(--cc-line)" />}>
                {sicht.neu.slice(0, 60).map((k) => {
                  const alter = jetzt - new Date(k.created_at).getTime();
                  return (
                    <ArbeitsZeile
                      key={k.id}
                      kompakt
                      name={k.name ?? k.email}
                      href={kontaktLink(k.id)}
                      badge={alter < STD ? <StatusPill tone="attention">neu</StatusPill> : alter > 24 * STD ? <StatusPill tone="danger">wartet</StatusPill> : null}
                      unter={`${relativ(k.created_at, jetzt)} · ${k.closer_id ? closerName(team, k.closer_id) : "Pool"}`}
                      aktionen={
                        <>
                          <AnrufKnopf telefon={k.telefon} />
                          {!k.closer_id && ichId ? (
                            <Button size="sm" variant="line" onClick={() => void uebernehmen(k)}>
                              Übernehmen
                            </Button>
                          ) : null}
                        </>
                      }
                    />
                  );
                })}
              </Stack>
            )}
          </Abschnitt>

          <Abschnitt titel="Später heute" zahl={bereit ? sicht.wvHeute.length : undefined}>
            {sicht.wvHeute.length === 0 ? (
              <Text fontSize="13px" color="var(--cc-text-3)">
                Keine weiteren Wiedervorlagen für heute.
              </Text>
            ) : (
              <Stack gap={0} divider={<StackDivider borderColor="var(--cc-line)" />}>
                {sicht.wvHeute.map((k) => (
                  <ArbeitsZeile
                    key={k.id}
                    kompakt
                    name={k.name ?? k.email}
                    href={kontaktLink(k.id)}
                    badge={<PhasePill phase={k.phase} />}
                    unter={`um ${uhrzeit(k.wiedervorlage_am!)} Uhr · ${closerName(team, k.closer_id)}`}
                    aktionen={<AnrufKnopf telefon={k.telefon} />}
                  />
                ))}
              </Stack>
            )}
          </Abschnitt>

          <Abschnitt titel="Nächste Tage" zahl={bereit ? sicht.spaeterT.length : undefined}>
            {sicht.spaeterT.length === 0 ? (
              <Text fontSize="13px" color="var(--cc-text-3)">
                Keine Termine in den nächsten drei Tagen.
              </Text>
            ) : (
              <NaechsteTage termine={sicht.spaeterT} jetzt={jetzt} team={team} link={kontaktLink} />
            )}
          </Abschnitt>
        </Stack>
      </Grid>
    </Stack>
  );
}

/* ─── Bausteine ─────────────────────────────────────────────────────────── */

function ArbeitsZeile({
  name,
  href,
  badge,
  unter,
  aktionen,
  kompakt = false,
}: {
  name: string;
  href: string | null;
  badge?: ReactNode;
  unter: string;
  aktionen?: ReactNode;
  kompakt?: boolean;
}) {
  return (
    <Flex align="center" gap={3} py={kompakt ? 2.5 : 3} wrap={{ base: "wrap", sm: "nowrap" }}>
      <Avatar name={name} groesse={kompakt ? 30 : 34} />
      <Box flex="1" minW="140px">
        <Flex align="center" gap={2} minW={0}>
          {href ? (
            <Text as={NextLink} href={href} fontSize="14px" fontWeight={500} noOfLines={1} _hover={{ color: "var(--cc-gold-light)" }}>
              {name}
            </Text>
          ) : (
            <Text fontSize="14px" fontWeight={500} noOfLines={1}>
              {name}
            </Text>
          )}
          {badge}
        </Flex>
        <Text fontSize="12px" color="var(--cc-text-3)" noOfLines={1}>
          {unter}
        </Text>
      </Box>
      {aktionen ? (
        <HStack gap={1.5} flexShrink={0} ml={{ base: "42px", sm: 0 }}>
          {aktionen}
        </HStack>
      ) : null}
    </Flex>
  );
}

function AnrufKnopf({ telefon, mitText = false }: { telefon: string | null; mitText?: boolean }) {
  if (!telefon) return null;
  const href = `tel:${telefon.replace(/[^\d+]/g, "")}`;
  if (mitText) {
    return (
      <Button as="a" href={href} size="sm" variant="gold" leftIcon={<Phone size={14} />}>
        Anrufen
      </Button>
    );
  }
  return <IconKnopf icon={Phone} label={`${telefon} anrufen`} href={href} />;
}

/** Tagesplan als Zeitleiste: Uhrzeit, Schiene mit Statuspunkt, „Jetzt"-Linie zwischen Vergangenem und Kommendem. */
function Tagesplan({
  termine,
  jetzt,
  team,
  link,
}: {
  termine: TerminKurz[];
  jetzt: number;
  team: TeamMitglied[];
  link: (id: string | null) => string | null;
}) {
  const jetztIndex = termine.findIndex((t) => new Date(t.start_am).getTime() > jetzt);
  const zeilen: ReactNode[] = [];
  termine.forEach((t, i) => {
    if (i === jetztIndex) zeilen.push(<JetztLinie key="jetzt" jetzt={jetzt} />);
    const start = new Date(t.start_am).getTime();
    const laeuft = t.status === "gebucht" && start <= jetzt && jetzt < start + NO_SHOW_ANRUF_MINUTEN * 60_000;
    const vorbeiOhne = t.status === "gebucht" && jetzt >= start + NO_SHOW_ANRUF_MINUTEN * 60_000;
    const kommt = t.status === "gebucht" && start > jetzt;
    const punkt = t.status === "gefuehrt" ? "success" : t.status === "no_show" || vorbeiOhne ? "danger" : laeuft ? "live" : "offen";
    const href = link(t.kontaktId);
    zeilen.push(
      <Grid key={t.id} templateColumns="52px 18px minmax(0, 1fr) auto" columnGap={3} alignItems="center" py={2.5} opacity={t.status === "no_show" ? 0.7 : 1}>
        <Text className="cc-num" fontSize="14px" fontWeight={600} color={kommt || laeuft ? "var(--cc-text)" : "var(--cc-text-3)"}>
          {uhrzeit(t.start_am)}
        </Text>
        <Flex justify="center" position="relative" h="100%" align="center">
          <Box position="absolute" top="-12px" bottom="-12px" w="1px" bg="var(--cc-line-strong)" />
          <Box
            position="relative"
            w="11px"
            h="11px"
            borderRadius="full"
            className={punkt === "live" ? "crm-jetzt-punkt" : undefined}
            bg={punkt === "success" ? "var(--cc-success)" : punkt === "danger" ? "var(--cc-danger)" : punkt === "live" ? "var(--cc-gold-light)" : "var(--cc-bg)"}
            border={punkt === "offen" ? "1.5px solid var(--cc-text-3)" : "none"}
          />
        </Flex>
        <Box minW={0}>
          <Flex align="center" gap={2}>
            {href ? (
              <Text as={NextLink} href={href} fontSize="14px" fontWeight={500} noOfLines={1} _hover={{ color: "var(--cc-gold-light)" }}>
                {t.name ?? t.email}
              </Text>
            ) : (
              <Text fontSize="14px" fontWeight={500} noOfLines={1}>
                {t.name ?? t.email}
              </Text>
            )}
            {t.status === "gefuehrt" ? <StatusPill tone="success">Geführt</StatusPill> : null}
            {t.status === "no_show" ? <StatusPill tone="danger">No-Show</StatusPill> : null}
            {laeuft ? <StatusPill tone="success">läuft jetzt</StatusPill> : null}
            {vorbeiOhne ? <StatusPill tone="danger">Status fehlt</StatusPill> : null}
          </Flex>
          <Flex align="center" gap={1.5} fontSize="12px" color="var(--cc-text-3)">
            <Avatar name={closerName(team, t.closerId)} groesse={16} />
            <Text noOfLines={1}>
              {closerName(team, t.closerId)}
              {kommt ? ` · ${relativ(t.start_am, jetzt)}` : ""}
            </Text>
          </Flex>
        </Box>
        <HStack gap={1.5}>
          {t.status === "gebucht" && t.join_url && (laeuft || kommt) ? (
            <IconKnopf icon={Video} label="Einwählen" href={t.join_url} extern gold={laeuft} />
          ) : null}
          {vorbeiOhne && t.telefon ? <IconKnopf icon={Phone} label={`${t.telefon} anrufen`} href={`tel:${t.telefon.replace(/[^\d+]/g, "")}`} /> : null}
        </HStack>
      </Grid>,
    );
  });
  if (jetztIndex === -1) zeilen.push(<JetztLinie key="jetzt" jetzt={jetzt} />);
  return <Box>{zeilen}</Box>;
}

function JetztLinie({ jetzt }: { jetzt: number }) {
  return (
    <Grid templateColumns="52px 18px minmax(0, 1fr)" columnGap={3} alignItems="center" py={1} aria-label="Jetzt">
      <Text className="cc-num" fontSize="11px" fontWeight={600} color="var(--cc-gold-light)" letterSpacing="0.06em" textTransform="uppercase">
        {uhrzeit(new Date(jetzt).toISOString())}
      </Text>
      <Flex justify="center">
        <Box w="7px" h="7px" borderRadius="full" bg="var(--cc-gold-light)" boxShadow="0 0 10px rgba(212,176,128,0.7)" />
      </Flex>
      <Box h="1px" bg="var(--cc-gold-bar)" opacity={0.75} />
    </Grid>
  );
}

function NaechsteTage({
  termine,
  jetzt,
  team,
  link,
}: {
  termine: TerminKurz[];
  jetzt: number;
  team: TeamMitglied[];
  link: (id: string | null) => string | null;
}) {
  const morgen = berlinTag(jetzt + 24 * STD);
  const gruppen = new Map<string, TerminKurz[]>();
  for (const t of termine) {
    const tag = berlinTag(new Date(t.start_am).getTime());
    gruppen.set(tag, [...(gruppen.get(tag) ?? []), t]);
  }
  return (
    <Stack gap={3}>
      {[...gruppen.entries()].map(([tag, liste]) => (
        <Fragment key={tag}>
          <Text fontSize="11px" fontWeight={500} letterSpacing="0.1em" textTransform="uppercase" color="var(--cc-text-3)">
            {tag === morgen
              ? "Morgen"
              : new Date(liste[0]!.start_am).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Berlin" })}
          </Text>
          <Stack gap={0} mt={-1} divider={<StackDivider borderColor="var(--cc-line)" />}>
            {liste.map((t) => (
              <ArbeitsZeile
                key={t.id}
                kompakt
                name={t.name ?? t.email}
                href={link(t.kontaktId)}
                unter={`${uhrzeit(t.start_am)} Uhr · ${closerName(team, t.closerId)}`}
              />
            ))}
          </Stack>
        </Fragment>
      ))}
    </Stack>
  );
}
