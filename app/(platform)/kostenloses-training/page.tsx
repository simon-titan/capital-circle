import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Box, Button, Flex, HStack, Stack, Text } from "@chakra-ui/react";
import { Lock, MessageCircle } from "lucide-react";
import { AusbildungModuleLearningClient } from "@/components/platform/AusbildungPageCards";
import { AnalyseGespraechProvider } from "@/components/platform/training/AnalyseGespraech";
import { BlueprintKarte } from "@/components/platform/dashboard/FreeDashboardView";
import { TrainingRegistrierungProvider, TrainingStartKnopf } from "@/components/landing/training/TrainingRegistrierung";
import { TRAINING_MODUL_ID, TRAINING_STATUS_PFAD, mitglied, videoPlatzhalter, zugangTexte } from "@/config/training";
import { datumBerlin } from "@/lib/mailsystem/zeit";
import { isPlaylistIndexUnlocked } from "@/lib/module-video";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ladeTrainingsStand } from "@/lib/training/stand";
import { ladeBlueprint } from "@/lib/trading-blueprint";
import { ladeTrainingFreigabe, whatsappVerlaengerungUrl } from "@/lib/training/zugang";

export const metadata: Metadata = { title: "Kostenloses Training · Capital Circle" };
export const dynamic = "force-dynamic";

/**
 * Das kostenlose Training im Mitgliederbereich (Board, Spalte 3 und 4).
 *
 * Die Videos spielt der vorhandene Kursplayer ab — samt Freischaltung Video für
 * Video (90 % gesehen; Video 2 ist optional) und Fortschritt in `user_progress`.
 *
 * Zugang seit 07.11.2026 (E-Mail-Playbook 1.0, Migration 110): nur nach
 * angenommener Bewerbung, 30 Tage ab Freischaltung, einmalig +7 Tage über das
 * Team. Danach bleibt die Seite mit dem Fortschritt stehen, die Videos sind
 * gesperrt (auch in `/api/video-url`). Zahlende sehen das Training immer.
 *
 * Adressen aus den Mails: `?video=n` springt in Lektion n (wenn offen),
 * `?gespraech=1` öffnet das Analysegespräch, `?bewerben=1` die Bewerbung.
 */
export default async function KostenlosesTrainingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login?next=/kostenloses-training");
  const params = await searchParams;
  const wert = (k: string) => (Array.isArray(params[k]) ? params[k]?.[0] : params[k]) as string | undefined;

  const [stand, { data: profil }, { data: notiz }, blueprint] = await Promise.all([
    ladeTrainingsStand(supabase, user.id),
    supabase.from("profiles").select("full_name, is_paid, is_admin").eq("id", user.id).maybeSingle(),
    supabase.from("user_notes").select("content").eq("user_id", user.id).eq("module_id", TRAINING_MODUL_ID).maybeSingle(),
    ladeBlueprint().catch(() => null),
  ]);
  const blueprintFrei = Boolean(profil?.is_paid || profil?.is_admin || stand.abgeschlossen);
  const freigabe = await ladeTrainingFreigabe(createServiceClient(), user.id, profil as { is_paid?: boolean; is_admin?: boolean } | null);
  if (freigabe.art === "bewerbung" && freigabe.bewerbung.status !== "angenommen") redirect(TRAINING_STATUS_PFAD);

  /*
    `?gespraech=1` aus den Mails (L04, I02/I03, E05 = analysis_entry_router_url):
    Gibt es schon eine Anfrage mit ausgefüllten Fragen, geht es direkt zum
    Kalender dieser Anfrage — kein zweiter Fragebogen, kein zweiter Lead.
  */
  if (wert("gespraech") === "1") {
    const { data: lead } = await createServiceClient()
      .from("training_leads")
      .select("token, answers")
      .eq("user_id", user.id)
      .in("status", ["neu", "nachfassen", "no_show", "termin"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const l = lead as { token: string; answers: Record<string, unknown> | null } | null;
    if (l && l.answers && Object.keys(l.answers).length > 0) redirect(`/termin/kalender/t-${l.token}`);
  }

  const name = ((profil?.full_name as string | null) ?? "").trim();
  const offen = freigabe.art === "bezahlt" || freigabe.art === "aktiv";

  // Lektion aus der Mail (`?video=3`), aber nur, wenn sie für dieses Konto offen ist.
  const gewuenscht = Number(wert("video"));
  const startVideo =
    Number.isInteger(gewuenscht) && gewuenscht >= 1 && isPlaylistIndexUnlocked(stand.videos, stand.progressMap, gewuenscht - 1)
      ? stand.videos[gewuenscht - 1]!.id
      : stand.lastVideoId;


  if (freigabe.art === "keine") {
    return (
      <TrainingRegistrierungProvider eingeloggt sofortOffen={wert("bewerben") === "1"}>
        <Box>
          <Stack className="cc-card cc-card--hero" p={{ base: 6, md: 8 }} spacing={4} maxW="560px" align="flex-start">
            <Text as="h2" fontSize={{ base: "20px", md: "22px" }} fontWeight={600} color="var(--cc-text)">
              {zugangTexte.keinZugangTitel}
            </Text>
            <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text-2)">
              {zugangTexte.keinZugangText}
            </Text>
            <TrainingStartKnopf>{zugangTexte.bewerben}</TrainingStartKnopf>
          </Stack>
        </Box>
      </TrainingRegistrierungProvider>
    );
  }

  // Blueprint unter der Lektionsliste (Feedback 14.11.2026); der Schluss-CTA („NaechsterSchritt") ist raus.
  const blueprintKarte = (
    <BlueprintKarte kompakt pdf={Boolean(blueprint?.r2_key)} video={Boolean(blueprint?.video_uid)} frei={blueprintFrei} />
  );

  const whatsapp = freigabe.art === "beendet" && freigabe.verlaengerbar ? whatsappVerlaengerungUrl() : null;

  return (
    <AnalyseGespraechProvider name={name} email={user.email ?? ""} sofortOffen={wert("gespraech") === "1"}>
      <Box>

        {/* Unterzeile und Statuszeile („0/5 Videos · Noch n Tage Zugang") sind seit 14.11.2026 raus:
            Fortschritt steht in der Kursleiste, die Restzeit im Countdown der Seitenleiste. */}

        {!offen ? (
          <Stack className="cc-card cc-card--still" p={{ base: 5, md: 7 }} spacing={4} maxW="640px">
            <HStack color="var(--cc-text-2)" spacing={2}>
              <Lock size={16} strokeWidth={1.75} aria-hidden />
              <Text fontSize="13px">{freigabe.art === "beendet" ? zugangTexte.bis(datumBerlin(freigabe.endeAm)) : ""}</Text>
            </HStack>
            <Text as="h2" fontSize={{ base: "19px", md: "21px" }} fontWeight={600} color="var(--cc-text)">
              {zugangTexte.beendetTitel}
            </Text>
            <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text-2)">
              {whatsapp ? zugangTexte.beendetText : zugangTexte.beendetVerlaengertText}
            </Text>
            {whatsapp ? (
              <Button
                as="a"
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                variant="gold"
                alignSelf="flex-start"
                leftIcon={<MessageCircle size={17} strokeWidth={2} />}
              >
                {zugangTexte.whatsapp}
              </Button>
            ) : null}
          </Stack>
        ) : stand.videos.length > 0 ? (
          <AusbildungModuleLearningClient
            moduleId={TRAINING_MODUL_ID}
            moduleTitle={mitglied.trainingTitel}
            courseTitle={null}
            moduleDescription={null}
            playlist={stand.videos}
            initialVideoId={startVideo}
            initialProgressMap={stand.progressMap}
            questions={[]}
            quizMode="multi_page"
            passThreshold={100}
            nextModuleHref={null}
            initialNoteContent={typeof notiz?.content === "string" ? notiz.content : ""}
            attachmentsByVideoId={{}}
            ohneNotizen
            unterPlaylist={blueprintKarte}
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
        {/* Ohne hochgeladene Videos (Platzhalterliste) steht der Blueprint darunter, so breit wie die Lektionsspalte. */}
        {offen && stand.videos.length === 0 ? (
          <Box mt={4} maxW="380px">
            {blueprintKarte}
          </Box>
        ) : null}
      </Box>
    </AnalyseGespraechProvider>
  );
}
