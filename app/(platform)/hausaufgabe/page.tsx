import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { HomeworkFullView } from "@/components/platform/HomeworkFullView";
import {
  getActiveHomework,
  getCurrentUserAndProfile,
  getHomeworkDashboardState,
  getPastHomework,
} from "@/lib/server-data";

export default async function HausaufgabePage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) {
    redirect("/einsteig");
  }

  const [homework, pastHomework] = await Promise.all([
    getActiveHomework(),
    getPastHomework(),
  ]);
  const homeworkState = await getHomeworkDashboardState(user.id, homework);

  return (
    <Stack spacing={{ base: 6, md: 8 }}>
      <Box>
        <Text
          className="inter-medium"
          fontSize="xs"
          letterSpacing="0.14em"
          textTransform="uppercase"
          color="rgba(255, 255, 255, 0.5)"
          mb={2}
        >
          Arsenal · Lernroutine
        </Text>
        <Heading as="h1" size="xl" className="radley-regular" fontWeight={400} color="var(--color-text-primary)" mb={2}>
          Hausaufgabe & Checkliste
        </Heading>
        <Text className="inter" fontSize="md" color="var(--color-text-muted)" maxW="720px" lineHeight="tall">
          Hier siehst du die aktuelle Wochenaufgabe im Detail und verwaltest deine persönlichen Aufgaben.
        </Text>
      </Box>

      <HomeworkFullView
        homework={homework}
        initialOfficialDone={homeworkState.officialDone}
        initialCustomTasks={homeworkState.customTasks}
        pastHomework={pastHomework}
      />
    </Stack>
  );
}
