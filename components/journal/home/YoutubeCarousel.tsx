"use client";

import { AspectRatio, Box, HStack, Icon, IconButton, Stack, Text } from "@chakra-ui/react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { YoutubeVideo } from "@/lib/journal/youtube";
import { Panel } from "../Panel";

/**
 * Letzte Uploads als horizontale Slideshow. Shorts filtert bereits der Feed —
 * `lib/journal/youtube.ts` zieht die Long-Form-Playlist statt des Kanal-Feeds.
 *
 * Datenschutzfreundlich: gerendert wird zunächst nur das Vorschaubild. Erst beim
 * Klick lädt das youtube-nocookie-iframe — vorher stellt YouTube keine
 * Verbindung her und setzt keine Cookies.
 */
export function YoutubeCarousel() {
  const [videos, setVideos] = useState<YoutubeVideo[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/journal/youtube");
        const payload = await response.json();
        if (!cancelled && payload?.videos) setVideos(payload.videos as YoutubeVideo[]);
      } catch {
        // Beiwerk — bei Ausfall bleibt der Bereich einfach leer.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (videos.length === 0) return null;

  const scroll = (direction: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: direction * 340, behavior: "smooth" });
  };

  const navSx = {
    size: "sm" as const,
    variant: "ghost" as const,
    color: "var(--cc-text-2)",
    _hover: { bg: "var(--j-accent-soft)", color: "var(--cc-text)" },
  };

  return (
    <Panel>
      <HStack justify="space-between" pb={3} mb={5} borderBottom="1px solid var(--j-line)">
        <Text
          as="h2"
          fontSize="13px"
          lineHeight="18px"
          fontWeight={500}
          letterSpacing="0.12em"
          textTransform="uppercase"
          color="var(--cc-text-soft)"
        >
          Neueste Videos
        </Text>
        <HStack gap={1}>
          <IconButton {...navSx} aria-label="Zurück" icon={<ChevronLeft size={16} />} onClick={() => scroll(-1)} />
          <IconButton {...navSx} aria-label="Weiter" icon={<ChevronRight size={16} />} onClick={() => scroll(1)} />
        </HStack>
      </HStack>

      <Box
        ref={scrollRef}
        display="flex"
        gap={4}
        overflowX="auto"
        pb={2}
        scrollSnapType="x mandatory"
        sx={{
          "&::-webkit-scrollbar": { height: "6px" },
          "&::-webkit-scrollbar-thumb": { background: "rgba(255,255,255,0.12)", borderRadius: "3px" },
        }}
      >
        {videos.map((video) => (
          <Stack
            key={video.videoId}
            minW={{ base: "255px", md: "300px" }}
            maxW={{ base: "255px", md: "300px" }}
            gap={2.5}
            scrollSnapAlign="start"
          >
            <AspectRatio ratio={16 / 9} borderRadius="10px" overflow="hidden" bg="#000">
              {playing === video.videoId ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&rel=0`}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <Box
                  as="button"
                  onClick={() => setPlaying(video.videoId)}
                  position="relative"
                  aria-label={`Video abspielen: ${video.title}`}
                  cursor="pointer"
                  _hover={{
                    "& .play-overlay": {
                      bg: "var(--cc-gold)",
                      borderColor: "var(--cc-gold-light)",
                      boxShadow: "0 0 26px rgba(212, 176, 128, 0.55)",
                    },
                    "& .play-icon": { color: "var(--cc-on-gold)" },
                  }}
                >
                  {/* Über den Next-Optimizer geladen: der Browser kontaktiert
                      YouTube erst beim Klick, nicht schon beim Rendern. */}
                  <Image src={video.thumbnail} alt="" fill sizes="300px" style={{ objectFit: "cover" }} />
                  <Box
                    className="play-overlay"
                    position="absolute"
                    top="50%"
                    left="50%"
                    transform="translate(-50%, -50%)"
                    w="46px"
                    h="46px"
                    borderRadius="full"
                    bg="rgba(0,0,0,0.6)"
                    border="1px solid rgba(255,255,255,0.5)"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    transition="background 0.15s ease, border-color 0.15s ease"
                  >
                    <Icon as={Play} className="play-icon" boxSize={4} color="#fff" fill="currentColor" ml="2px" />
                  </Box>
                </Box>
              )}
            </AspectRatio>

            <Text fontSize="sm" color="var(--cc-text-2)" noOfLines={2} lineHeight="1.4">
              {video.title}
            </Text>
          </Stack>
        ))}
      </Box>
    </Panel>
  );
}
