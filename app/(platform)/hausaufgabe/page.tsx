import { Box } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/journal/PageHeader";
import { HomeworkFullView } from "@/components/platform/HomeworkFullView";
import { getCurrentUserAndProfile, getHomeworkDashboardState, getHomeworkOverview } from "@/lib/server-data";

export default async function HausaufgabePage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) {
    redirect("/einsteig");
  }

  const [overview, homeworkState] = await Promise.all([getHomeworkOverview(), getHomeworkDashboardState(user.id)]);

  return (
    <Box>
      <PageHeader
        title="Wochenaufgabe"
        subtitle="Hier siehst du deine aktuellen Aufgaben im Detail und verwaltest deine persönliche Checkliste."
      />

      <HomeworkFullView
        aktuell={overview.aktuell}
        vergangen={overview.vergangen}
        todayKey={overview.todayKey}
        initialOfficialDone={homeworkState.officialDone}
        initialCustomTasks={homeworkState.customTasks}
      />
    </Box>
  );
}
