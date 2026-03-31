"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Flex, Grid, GridItem, Text } from "@chakra-ui/react";
import { GlassVideoPlayer } from "@/components/ui/GlassVideoPlayer";
import { QuizModal, type QuizMode, type QuizQuestion } from "@/components/platform/QuizModal";
import { VideoPlaylist, isPlaylistIndexUnlocked } from "@/components/platform/VideoPlaylist";
import { isPlaylistVideoDone } from "@/lib/module-video";
import { VideoDescription } from "@/components/platform/VideoDescription";
import { VideoAttachments, type VideoAttachmentItem } from "@/components/platform/VideoAttachments";
import { ModuleNotes } from "@/components/platform/ModuleNotes";
import type { PlaylistVideoRow } from "@/lib/module-video";

type ModuleLearningClientProps = {
  moduleId: string;
  playlist: PlaylistVideoRow[];
  initialVideoId: string | null;
  initialProgressMap: Record<string, number>;
  questions: QuizQuestion[];
  quizMode: QuizMode;
  passThreshold: number;
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
  initialNoteContent,
  attachmentsByVideoId,
}: ModuleLearningClientProps) {
  const [quizOpen, setQuizOpen] = useState(false);
  const [lastProgress, setLastProgress] = useState(0);
  const lastProgressRef = useRef(lastProgress);
  useEffect(() => {
    lastProgressRef.current = lastProgress;
  }, [lastProgress]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>(() => ({ ...initialProgressMap }));
  const progressMapRef = useRef(progressMap);
  useEffect(() => {
    progressMapRef.current = progressMap;
  }, [progressMap]);

  const [activeIndex, setActiveIndex] = useState(() => pickStartIndex(playlist, initialVideoId, initialProgressMap));
  const hasQuiz = useMemo(() => questions.length > 0, [questions.length]);

  const current = playlist[activeIndex] ?? null;
  const startAtSeconds = current ? Math.max(0, progressMap[current.id] ?? 0) : 0;
  const currentAttachments = current ? attachmentsByVideoId[current.id] ?? [] : [];

  const postProgress = useCallback(
    async (payload: {
      progressSeconds: number;
      videoId?: string | null;
      videoCompleted?: boolean;
      completed?: boolean;
      quizPassed?: boolean;
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
      void postProgress({
        progressSeconds: progress,
        videoId: current.id,
        videoProgressMap: map,
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [current, postProgress]);

  const onPassed = async () => {
    const vid = current?.id;
    const map = progressMapRef.current;
    const merged = vid ? { ...map, [vid]: Math.max(map[vid] ?? 0, lastProgress) } : map;
    await postProgress({
      progressSeconds: lastProgress,
      videoId: vid,
      videoCompleted: true,
      completed: true,
      quizPassed: true,
      videoProgressMap: merged,
    });
  };

  const onVideoEnded = useCallback(() => {
    if (!current) return;
    const dur = current.duration_seconds ?? 0;
    const endedSeconds = dur > 0 ? dur : Math.max(lastProgress, progressMapRef.current[current.id] ?? 0);

    if (activeIndex < playlist.length - 1) {
      const next = playlist[activeIndex + 1];
      const newMap = {
        ...progressMapRef.current,
        [current.id]: Math.max(progressMapRef.current[current.id] ?? 0, endedSeconds),
      };
      progressMapRef.current = newMap;
      setProgressMap(newMap);
      void postProgress({
        progressSeconds: endedSeconds,
        videoId: current.id,
        videoCompleted: false,
        videoProgressMap: newMap,
      });
      setActiveIndex((i) => i + 1);
      setLastProgress(0);
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
    if (hasQuiz) setQuizOpen(true);
  }, [activeIndex, current, hasQuiz, lastProgress, playlist, postProgress]);

  const onSelectVideo = useCallback(
    async (idx: number) => {
      if (idx === activeIndex || idx < 0 || idx >= playlist.length) return;
      if (!isPlaylistIndexUnlocked(playlist, progressMapRef.current, idx)) return;
      const next = playlist[idx];
      const cur = playlist[activeIndex];
      const secs = lastProgress;
      const base = { ...progressMapRef.current };
      if (cur) {
        base[cur.id] = Math.max(base[cur.id] ?? 0, Math.floor(secs));
      }
      setProgressMap(base);
      await postProgress({
        progressSeconds: cur ? base[cur.id] ?? 0 : 0,
        videoId: next.id,
        videoCompleted: false,
        videoProgressMap: base,
      });
      setActiveIndex(idx);
      setLastProgress(0);
    },
    [activeIndex, lastProgress, playlist, postProgress],
  );

  if (!playlist.length) {
    const introFallback = process.env.NEXT_PUBLIC_INTRO_VIDEO_URL ?? "";
    return (
      <Box>
        <Text className="inter" color="gray.500" fontSize="sm" mb={4}>
          Kein veröffentlichtes Video in diesem Modul. Platzhalter-Intro wird angezeigt, falls konfiguriert.
        </Text>
        {introFallback ? (
          <GlassVideoPlayer src={introFallback} onProgress={(seconds) => setLastProgress(Math.floor(seconds))} />
        ) : null}
        {quizOpen ? (
          <QuizModal
            isOpen
            onClose={() => setQuizOpen(false)}
            questions={questions}
            quizMode={quizMode}
            passThreshold={passThreshold}
            onPassed={onPassed}
          />
        ) : null}
        <ModuleNotes moduleId={moduleId} initialContent={initialNoteContent} />
      </Box>
    );
  }

  return (
    <Box>
      {hasQuiz ? (
        <Flex justify="flex-end" mb={4}>
          <Button variant="outline" onClick={() => setQuizOpen(true)}>
            Quiz jetzt starten
          </Button>
        </Flex>
      ) : null}
      <Grid
        templateColumns={{ base: "1fr", lg: "minmax(0, 5fr) minmax(280px, 2fr)" }}
        gap={{ base: 6, lg: 8 }}
        alignItems="start"
      >
        <GridItem minW={0}>
          <GlassVideoPlayer
            key={current.id}
            storageKey={current.storage_key}
            startAtSeconds={startAtSeconds}
            onProgress={(seconds) => setLastProgress(Math.floor(seconds))}
            onEnded={onVideoEnded}
          />
          <VideoDescription description={current.description} />
          <VideoAttachments attachments={currentAttachments} />
          <ModuleNotes moduleId={moduleId} initialContent={initialNoteContent} />
        </GridItem>
        <GridItem>
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
          onPassed={onPassed}
        />
      ) : null}
    </Box>
  );
}
