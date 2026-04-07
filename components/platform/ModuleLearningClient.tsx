"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Box, Button, Grid, GridItem, HStack, Stack, Text, Tooltip } from "@chakra-ui/react";
import { GlassVideoPlayer } from "@/components/ui/GlassVideoPlayer";
import { QuizModal, type QuizMode, type QuizQuestion } from "@/components/platform/QuizModal";
import { VideoPlaylist, isPlaylistIndexUnlocked } from "@/components/platform/VideoPlaylist";
import { isPlaylistVideoDone } from "@/lib/module-video";
import { VideoDescription } from "@/components/platform/VideoDescription";
import { VideoAttachments, type VideoAttachmentItem } from "@/components/platform/VideoAttachments";
import { ModuleNotes } from "@/components/platform/ModuleNotes";
import { ChakraLinkButton } from "@/components/platform/ChakraLinkButton";
import type { PlaylistVideoRow } from "@/lib/module-video";

export type ModuleLearningClientProps = {
  moduleId: string;
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

export function ModuleLearningClient({
  moduleId,
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

  if (!playlist.length) {
    const introFallback = process.env.NEXT_PUBLIC_INTRO_VIDEO_URL ?? "";
    return (
      <Box pb={{ base: 4, md: 0 }}>
        <Text className="inter" color="gray.500" fontSize="sm" mb={4} px={{ base: 4, md: 0 }}>
          Kein veröffentlichtes Video in diesem Modul. Platzhalter-Intro wird angezeigt, falls konfiguriert.
        </Text>
        {introFallback ? (
          <GlassVideoPlayer src={introFallback} onProgress={onPlayerProgress} />
        ) : null}
        {hasQuiz ? (
          <Stack spacing={3} mt={4} mb={6} maxW="md" px={{ base: 4, md: 0 }}>
            <Text
              className="inter"
              fontSize="xs"
              textTransform="uppercase"
              letterSpacing="0.08em"
              color="var(--color-text-muted)"
            >
              Modul-Test
            </Text>
            {quizStatusLabel ? (
              <Badge
                px={2}
                py={0.5}
                borderRadius="md"
                fontSize="xs"
                className="inter-medium"
                w="fit-content"
                colorScheme={quizPassed ? "green" : quizLastScore !== null ? "yellow" : "gray"}
              >
                {quizStatusLabel}
              </Badge>
            ) : null}
            <Tooltip
              label="Schau zuerst alle Videos dieses Moduls zu Ende."
              isDisabled={!quizStartBlocked}
              hasArrow
              openDelay={200}
            >
              <span style={{ width: "fit-content", display: "inline-block" }}>
                <Button
                  variant="outline"
                  size="sm"
                  w="fit-content"
                  isDisabled={quizStartBlocked}
                  onClick={() => setQuizOpen(true)}
                  borderColor="rgba(212,175,55,0.45)"
                  color="var(--color-accent-gold-light)"
                >
                  {quizPassed ? "Test wiederholen" : quizLastScore !== null ? "Erneut versuchen" : "Test starten"}
                </Button>
              </span>
            </Tooltip>
            {quizStartBlocked ? (
              <Text className="inter" fontSize="xs" color="var(--color-text-muted)">
                Der Test ist verfügbar, sobald alle Videos vollständig angesehen sind.
              </Text>
            ) : null}
          </Stack>
        ) : null}
        {quizOpen ? (
          <QuizModal
            isOpen
            onClose={() => setQuizOpen(false)}
            questions={questions}
            quizMode={quizMode}
            passThreshold={passThreshold}
            onQuizResult={onQuizResult}
            nextModuleHref={nextModuleHref}
          />
        ) : null}
        {moduleCompleted ? (
          <Box
            mt={4}
            mx={{ base: 4, md: 0 }}
            p={5}
            borderRadius="16px"
            borderWidth="1px"
            borderColor="rgba(212,175,55,0.35)"
            bg="rgba(212,175,55,0.06)"
          >
            <Text className="radley-regular" fontSize="lg" mb={3} color="var(--color-text-primary)">
              Modul abgeschlossen
            </Text>
            <Stack direction={{ base: "column", sm: "row" }} spacing={3}>
              {nextModuleHref ? (
                <ChakraLinkButton href={nextModuleHref} colorScheme="yellow" size="md">
                  Zum nächsten Modul
                </ChakraLinkButton>
              ) : null}
              <ChakraLinkButton
                href="/ausbildung"
                variant="outline"
                borderColor="rgba(212,175,55,0.45)"
                color="var(--color-accent-gold)"
                size="md"
              >
                Zur Instituts-Übersicht
              </ChakraLinkButton>
            </Stack>
          </Box>
        ) : null}
        <Box px={{ base: 4, md: 0 }}>
          <ModuleNotes moduleId={moduleId} initialContent={initialNoteContent} />
        </Box>
      </Box>
    );
  }

  return (
    <Box pb={{ base: 4, md: 0 }}>
      <Grid
        templateColumns={{ base: "1fr", lg: "minmax(0, 5fr) minmax(280px, 2fr)" }}
        gap={{ base: 6, lg: 8 }}
        alignItems="start"
      >
        <GridItem minW={0}>
          <Stack spacing={6}>
            <GlassVideoPlayer
              key={current.id}
              storageKey={current.storage_key}
              startAtSeconds={startAtSeconds}
              onProgress={onPlayerProgress}
              onEnded={onVideoEnded}
            />
            <Box px={{ base: 4, md: 0 }}>
              {moduleCompleted ? (
                <Box
                  mb={4}
                  p={5}
                  borderRadius="16px"
                  borderWidth="1px"
                  borderColor="rgba(212,175,55,0.35)"
                  bg="rgba(212,175,55,0.06)"
                >
                  <Text className="radley-regular" fontSize="lg" mb={3} color="var(--color-text-primary)">
                    Modul abgeschlossen
                  </Text>
                  <Stack direction={{ base: "column", sm: "row" }} spacing={3}>
                    {nextModuleHref ? (
                      <ChakraLinkButton href={nextModuleHref} colorScheme="yellow" size="md">
                        Zum nächsten Modul
                      </ChakraLinkButton>
                    ) : null}
                    <ChakraLinkButton
                      href="/ausbildung"
                      variant="outline"
                      borderColor="rgba(212,175,55,0.45)"
                      color="var(--color-accent-gold)"
                      size="md"
                    >
                      Zur Instituts-Übersicht
                    </ChakraLinkButton>
                  </Stack>
                </Box>
              ) : null}
              <VideoDescription description={current.description} />
              <VideoAttachments attachments={currentAttachments} />
              <ModuleNotes moduleId={moduleId} initialContent={initialNoteContent} />
            </Box>
          </Stack>
        </GridItem>
        <GridItem px={{ base: 4, md: 0 }}>
          <Box
            position={{ base: "relative", lg: "sticky" }}
            top={{ lg: "80px" }}
            maxH={{ lg: "calc(100vh - 100px)" }}
            overflowY={{ lg: "auto" }}
            pr={{ lg: 1 }}
          >
            <VideoPlaylist
              playlist={playlist}
              activeIndex={activeIndex}
              progressMap={progressMap}
              onSelect={onSelectVideo}
            />
            {hasQuiz ? (
              <Stack spacing={3} mt={6} pt={6} borderTopWidth="1px" borderColor="rgba(255,255,255,0.08)">
                <Text
                  className="inter"
                  fontSize="xs"
                  textTransform="uppercase"
                  letterSpacing="0.08em"
                  color="var(--color-text-muted)"
                >
                  Modul-Test
                </Text>
                <HStack spacing={2} flexWrap="wrap">
                  {quizStatusLabel ? (
                    <Badge
                      px={2}
                      py={0.5}
                      borderRadius="md"
                      fontSize="xs"
                      className="inter-medium"
                      colorScheme={quizPassed ? "green" : quizLastScore !== null ? "yellow" : "gray"}
                    >
                      {quizStatusLabel}
                    </Badge>
                  ) : null}
                </HStack>
                <Tooltip
                  label="Schau zuerst alle Videos dieses Moduls zu Ende."
                  isDisabled={!quizStartBlocked}
                  hasArrow
                  openDelay={200}
                >
                  <span style={{ width: "100%", display: "block" }}>
                    <Button
                      variant="outline"
                      size="sm"
                      w="full"
                      isDisabled={quizStartBlocked}
                      onClick={() => setQuizOpen(true)}
                      borderColor="rgba(212,175,55,0.45)"
                      color="var(--color-accent-gold-light)"
                    >
                      {quizPassed ? "Test wiederholen" : quizLastScore !== null ? "Erneut versuchen" : "Test starten"}
                    </Button>
                  </span>
                </Tooltip>
                {quizStartBlocked ? (
                  <Text className="inter" fontSize="xs" color="var(--color-text-muted)">
                    Der Test ist verfügbar, sobald alle Videos vollständig angesehen sind.
                  </Text>
                ) : null}
              </Stack>
            ) : null}
          </Box>
        </GridItem>
      </Grid>
      {quizOpen ? (
        <QuizModal
          isOpen
          onClose={() => setQuizOpen(false)}
          questions={questions}
          quizMode={quizMode}
          passThreshold={passThreshold}
          onQuizResult={onQuizResult}
          nextModuleHref={nextModuleHref}
        />
      ) : null}
    </Box>
  );
}
