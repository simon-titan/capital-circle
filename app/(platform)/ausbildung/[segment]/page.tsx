import { Box, Heading, Stack, Text } from "@chakra-ui/react";
import { notFound, redirect } from "next/navigation";
import { ChakraLinkButton } from "@/components/platform/ChakraLinkButton";
import { PaywallOverlay } from "@/components/ui/PaywallOverlay";
import { AusbildungModuleLearningClient } from "@/components/platform/AusbildungPageCards";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isCourseUnlocked, isModuleUnlocked } from "@/lib/progress";
import { getModulePublishedPlaylist, playlistAlsVorschau } from "@/lib/module-video";
import { parseVideoProgressByVideo, userCanAccessAcademyModule } from "@/lib/server-data";
import { LEKTION_PARAM, isUuidParam, moduleHref } from "@/lib/module-route";
import type { VideoAttachmentItem } from "@/components/platform/VideoAttachments";

type PageProps = {
  params: Promise<{ segment: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Harte Sperre (gesperrtes Modul / Kurs / Reihenfolge) als ruhige Glas-Karte. */
function LockedNotice({ title, text }: { title: string; text: string }) {
  return (
    <Stack gap={6} maxW="720px" mx="auto">
      <Box className="cc-card cc-card--still" p={{ base: 6, md: 8 }}>
        <Heading as="h1" fontSize="22px" fontWeight={600} color="var(--cc-text)" mb={2}>
          {title}
        </Heading>
        <Text fontSize="15px" color="var(--cc-text-2)" mb={6}>
          {text}
        </Text>
        <ChakraLinkButton href="/ausbildung" variant="line">
          Zur Instituts-Übersicht
        </ChakraLinkButton>
      </Box>
    </Stack>
  );
}

export default async function AcademyModulePage({ params, searchParams }: PageProps) {
  const { segment: raw } = await params;
  const query = await searchParams;
  const idOrSlug = decodeURIComponent(raw);
  const gewuenschteLektion = typeof query[LEKTION_PARAM] === "string" ? (query[LEKTION_PARAM] as string) : null;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/einsteig");

  const col = isUuidParam(idOrSlug) ? "id" : "slug";
  const { data: mod } = await supabase
    .from("modules")
    .select("id,title,description,course_id,is_published,order_index,is_locked")
    .eq(col, idOrSlug)
    .eq("is_published", true)
    .maybeSingle();

  if (!mod?.id) notFound();

  const [{ data: courseRow }, { data: profileRow }] = await Promise.all([
    supabase.from("courses").select("is_free,title").eq("id", mod.course_id).maybeSingle(),
    supabase.from("profiles").select("is_paid").eq("id", user.id).maybeSingle(),
  ]);

  const hasAccess = userCanAccessAcademyModule(Boolean(profileRow?.is_paid), courseRow?.is_free);

  // For locked / progression-gated modules, always keep the existing hard-stop UI
  // (no overlay — there is no premium content to "preview" for these cases).
  if (hasAccess) {
    if (mod.is_locked) {
      return <LockedNotice title="Modul gesperrt" text="Dieses Modul ist derzeit nicht verfügbar." />;
    }

    const courseUnlocked = await isCourseUnlocked(user.id, mod.course_id as string);
    if (!courseUnlocked) {
      return <LockedNotice title="Kurs gesperrt" text="Schließe zuerst den vorherigen Kurs ab, um fortzufahren." />;
    }

    const moduleUnlocked = await isModuleUnlocked(user.id, mod.id);
    if (!moduleUnlocked) {
      return <LockedNotice title="Modul gesperrt" text="Schließe zuerst das vorherige Modul ab, um fortzufahren." />;
    }
  }

  /*
   * Ohne Zugang steht die Seite verdeckt hinter der PaywallOverlay. Alles, was
   * hier geladen wird, landet trotzdem im Seiten-Payload beim Browser — die
   * Paywall verdeckt nur optisch. Deshalb bekommt sie ausschließlich die
   * Gliederung (Lektionstitel, Reihenfolge, Dauer): keine Abspiel-Schlüssel,
   * keine Beschreibungen, kein Quiz, keine Anhänge.
   *
   * Die Gliederung kommt über den Service-Client, weil die Zeilen-Sicherheit
   * (Migration 076) Konten ohne Zahlung die Videos bezahlter Kurse gar nicht
   * mehr ausliefert — die verdeckte Seite stünde sonst leer da.
   */
  const [{ data: quiz }, playlist] = await Promise.all([
    hasAccess
      ? supabase
          .from("quizzes")
          .select("questions,pass_threshold,quiz_mode")
          .eq("module_id", mod.id)
          .maybeSingle()
      : Promise.resolve({ data: null as { questions: unknown; pass_threshold: unknown; quiz_mode: unknown } | null }),
    hasAccess
      ? getModulePublishedPlaylist(supabase, mod.id)
      : getModulePublishedPlaylist(createServiceClient(), mod.id).then(playlistAlsVorschau),
  ]);

  const { data: progress } = await supabase
    .from("user_progress")
    .select("last_video_id,video_progress_by_video,quiz_passed,quiz_last_score,completed")
    .eq("user_id", user.id)
    .eq("module_id", mod.id)
    .maybeSingle();

  const orderIdx = typeof mod.order_index === "number" ? mod.order_index : 0;
  const { data: nextMod } = await supabase
    .from("modules")
    .select("id,slug")
    .eq("course_id", mod.course_id)
    .eq("order_index", orderIdx + 1)
    .eq("is_published", true)
    .maybeSingle();

  const nextModuleHref = nextMod?.id ? moduleHref({ id: nextMod.id as string, slug: (nextMod.slug as string | null) ?? null }) : null;

  const initialMap = parseVideoProgressByVideo(progress?.video_progress_by_video);
  const lastVideoId = (progress?.last_video_id as string | null) ?? null;

  /*
   * Ein verlangter Einstieg (`?lektion=`) schlägt den gespeicherten Stand — aber
   * nur, wenn die Lektion wirklich in dieser Playlist steht. Sonst würde ein
   * alter oder fremder Link den Player auf die erste Lektion zurückwerfen,
   * statt dort weiterzumachen, wo man war.
   */
  const startVideoId =
    gewuenschteLektion && playlist.some((v) => v.id === gewuenschteLektion) ? gewuenschteLektion : lastVideoId;

  const videoIds = playlist.map((v) => v.id);
  const attachmentsByVideoId: Record<string, VideoAttachmentItem[]> = {};
  if (hasAccess && videoIds.length > 0) {
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

  // Aufbau wie in der Vorlage: Kursleiste links, Player und Notizen rechts — alles im Client.
  const pageContent = (
    <AusbildungModuleLearningClient
      moduleId={mod.id}
      moduleTitle={mod.title as string}
      courseTitle={(courseRow?.title as string | null | undefined) ?? null}
      moduleDescription={(mod.description as string | null) ?? null}
      playlist={playlist}
      initialVideoId={startVideoId}
      initialProgressMap={initialMap}
      questions={Array.isArray(quiz?.questions) ? (quiz.questions as never[]) : []}
      quizMode={quiz?.quiz_mode === "single_page" ? "single_page" : "multi_page"}
      passThreshold={typeof quiz?.pass_threshold === "number" ? quiz.pass_threshold : 100}
      initialQuizPassed={Boolean(progress?.quiz_passed)}
      initialQuizLastScore={typeof progress?.quiz_last_score === "number" ? progress.quiz_last_score : null}
      initialModuleCompleted={Boolean(progress?.completed)}
      nextModuleHref={nextModuleHref}
      initialNoteContent={initialNoteContent}
      attachmentsByVideoId={attachmentsByVideoId}
    />
  );

  if (!hasAccess) {
    return <PaywallOverlay active>{pageContent}</PaywallOverlay>;
  }

  return pageContent;
}
