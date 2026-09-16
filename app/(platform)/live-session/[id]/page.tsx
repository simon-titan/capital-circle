import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { ChakraLinkButton } from "@/components/platform/ChakraLinkButton";
import { IconTile } from "@/components/platform/dashboard/primitives";
import { LiveSessionDetailClient } from "@/components/platform/LiveSessionDetailClient";
import { getCurrentUserAndProfile, getLiveSessionDetail } from "@/lib/server-data";
import { isApprovedFreeMember } from "@/lib/membership";

type PageProps = {
  params: Promise<{ id: string }>;
};

/** Zeitangaben in Berlin, unabhängig von der Server-Zeitzone. */
function formatBerlin(iso: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleString("de-DE", { ...opts, timeZone: "Europe/Berlin" });
}

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
      <Stack spacing={5} align="stretch">
        <Box>
          <ChakraLinkButton
            href="/live-session"
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
          </ChakraLinkButton>
        </Box>

        <Flex
          className="cc-card cc-card--still cc-rise"
          direction="column"
          align="center"
          textAlign="center"
          py={{ base: 10, md: 14 }}
          px={{ base: 5, md: 6 }}
        >
          <IconTile>
            <Box color="var(--cc-gold-light)">
              <Lock size={24} strokeWidth={1.75} />
            </Box>
          </IconTile>
          <Box
            as="h1"
            fontSize={{ base: "22px", md: "26px" }}
            fontWeight={600}
            lineHeight={1.25}
            letterSpacing="-0.01em"
            color="var(--cc-text)"
            mt={5}
            maxW="32rem"
          >
            {detail.title}
          </Box>
          <Text fontSize="16px" fontWeight={500} color="var(--cc-text)" mt={3}>
            Nur für vollwertige Mitglieder
          </Text>
          <Text fontSize="14px" lineHeight={1.7} color="var(--cc-text-2)" mt={2} maxW="420px">
            Diese Live Session ist exklusiv für vollwertige Capital Circle Mitglieder verfügbar.
            Als Free-Mitglied hast du Zugang zu allen Weekly Outlook Sessions.
          </Text>
          <ChakraLinkButton href="/bewerbung" variant="gold" mt={6} px={8}>
            Jetzt Mitglied werden
          </ChakraLinkButton>
        </Flex>
      </Stack>
    );
  }

  const dateLine = detail.event
    ? `Live am: ${formatBerlin(detail.event.start_time, { dateStyle: "full", timeStyle: "short" })}`
    : detail.recorded_at
      ? `Aufzeichnung: ${formatBerlin(detail.recorded_at, { dateStyle: "medium", timeStyle: "short" })}`
      : null;

  return (
    <LiveSessionDetailClient
      playlist={detail.playlist}
      session={{
        title: detail.title,
        categoryTitle: detail.category.title,
        description: detail.description,
        dateLine,
        eventTitle: detail.event?.title ?? null,
      }}
    />
  );
}
