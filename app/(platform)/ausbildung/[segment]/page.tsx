import { Grid, GridItem, Heading, Stack, Text } from "@chakra-ui/react";
import { notFound, redirect } from "next/navigation";
import { ChakraLinkButton } from "@/components/platform/ChakraLinkButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { ModuleLearningClient } from "@/components/platform/ModuleLearningClient";
import { createClient } from "@/lib/supabase/server";
import { isModuleUnlocked } from "@/lib/progress";
import { getModulePublishedPlaylist } from "@/lib/module-video";
import { parseVideoProgressByVideo, userCanAccessAcademyModule } from "@/lib/server-data";
import { isUuidParam } from "@/lib/module-route";
import type { VideoAttachmentItem } from "@/components/platform/VideoAttachments";

type PageProps = {
  params: Promise<{ segment: string }>;
};

export default async function AcademyModulePage({ params }: PageProps) {
  const { segment: raw } = await params;
  const idOrSlug = decodeURIComponent(raw);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/einsteig");

  const col = isUuidParam(idOrSlug) ? "id" : "slug";
  const { data: mod } = await supabase
    .from("modules")
    .select("id,title,description,course_id,is_published")
    .eq(col, idOrSlug)
    .eq("is_published", true)
    .maybeSingle();

  if (!mod?.id) notFound();

  const [{ data: courseRow }, { data: profileRow }] = await Promise.all([
    supabase.from("courses").select("is_free").eq("id", mod.course_id).maybeSingle(),
    supabase.from("profiles").select("is_paid").eq("id", user.id).maybeSingle(),
  ]);

  if (!userCanAccessAcademyModule(Boolean(profileRow?.is_paid), courseRow?.is_free)) {
    return (
      <Stack gap={6} maxW="720px" mx="auto">
        <GlassCard highlight>
          <Heading as="h1" size="md" className="inter-semibold" fontWeight={600} mb={2}>
            Paid-Bereich
          </Heading>
          <Text className="inter" color="var(--color-text-muted)" fontSize="sm" mb={6}>
            Dieses Modul ist Teil des kostenpflichtigen Angebots. Mit deinem aktuellen Zugang ist es nicht
            verfügbar.
          </Text>
          <ChakraLinkButton href="/ausbildung" variant="outline" borderColor="rgba(212,175,55,0.45)" color="var(--color-accent-gold)">
            Zur Instituts-Übersicht
          </ChakraLinkButton>
        </GlassCard>
      </Stack>
    );
  }

  const unlocked = await isModuleUnlocked(user.id, mod.id);

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("questions,pass_threshold,quiz_mode")
    .eq("module_id", mod.id)
    .maybeSingle();
  const playlist = await getModulePublishedPlaylist(supabase, mod.id);

  const { data: progress } = await supabase
    .from("user_progress")
    .select("last_video_id,video_progress_by_video")
    .eq("user_id", user.id)
    .eq("module_id", mod.id)
    .maybeSingle();

  const initialMap = parseVideoProgressByVideo(progress?.video_progress_by_video);
  const lastVideoId = (progress?.last_video_id as string | null) ?? null;

  const videoIds = playlist.map((v) => v.id);
  const attachmentsByVideoId: Record<string, VideoAttachmentItem[]> = {};
  if (videoIds.length > 0) {
    const { data: attRows } = await supabase
      .from("video_attachments")
      .select("id, video_id, filename, content_type, position")
      .in("video_id", videoIds)
      .order("position", { ascending: true });
    for (const r of attRows ?? []) {
      const vid = r.video_id as string;
      if (!attachmentsByVideoId[vid]) attachmentsByVideoId[vid] = [];
      attachmentsByVideoId[vid].push({
        id: r.id as string,
        filename: r.filename as string,
        content_type: (r.content_type as string | null) ?? null,
      });
    }
  }

  const { data: noteRow } = await supabase
    .from("user_notes")
    .select("content")
    .eq("user_id", user.id)
    .eq("module_id", mod.id)
    .maybeSingle();

  const initialNoteContent = typeof noteRow?.content === "string" ? noteRow.content : "";

  if (!unlocked) {
    return (
      <Stack gap={6} maxW="720px" mx="auto">
        <GlassCard highlight>
          <Heading as="h1" size="md" className="inter-semibold" fontWeight={600} mb={2}>
            Modul gesperrt
          </Heading>
          <Text className="inter" color="var(--color-text-muted)" fontSize="sm" mb={6}>
            Schließe zuerst das vorherige Modul ab, um fortzufahren.
          </Text>
          <ChakraLinkButton href="/ausbildung" variant="outline" borderColor="rgba(212,175,55,0.45)" color="var(--color-accent-gold)">
            Zur Instituts-Übersicht
          </ChakraLinkButton>
        </GlassCard>
      </Stack>
    );
  }

  return (
    <Grid templateColumns="1fr" gap={6} alignItems="start">
      <GridItem>
        <ChakraLinkButton
          href="/ausbildung"
          variant="ghost"
          size="sm"
          mb={2}
          color="var(--color-accent-gold)"
          className="inter"
        >
          ← Zur Instituts-Übersicht
        </ChakraLinkButton>
        <GlassCard>
          <Stack spacing={4} mb={6}>
            <Heading as="h1" size="lg" className="radley-regular" fontWeight={400} color="var(--color-text-primary)">
              {mod.title}
            </Heading>
            {mod.description ? (
              <Text className="inter" fontSize="sm" color="var(--color-text-muted)" lineHeight={1.6}>
                {mod.description}
              </Text>
            ) : null}
          </Stack>
          <ModuleLearningClient
            moduleId={mod.id}
            playlist={playlist}
            initialVideoId={lastVideoId}
            initialProgressMap={initialMap}
            questions={Array.isArray(quiz?.questions) ? (quiz.questions as never[]) : []}
            quizMode={quiz?.quiz_mode === "single_page" ? "single_page" : "multi_page"}
            passThreshold={typeof quiz?.pass_threshold === "number" ? quiz.pass_threshold : 100}
            initialNoteContent={initialNoteContent}
            attachmentsByVideoId={attachmentsByVideoId}
          />
        </GlassCard>
      </GridItem>
    </Grid>
  );
}
