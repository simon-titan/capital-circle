"use client";

import { Box, Center, HStack, Spinner, Stack, Text } from "@chakra-ui/react";
import Image from "next/image";
import { Info } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassVideoPlayer } from "@/components/ui/GlassVideoPlayer";
import { createClient } from "@/lib/supabase/client";
import { getIntroVideoUrl } from "@/lib/intro-video";

export function IntroVideoStep() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const introVideoUrl = getIntroVideoUrl();

  const goToDashboard = async () => {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await supabase
        .from("profiles")
        .update({ intro_video_watched: true, intro_video_watched_at: new Date().toISOString() })
        .eq("id", data.user.id);
    }
    router.replace("/dashboard");
    router.refresh();
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
          bg="rgba(0, 0, 0, 0.45)"
          backdropFilter="blur(8px)"
          sx={{ WebkitBackdropFilter: "blur(8px)" }}
        >
          <Spinner size="xl" color="brand.400" thickness="3px" speed="0.85s" />
        </Center>
      ) : null}

      <Stack
        className="glass-card"
        p={{ base: 4, md: 6 }}
        w="full"
        maxW={{ base: "100%", md: "1100px" }}
        gap={{ base: 5, md: 6 }}
        borderColor="rgba(255, 255, 255, 0.12)"
        boxShadow="0 8px 40px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06)"
        position="relative"
      >
        <Box display="flex" justifyContent="center" px={{ base: 1, md: 2 }}>
          <Box position="relative" w="full" maxW={{ base: "260px", sm: "300px", md: "360px" }}>
            <Image
              src="/logo/logo-intro.png"
              alt="Capital Circle Intro"
              width={760}
              height={280}
              priority
              style={{
                width: "100%",
                height: "auto",
                objectFit: "contain",
                display: "block",
              }}
            />
          </Box>
        </Box>

        <HStack
          justify="center"
          align="flex-start"
          spacing={2}
          w="full"
          px={{ base: 1, md: 2 }}
        >
          <Box
            as="span"
            display="flex"
            flexShrink={0}
            mt="3px"
            color="rgba(232, 197, 71, 0.9)"
            aria-hidden
          >
            <Info size={14} strokeWidth={2} />
          </Box>
          <Text
            fontSize={{ base: "11px", md: "xs" }}
            className="inter"
            color="rgba(240, 240, 242, 0.5)"
            textAlign="center"
            lineHeight="1.45"
            maxW="520px"
          >
            Du wirst nach dem Video automatisch auf unsere Plattform weitergeleitet
          </Text>
        </HStack>

        <Box position="relative" w="full" zIndex={2} mx={{ base: 0, md: 0 }}>
          <GlassVideoPlayer src={introVideoUrl} onEnded={() => void goToDashboard()} />
        </Box>
      </Stack>
    </Stack>
  );
}
