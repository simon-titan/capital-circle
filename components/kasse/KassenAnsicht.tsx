import type { ReactNode } from "react";
import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react";
import { Check, CircleCheck, Clock, Mail, Minus, ShieldCheck, UserRound } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { KassenKnopf } from "@/components/kasse/KassenKnopf";
import { RechtsLinks } from "@/components/legal/RechtsFusszeile";
import { anbieter } from "@/config/legal";
import { ZahlungsIcons } from "@/components/landing/membership/ZahlungsIcons";
import { CLOSER_AUSWAHL, PRODUKTE, euro, garantie, type Leistung } from "@/config/mentoring";
import {
  angebotsZusammenfassung,
  ersteLiveAbbuchung,
  type Kassenlink,
  type KassenlinkZustand,
} from "@/lib/mentoring/kasse";

/**
 * Inhalt der Kassenseite (`app/kasse/[token]`), ohne Datenbank.
 *
 * Steht als eigener Baustein, weil ihn zwei Seiten zeigen: die echte
 * Kassenseite mit dem Link aus der Datenbank und die Vorschau für Emre
 * (`/vorschau/mentoring/kasse/<variante>`) mit Beispieldaten. Beide sollen
 * exakt dasselbe Layout zeigen — eine nachgebaute Vorschau liefe nach der
 * ersten Änderung auseinander.
 *
 * Mit `vorschau` legt der Kaufknopf keine Stripe-Kasse an.
 */

/** Fehlercodes aus `app/api/kasse/[token]/route.ts` (`KasseFehler` in `lib/mentoring/kasse.ts`). */
function fehlertext(code: string, ansprechpartner: string): string {
  switch (code) {
    case "stripe_fehler":
      return `Die Zahlungsseite ließ sich gerade nicht öffnen. Bitte versuch es in einem Moment noch einmal. Klappt es weiterhin nicht, melde dich bei ${ansprechpartner}.`;
    case "kein_mentoring_konto":
      return `Das Live-Abo setzt ein Mentoring-Programm voraus. Zu dieser E-Mail-Adresse haben wir noch kein Programm gefunden. Bitte melde dich bei ${ansprechpartner}.`;
    case "live_laeuft":
      return "Für dieses Konto läuft bereits ein Live-Trading-Abo. Ein zweites ist nicht nötig.";
    default:
      return `Beim Öffnen der Zahlungsseite ist etwas schiefgelaufen. Bitte versuch es noch einmal oder melde dich bei ${ansprechpartner}.`;
  }
}

/** Fehler, die ein zweiter Klick nicht behebt — dann steht kein Kaufknopf da, sondern nur der Weg zum Ansprechpartner. */
const ENDGUELTIG = new Set(["kein_mentoring_konto", "live_laeuft"]);

const WOCHENTAGE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

/** „Fr, 24. Okt" (DESIGN.md, Time-Vocabulary Rule), in deutscher Zeit. */
function kurzdatum(iso: string): string {
  const teile = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date(iso));
  const wert = (typ: string) => Number(teile.find((t) => t.type === typ)?.value ?? 0);
  const tag = new Date(Date.UTC(wert("year"), wert("month") - 1, wert("day")));
  return `${WOCHENTAGE[tag.getUTCDay()]}, ${wert("day")}. ${MONATE[wert("month") - 1]}`;
}

/** Vorname des Closers aus `CLOSER_AUSWAHL`, sonst `null`. */
function closerName(slug: string | null): string | null {
  return CLOSER_AUSWAHL.find((c) => c.id === slug)?.name ?? null;
}

function kontaktMail(betreff: string): string {
  return `mailto:${anbieter.email}?subject=${encodeURIComponent(betreff)}`;
}

const label = {
  fontSize: "13px",
  lineHeight: "18px",
  fontWeight: 500,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
} as const;

const textLink = {
  color: "var(--cc-gold-light)",
  textDecoration: "underline",
  textDecorationColor: "var(--cc-gold-line)",
  textUnderlineOffset: "3px",
  _hover: { color: "var(--cc-text)" },
} as const;

export function KassenAnsicht({
  link,
  zustand,
  fehler,
  vorschau = false,
  liveBis = null,
  kopf,
}: {
  link: Kassenlink;
  zustand: KassenlinkZustand;
  /** Fehlercode aus `?fehler=` (nur im Zustand „offen" angezeigt). */
  fehler: string | null;
  vorschau?: boolean;
  /** Live-Abo: Ende des laufenden Live-Zugangs des Kunden (`profiles.live_bis`), bestimmt die erste Abbuchung. */
  liveBis?: string | null;
  /** Optionaler Streifen ganz oben (Vorschau-Hinweis). */
  kopf?: ReactNode;
}) {
  const name = closerName(link.closer);
  const ansprechpartner = name ?? "deinem Ansprechpartner";
  const produktName = PRODUKTE[link.produkt].name;

  return (
    <Box position="relative" minH="100vh" w="full" bg="var(--cc-bg)" color="var(--cc-text)" overflowX="clip">
      <Box className="cc-stars" aria-hidden />
      <Box className="cc-goldlight" aria-hidden />

      {kopf}

      <Flex position="relative" zIndex={1} justify="center" px={4} pt={{ base: 10, md: 16 }} pb={10}>
        <Stack spacing={{ base: 7, md: 8 }} w="full" maxW="560px">
          <Flex justify="center" className="cc-rise">
            <Box maxW="170px">
              <Logo variant="onDark" />
            </Box>
          </Flex>

          {zustand === "offen" ? (
            <Angebot
              link={link}
              fehler={fehler}
              ansprechpartner={ansprechpartner}
              vorschau={vorschau}
              liveBis={liveBis}
            />
          ) : zustand === "bezahlt" ? (
            <Hinweis
              icon={<CircleCheck size={24} strokeWidth={1.75} />}
              gold
              titel="Bereits bezahlt"
              text={`Dieses Angebot ist bezahlt. Die Zugangsdaten haben wir an ${link.email} geschickt. Falls du dich schon angemeldet hast, geht es über den Login direkt weiter.`}
            >
              <Button as="a" href="/login" variant="gold" h="48px" px={7} mt={2}>
                Zum Login
              </Button>
            </Hinweis>
          ) : (
            <Hinweis
              icon={<Clock size={24} strokeWidth={1.75} />}
              titel={zustand === "abgelaufen" ? "Dieser Link ist abgelaufen" : "Dieser Link gilt nicht mehr"}
              text={`Bitte melde dich bei ${ansprechpartner}, dann bekommst du einen neuen Link.`}
            />
          )}

          <Ansprechpartner name={name} mailto={kontaktMail(`Mein Angebot: ${produktName}`)} />

          <Stack spacing={4} pt={2} align="center" textAlign="center">
            <Text fontSize="12px" color="var(--cc-text-3)" maxW="480px" lineHeight={1.7}>
              Trading ist mit erheblichen Verlustrisiken verbunden. Frühere Ergebnisse sind keine Garantie für zukünftige
              Gewinne. Capital Circle vermittelt Wissen und erbringt keine Anlageberatung.
            </Text>
            <RechtsLinks />
          </Stack>
        </Stack>
      </Flex>
    </Box>
  );
}

/* ── Ansprechpartner ────────────────────────────────────────────────────── */

/**
 * Wer das Angebot gemacht hat und wie man ihn erreicht — in jedem Zustand.
 * Jeder Fehler- und Ablauftext verweist auf den Ansprechpartner; ohne Name und
 * Weg wäre das eine Sackgasse.
 */
function Ansprechpartner({ name, mailto }: { name: string | null; mailto: string }) {
  return (
    <Flex
      gap={3.5}
      align="center"
      px={{ base: 4, md: 5 }}
      py={4}
      border="1px solid var(--cc-line)"
      borderRadius="12px"
      bg="rgba(255, 255, 255, 0.02)"
      className="cc-rise"
    >
      <Flex
        w="40px"
        h="40px"
        flexShrink={0}
        align="center"
        justify="center"
        borderRadius="full"
        border="1px solid var(--cc-line-strong)"
        color="var(--cc-text-2)"
        aria-hidden
      >
        <UserRound size={18} strokeWidth={1.75} />
      </Flex>
      <Box minW={0} fontSize="14px" lineHeight={1.55}>
        <Text color="var(--cc-text)">
          {name ? (
            <>
              Dein Ansprechpartner:{" "}
              <Box as="span" fontWeight={600}>
                {name}
              </Box>
            </>
          ) : (
            "Fragen zu deinem Angebot?"
          )}
        </Text>
        <Text color="var(--cc-text-2)" overflowWrap="anywhere">
          {name ? "Fragen? " : null}Schreib an{" "}
          <Box as="a" href={mailto} {...textLink}>
            {anbieter.email}
          </Box>
        </Text>
      </Box>
      <Box
        as="a"
        href={mailto}
        ml="auto"
        flexShrink={0}
        display={{ base: "none", sm: "inline-flex" }}
        alignItems="center"
        justifyContent="center"
        w="40px"
        h="40px"
        borderRadius="8px"
        border="1px solid var(--cc-line-strong)"
        color="var(--cc-text-soft)"
        aria-label={`E-Mail an ${anbieter.email}`}
        transition="border-color 180ms var(--cc-ease), color 180ms var(--cc-ease)"
        _hover={{ borderColor: "var(--cc-gold-line)", color: "var(--cc-gold-light)" }}
      >
        <Mail size={17} strokeWidth={1.75} />
      </Box>
    </Flex>
  );
}

/* ── Offenes Angebot ────────────────────────────────────────────────────── */

function Angebot({
  link,
  fehler,
  ansprechpartner,
  vorschau,
  liveBis,
}: {
  link: Kassenlink;
  fehler: string | null;
  ansprechpartner: string;
  vorschau: boolean;
  liveBis: string | null;
}) {
  const a = angebotsZusammenfassung(link);
  const produkt = a.produkt;
  const ersteAbbuchung = a.istAbo ? ersteLiveAbbuchung(liveBis) : null;
  // Gemischt in einer Liste sah man nicht, was nach Ablauf der Betreuung bleibt.
  const dauerhaft = produkt.enthalten.filter((l) => l.dauerhaft);
  const befristet = produkt.enthalten.filter((l) => !l.dauerhaft);
  // Solange `garantie.freigegeben` false ist, steht hier nichts (siehe config/mentoring.ts).
  const zeigeGarantie = garantie.freigegeben && (garantie.produkte as readonly string[]).includes(link.produkt);

  const gross = a.istAbo ? euro(produkt.preisCents) : a.istRaten ? euro(a.rateCents) : euro(a.gesamtCents);
  const proMonat = a.istAbo || a.istRaten;
  const endgueltig = fehler ? ENDGUELTIG.has(fehler) : false;

  return (
    <>
      <Stack spacing={2.5} align="center" textAlign="center" className="cc-rise">
        <Text {...label} color="var(--cc-gold-light)">
          Dein persönliches Angebot
        </Text>
        <Box as="h1" fontSize={{ base: "28px", md: "34px" }} fontWeight={600} lineHeight={1.15} letterSpacing="-0.01em">
          {produkt.name}
        </Box>
        {link.name ? (
          <Text fontSize="16px" color="var(--cc-text-2)">
            Für {link.name}
          </Text>
        ) : null}
      </Stack>

      <Box className="cc-card cc-card--hero cc-rise" p={{ base: 5, md: 7 }}>
        {/* ── Preis ──────────────────────────────────────────────────── */}
        <Stack spacing={1.5}>
          <Text {...label} color="var(--cc-text-soft)">
            {a.istAbo ? "Monatlich" : a.istRaten ? "Monatsrate" : "Einmalzahlung"}
          </Text>
          <Flex align="baseline" gap={2} wrap="wrap">
            <Text
              as="span"
              className="cc-num"
              fontSize={{ base: "40px", md: "48px" }}
              fontWeight={600}
              lineHeight={1.05}
              letterSpacing="-0.02em"
            >
              {gross}
            </Text>
            {proMonat ? (
              <Text as="span" fontSize="16px" color="var(--cc-text-2)">
                / Monat
              </Text>
            ) : null}
          </Flex>
          {a.istRaten ? (
            <Text fontSize="15px" color="var(--cc-text)" className="cc-num">
              Heute fällig: {euro(a.rateCents)}, danach {a.raten - 1} {a.raten - 1 === 1 ? "weitere Rate" : "weitere Raten"}{" "}
              im Monatsabstand. Zusammen {euro(a.sollCents)}.
            </Text>
          ) : null}
          {a.istAbo ? (
            <Text fontSize="15px" color="var(--cc-text)" className="cc-num">
              {ersteAbbuchung
                ? `Erste Abbuchung am ${kurzdatum(ersteAbbuchung.toISOString())}, wenn dein Live-Zugang aus dem Programm endet. Danach monatlich.`
                : "Erste Abbuchung heute, danach monatlich am selben Tag."}
            </Text>
          ) : null}
          <Text fontSize="14px" color="var(--cc-text-2)" lineHeight={1.55}>
            {a.istAbo
              ? "Inkl. MwSt. Monatlich kündbar."
              : a.istRaten
                ? "Inkl. MwSt., ohne Aufschlag. Endet nach der letzten Rate von selbst, eine Kündigung ist nicht nötig."
                : "Inkl. MwSt. Keine Verlängerung, keine weitere Abbuchung."}
          </Text>
        </Stack>

        <Box h="1px" bg="var(--cc-line)" my={{ base: 5, md: 6 }} aria-hidden />

        {/* ── Leistungen ─────────────────────────────────────────────── */}
        <Stack spacing={5}>
          {dauerhaft.length && befristet.length ? (
            <>
              <LeistungsListe titel="Dauerhaft enthalten" eintraege={dauerhaft} />
              <LeistungsListe titel="Live und Betreuung" eintraege={befristet} />
            </>
          ) : (
            <LeistungsListe titel="Enthalten" eintraege={produkt.enthalten} />
          )}
          {produkt.nichtEnthalten.length ? (
            <LeistungsListe titel="Nicht enthalten" eintraege={produkt.nichtEnthalten} gedaempft />
          ) : null}

          <Box
            px={4}
            py={3}
            bg="rgba(255, 255, 255, 0.02)"
            border="1px solid var(--cc-line)"
            borderRadius="10px"
            fontSize="14px"
            color="var(--cc-text-2)"
            lineHeight={1.6}
          >
            {a.istAbo
              ? "Läuft monatlich und ist jederzeit zum Ende des laufenden Monats kündbar."
              : `Plattform, Kurse und Trading Journal bleiben dauerhaft offen. Der Live-Zugang läuft ${produkt.liveMonate} Monate ab Kauf; danach kannst du ihn mit dem Live-Trading-Abo für ${euro(PRODUKTE.live.preisCents)} im Monat verlängern.`}
          </Box>

          {zeigeGarantie ? (
            <Flex gap={3} align="flex-start" fontSize="14px" color="var(--cc-text-soft)" lineHeight={1.6}>
              <Box color="var(--cc-gold-light)" mt="2px" flexShrink={0}>
                <ShieldCheck size={18} strokeWidth={1.75} />
              </Box>
              <Text>
                {garantie.kurz}{" "}
                <Box as="a" href="/garantie" {...textLink} whiteSpace="nowrap">
                  Bedingungen lesen
                </Box>
              </Text>
            </Flex>
          ) : null}
        </Stack>

        {/* ── Aktion ─────────────────────────────────────────────────── */}
        <Stack spacing={3} mt={{ base: 6, md: 7 }}>
          {/* Für wen das Konto entsteht — vor dem Knopf, nicht im Kleingedruckten: Eine falsche
              Adresse fällt hier auf, nach der Zahlung hängt der Zugang daran. */}
          <Flex
            justify="space-between"
            align="baseline"
            gap={3}
            wrap="wrap"
            px={4}
            py={3}
            borderRadius="10px"
            bg="rgba(255, 255, 255, 0.02)"
            border="1px solid var(--cc-line)"
            fontSize="14px"
            lineHeight={1.5}
          >
            <Text color="var(--cc-text-2)" minW={0} overflowWrap="anywhere">
              Zugang für{" "}
              <Box as="span" color="var(--cc-text)" fontWeight={500}>
                {link.email}
              </Box>
            </Text>
            <Box
              as="a"
              href={kontaktMail(`Falsche E-Mail-Adresse im Angebot (${produkt.name})`)}
              {...textLink}
              fontSize="13px"
              color="var(--cc-text-2)"
              textDecorationColor="var(--cc-line-strong)"
            >
              Stimmt nicht?
            </Box>
          </Flex>

          {fehler ? (
            <Box
              role="alert"
              px={4}
              py={3}
              bg="rgba(248, 113, 113, 0.1)"
              border="1px solid rgba(248, 113, 113, 0.3)"
              borderRadius="8px"
              fontSize="14px"
              lineHeight={1.55}
              color="var(--cc-text)"
            >
              {fehlertext(fehler, ansprechpartner)}
            </Box>
          ) : null}
          {endgueltig ? null : (
            <KassenKnopf action={`/api/kasse/${encodeURIComponent(link.token)}`} vorschau={vorschau} />
          )}
          {/* Dieselben Logos wie im Beitritts-Modal. Sie stimmen nur, solange die Mentoring-Kasse
              Stripes Standard-Zahlarten nutzt; mit eigener Konfiguration (`STRIPE_PMC_MENTORING`)
              blenden wir sie aus, statt Zahlarten zu zeigen, die die Kasse vielleicht nicht anbietet. */}
          {process.env.STRIPE_PMC_MENTORING?.trim() ? null : (
            <Box pt={1}>
              <ZahlungsIcons />
            </Box>
          )}
          <Text fontSize="13px" color="var(--cc-text-3)" textAlign="center" lineHeight={1.6}>
            Sichere Zahlung über Stripe. Dort siehst du vor dem Bezahlen noch einmal alle Angaben.
            <br />
            Angebot gültig bis {kurzdatum(link.gueltig_bis)}
          </Text>
        </Stack>
      </Box>
    </>
  );
}

function LeistungsListe({
  titel,
  eintraege,
  gedaempft = false,
}: {
  titel: string;
  eintraege: Leistung[];
  gedaempft?: boolean;
}) {
  return (
    <Stack spacing={3}>
      <Text as="h2" {...label} color="var(--cc-text-soft)">
        {titel}
      </Text>
      <Stack as="ul" listStyleType="none" spacing={3}>
        {eintraege.map((l) => (
          <Flex as="li" key={l.text} gap={3} align="flex-start">
            <Flex
              w="20px"
              h="20px"
              mt="1px"
              flexShrink={0}
              align="center"
              justify="center"
              borderRadius="full"
              bg={gedaempft ? "transparent" : "var(--cc-gold-wash)"}
              border="1px solid"
              borderColor={gedaempft ? "var(--cc-line-strong)" : "rgba(212, 176, 128, 0.32)"}
              color={gedaempft ? "var(--cc-text-3)" : "var(--cc-gold-light)"}
              aria-hidden
            >
              {gedaempft ? <Minus size={12} strokeWidth={2} /> : <Check size={12} strokeWidth={2.5} />}
            </Flex>
            <Box minW={0}>
              <Text fontSize="15px" lineHeight={1.45} color={gedaempft ? "var(--cc-text-2)" : "var(--cc-text)"}>
                {l.text}
              </Text>
              {l.detail ? (
                <Text fontSize="13px" lineHeight={1.5} color="var(--cc-text-3)" mt={0.5}>
                  {l.detail}
                </Text>
              ) : null}
            </Box>
          </Flex>
        ))}
      </Stack>
    </Stack>
  );
}

/* ── Bezahlt, storniert, abgelaufen, unbekannt ──────────────────────────── */

export function Hinweis({
  icon,
  titel,
  text,
  gold = false,
  children,
}: {
  icon: ReactNode;
  titel: string;
  text: string;
  gold?: boolean;
  children?: ReactNode;
}) {
  return (
    <Box className="cc-card cc-rise" p={{ base: 6, md: 8 }}>
      <Stack spacing={4} align="center" textAlign="center">
        <Flex
          w="52px"
          h="52px"
          align="center"
          justify="center"
          borderRadius="full"
          bg={gold ? "var(--cc-gold-wash)" : "rgba(255, 255, 255, 0.03)"}
          border="1px solid"
          borderColor={gold ? "rgba(212, 176, 128, 0.32)" : "var(--cc-line-strong)"}
          color={gold ? "var(--cc-gold-light)" : "var(--cc-text-2)"}
          aria-hidden
        >
          {icon}
        </Flex>
        <Box as="h1" fontSize={{ base: "24px", md: "28px" }} fontWeight={600} lineHeight={1.2} letterSpacing="-0.01em">
          {titel}
        </Box>
        <Text fontSize="15px" color="var(--cc-text-2)" lineHeight={1.6} maxW="42ch" overflowWrap="anywhere">
          {text}
        </Text>
        {children}
      </Stack>
    </Box>
  );
}
