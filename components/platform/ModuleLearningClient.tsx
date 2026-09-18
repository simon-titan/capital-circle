"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import { AlignLeft, ArrowLeft, ArrowRight, Download, FileText } from "lucide-react";
import NextLink from "next/link";
import { GlassVideoPlayer } from "@/components/ui/GlassVideoPlayer";
import { QuizModal, type QuizMode, type QuizQuestion } from "@/components/platform/QuizModal";
import { VideoPlaylist, isPlaylistIndexUnlocked } from "@/components/platform/VideoPlaylist";
import { isPlaylistVideoDone } from "@/lib/module-video";
import { VideoDescription } from "@/components/platform/VideoDescription";
import { VideoAttachments, type VideoAttachmentItem } from "@/components/platform/VideoAttachments";
import { ModuleNotes } from "@/components/platform/ModuleNotes";
import { ProgressBar, clampLines } from "@/components/platform/dashboard/primitives";
import type { PlaylistVideoRow } from "@/lib/module-video";

export type ModuleLearningClientProps = {
  moduleId: string;
  /** Titel und Kontext für die Kursleiste */
  moduleTitle: string;
  courseTitle?: string | null;
  moduleDescription?: string | null;
  playlist: PlaylistVideoRow[];
  initialVideoId: string | null;
  initialProgressMap: Record<string, number>;
  questions: QuizQuestion[];
  quizMode: QuizMode;
  passThreshold: number;
  /** Aus user_progress (Server) */
  initialQuizPassed?: boolean;
  initialQuizLastScore?: number | null;
  initialModuleCompleted?: boolean;
  /** Nächstes Modul im gleichen Kurs (für CTA nach Abschluss) */
  nextModuleHref?: string | null;
  initialNoteContent: string;
  attachmentsByVideoId: Record<string, VideoAttachmentItem[]>;
};

function pickStartIndex(playlist: PlaylistVideoRow[], initialVideoId: string | null, map: Record<string, number>) {
  if (!playlist.length) return 0;
  if (initialVideoId) {
    const i = playlist.findIndex((v) => v.id === initialVideoId);
    if (i >= 0 && isPlaylistIndexUnlocked(playlist, map, i)) return i;
  }
  for (let i = 0; i < playlist.length; i++) {
    if (!isPlaylistIndexUnlocked(playlist, map, i)) continue;
    if (!isPlaylistVideoDone(playlist[i]!, map)) return i;
  }
  for (let i = playlist.length - 1; i >= 0; i--) {
    if (isPlaylistIndexUnlocked(playlist, map, i)) return i;
  }
  return 0;
}

const sectionLabel = {
  fontSize: "12px",
  lineHeight: "16px",
  fontWeight: 500,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "var(--cc-text-2)",
};

const tabProps = {
  px: 4,
  py: 2,
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: 500,
  color: "var(--cc-text-2)",
  border: "1px solid transparent",
  transition: "color 150ms var(--cc-ease), background-color 150ms var(--cc-ease), border-color 150ms var(--cc-ease)",
  _hover: { color: "var(--cc-text)" },
  /* Gold als Schrift- und Flächenfarbe bleibt; der Schein fällt weg (siehe unten). */
  _selected: {
    color: "var(--cc-gold-light)",
    bg: "linear-gradient(90deg, rgba(212, 176, 128, 0.16) 0%, rgba(212, 176, 128, 0.04) 100%)",
    borderColor: "var(--cc-gold-line)",
  },
};

function BackLink() {
  return (
    <Button
      as={NextLink}
      href="/ausbildung"
      variant="ghost"
      size="sm"
      h="auto"
      px={0}
      leftIcon={<ArrowLeft size={15} strokeWidth={2} />}
      color="var(--cc-text-2)"
      fontWeight={500}
      _hover={{ color: "var(--cc-gold-light)", bg: "transparent" }}
    >
      Zurück zur Übersicht
    </Button>
  );
}

export function ModuleLearningClient({
  moduleId,
  moduleTitle,
  courseTitle = null,
  moduleDescription = null,
  playlist,
  initialVideoId,
  initialProgressMap,
  questions,
  quizMode,
  passThreshold,
  initialQuizPassed = false,
  initialQuizLastScore = null,
  initialModuleCompleted = false,
  nextModuleHref = null,
  initialNoteContent,
  attachmentsByVideoId,
}: ModuleLearningClientProps) {
  const [quizOpen, setQuizOpen] = useState(false);
  const [moduleCompleted, setModuleCompleted] = useState(Boolean(initialModuleCompleted));
  const moduleCompletedRef = useRef(moduleCompleted);
  useEffect(() => {
    moduleCompletedRef.current = moduleCompleted;
  }, [moduleCompleted]);
  const [quizPassed, setQuizPassed] = useState(Boolean(initialQuizPassed));
  const [quizLastScore, setQuizLastScore] = useState<number | null>(
    typeof initialQuizLastScore === "number" ? initialQuizLastScore : null,
  );
  /** Nur Ref — kein useState, damit nicht jede Sekunde das gesamte Modul-Layout neu rendert. */
  const lastProgressRef = useRef(0);

  /** Ref sofort setzen (nicht nur nach Re-Render), damit onVideoEnded nach timeupdate/ended zuverlässig prüfen kann. */
  const onPlayerProgress = useCallback((seconds: number) => {
    lastProgressRef.current = Math.floor(seconds);
  }, []);
  /** Für den Zeitstempel in den Notizen — liest den Ref, löst selbst kein Rendern aus. */
  const getTimestamp = useCallback(() => lastProgressRef.current, []);
  const [progressMap, setProgressMap] = useState<Record<string, number>>(() => ({ ...initialProgressMap }));
  const progressMapRef = useRef(progressMap);
  useEffect(() => {
    progressMapRef.current = progressMap;
  }, [progressMap]);

  const [activeIndex, setActiveIndex] = useState(() => pickStartIndex(playlist, initialVideoId, initialProgressMap));
  const hasQuiz = useMemo(() => questions.length > 0, [questions.length]);

  /** Alle Playlist-Videos als „fertig“ (für Quiz-Startpflicht). */
  const allVideosWatched = useMemo(() => {
    if (!playlist.length) return true;
    return playlist.every((v) => isPlaylistVideoDone(v, progressMap));
  }, [playlist, progressMap]);

  /** Fortschritt der Kursleiste: erledigte Lektionen / alle Lektionen. */
  const doneCount = useMemo(
    () => playlist.filter((v) => isPlaylistVideoDone(v, progressMap)).length,
    [playlist, progressMap],
  );
  const modulePct = playlist.length ? Math.round((doneCount / playlist.length) * 100) : 0;

  /** Manueller Quiz-Start nur, wenn alle Videos durchgesehen oder Modul bereits abgeschlossen (Wiederholung). */
  const quizStartBlocked = hasQuiz && !allVideosWatched && !moduleCompleted;

  const current = playlist[activeIndex] ?? null;
  // startAtSeconds auf max. 85% der Dauer begrenzen: verhindert dass das Video sofort endet
  // und onVideoEnded feuert wenn gespeicherter Fortschritt nahe am Ende liegt.
  const startAtSeconds = (() => {
    if (!current) return 0;
    const saved = progressMap[current.id] ?? 0;
    const dur = current.duration_seconds ?? 0;
    const maxStart = dur > 0 ? dur * 0.85 : saved;
    return Math.max(0, Math.min(saved, maxStart));
  })();
  const currentAttachments = current ? attachmentsByVideoId[current.id] ?? [] : [];

  const postProgress = useCallback(
    async (payload: {
      progressSeconds: number;
      videoId?: string | null;
      videoCompleted?: boolean;
      completed?: boolean;
      quizPassed?: boolean;
      quizLastScore?: number;
      videoProgressMap?: Record<string, number>;
    }) => {
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          progressSeconds: payload.progressSeconds,
          videoId: payload.videoId,
          videoCompleted: payload.videoCompleted,
          completed: payload.completed,
          quizPassed: payload.quizPassed,
          quizLastScore: payload.quizLastScore,
          videoProgressMap: payload.videoProgressMap,
        }),
      });
    },
    [moduleId],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const progress = lastProgressRef.current;
      if (!current || progress <= 0) return;
      const map = {
        ...progressMapRef.current,
        [current.id]: Math.max(progressMapRef.current[current.id] ?? 0, progress),
      };
      // Nur Fortschritt speichern — kein completed/videoCompleted setzen.
      // Das Abschließen passiert ausschließlich über onVideoEnded (zuverlässig durch den Player).
      void postProgress({
        progressSeconds: progress,
        videoId: current.id,
        videoProgressMap: map,
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [current, postProgress]);

  const onQuizResult = async ({ score, passed }: { score: number; passed: boolean }) => {
    const vid = current?.id ?? null;
    const lp = lastProgressRef.current;
    const map = progressMapRef.current;
    const merged = vid ? { ...map, [vid]: Math.max(map[vid] ?? 0, lp) } : map;
    setQuizPassed(passed);
    setQuizLastScore(score);
    if (passed) {
      moduleCompletedRef.current = true;
      setModuleCompleted(true);
    }
    await postProgress({
      progressSeconds: lp,
      videoId: vid,
      videoCompleted: true,
      completed: passed,
      quizPassed: passed,
      quizLastScore: score,
      videoProgressMap: merged,
    });
  };

  const onVideoEnded = useCallback(() => {
    if (!current) return;
    const dur = current.duration_seconds ?? 0;
    // Sicherheitscheck: nur die in DIESER Session tatsächlich geschauten Sekunden prüfen.
    // progressMapRef enthält ggf. alte DB-Werte → darf hier NICHT verwendet werden,
    // sonst gilt ein Video das beim Start ans Ende seeked sofort als fertig.
    const sessionWatched = lastProgressRef.current;
    if (dur > 0 && sessionWatched < dur * 0.85) return;
    const endedSeconds = dur > 0 ? dur : Math.max(lastProgressRef.current, progressMapRef.current[current.id] ?? 0);

    if (activeIndex < playlist.length - 1) {
      const nextVideo = playlist[activeIndex + 1]!;
      const newMap = {
        ...progressMapRef.current,
        [current.id]: Math.max(progressMapRef.current[current.id] ?? 0, endedSeconds),
      };
      progressMapRef.current = newMap;
      setProgressMap(newMap);
      // videoId = nächstes Video (last_video_id in DB). progressSeconds: 0 — Fortschritt des
      // aktuellen Videos steht nur in videoProgressMap; sonst schreibt die API fälschlich
      // endedSeconds unter nextVideo.id in video_progress_by_video (Kaskaden-Bug).
      void postProgress({
        progressSeconds: 0,
        videoId: nextVideo.id,
        videoCompleted: false,
        videoProgressMap: newMap,
      });
      setActiveIndex((i) => i + 1);
      lastProgressRef.current = 0;
      return;
    }

    const newMap = {
      ...progressMapRef.current,
      [current.id]: Math.max(progressMapRef.current[current.id] ?? 0, endedSeconds),
    };
    progressMapRef.current = newMap;
    setProgressMap(newMap);
    void postProgress({
      progressSeconds: endedSeconds,
      videoId: current.id,
      videoCompleted: true,
      completed: !hasQuiz,
      videoProgressMap: newMap,
    });
    if (!hasQuiz) {
      moduleCompletedRef.current = true;
      setModuleCompleted(true);
    }
    // Quiz nur öffnen wenn Modul noch NICHT abgeschlossen (erster Durchlauf)
    if (hasQuiz && !moduleCompletedRef.current) setQuizOpen(true);
  }, [activeIndex, current, hasQuiz, playlist, postProgress]);

  const onSelectVideo = useCallback(
    async (idx: number) => {
      if (idx === activeIndex || idx < 0 || idx >= playlist.length) return;
      if (!isPlaylistIndexUnlocked(playlist, progressMapRef.current, idx)) return;
      const next = playlist[idx]!;
      const cur = playlist[activeIndex];
      const secs = lastProgressRef.current;
      const base = { ...progressMapRef.current };
      if (cur) {
        base[cur.id] = Math.max(base[cur.id] ?? 0, Math.floor(secs));
      }
      setProgressMap(base);
      // videoId = Ziel-Video (next), damit last_video_id in DB korrekt gesetzt wird
      await postProgress({
        progressSeconds: cur ? base[cur.id] ?? 0 : 0,
        videoId: next.id,
        videoCompleted: false,
        videoProgressMap: base,
      });
      setActiveIndex(idx);
      lastProgressRef.current = 0;
    },
    [activeIndex, playlist, postProgress],
  );

  const quizStatusLabel = !hasQuiz
    ? null
    : quizPassed
      ? "Bestanden"
      : quizLastScore !== null
        ? "Nicht bestanden"
        : "Offen";

  const quizBadge = quizStatusLabel ? (
    <Box
      as="span"
      px={2}
      py="2px"
      borderRadius="6px"
      fontSize="11px"
      fontWeight={600}
      bg={quizPassed ? "rgba(74, 222, 128, 0.12)" : quizLastScore !== null ? "rgba(212, 176, 128, 0.14)" : "rgba(255, 255, 255, 0.06)"}
      color={quizPassed ? "var(--cc-success)" : quizLastScore !== null ? "var(--cc-gold-light)" : "var(--cc-text-2)"}
    >
      {quizStatusLabel}
    </Box>
  ) : null;

  const quizButton = (fullWidth: boolean) => (
    <Tooltip label="Schau zuerst alle Videos dieses Moduls zu Ende." isDisabled={!quizStartBlocked} hasArrow openDelay={200}>
      <span style={{ width: fullWidth ? "100%" : "fit-content", display: fullWidth ? "block" : "inline-block" }}>
        <Button
          variant="line"
          size="sm"
          w={fullWidth ? "full" : "fit-content"}
          isDisabled={quizStartBlocked}
          onClick={() => setQuizOpen(true)}
          color="var(--cc-gold-light)"
          borderColor="var(--cc-gold-line)"
        >
          {quizPassed ? "Test wiederholen" : quizLastScore !== null ? "Erneut versuchen" : "Test starten"}
        </Button>
      </span>
    </Tooltip>
  );

  const quizModal = quizOpen ? (
    <QuizModal
      isOpen
      onClose={() => setQuizOpen(false)}
      questions={questions}
      quizMode={quizMode}
      passThreshold={passThreshold}
      onQuizResult={onQuizResult}
      nextModuleHref={nextModuleHref}
    />
  ) : null;

  const completedBanner = moduleCompleted ? (
    <Flex
      className="cc-card cc-card--still"
      p={{ base: 5, md: 6 }}
      direction={{ base: "column", md: "row" }}
      align={{ base: "stretch", md: "center" }}
      justify="space-between"
      gap={4}
    >
      <Box>
        <Text fontSize="18px" fontWeight={600} color="var(--cc-text)">
          Modul abgeschlossen
        </Text>
        <Text fontSize="14px" color="var(--cc-text-2)" mt={1}>
          {nextModuleHref ? "Weiter geht es mit dem nächsten Modul." : "Du hast alle Lektionen dieses Moduls gesehen."}
        </Text>
      </Box>
      <Stack direction={{ base: "column", sm: "row" }} spacing={3}>
        {nextModuleHref ? (
          <Button as={NextLink} href={nextModuleHref} variant="gold" rightIcon={<ArrowRight size={16} />}>
            Zum nächsten Modul
          </Button>
        ) : null}
        <Button as={NextLink} href="/ausbildung" variant="line">
          Zur Instituts-Übersicht
        </Button>
      </Stack>
    </Flex>
  ) : null;

  const notes = <ModuleNotes moduleId={moduleId} initialContent={initialNoteContent} getTimestamp={getTimestamp} />;

  if (!playlist.length) {
    const introFallback = process.env.NEXT_PUBLIC_INTRO_VIDEO_URL ?? "";
    return (
      <Stack spacing={5} data-learning-wide className="cc-neutral">
        <Box>
          <BackLink />
          <Heading as="h1" fontSize={{ base: "24px", md: "30px" }} fontWeight={600} color="var(--cc-text)" mt={3}>
            {moduleTitle}
          </Heading>
          <Text fontSize="14px" color="var(--cc-text-2)" mt={2}>
            Kein veröffentlichtes Video in diesem Modul. Platzhalter-Intro wird angezeigt, falls konfiguriert.
          </Text>
        </Box>
        {introFallback ? <GlassVideoPlayer src={introFallback} onProgress={onPlayerProgress} /> : null}
        {hasQuiz ? (
          <Stack spacing={3} className="cc-card cc-card--still" p={5} maxW="md">
            <HStack justify="space-between">
              <Text {...sectionLabel}>Modul-Test</Text>
              {quizBadge}
            </HStack>
            {quizButton(false)}
            {quizStartBlocked ? (
              <Text fontSize="12px" color="var(--cc-text-3)">
                Der Test ist verfügbar, sobald alle Videos vollständig angesehen sind.
              </Text>
            ) : null}
          </Stack>
        ) : null}
        {completedBanner}
        <Box className="cc-card cc-card--still" p={{ base: 4, md: 6 }}>
          {notes}
        </Box>
        {quizModal}
      </Stack>
    );
  }

  /*
   * `cc-neutral` nimmt der ganzen Lektionsseite Gold-Haarlinie, Hover-Glow und
   * atmenden Rahmen — wie beim Dashboard seit 16.09.2026 und wie es die
   * Institut-Übersicht schon macht. Gold als Schrift- und Buttonfarbe bleibt;
   * die drei Inline-Glows, an die die Klasse nicht herankommt, sind direkt
   * entfernt (Tab, Lektions-Pill, Hero-Variante des Abschluss-Banners).
   */
  return (
    <Box data-learning-wide className="cc-neutral">
      {/* Mobil: Titel über dem Player — die Kursleiste folgt darunter. */}
      <Box display={{ base: "block", lg: "none" }} mb={4}>
        <BackLink />
        <Heading as="h1" fontSize="22px" fontWeight={600} lineHeight={1.3} color="var(--cc-text)" mt={3}>
          {moduleTitle}
        </Heading>
      </Box>

      <Grid templateColumns={{ base: "minmax(0, 1fr)", lg: "340px minmax(0, 1fr)" }} gap={{ base: 5, lg: 6 }} alignItems="start">
        {/* Kursleiste: Titel, Fortschritt, Lektionen — klebt und scrollt für sich. */}
        <GridItem order={{ base: 2, lg: 1 }} minW={0} position={{ lg: "sticky" }} top={{ lg: "calc(var(--cc-strip-h) + 24px)" }}>
          <Flex
            className="cc-card cc-card--still"
            direction="column"
            overflow="hidden"
            maxH={{ lg: "calc(100dvh - var(--cc-strip-h) - 48px)" }}
          >
            <Box px={5} pt={5} pb={4} flexShrink={0}>
              <Box display={{ base: "none", lg: "block" }}>
                <BackLink />
                {courseTitle ? (
                  <Text fontSize="12px" color="var(--cc-text-3)" mt={4} isTruncated>
                    {courseTitle}
                  </Text>
                ) : null}
                <Heading
                  as="h1"
                  fontSize="20px"
                  fontWeight={600}
                  lineHeight={1.3}
                  color="var(--cc-text)"
                  mt={courseTitle ? 1 : 4}
                  sx={clampLines(2)}
                >
                  {moduleTitle}
                </Heading>
                {moduleDescription ? (
                  <Text fontSize="13px" lineHeight={1.5} color="var(--cc-text-2)" mt={2} sx={clampLines(3)}>
                    {moduleDescription}
                  </Text>
                ) : null}
              </Box>
              <Flex align="center" justify="space-between" gap={3} mt={{ base: 0, lg: 5 }}>
                <Text {...sectionLabel}>Modulinhalt</Text>
                <HStack spacing={2}>
                  <Box
                    as="span"
                    className="cc-num"
                    px={2}
                    py="2px"
                    borderRadius="full"
                    bg="var(--cc-gold-grad)"
                    color="var(--cc-on-gold)"
                    fontSize="11px"
                    fontWeight={600}
                  >
                    {playlist.length} {playlist.length === 1 ? "Lektion" : "Lektionen"}
                  </Box>
                  <Text className="cc-num" fontSize="13px" fontWeight={600} color="var(--cc-gold-light)">
                    {modulePct}%
                  </Text>
                </HStack>
              </Flex>
              <ProgressBar value={modulePct} label={`Modul-Fortschritt ${modulePct} Prozent`} mt={3} maxW="none" />
            </Box>

            <Flex px={5} py={3} align="center" justify="space-between" borderTop="1px solid var(--cc-line)" flexShrink={0}>
              <Text {...sectionLabel}>Lektionen</Text>
              <Box
                as="span"
                className="cc-num"
                minW="22px"
                h="22px"
                px="6px"
                borderRadius="6px"
                bg="rgba(255, 255, 255, 0.06)"
                color="var(--cc-text-2)"
                fontSize="11px"
                display="inline-flex"
                alignItems="center"
                justifyContent="center"
              >
                {playlist.length}
              </Box>
            </Flex>

            <Box px={2} pb={3} overflowY="auto" flex="1" minH={0} maxH={{ base: "420px", lg: "none" }}>
              <VideoPlaylist playlist={playlist} activeIndex={activeIndex} progressMap={progressMap} onSelect={onSelectVideo} />
            </Box>

            {hasQuiz ? (
              <Stack spacing={3} px={5} py={4} borderTop="1px solid var(--cc-line)" flexShrink={0}>
                <HStack justify="space-between">
                  <Text {...sectionLabel}>Modul-Test</Text>
                  {quizBadge}
                </HStack>
                {quizButton(true)}
                {quizStartBlocked ? (
                  <Text fontSize="12px" color="var(--cc-text-3)">
                    Der Test ist verfügbar, sobald alle Videos vollständig angesehen sind.
                  </Text>
                ) : null}
              </Stack>
            ) : null}
          </Flex>
        </GridItem>

        {/* Player, Abschluss-Hinweis, Notizen/Anhänge/Beschreibung */}
        <GridItem order={{ base: 1, lg: 2 }} minW={0}>
          <Stack spacing={5}>
            <GlassVideoPlayer
              key={current.id}
              accent="#d4b080"
              accentRgb="212, 176, 128"
              storageKey={current.cloudflare_uid ?? current.storage_key}
              startAtSeconds={startAtSeconds}
              onProgress={onPlayerProgress}
              onEnded={onVideoEnded}
            />
            {completedBanner}
            <Box className="cc-card cc-card--still" p={{ base: 4, md: 6 }}>
              <Tabs variant="unstyled">
                <TabList
                  gap={1}
                  p={1}
                  w="fit-content"
                  maxW="100%"
                  overflowX="auto"
                  borderRadius="10px"
                  border="1px solid var(--cc-line)"
                  bg="rgba(255, 255, 255, 0.03)"
                >
                  <Tab {...tabProps}>
                    <HStack spacing={2}>
                      <FileText size={15} strokeWidth={2} aria-hidden />
                      <span>Notizen</span>
                    </HStack>
                  </Tab>
                  <Tab {...tabProps}>
                    <HStack spacing={2}>
                      <Download size={15} strokeWidth={2} aria-hidden />
                      <span>Anhänge</span>
                      {currentAttachments.length > 0 ? (
                        <Box as="span" className="cc-num" fontSize="11px" px="6px" borderRadius="full" bg="rgba(212, 176, 128, 0.16)" color="var(--cc-gold-light)">
                          {currentAttachments.length}
                        </Box>
                      ) : null}
                    </HStack>
                  </Tab>
                  {current.description?.trim() ? (
                    <Tab {...tabProps}>
                      <HStack spacing={2}>
                        <AlignLeft size={15} strokeWidth={2} aria-hidden />
                        <span>Beschreibung</span>
                      </HStack>
                    </Tab>
                  ) : null}
                </TabList>
                <TabPanels mt={5}>
                  <TabPanel p={0}>{notes}</TabPanel>
                  <TabPanel p={0}>
                    {currentAttachments.length > 0 ? (
                      <VideoAttachments attachments={currentAttachments} />
                    ) : (
                      <Text fontSize="14px" color="var(--cc-text-2)">
                        Für diese Lektion gibt es keine Anhänge.
                      </Text>
                    )}
                  </TabPanel>
                  {current.description?.trim() ? (
                    <TabPanel p={0}>
                      <VideoDescription description={current.description} />
                    </TabPanel>
                  ) : null}
                </TabPanels>
              </Tabs>
            </Box>
          </Stack>
        </GridItem>
      </Grid>
      {quizModal}
    </Box>
  );
}
