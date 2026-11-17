import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Box, Flex, Grid, Stack, Text } from "@chakra-ui/react";
import { ArrowUpRight, Mail } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { MENTORING_PRODUKTE, PRODUKTE, erlaubteRaten, euro, rateCents, type KassenProdukt } from "@/config/mentoring";

export const metadata: Metadata = {
  title: "Mentoring-Funnel · Vorschau",
  robots: { index: false, follow: false },
};

/**
 * Übersicht für die Abnahme durch Emre (`/vorschau/mentoring`).
 *
 * Alles, was ein Käufer vom ersten Klick bis zur Bestätigungsmail sieht, an
 * einer Adresse und mit Beispieldaten: Call-Funnel, die Kassenseiten aller
 * Angebote, die Sonderfälle, die Bestätigungsmail und der Garantie-Entwurf.
 * Nichts davon schreibt in die Datenbank oder öffnet eine Stripe-Kasse.
 *
 * Unter `/vorschau/`, weil `proxy.ts` den Pfad von Anmeldung **und**
 * Wartungs-Gate ausnimmt — der Link funktioniert also auch, solange die
 * Plattform zu ist.
 */

const ABLAUF = [
  { titel: "Anzeige oder Discord", text: "Der Besucher landet auf der Seite zum kostenlosen Strategie-Gespräch." },
  { titel: "Video und Fragebogen", text: "Er schaut das Video, beantwortet sechs Fragen und bucht direkt im Kalender." },
  { titel: "Closing-Call", text: "Das Team führt das Gespräch und legt im Admin einen persönlichen Kassenlink an." },
  { titel: "Kassenseite", text: "Der Kunde sieht sein Angebot, prüft die Leistungen und zahlt über Stripe." },
  { titel: "Zugang", text: "Konto, Bestätigungsmail mit allen Leistungen und Zugang zur Plattform entstehen automatisch." },
];

const OFFEN: { titel: string; text: string; link?: { href: string; label: string } }[] = [
  {
    titel: "Garantiebedingungen abnehmen",
    text: "Bis zur Freigabe zeigt keine Seite den Garantiesatz. Der Entwurf gilt für Main und Premium.",
    link: { href: "/vorschau/mentoring/garantie", label: "Entwurf lesen" },
  },
  {
    titel: "Video für die Funnel-Seite",
    text: "Ohne Video beginnt die Seite direkt mit dem Gespräch. In der Vorschau steht ein Platzhalter, wo es hinkommt.",
  },
  {
    titel: "Video-Testimonials",
    text: "Bis sie da sind, zeigen die Case Studies die vier bekannten Fälle mit Bild-Nachweis.",
  },
  {
    titel: "Preise, Raten und Leistungen prüfen",
    text: "Alles unten kommt aus derselben Quelle wie die echte Kasse. Was hier falsch ist, wäre es dort auch.",
  },
];

function Abschnitt({ titel, text, children }: { titel: string; text?: string; children: ReactNode }) {
  return (
    <Stack as="section" spacing={{ base: 5, md: 6 }}>
      <Stack spacing={2}>
        <Box as="h2" fontSize={{ base: "22px", md: "26px" }} fontWeight={600} lineHeight={1.2} letterSpacing="-0.01em">
          {titel}
        </Box>
        {text ? (
          <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text-2)" maxW="62ch">
            {text}
          </Text>
        ) : null}
      </Stack>
      {children}
    </Stack>
  );
}

const linkStil = {
  display: "inline-flex",
  alignItems: "center",
  gap: 1.5,
  fontSize: "14px",
  fontWeight: 500,
  color: "var(--cc-gold-light)",
  textDecoration: "underline",
  textDecorationColor: "var(--cc-gold-line)",
  textUnderlineOffset: "3px",
  _hover: { color: "var(--cc-text)" },
} as const;

function VorschauLink({ href, children, icon }: { href: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <Box as="a" href={href} target="_blank" rel="noopener" {...linkStil}>
      {children}
      {icon ?? <ArrowUpRight size={15} strokeWidth={1.75} aria-hidden />}
    </Box>
  );
}

function AngebotsKarte({ produkt }: { produkt: KassenProdukt }) {
  const p = PRODUKTE[produkt];
  const istLive = produkt === "live";
  const raten = erlaubteRaten(produkt).filter((n) => n > 1);
  const ratenText = raten.length > 1 ? `${raten.slice(0, -1).join(", ")} oder ${raten[raten.length - 1]}` : String(raten[0] ?? "");
  const maxRaten = raten[raten.length - 1] ?? 1;
  const maxRate = rateCents(p.preisCents, maxRaten);

  return (
    <Stack className="cc-card" p={{ base: 5, md: 6 }} spacing={4} h="full">
      <Stack spacing={1}>
        <Text fontSize="17px" fontWeight={600} lineHeight={1.3}>
          {p.name}
        </Text>
        <Text className="cc-num" fontSize="28px" fontWeight={600} lineHeight={1.1} letterSpacing="-0.02em">
          {euro(p.preisCents)}
          {istLive ? (
            <Box as="span" fontSize="15px" fontWeight={400} color="var(--cc-text-2)" ml={1.5}>
              / Monat
            </Box>
          ) : null}
        </Text>
        <Text fontSize="14px" lineHeight={1.55} color="var(--cc-text-2)">
          {istLive
            ? "Anschluss nach dem Programm, monatlich kündbar"
            : `Einmal oder in ${ratenText} Raten (${maxRaten} × ${euro(maxRate)}) · ${p.liveMonate} Monate Live-Zugang`}
        </Text>
      </Stack>

      <Stack spacing={2} mt="auto" pt={2} borderTop="1px solid var(--cc-line)">
        <Text fontSize="13px" color="var(--cc-text-3)" pt={2}>
          Kassenseite
        </Text>
        <Flex gap={4} wrap="wrap">
          <VorschauLink href={`/vorschau/mentoring/kasse/${produkt}`}>{istLive ? "Abo" : "Einmalzahlung"}</VorschauLink>
          {!istLive ? <VorschauLink href={`/vorschau/mentoring/kasse/${produkt}-raten`}>In Raten</VorschauLink> : null}
        </Flex>
        <Text fontSize="13px" color="var(--cc-text-3)" pt={1}>
          Bestätigungsmail
        </Text>
        <Flex gap={4} wrap="wrap">
          <VorschauLink href={`/vorschau/mentoring/mail/${produkt}`} icon={<Mail size={15} strokeWidth={1.75} aria-hidden />}>
            {istLive ? "Abo" : "Einmalzahlung"}
          </VorschauLink>
          {!istLive ? (
            <VorschauLink
              href={`/vorschau/mentoring/mail/${produkt}-raten`}
              icon={<Mail size={15} strokeWidth={1.75} aria-hidden />}
            >
              In Raten
            </VorschauLink>
          ) : null}
        </Flex>
      </Stack>
    </Stack>
  );
}

export default function MentoringVorschau() {
  return (
    <Box position="relative" minH="100vh" w="full" bg="var(--cc-bg)" color="var(--cc-text)" overflowX="clip">
      <Box className="cc-stars" aria-hidden />
      <Box className="cc-goldlight" aria-hidden />

      <Box position="relative" zIndex={1} maxW="1040px" mx="auto" px={{ base: 4, md: 8 }} pt={{ base: 10, md: 16 }} pb={16}>
        <Stack spacing={{ base: 12, md: 16 }}>
          {/* ── Kopf ─────────────────────────────────────────────────── */}
          <Stack spacing={6} className="cc-rise">
            <Box maxW="150px">
              <Logo variant="onDark" />
            </Box>
            <Stack spacing={3}>
              <Box
                as="h1"
                fontSize={{ base: "32px", md: "44px" }}
                fontWeight={600}
                lineHeight={1.1}
                letterSpacing="-0.02em"
                maxW="18ch"
              >
                Mentoring-Funnel zur Abnahme
              </Box>
              <Text fontSize={{ base: "16px", md: "18px" }} lineHeight={1.6} color="var(--cc-text-2)" maxW="60ch">
                Alles, was ein Käufer vom ersten Klick bis zur Bestätigungsmail sieht. Mit Beispieldaten: Hier wird
                nichts gebucht, gekauft oder gespeichert.
              </Text>
            </Stack>
          </Stack>

          {/* ── Ablauf ───────────────────────────────────────────────── */}
          <Abschnitt titel="So läuft es ab">
            <Box
              as="ol"
              listStyleType="none"
              display="grid"
              gridTemplateColumns={{ base: "1fr", md: "repeat(5, minmax(0, 1fr))" }}
              gap={{ base: 0, md: 4 }}
            >
              {ABLAUF.map((s, i) => (
                <Flex
                  as="li"
                  key={s.titel}
                  direction={{ base: "row", md: "column" }}
                  gap={{ base: 4, md: 3 }}
                  py={{ base: 4, md: 0 }}
                  borderTop={{ base: i ? "1px solid var(--cc-line)" : "none", md: "none" }}
                >
                  <Flex align="center" gap={3} flexShrink={0}>
                    <Flex
                      w="32px"
                      h="32px"
                      align="center"
                      justify="center"
                      borderRadius="full"
                      border="1px solid rgba(212, 176, 128, 0.32)"
                      bg="var(--cc-gold-wash)"
                      color="var(--cc-gold-light)"
                      className="cc-num"
                      fontSize="14px"
                      fontWeight={600}
                    >
                      {i + 1}
                    </Flex>
                    <Box display={{ base: "none", md: "block" }} flex={1} h="1px" bg="var(--cc-line)" aria-hidden />
                  </Flex>
                  <Stack spacing={1}>
                    <Text fontSize="15px" fontWeight={600}>
                      {s.titel}
                    </Text>
                    <Text fontSize="14px" lineHeight={1.55} color="var(--cc-text-2)">
                      {s.text}
                    </Text>
                  </Stack>
                </Flex>
              ))}
            </Box>
          </Abschnitt>

          {/* ── Funnel ───────────────────────────────────────────────── */}
          <Abschnitt
            titel="Seite zum Strategie-Gespräch"
            text="Die Seite, auf die Anzeigen und Discord verlinken. In der Vorschau läuft der Fragebogen komplett durch, legt aber keinen Lead an, und statt des Kalenders steht ein Hinweis."
          >
            <Flex
              as="a"
              href="/vorschau/mentoring/call"
              target="_blank"
              rel="noopener"
              className="cc-card cc-card--hero"
              p={{ base: 5, md: 7 }}
              direction={{ base: "column", sm: "row" }}
              align={{ base: "flex-start", sm: "center" }}
              justify="space-between"
              gap={4}
              transition="transform 180ms var(--cc-ease)"
              _hover={{ transform: "translateY(-2px)" }}
            >
              <Stack spacing={1}>
                <Text fontSize={{ base: "18px", md: "20px" }} fontWeight={600}>
                  Call-Funnel öffnen
                </Text>
                <Text fontSize="14px" color="var(--cc-text-2)">
                  Video · Fragebogen · Termin · Case Studies · Auszahlungen
                </Text>
              </Stack>
              <Flex align="center" gap={2} color="var(--cc-gold-light)" fontSize="15px" fontWeight={500}>
                Ansehen
                <ArrowUpRight size={18} strokeWidth={1.75} aria-hidden />
              </Flex>
            </Flex>
          </Abschnitt>

          {/* ── Angebote ─────────────────────────────────────────────── */}
          <Abschnitt
            titel="Angebote und Kassenseiten"
            text="Die Seite, die der Kunde nach dem Closing-Call per Link bekommt, und die Mail, die nach der Zahlung rausgeht. Der Kaufknopf öffnet in der Vorschau keine Kasse."
          >
            <Grid templateColumns={{ base: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" }} gap={4}>
              {[...MENTORING_PRODUKTE, "live" as const].map((p) => (
                <AngebotsKarte key={p} produkt={p} />
              ))}
            </Grid>
          </Abschnitt>

          {/* ── Sonderfälle ──────────────────────────────────────────── */}
          <Abschnitt
            titel="Sonderfälle"
            text="Was der Kunde sieht, wenn der Link schon bezahlt, abgelaufen ist oder Stripe gerade nicht antwortet."
          >
            <Flex gap={{ base: 4, md: 6 }} wrap="wrap">
              <VorschauLink href="/vorschau/mentoring/kasse/bezahlt">Link schon bezahlt</VorschauLink>
              <VorschauLink href="/vorschau/mentoring/kasse/abgelaufen">Link abgelaufen</VorschauLink>
              <VorschauLink href="/vorschau/mentoring/kasse/main?fehler=stripe_fehler">Zahlungsseite lädt nicht</VorschauLink>
              <VorschauLink href="/vorschau/mentoring/kasse/live?fehler=kein_mentoring_konto">
                Live-Abo ohne Programm
              </VorschauLink>
              <VorschauLink href="/vorschau/mentoring/kasse/live-spaeter">Live-Abo, Live-Zugang läuft noch</VorschauLink>
            </Flex>
          </Abschnitt>

          {/* ── Offen ────────────────────────────────────────────────── */}
          <Abschnitt titel="Was noch von dir kommt">
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))" }} gap={4}>
              {OFFEN.map((o) => (
                <Stack key={o.titel} className="cc-card cc-card--still" p={{ base: 5, md: 6 }} spacing={2}>
                  <Text fontSize="16px" fontWeight={600}>
                    {o.titel}
                  </Text>
                  <Text fontSize="14px" lineHeight={1.6} color="var(--cc-text-2)">
                    {o.text}
                  </Text>
                  {o.link ? (
                    <Box pt={1}>
                      <VorschauLink href={o.link.href}>{o.link.label}</VorschauLink>
                    </Box>
                  ) : null}
                </Stack>
              ))}
            </Grid>
          </Abschnitt>
        </Stack>
      </Box>
    </Box>
  );
}
