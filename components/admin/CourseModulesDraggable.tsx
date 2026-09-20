"use client";

import {
  Badge,
  Box,
  Button,
  Collapse,
  FormControl,
  FormLabel,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { DraggableList } from "@/components/admin/DraggableList";
import { ArrowRightLeft, ChevronDown, EyeOff, FolderOpen, Pencil, PlayCircle } from "lucide-react";
import { UNASSIGNED_COURSE_ID } from "@/lib/scan-modules";

type Mod = { id: string; title: string; order_index: number };

type CourseOption = { id: string; title: string };

export type SubcategoryRow = { id: string; title: string; position: number; module_id: string };

export type ModuleVideoRow = {
  id: string;
  title: string;
  position: number;
  is_published: boolean;
  duration_seconds: number | null;
  module_id: string | null;
  subcategory_id: string | null;
};

/** „1 Std 24 Min“ / „7 Min“ — Rohsekunden sind in der Übersicht nicht lesbar. */
function dauerText(sekunden: number): string {
  if (sekunden <= 0) return "—";
  const std = Math.floor(sekunden / 3600);
  const min = Math.round((sekunden % 3600) / 60);
  if (std > 0) return min > 0 ? `${std} Std ${min} Min` : `${std} Std`;
  return `${Math.max(1, min)} Min`;
}

/** Eine Videozeile im aufgeklappten Modul — unveröffentlichte sind gedimmt markiert. */
function VideoZeile({ video, eingerueckt }: { video: ModuleVideoRow; eingerueckt?: boolean }) {
  return (
    <HStack spacing={2} pl={eingerueckt ? 5 : 0} minW={0}>
      <Box
        as={video.is_published ? PlayCircle : EyeOff}
        boxSize="12px"
        flexShrink={0}
        color={video.is_published ? "var(--cc-text-3)" : "var(--cc-gold-light)"}
        aria-hidden
      />
      <Text fontSize="12px" color={video.is_published ? "var(--cc-text-2)" : "var(--cc-text-3)"} noOfLines={1} flex={1}>
        {video.title}
      </Text>
      {video.duration_seconds ? (
        <Text fontSize="11px" color="var(--cc-text-3)" className="cc-num" flexShrink={0}>
          {dauerText(video.duration_seconds)}
        </Text>
      ) : null}
    </HStack>
  );
}

const fieldSx = {
  bg: "rgba(255, 255, 255, 0.03)",
  border: "1px solid",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  color: "var(--cc-text)",
  _hover: { borderColor: "rgba(255, 255, 255, 0.22)" },
  _focusVisible: { borderColor: "var(--cc-gold-line)", boxShadow: "0 0 0 1px var(--cc-gold-line)" },
} as const;

const optionStyle = { background: "var(--cc-panel-solid)" };

export function CourseModulesDraggable({
  courseId,
  initialModules,
  allCourses = [],
  subcategories = [],
  videos = [],
}: {
  courseId: string;
  initialModules: Mod[];
  /** Alle Kurse für „Modul verschieben“ (ohne aktuellen werden gefiltert) */
  allCourses?: CourseOption[];
  /** Untermodule aller Module dieses Kurses — für das Aufklappen der Kacheln. */
  subcategories?: SubcategoryRow[];
  /** Videos aller Module/Untermodule dieses Kurses. */
  videos?: ModuleVideoRow[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialModules);
  const [offenesModul, setOffenesModul] = useState<string | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveModule, setMoveModule] = useState<Mod | null>(null);
  const [targetCourseId, setTargetCourseId] = useState("");
  const [moveLoading, setMoveLoading] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  // Verschieben ist aus jedem Kurs heraus erlaubt (Ziel ist jeder andere echte Kurs).
  const canMove = true;

  const otherCourses = useMemo(
    () => allCourses.filter((c) => c.id !== courseId && c.id !== UNASSIGNED_COURSE_ID),
    [allCourses, courseId],
  );

  /**
   * Inhalt je Modul, einmal vorberechnet: Untermodule mit ihren Videos, die
   * direkt am Modul hängenden Videos sowie Kennzahlen für die Kachel.
   */
  const inhaltNachModul = useMemo(() => {
    const videosNachSub = new Map<string, ModuleVideoRow[]>();
    const direkteVideos = new Map<string, ModuleVideoRow[]>();
    for (const v of videos) {
      if (v.subcategory_id) {
        const arr = videosNachSub.get(v.subcategory_id) ?? [];
        arr.push(v);
        videosNachSub.set(v.subcategory_id, arr);
      } else if (v.module_id) {
        const arr = direkteVideos.get(v.module_id) ?? [];
        arr.push(v);
        direkteVideos.set(v.module_id, arr);
      }
    }

    const subsNachModul = new Map<string, SubcategoryRow[]>();
    for (const s of subcategories) {
      const arr = subsNachModul.get(s.module_id) ?? [];
      arr.push(s);
      subsNachModul.set(s.module_id, arr);
    }

    const map = new Map<
      string,
      {
        subs: Array<SubcategoryRow & { videos: ModuleVideoRow[] }>;
        direkt: ModuleVideoRow[];
        videoAnzahl: number;
        unveroeffentlicht: number;
        dauerSekunden: number;
      }
    >();

    for (const m of initialModules) {
      const subs = (subsNachModul.get(m.id) ?? [])
        .slice()
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((s) => ({
          ...s,
          videos: (videosNachSub.get(s.id) ?? []).slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
        }));
      const direkt = (direkteVideos.get(m.id) ?? []).slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      const alle = [...direkt, ...subs.flatMap((s) => s.videos)];
      map.set(m.id, {
        subs,
        direkt,
        videoAnzahl: alle.length,
        unveroeffentlicht: alle.filter((v) => !v.is_published).length,
        dauerSekunden: alle.reduce((s, v) => s + (v.duration_seconds ?? 0), 0),
      });
    }
    return map;
  }, [initialModules, subcategories, videos]);

  const openMove = useCallback(
    (m: Mod) => {
      setMoveModule(m);
      setMoveError(null);
      setTargetCourseId(otherCourses[0]?.id ?? "");
      setMoveOpen(true);
    },
    [otherCourses],
  );

  const confirmMove = useCallback(async () => {
    if (!moveModule?.id || !targetCourseId) return;
    setMoveLoading(true);
    setMoveError(null);
    try {
      const res = await fetch(`/api/admin/modules/${moveModule.id}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetCourseId }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!json.ok) {
        setMoveError(json.error ?? "Verschieben fehlgeschlagen.");
        setMoveLoading(false);
        return;
      }
      setMoveOpen(false);
      setMoveModule(null);
      router.refresh();
    } catch {
      setMoveError("Netzwerkfehler.");
    }
    setMoveLoading(false);
  }, [moveModule, router, targetCourseId]);

  const onReorder = useCallback(
    async (orderedIds: string[]) => {
      setItems((prev) => {
        const map = new Map(prev.map((m) => [m.id, m]));
        return orderedIds
          .map((id, idx) => {
            const row = map.get(id);
            return row ? { ...row, order_index: idx + 1 } : null;
          })
          .filter(Boolean) as Mod[];
      });
      await fetch("/api/admin/modules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reorder: true, courseId, orderedModuleIds: orderedIds }),
      });
      router.refresh();
    },
    [courseId, router],
  );

  if (items.length === 0) {
    return (
      <Text fontSize="14px" color="var(--cc-text-2)">
        Noch keine Module. Oben auf „+ Neues Modul“ klicken.
      </Text>
    );
  }

  return (
    <>
    <DraggableList
      items={items}
      onReorder={onReorder}
      variante="raster"
      // Auf breiten Schirmen mehr Spalten statt breiterer Karten — eine Modulkachel
      // trägt Titel, drei Kennzahlen und einen Chevron, mehr Breite bringt ihr nichts.
      spalten={{ base: 1, md: 2, xl: 4, "2xl": 5 }}
      renderItem={(item, handle) => {
        const inhalt = inhaltNachModul.get(item.id);
        const offen = offenesModul === item.id;
        const panelId = `modul-inhalt-${item.id}`;

        return (
          <Stack
            key={item.id}
            h="100%"
            spacing={0}
            borderRadius="12px"
            border="1px solid"
            borderColor={offen ? "var(--cc-gold-line)" : "var(--cc-line)"}
            bg="rgba(255, 255, 255, 0.02)"
            boxShadow={offen ? "0 0 0 1px var(--cc-gold-line), 0 0 28px rgba(212, 176, 128, 0.1)" : "none"}
            transition="border-color 160ms var(--cc-ease), box-shadow 160ms var(--cc-ease)"
            overflow="hidden"
            _hover={{ borderColor: offen ? "var(--cc-gold-line)" : "rgba(255, 255, 255, 0.16)" }}
          >
            <HStack align="center" px={3} pt={3} pb={2} spacing={2}>
              {handle}
              <Badge
                px={2}
                py={0.5}
                borderRadius="full"
                bg="rgba(255, 255, 255, 0.06)"
                color="var(--cc-text-2)"
                fontSize="11px"
                fontWeight={500}
                textTransform="none"
                className="cc-num"
                flexShrink={0}
              >
                #{item.order_index}
              </Badge>
              {inhalt && inhalt.unveroeffentlicht > 0 ? (
                <Badge
                  px={2}
                  py={0.5}
                  borderRadius="full"
                  bg="rgba(212, 176, 128, 0.12)"
                  color="var(--cc-gold-light)"
                  fontSize="11px"
                  fontWeight={500}
                  textTransform="none"
                  flexShrink={0}
                >
                  <Box as="span" className="cc-num">{inhalt.unveroeffentlicht}</Box> unveröffentlicht
                </Badge>
              ) : null}
            </HStack>

            {/* Die ganze Fläche klappt auf — der Griff daneben bleibt zum Sortieren. */}
            <Box
              as="button"
              type="button"
              textAlign="left"
              px={4}
              pb={3}
              w="full"
              flex={1}
              bg="transparent"
              aria-expanded={offen}
              aria-controls={panelId}
              onClick={() => setOffenesModul((prev) => (prev === item.id ? null : item.id))}
              _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "-2px" }}
            >
              <HStack align="flex-start" justify="space-between" spacing={2}>
                <Text fontSize="15px" fontWeight={600} lineHeight={1.35} color="var(--cc-text)" noOfLines={2}>
                  {item.title}
                </Text>
                <Box
                  as={ChevronDown}
                  boxSize="18px"
                  mt="2px"
                  flexShrink={0}
                  color={offen ? "var(--cc-gold-light)" : "var(--cc-text-3)"}
                  transform={offen ? "rotate(180deg)" : "rotate(0deg)"}
                  transition="transform 180ms var(--cc-ease), color 160ms var(--cc-ease)"
                  aria-hidden
                />
              </HStack>

              <HStack mt={2} spacing={3} flexWrap="wrap" fontSize="12px" color="var(--cc-text-2)">
                <HStack spacing={1}>
                  <Box as={FolderOpen} boxSize="13px" aria-hidden />
                  <Box as="span" className="cc-num">{inhalt?.subs.length ?? 0}</Box>
                  <Box as="span">Untermodule</Box>
                </HStack>
                <HStack spacing={1}>
                  <Box as={PlayCircle} boxSize="13px" aria-hidden />
                  <Box as="span" className="cc-num">{inhalt?.videoAnzahl ?? 0}</Box>
                  <Box as="span">Videos</Box>
                </HStack>
                {inhalt && inhalt.dauerSekunden > 0 ? (
                  <Box as="span" className="cc-num">{dauerText(inhalt.dauerSekunden)}</Box>
                ) : null}
              </HStack>
            </Box>

            <Collapse in={offen} animateOpacity>
              <Box id={panelId} px={4} pb={4} borderTop="1px solid var(--cc-line)" pt={3}>
                {!inhalt || (inhalt.subs.length === 0 && inhalt.direkt.length === 0) ? (
                  <Text fontSize="13px" color="var(--cc-text-3)">
                    Noch kein Inhalt. Über „Bearbeiten“ Videos hochladen oder Untermodule anlegen.
                  </Text>
                ) : (
                  <Stack spacing={3}>
                    {inhalt.direkt.length > 0 ? (
                      <Stack spacing={1}>
                        <Text
                          fontSize="11px"
                          fontWeight={500}
                          textTransform="uppercase"
                          letterSpacing="0.08em"
                          color="var(--cc-text-3)"
                        >
                          Direkt im Modul
                        </Text>
                        {inhalt.direkt.map((v) => (
                          <VideoZeile key={v.id} video={v} />
                        ))}
                      </Stack>
                    ) : null}

                    {inhalt.subs.map((sub) => (
                      <Stack key={sub.id} spacing={1}>
                        <HStack spacing={1.5} color="var(--cc-gold-light)">
                          <Box as={FolderOpen} boxSize="13px" aria-hidden />
                          <Text fontSize="12px" fontWeight={600} noOfLines={1}>
                            {sub.title}
                          </Text>
                          <Text fontSize="11px" color="var(--cc-text-3)" className="cc-num" flexShrink={0}>
                            {sub.videos.length}
                          </Text>
                        </HStack>
                        {sub.videos.length === 0 ? (
                          <Text fontSize="12px" color="var(--cc-text-3)" pl={5}>
                            leer
                          </Text>
                        ) : (
                          sub.videos.map((v) => <VideoZeile key={v.id} video={v} eingerueckt />)
                        )}
                      </Stack>
                    ))}
                  </Stack>
                )}

                <SimpleGrid mt={4} columns={canMove && otherCourses.length > 0 ? 2 : 1} spacing={2}>
                  <Button
                    as={Link}
                    href={`/admin/kurse/${courseId}/module/${item.id}`}
                    size="sm"
                    variant="gold"
                    leftIcon={<Pencil size={14} />}
                  >
                    Bearbeiten
                  </Button>
                  {canMove && otherCourses.length > 0 ? (
                    <Button
                      size="sm"
                      variant="line"
                      leftIcon={<ArrowRightLeft size={14} />}
                      onClick={() => openMove(item)}
                    >
                      Verschieben
                    </Button>
                  ) : null}
                </SimpleGrid>
              </Box>
            </Collapse>
          </Stack>
        );
      }}
    />
    <Modal isOpen={moveOpen} onClose={() => !moveLoading && setMoveOpen(false)} isCentered size="md">
      <ModalOverlay bg="rgba(8, 10, 12, 0.72)" backdropFilter="blur(6px)" />
      <ModalContent
        bg="var(--cc-panel-solid)"
        border="1px solid rgba(212, 176, 128, 0.28)"
        borderRadius="12px"
        boxShadow="0 24px 60px rgba(0, 0, 0, 0.6)"
        mx={4}
      >
        <ModalHeader fontSize="17px" fontWeight={600} color="var(--cc-text)">
          Modul verschieben
        </ModalHeader>
        <ModalCloseButton isDisabled={moveLoading} color="var(--cc-text-2)" />
        <ModalBody>
          <Stack spacing={4}>
            <Text fontSize="14px" lineHeight={1.5} color="var(--cc-text-2)">
              {moveModule ? (
                <>
                  „<Text as="span" fontWeight={600} color="var(--cc-text)">{moveModule.title}</Text>“ in einen anderen Kurs legen.
                  Reihenfolge dort: ans Ende der Liste.
                </>
              ) : null}
            </Text>
            <FormControl>
              <FormLabel fontSize="13px" fontWeight={500} color="var(--cc-text-2)">
                Ziel-Kurs
              </FormLabel>
              <Select
                value={targetCourseId}
                onChange={(e) => setTargetCourseId(e.target.value)}
                {...fieldSx}
                isDisabled={moveLoading}
              >
                {otherCourses.map((c) => (
                  <option key={c.id} value={c.id} style={optionStyle}>
                    {c.title}
                  </option>
                ))}
              </Select>
            </FormControl>
            {moveError ? (
              <Text fontSize="14px" color="var(--cc-danger)">
                {moveError}
              </Text>
            ) : null}
          </Stack>
        </ModalBody>
        <ModalFooter gap={3}>
          <Button variant="line" onClick={() => setMoveOpen(false)} isDisabled={moveLoading}>
            Abbrechen
          </Button>
          <Button variant="gold" onClick={() => void confirmMove()} isLoading={moveLoading} isDisabled={!targetCourseId}>
            Verschieben
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
    </>
  );
}
