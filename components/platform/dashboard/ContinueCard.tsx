"use client";

import { Box, Button, Flex, Grid, IconButton, Text, VisuallyHidden } from "@chakra-ui/react";
import { ArrowRight, ChevronLeft, ChevronRight, GraduationCap, Play } from "lucide-react";
import NextLink from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { InstitutMediaArea } from "@/components/platform/InstitutMediaArea";
import { CardValue, DashCard, Meta, ProgressBar, TitleWithMeta, clampLines } from "./primitives";
import type { ContinueItem } from "./types";

type Richtung = "prev" | "next";

/**
 * Pfeile zur Nachbarlektion — eine Lektion vor bzw. zurück, nicht ein ganzes
 * Modul (Nutzerwunsch 17.09.2026). Am Modulende führt der Pfeil in die erste
 * Lektion des nächsten Moduls; dass dabei das Modul wechselt, ist Folge des
 * Sprungs, nicht sein Maß.
 *
 * Seit 20.09.2026 sind es Schaltflächen, keine Links: Sie blättern die Karte
 * selbst durch den Lernpfad. Vorher navigierten sie ins Institut — wer nur
 * nachsehen wollte, was als Nächstes kommt, verlor damit das Dashboard.
 *
 * Ohne Ziel bleibt der Pfeil sichtbar, aber inaktiv — ein verschwindender Pfeil
 * würde die Titelzeile beim Blättern springen lassen. Inaktiv heißt er auch,
 * wenn die Nachbarlektion in einem gesperrten Modul liegt.
 *
 * Während geladen wird, bleiben beide Pfeile fokussierbar, melden sich aber als
 * `aria-disabled` und tun nichts: Ein echtes `disabled` würde einer Tastatur den
 * Fokus unter den Fingern wegnehmen.
 */
function LektionsPfeile({
  prevVideoId,
  nextVideoId,
  laedt,
  onBlaettern,
}: {
  prevVideoId: string | null;
  nextVideoId: string | null;
  laedt: Richtung | null;
  onBlaettern: (richtung: Richtung) => void;
}) {
  const arrowProps = {
    size: "sm" as const,
    variant: "line" as const,
    w: "32px",
    minW: "32px",
    h: "32px",
  };
  return (
    <Flex gap={2}>
      <IconButton
        {...arrowProps}
        onClick={() => onBlaettern("prev")}
        isDisabled={!prevVideoId}
        aria-disabled={laedt !== null || undefined}
        aria-label="Vorherige Lektion"
        icon={<ChevronLeft size={16} strokeWidth={1.75} />}
      />
      <IconButton
        {...arrowProps}
        onClick={() => onBlaettern("next")}
        isDisabled={!nextVideoId}
        aria-disabled={laedt !== null || undefined}
        aria-label="Nächste Lektion"
        icon={<ChevronRight size={16} strokeWidth={1.75} />}
      />
    </Flex>
  );
}

export function ContinueCard({ item }: { item: ContinueItem | null }) {
  if (!item) {
    return (
      <DashCard label="Als nächstes" labelId="dash-continue" icon={<GraduationCap size={17} strokeWidth={1.5} />}>
        <CardValue>Noch keine Inhalte</CardValue>
        <Meta mt={1}>Sobald Module freigeschaltet sind, geht es hier weiter.</Meta>
        <Box pt={6}>
          <Button as={NextLink} href="/ausbildung" variant="line">
            Zum Institut
          </Button>
        </Box>
      </DashCard>
    );
  }

  return <ContinueCardInhalt basis={item} />;
}

/**
 * Die Karte blättert nur in der Ansicht: Am Fortschritt ändert sich dabei
 * nichts, und nach einem Neuladen steht wieder die tatsächlich nächste Lektion
 * hier. `basis` ist genau diese vom Server berechnete Lektion.
 */
function ContinueCardInhalt({ basis }: { basis: ContinueItem }) {
  const [item, setItem] = useState<ContinueItem>(basis);
  const [laedt, setLaedt] = useState<Richtung | null>(null);
  const [fehler, setFehler] = useState(false);
  // Einmal geholte Lektionen bleiben liegen — Hin und Her kostet dann nichts
  // mehr, und der Rückweg zur Ausgangslektion zeigt exakt die Serverfassung.
  const gemerkt = useRef<Map<string, ContinueItem>>(new Map());
  const laufend = useRef<AbortController | null>(null);

  useEffect(() => {
    // Neue Serverdaten (Navigation zurück, Neuladen) setzen die Karte auf die
    // tatsächlich nächste Lektion zurück — ein noch laufender Sprung verfällt.
    laufend.current?.abort();
    gemerkt.current = new Map(basis.videoId ? [[basis.videoId, basis]] : []);
    setItem(basis);
    setLaedt(null);
    setFehler(false);
  }, [basis]);

  useEffect(() => () => laufend.current?.abort(), []);

  const blaettern = useCallback(
    (richtung: Richtung) => {
      // Doppelklick-Schutz: Solange geladen wird, führt ein zweiter Klick nichts aus.
      if (laedt) return;
      const ziel = richtung === "prev" ? item.prevVideoId : item.nextVideoId;
      if (!ziel) return;

      setFehler(false);
      const bekannt = gemerkt.current.get(ziel);
      if (bekannt) {
        setItem(bekannt);
        return;
      }

      laufend.current?.abort();
      const abbruch = new AbortController();
      laufend.current = abbruch;
      setLaedt(richtung);

      void (async () => {
        try {
          const res = await fetch(`/api/dashboard/lektion?video=${encodeURIComponent(ziel)}`, {
            signal: abbruch.signal,
          });
          const json = (await res.json()) as { ok?: boolean; item?: ContinueItem };
          if (abbruch.signal.aborted) return;
          if (res.ok && json.ok && json.item) {
            gemerkt.current.set(ziel, json.item);
            setItem(json.item);
          } else {
            // Die Karte bleibt auf der zuletzt gültigen Lektion stehen; nur der
            // Hinweis unter dem Titel sagt, dass der Sprung nicht geklappt hat.
            setFehler(true);
          }
        } catch {
          if (!abbruch.signal.aborted) setFehler(true);
        } finally {
          if (!abbruch.signal.aborted) setLaedt(null);
        }
      })();
    },
    [item.nextVideoId, item.prevVideoId, laedt],
  );

  const resume = item.kind === "resume";
  const hasImage = Boolean(item.thumbnailUrl || item.videoStorageKey);
  const cta = resume ? "Weiterlernen" : "Jetzt starten";
  const stand = [item.moduleTitle, item.lessonLabel, item.videoTitle].filter(Boolean).join(" · ");

  return (
    <DashCard
      label="Als nächstes"
      labelId="dash-continue"
      icon={<GraduationCap size={17} strokeWidth={1.5} />}
      badge={
        <LektionsPfeile
          prevVideoId={item.prevVideoId}
          nextVideoId={item.nextVideoId}
          laedt={laedt}
          onBlaettern={blaettern}
        />
      }
    >
      {/* Die wechselnde Beschriftung einmal ansagen — nicht Titel, Fortschritt
          und Knopf einzeln, wie es eine Live-Region um die ganze Spalte täte. */}
      <VisuallyHidden aria-live="polite">
        {fehler ? "Die Lektion ließ sich nicht laden." : laedt ? "Lektion wird geladen …" : stand}
      </VisuallyHidden>

      <Grid
        templateColumns={{ base: "minmax(0, 1fr)", md: "minmax(0, 0.85fr) minmax(0, 1fr)" }}
        gap={{ base: 5, md: 8 }}
        alignItems="center"
        aria-busy={laedt !== null}
        // Beim Blättern bleibt die bisherige Lektion stehen und wird nur ruhiger —
        // ein Platzhalter an ihrer Stelle würde die Karte springen lassen.
        opacity={laedt ? 0.55 : 1}
        transition="opacity 160ms var(--cc-ease)"
      >
        <Box
          position="relative"
          borderRadius="10px"
          overflow="hidden"
          border="1px solid var(--cc-line-strong)"
          boxShadow="0 10px 28px rgba(0, 0, 0, 0.45)"
        >
          <InstitutMediaArea
            videoStorageKey={item.videoStorageKey}
            thumbnailUrl={item.thumbnailUrl}
            startAtSeconds={item.startAtSeconds}
            fallback={
              // Ohne Bild: der Lektionstitel wird zum Bildinhalt, auf warmem Gold-Schein.
              <Flex
                w="100%"
                h="100%"
                p={4}
                align="flex-end"
                bg="radial-gradient(circle at 80% 10%, rgba(212, 176, 128, 0.22), transparent 55%), linear-gradient(160deg, #1c2128 0%, #0f1318 100%)"
              >
                {item.videoTitle ? (
                  <Text fontSize="16px" fontWeight={600} lineHeight={1.35} color="var(--cc-text)" maxW="75%" sx={clampLines(2)}>
                    {item.videoTitle}
                  </Text>
                ) : null}
              </Flex>
            }
          >
            <Box
              as={NextLink}
              href={item.href}
              aria-label={`${cta}: ${item.moduleTitle}`}
              display="flex"
              w="64px"
              h="64px"
              borderRadius="full"
              alignItems="center"
              justifyContent="center"
              bg="var(--cc-gold-grad)"
              color="var(--cc-on-gold)"
              boxShadow="0 8px 20px rgba(0, 0, 0, 0.45), inset 0 2px 0 rgba(255, 255, 255, 0.35)"
              transition="transform 200ms var(--cc-ease), box-shadow 200ms var(--cc-ease)"
              _hover={{
                transform: "scale(1.07)",
                boxShadow:
                  "0 10px 24px rgba(0, 0, 0, 0.5), inset 0 2px 0 rgba(255, 255, 255, 0.4)",
              }}
            >
              <Play size={24} fill="currentColor" strokeWidth={0} style={{ marginLeft: 3 }} aria-hidden />
            </Box>
          </InstitutMediaArea>
          {item.videoTitle && hasImage ? (
            <Text
              position="absolute"
              left={3}
              right={3}
              bottom={2.5}
              zIndex={3}
              fontSize="12px"
              color="rgba(255, 255, 255, 0.92)"
              isTruncated
              pointerEvents="none"
            >
              {item.videoTitle}
            </Text>
          ) : null}
        </Box>

        <Box minW={0}>
          <TitleWithMeta title={item.moduleTitle} meta={item.lessonLabel} />

          {/* Prozentwert rechts neben dem Balken statt darüber (Kunden-Mockup). */}
          <Flex align="center" gap={4} mt={5}>
            <ProgressBar
              value={item.progressPercent}
              label={`Modul-Fortschritt ${item.progressPercent} Prozent`}
              tone="ink"
              flex="1"
            />
            <Text className="cc-num" fontSize="14px" color="var(--cc-text-2)" flexShrink={0}>
              {item.progressPercent} %
            </Text>
          </Flex>

          {/* Der Fehlerhinweis nimmt den Platz der Modulbeschreibung ein, damit
              die Karte durch ihn nicht höher wird. */}
          {fehler ? (
            <Meta mt={4} color="var(--cc-danger)">
              Die Lektion ließ sich gerade nicht laden. Bitte nochmal versuchen.
            </Meta>
          ) : item.description ? (
            <Meta mt={4} sx={clampLines(2)}>
              {item.description}
            </Meta>
          ) : null}

          <Button
            as={NextLink}
            href={item.href}
            variant="gold"
            mt={5}
            rightIcon={<ArrowRight size={16} strokeWidth={2} />}
          >
            {cta}
          </Button>
        </Box>
      </Grid>
    </DashCard>
  );
}
