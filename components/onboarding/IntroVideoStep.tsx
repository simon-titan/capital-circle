"use client";

import { Box, Center, HStack, Spinner, Stack, Text } from "@chakra-ui/react";
import { Info } from "lucide-react";
import { useState } from "react";
import { GlassVideoPlayer } from "@/components/ui/GlassVideoPlayer";
import { createClient } from "@/lib/supabase/client";
import { getIntroVideoUrl } from "@/lib/intro-video";
import { OnboardingHeading } from "@/components/onboarding/OnboardingParts";

type IntroVideoStepProps = {
  onCompleted: () => void | Promise<void>;
};

export function IntroVideoStep({ onCompleted }: IntroVideoStepProps) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const introVideoUrl = getIntroVideoUrl();

  const onVideoEnded = async () => {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await supabase
        .from("profiles")
        .update({ intro_video_watched: true, intro_video_watched_at: new Date().toISOString() })
        .eq("id", data.user.id);
    }
    setLoading(false);
    await onCompleted();
  };

  return (
    <Stack
      minH="100vh"
      w="full"
      align="center"
      justify="center"
      px={{ base: 3, md: 6 }}
      py={{ base: 6, md: 8 }}
      spacing={0}
      position="relative"
      zIndex={1}
    >
      {loading ? (
        <Center
          position="fixed"
          inset={0}
          zIndex={50}
          bg="rgba(8, 10, 12, 0.72)"
          backdropFilter="blur(8px)"
          sx={{ WebkitBackdropFilter: "blur(8px)" }}
        >
          <Spinner
            size="xl"
            color="var(--cc-gold)"
            emptyColor="rgba(255, 255, 255, 0.08)"
            thickness="3px"
            speed="0.85s"
            label="Wird gespeichert"
          />
        </Center>
      ) : null}

      <Stack
        as="section"
        aria-labelledby="intro-title"
        className="cc-card cc-card--hero cc-card--still"
        p={{ base: 4, md: 6 }}
        w="full"
        maxW={{ base: "100%", md: "1100px" }}
        gap={{ base: 5, md: 6 }}
      >
        <Box className="cc-rise">
          <OnboardingHeading id="intro-title" title="Intro" />
        </Box>

        <HStack justify="center" align="flex-start" spacing={2} w="full" px={{ base: 1, md: 2 }}>
          <Box as="span" display="flex" flexShrink={0} mt="3px" color="var(--cc-gold-light)" aria-hidden>
            <Info size={14} strokeWidth={1.75} />
          </Box>
          <Text
            fontSize={{ base: "12px", md: "13px" }}
            color="var(--cc-text-2)"
            textAlign="center"
            lineHeight="1.45"
            maxW="520px"
          >
            Anschließend folgt die Vereinbarung zur Nutzung und Vertraulichkeit – erst danach erhältst du Zugang zur
            Plattform
          </Text>
        </HStack>

        <Box position="relative" w="full" zIndex={2}>
          <GlassVideoPlayer autoPlay src={introVideoUrl} onEnded={() => void onVideoEnded()} disableSeeking />
        </Box>
      </Stack>
    </Stack>
  );
}
