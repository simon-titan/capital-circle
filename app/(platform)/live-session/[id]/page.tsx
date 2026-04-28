import { Box, Button, Flex, Heading, Stack, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import { notFound, redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { ChakraLinkButton } from "@/components/platform/ChakraLinkButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { PageLiveSessionDetailClient } from "@/components/platform/PageCards";
import { getCurrentUserAndProfile, getLiveSessionDetail } from "@/lib/server-data";
import { isApprovedFreeMember } from "@/lib/membership";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function LiveSessionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");

  const detail = await getLiveSessionDetail(id);
  if (!detail) notFound();

  const freeMember = isApprovedFreeMember(profile);
  const isWeeklyOutlook = detail.category.title.toLowerCase().includes("weekly outlook");

  if (freeMember && !isWeeklyOutlook) {
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
          <Flex direction="column" align="center" justify="center" py={16} px={6} textAlign="center">
            <Box
              h="2px"
              w="48px"
              borderRadius="full"
              mb={4}
              bg="linear-gradient(90deg, rgba(212,175,55,0) 0%, rgba(232,197,71,0.85) 50%, rgba(212,175,55,0) 100%)"
              boxShadow="0 0 10px rgba(212,175,55,0.3)"
            />
            <Flex
              align="center"
              justify="center"
              w="56px"
              h="56px"
              borderRadius="14px"
              bg="rgba(212, 175, 55, 0.12)"
              border="1px solid rgba(212, 175, 55, 0.38)"
              mb={5}
            >
              <Lock size={26} strokeWidth={2} aria-hidden style={{ color: "rgba(212,175,55,0.9)" }} />
            </Flex>
            <Stack spacing={2} mb={6} maxW="420px">
              <Text className="radley-regular" fontSize="xl" color="var(--color-text-primary)">
                {detail.title}
              </Text>
              <Text className="inter-semibold" fontSize="sm" color="var(--color-text-primary)">
                Nur für vollwertige Mitglieder
              </Text>
              <Text className="inter" fontSize="sm" color="rgba(255,255,255,0.52)" lineHeight="1.7">
                Diese Live Session ist exklusiv für vollwertige Capital Circle Mitglieder verfügbar.
                Als Free-Mitglied hast du Zugang zu allen Weekly Outlook Sessions.
              </Text>
            </Stack>
            <Button
              as={NextLink}
              href="/bewerbung"
              size="md"
              borderRadius="10px"
              bg="rgba(212, 175, 55, 0.22)"
              border="1px solid rgba(212, 175, 55, 0.48)"
              color="rgba(232, 197, 71, 0.95)"
              className="inter-semibold"
              fontSize="sm"
              px={8}
              _hover={{
                bg: "rgba(212, 175, 55, 0.32)",
                borderColor: "rgba(232, 197, 71, 0.65)",
                boxShadow: "0 0 16px rgba(212,175,55,0.22)",
              }}
            >
              Jetzt Mitglied werden
            </Button>
          </Flex>
        </GlassCard>
      </Stack>
    );
  }

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
          {detail.event ? (
            <Text className="inter-semibold" fontSize="sm" color="rgba(147, 197, 253, 0.95)">
              Live am:{" "}
              {new Date(detail.event.start_time).toLocaleString("de-DE", {
                dateStyle: "full",
                timeStyle: "short",
              })}
            </Text>
          ) : detail.recorded_at ? (
            <Text className="inter" fontSize="sm" color="var(--color-text-muted)">
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
              borderColor="rgba(100, 170, 240, 0.4)"
              bg="rgba(74, 144, 217, 0.1)"
            >
              <Text fontSize="10px" letterSpacing="0.08em" textTransform="uppercase" className="inter-semibold" color="rgba(147, 197, 253, 0.85)" mb={1}>
                Kalender-Event
              </Text>
              <Text className="inter" fontSize="sm" color="rgba(191, 219, 254, 0.98)">
                {detail.event.title}
              </Text>
            </Box>
          ) : null}
        </Stack>
        <PageLiveSessionDetailClient playlist={detail.playlist} />
      </GlassCard>
    </Stack>
  );
}
