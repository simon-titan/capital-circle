import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { notFound, redirect } from "next/navigation";
import { ChakraLinkButton } from "@/components/platform/ChakraLinkButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageLiveSessionDetailClient } from "@/components/platform/PageCards";
import { getCurrentUserAndProfile, getLiveSessionDetail } from "@/lib/server-data";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function LiveSessionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");

  const detail = await getLiveSessionDetail(id);
  if (!detail) notFound();

  return (
    <Stack gap={6} alignItems="start">
      <ChakraLinkButton
        href="/live-session"
        variant="ghost"
        size="sm"
        color="var(--color-accent-gold)"
        className="inter"
      >
        ← Zurück zur Übersicht
      </ChakraLinkButton>

      <GlassCard>
        <Stack spacing={4} mb={6}>
          <Text
            fontSize="xs"
            letterSpacing="0.12em"
            textTransform="uppercase"
            className="inter-semibold"
            color="rgba(147, 197, 253, 0.9)"
          >
            {detail.category.title} · Live Session
          </Text>
          <Heading as="h1" size="lg" className="radley-regular" fontWeight={400} color="var(--color-text-primary)">
            {detail.title}
          </Heading>
          {detail.description ? (
            <Text className="inter" fontSize="sm" color="var(--color-text-muted)" lineHeight={1.6}>
              {detail.description}
            </Text>
          ) : null}
          {detail.recorded_at ? (
            <Text className="inter" fontSize="xs" color="var(--color-text-muted)">
              Aufzeichnung:{" "}
              {new Date(detail.recorded_at).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}
            </Text>
          ) : null}
          {detail.event ? (
            <Box
              px={3}
              py={2}
              borderRadius="md"
              borderWidth="1px"
              borderColor="rgba(100, 170, 240, 0.35)"
              bg="rgba(74, 144, 217, 0.08)"
            >
              <Text className="inter" fontSize="xs" color="rgba(191, 219, 254, 0.95)">
                Verknüpftes Event: {detail.event.title}
              </Text>
            </Box>
          ) : null}
        </Stack>
        <PageLiveSessionDetailClient playlist={detail.playlist} />
      </GlassCard>
    </Stack>
  );
}
