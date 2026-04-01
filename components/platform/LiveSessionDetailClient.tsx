"use client";

import { useCallback, useState } from "react";
import { Box, Grid, GridItem } from "@chakra-ui/react";
import { GlassVideoPlayer } from "@/components/ui/GlassVideoPlayer";
import { VideoDescription } from "@/components/platform/VideoDescription";
import { LiveSessionPlaylist } from "@/components/platform/LiveSessionPlaylist";
import type { LiveSessionVideoRow } from "@/lib/server-data";

export type LiveSessionDetailClientProps = {
  playlist: LiveSessionVideoRow[];
};

function pickStartIndex(playlist: LiveSessionVideoRow[]) {
  if (!playlist.length) return 0;
  return 0;
}

export function LiveSessionDetailClient({ playlist }: LiveSessionDetailClientProps) {
  const [activeIndex, setActiveIndex] = useState(() => pickStartIndex(playlist));
  const current = playlist[activeIndex] ?? null;

  const onSelectVideo = useCallback(
    (idx: number) => {
      if (idx === activeIndex || idx < 0 || idx >= playlist.length) return;
      setActiveIndex(idx);
    },
    [activeIndex, playlist.length],
  );

  if (!playlist.length) {
    return null;
  }

  return (
    <Grid
      templateColumns={{ base: "1fr", lg: "minmax(0, 5fr) minmax(280px, 2fr)" }}
      gap={{ base: 6, lg: 8 }}
      alignItems="start"
    >
      <GridItem minW={0}>
        {current ? (
          <GlassVideoPlayer
            key={current.id}
            storageKey={current.storage_key}
            presignApiPath="/api/live-session-video-url"
            startAtSeconds={0}
          />
        ) : null}
        <VideoDescription description={current?.description} />
      </GridItem>
      <GridItem>
        <Box
          position={{ base: "relative", lg: "sticky" }}
          top={{ lg: "80px" }}
          maxH={{ lg: "calc(100vh - 100px)" }}
          overflowY={{ lg: "auto" }}
          pr={{ lg: 1 }}
        >
          <LiveSessionPlaylist playlist={playlist} activeIndex={activeIndex} onSelect={onSelectVideo} />
        </Box>
      </GridItem>
    </Grid>
  );
}
