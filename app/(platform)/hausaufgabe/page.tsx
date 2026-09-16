import { Box } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/journal/PageHeader";
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
    <Box>
      <PageHeader
        title="Wochenaufgabe"
        subtitle="Hier siehst du die aktuelle Wochenaufgabe im Detail und verwaltest deine persönlichen Aufgaben."
      />

      <HomeworkFullView
        homework={homework}
        initialOfficialDone={homeworkState.officialDone}
        initialCustomTasks={homeworkState.customTasks}
        pastHomework={pastHomework}
      />
    </Box>
  );
}
