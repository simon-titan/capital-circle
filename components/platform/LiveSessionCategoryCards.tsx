import { Box, Flex, Grid, HStack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { BarChart3, CalendarCheck, Clock, Film, Radio } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { IconTile, LockedNote } from "@/components/platform/dashboard/primitives";
import { isFreeLiveSessionCategory } from "@/components/platform/live-session-free";
import {
  KartenAktion,
  Pill,
  formatSessionDate,
  formatSessionDuration,
  kategorieHinweis,
  riseDelay,
} from "@/components/platform/live-session-ui";
import type { LiveSessionCategoryOverviewRow } from "@/lib/live-session-overview";

/**
 * Die drei Kategorien als Einstiegskarten — der Aufbau des Instituts, eine
 * Ebene höher: anklicken, dann die Aufzeichnungen und darin die einzelnen
 * Videos (Nutzerwunsch 17.09.2026). Die früheren Filter-Chips („Alle / Live
 * Trading / …“) entfallen, weil die Karten selbst die Kategorie sind.
 *
 * Kartenform wie die Modulkacheln im Institut: neutrale Kante, ruhiger
 * Hover, Gold nur für die Aktion.
 */

/** Icon nach Titel statt nach ID — die Kategorien liegen in der Datenbank und werden neu angelegt. */
const KATEGORIE_ICONS: Array<[string, LucideIcon]> = [
  ["live", Radio],
  ["backtest", BarChart3],
  ["recap", CalendarCheck],
];

function kategorieIcon(title: string): LucideIcon {
  const t = title.toLowerCase();
  for (const [schluessel, icon] of KATEGORIE_ICONS) {
    if (t.includes(schluessel)) return icon;
  }
  return Film;
}

/**
 * Icon-Kachel wie im Institut. Das Icon kommt als Prop herein, weil eine im
 * Render zugewiesene Komponente (`const Icon = ...`) vom React-Compiler-Lint
 * beanstandet wird.
 */
function KategorieIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <IconTile>
      <Icon size={26} strokeWidth={1.75} />
    </IconTile>
  );
}

function KategorieKarte({
  c,
  gesperrt,
  freieKategorie,
}: {
  c: LiveSessionCategoryOverviewRow;
  gesperrt: boolean;
  /** Titel der Kategorie, die Free-Mitglieder sehen dürfen — für den gesperrten Hinweis. */
  freieKategorie: string | null;
}) {
  const leer = c.sessionCount === 0;
  // Klickbar ist nur, wo auch etwas liegt: Eine leere Kategorie führt sonst auf
  // eine Seite, die dasselbe sagt wie die Karte.
  const klickbar = !gesperrt && !leer;

  const inhalt = (
    <Flex
      as="article"
      direction="column"
      h="100%"
      minH={{ base: "auto", md: "236px" }}
      p={{ base: 4, md: 5 }}
      borderRadius="10px"
      bg="rgba(255, 255, 255, 0.03)"
      border="1px solid var(--cc-line)"
      transition="background-color 180ms var(--cc-ease), border-color 180ms var(--cc-ease)"
      _hover={klickbar ? { bg: "rgba(255, 255, 255, 0.05)", borderColor: "rgba(255, 255, 255, 0.24)" } : undefined}
    >
      <HStack spacing={{ base: 3, md: 4 }} align="center">
        <KategorieIcon icon={kategorieIcon(c.title)} />
        <Box flex={1} minW={0}>
          <Text as="h2" fontSize={{ base: "17px", md: "18px" }} fontWeight={600} lineHeight={1.3} color="var(--cc-text)">
            {c.title}
          </Text>
          {/* Zählwert nur, wenn es etwas zu zählen gibt — „0 Aufzeichnungen“
              sagt neben dem Leerzustand unten nichts Neues. */}
          {leer ? null : (
            <Text className="cc-num" fontSize="14px" color="var(--cc-text-2)" mt={1}>
              {c.sessionCount} {c.sessionCount === 1 ? "Aufzeichnung" : "Aufzeichnungen"}
            </Text>
          )}
        </Box>
      </HStack>

      {gesperrt ? (
        <Flex mt={4} flex="1">
          <LockedNote
            text={
              freieKategorie
                ? `${c.title} gehört zur Mitgliedschaft. Als Free-Mitglied siehst du ${freieKategorie}.`
                : `${c.title} gehört zur Mitgliedschaft.`
            }
          />
        </Flex>
      ) : leer ? (
        <Box mt={4} flex="1">
          <Pill tone="muted" upper>
            Noch nichts veröffentlicht
          </Pill>
          <Text fontSize="14px" lineHeight={1.6} color="var(--cc-text-2)" mt={3}>
            {kategorieHinweis(c.title)}
          </Text>
        </Box>
      ) : (
        <>
          <HStack spacing={2} flexWrap="wrap" rowGap={2} mt={4}>
            <Pill tone="neutral" icon={<Film size={12} aria-hidden />}>
              {c.videoCount} {c.videoCount === 1 ? "Video" : "Videos"}
            </Pill>
            <Pill tone="neutral" icon={<Clock size={12} aria-hidden />} className="cc-num">
              {formatSessionDuration(c.totalDurationSeconds)}
            </Pill>
          </HStack>
          {c.latestAt ? (
            <Text fontSize="13px" color="var(--cc-text-3)" mt={3}>
              Zuletzt{" "}
              <Box as="span" className="cc-num" color="var(--cc-text-2)">
                {formatSessionDate(c.latestAt)}
              </Box>
            </Text>
          ) : null}
          <Box mt="auto" pt={4}>
            <KartenAktion>Aufzeichnungen ansehen</KartenAktion>
          </Box>
        </>
      )}
    </Flex>
  );

  if (!klickbar) return <Box h="100%">{inhalt}</Box>;

  return (
    <Link href={`/live-session/kategorie/${c.id}`} style={{ textDecoration: "none", display: "block", height: "100%" }}>
      {inhalt}
    </Link>
  );
}

export function LiveSessionCategoryCards({
  categories,
  isFreeMember = false,
}: {
  categories: LiveSessionCategoryOverviewRow[];
  isFreeMember?: boolean;
}) {
  if (categories.length === 0) {
    return (
      <Box className="cc-card cc-card--still cc-rise" p={{ base: 5, md: 6 }}>
        <Text fontSize="15px" lineHeight={1.5} color="var(--cc-text-2)">
          Noch keine Kategorien angelegt.
        </Text>
      </Box>
    );
  }

  // Den Namen der freien Kategorie aus dem Bestand holen statt ihn im Text
  // festzuschreiben: Wird sie im Admin umbenannt, stimmt der Hinweis weiter.
  const freieKategorie = categories.find((c) => isFreeLiveSessionCategory(c.title))?.title ?? null;

  return (
    <Grid
      templateColumns={{ base: "minmax(0, 1fr)", md: "repeat(3, minmax(0, 1fr))" }}
      gap={{ base: 4, md: 5 }}
      alignItems="stretch"
    >
      {categories.map((c, i) => (
        <Box key={c.id} className="cc-rise" style={riseDelay(i)} minW={0}>
          <KategorieKarte
            c={c}
            gesperrt={isFreeMember && !isFreeLiveSessionCategory(c.title)}
            freieKategorie={freieKategorie}
          />
        </Box>
      ))}
    </Grid>
  );
}
