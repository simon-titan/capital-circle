import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { PageHeader } from "@/components/journal/PageHeader";
import { ChakraLinkButton } from "@/components/platform/ChakraLinkButton";
import { IconTile } from "@/components/platform/dashboard/primitives";
import { isFreeLiveSessionCategory } from "@/components/platform/live-session-free";
import { LiveSessionTiles } from "@/components/platform/LiveSessionTiles";
import { kategorieHinweis } from "@/components/platform/live-session-ui";
import { getLiveSessionCategory, getLiveSessionsWithCounts } from "@/lib/live-session-overview";
import { getCurrentUserAndProfile } from "@/lib/server-data";
import { isApprovedFreeMember } from "@/lib/membership";

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Eine Kategorie mit ihren Aufzeichnungen — die mittlere Ebene zwischen den
 * drei Einstiegskarten und der Detailansicht mit Player und Playlist. Aufbau
 * wie das Modulraster im Institut.
 */
function ZurueckLink() {
  return (
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
      Zurück zu den Live Sessions
    </ChakraLinkButton>
  );
}

export default async function LiveSessionCategoryPage({ params }: PageProps) {
  const { id } = await params;
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");

  const category = await getLiveSessionCategory(id);
  if (!category) notFound();

  // Free-Mitglieder sehen genau eine Kategorie (siehe live-session-free.ts).
  // Die gesperrte wird benannt statt versteckt — so wie DESIGN.md es vorgibt.
  if (isApprovedFreeMember(profile) && !isFreeLiveSessionCategory(category.title)) {
    return (
      <Stack spacing={5} align="stretch">
        <Box className="cc-rise">
          <ZurueckLink />
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
          >
            {category.title}
          </Box>
          <Text fontSize="16px" fontWeight={500} color="var(--cc-text)" mt={3}>
            Nur für Mitglieder
          </Text>
          <Text fontSize="14px" lineHeight={1.7} color="var(--cc-text-2)" mt={2} maxW="420px">
            Diese Kategorie ist vollwertigen Capital Circle Mitgliedern vorbehalten. Als Free-Mitglied hast du Zugang zu
            allen Wochenrecap-Sessions.
          </Text>
          <ChakraLinkButton href="/bewerbung" variant="gold" mt={6} px={8}>
            Jetzt Mitglied werden
          </ChakraLinkButton>
        </Flex>
      </Stack>
    );
  }

  const sessions = await getLiveSessionsWithCounts(category.id);

  return (
    <Box>
      <Box mb={4} className="cc-rise">
        <ZurueckLink />
      </Box>
      <PageHeader
        title={category.title}
        subtitle={
          sessions.length > 0
            ? "Eine Aufzeichnung anklicken — dann siehst du die einzelnen Videos und kannst sie der Reihe nach ansehen."
            : kategorieHinweis(category.title)
        }
      />
      {sessions.length > 0 ? (
        <LiveSessionTiles sessions={sessions} />
      ) : (
        <Box className="cc-card cc-card--still cc-rise" p={{ base: 5, md: 6 }}>
          <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text-2)">
            Noch keine Aufzeichnungen in dieser Kategorie. Sobald eine Session veröffentlicht ist, steht sie hier mit
            allen Videos.
          </Text>
        </Box>
      )}
    </Box>
  );
}
