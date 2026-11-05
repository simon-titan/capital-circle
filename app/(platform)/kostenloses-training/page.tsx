import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Box, Flex, HStack, Stack, Text } from "@chakra-ui/react";
import { Lock } from "lucide-react";
import { PageHeader } from "@/components/journal/PageHeader";
import { AusbildungModuleLearningClient } from "@/components/platform/AusbildungPageCards";
import { ProgressBar } from "@/components/platform/dashboard/primitives";
import { AnalyseGespraechProvider } from "@/components/platform/training/AnalyseGespraech";
import { NaechsterSchritt } from "@/components/platform/training/NaechsterSchritt";
import { TRAINING_MODUL_ID, mitglied, videoPlatzhalter } from "@/config/training";
import { createClient } from "@/lib/supabase/server";
import { ladeTrainingsStand } from "@/lib/training/stand";

export const metadata: Metadata = { title: "Kostenloses Training · Capital Circle" };
export const dynamic = "force-dynamic";

/**
 * Das kostenlose Training im Mitgliederbereich (Board, Spalte 3 und 4).
 *
 * Die Videos spielt der vorhandene Kursplayer ab — samt Freischaltung Video für
 * Video (90 % gesehen) und Fortschritt in `user_progress`. Solange noch keine
 * Videos hochgeladen sind, stehen hier die drei Titel als Platzhalter.
 * Darunter der nächste Schritt (Analysegespräch oder Ausbildung).
 *
 * Für alle Konten offen: Der Kurs ist `is_free` (Migration 109).
 */
export default async function KostenlosesTrainingPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login?next=/kostenloses-training");

  const [stand, { data: profil }, { data: notiz }] = await Promise.all([
    ladeTrainingsStand(supabase, user.id),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase.from("user_notes").select("content").eq("user_id", user.id).eq("module_id", TRAINING_MODUL_ID).maybeSingle(),
  ]);

  const name = ((profil?.full_name as string | null) ?? "").trim();

  return (
    <AnalyseGespraechProvider name={name} email={user.email ?? ""}>
      <Box>
        <PageHeader title={mitglied.trainingTitel} subtitle={mitglied.trainingText} />

        <Stack spacing={2} mb={6} maxW="480px" className="cc-rise">
          <ProgressBar value={(stand.gesehen / stand.gesamt) * 100} label="Fortschritt im Training" />
          <Text className="cc-num" fontSize="13px" color="var(--cc-text-2)">
            {Math.min(stand.gesehen, stand.gesamt)}/{stand.gesamt} Videos abgeschlossen
          </Text>
        </Stack>

        {stand.videos.length > 0 ? (
          <AusbildungModuleLearningClient
            moduleId={TRAINING_MODUL_ID}
            moduleTitle={mitglied.trainingTitel}
            courseTitle={null}
            moduleDescription={null}
            playlist={stand.videos}
            initialVideoId={stand.lastVideoId}
            initialProgressMap={stand.progressMap}
            questions={[]}
            quizMode="multi_page"
            passThreshold={100}
            nextModuleHref={null}
            initialNoteContent={typeof notiz?.content === "string" ? notiz.content : ""}
            attachmentsByVideoId={{}}
          />
        ) : (
          <Stack className="cc-card cc-card--still" p={{ base: 5, md: 6 }} spacing={4}>
            <Text fontSize="14px" color="var(--cc-text-2)">
              {mitglied.videosFolgen}
            </Text>
            {videoPlatzhalter.map((v, i) => (
              <Flex key={v.titel} align="center" gap={4} py={3} borderTop={i ? "1px solid var(--cc-line)" : undefined}>
                <Text className="cc-num" fontSize="13px" fontWeight={600} color="var(--cc-gold-light)" w="64px" flexShrink={0}>
                  Video {i + 1}
                </Text>
                <Box flex="1" minW={0}>
                  <Text fontSize="15px" fontWeight={500} color="var(--cc-text)">
                    {v.titel}
                  </Text>
                  {v.untertitel ? (
                    <Text fontSize="13px" color="var(--cc-text-3)">
                      {v.untertitel}
                    </Text>
                  ) : null}
                </Box>
                <HStack color="var(--cc-text-3)" spacing={1.5} flexShrink={0}>
                  <Lock size={14} strokeWidth={1.75} aria-hidden />
                  <Text fontSize="12px">Folgt</Text>
                </HStack>
              </Flex>
            ))}
          </Stack>
        )}

        <Box mt={{ base: 10, md: 14 }}>
          <NaechsterSchritt abgeschlossen={stand.abgeschlossen} />
        </Box>
      </Box>
    </AnalyseGespraechProvider>
  );
}
