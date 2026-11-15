import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Box, Button, Grid, HStack, Stack, Text } from "@chakra-ui/react";
import { BookOpen, Check, Users } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/journal/PageHeader";
import { AnalyseGespraechKnopf, AnalyseGespraechProvider } from "@/components/platform/training/AnalyseGespraech";
import { PRODUKTE, euro, rateCents } from "@/config/mentoring";
import { FREE_PROGRAMME_PFAD, programme } from "@/config/training";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ausbildung & Mentoring · Capital Circle" };
export const dynamic = "force-dynamic";

const DAUERZUGANG = new Set(["mentoring", "lifetime", "ht_1on1"]);
const ABO = new Set(["monthly", "quarterly", "yearly"]);

const FEHLER: Record<string, string> = {
  raten: programme.fehler.raten,
  schon_enthalten: programme.ausbildung.hatSchonText,
};

/**
 * „Ausbildung & Mentoring" (Board, Spalte 7): zwei Wege nach dem Training.
 *
 *   Ausbildung — Selbstkauf, einmal 799 € oder 2 Raten (`/api/programme/ausbildung`).
 *   Mentoring  — Preis im Gespräch, Knopf öffnet das Analysegespräch (`stelle: programme`).
 *
 * Nur für Zahlende und Admins: Free-Mitglieder gehen seit 14.11.2026 direkt
 * auf `/call` (Feedback Simon) — auch alte Links hierher leiten dorthin um.
 * Abo-Mitglieder dürfen die Ausbildung kaufen
 * (Entscheidung Simon, 02.11.2026); ihr Abo endet dann zum Periodenende
 * (Webhook). Wer die Inhalte schon dauerhaft hat (Mentoring, Lifetime, 1:1),
 * sieht „Bereits freigeschaltet".
 */
export default async function ProgrammePage({ searchParams }: { searchParams: Promise<{ fehler?: string; gespraech?: string }> }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login?next=/programme");

  const [{ data: profil }, { fehler, gespraech }] = await Promise.all([
    supabase.from("profiles").select("full_name,membership_tier,is_paid,is_admin").eq("id", user.id).maybeSingle(),
    searchParams,
  ]);
  // Free = wie `viewer.isFree` (nicht bezahlt, kein Admin).
  if (!profil?.is_paid && !profil?.is_admin) redirect(FREE_PROGRAMME_PFAD);
  const tier = String(profil?.membership_tier ?? "free");
  const hatSchon = DAUERZUGANG.has(tier);
  const a = programme.ausbildung;
  const m = programme.mentoring;
  const rate = euro(rateCents(PRODUKTE.ausbildung.preisCents, 2));
  const fehlerText = fehler ? (FEHLER[fehler] ?? programme.fehler.kasse) : null;

  return (
    <AnalyseGespraechProvider name={((profil?.full_name as string | null) ?? "").trim()} email={user.email ?? ""} stelle="programme" sofortOffen={gespraech === "1"}>
      <Box>
        <PageHeader title={programme.titel} />

        {fehlerText ? (
          <Box className="cc-card cc-card--still" borderColor="var(--cc-danger)" p={4} mb={6} role="alert">
            <Text fontSize="14px" color="var(--cc-text)">
              {fehlerText}
            </Text>
          </Box>
        ) : null}

        <Grid templateColumns={{ base: "1fr", lg: "repeat(2, minmax(0, 1fr))" }} gap={{ base: 5, md: 6 }} alignItems="stretch">
          <Karte icon={<BookOpen size={22} strokeWidth={1.75} />} titel={a.titel} untertitel={a.untertitel} text={a.text} punkte={a.punkte}>
            {hatSchon ? (
              <Stack spacing={1}>
                <Text fontSize="16px" fontWeight={600} color="var(--cc-text)">
                  {a.hatSchon}
                </Text>
                <Text fontSize="14px" color="var(--cc-text-2)">
                  {a.hatSchonText}
                </Text>
              </Stack>
            ) : (
              <Stack spacing={4}>
                <Box>
                  <HStack align="baseline" spacing={2}>
                    <Text className="cc-num" fontSize="32px" fontWeight={700} color="var(--cc-text)" lineHeight={1}>
                      {a.preis}
                    </Text>
                    <Text fontSize="15px" color="var(--cc-text-2)">
                      {a.preisZusatz}
                    </Text>
                  </HStack>
                  <Text fontSize="14px" color="var(--cc-text-2)" mt={1}>
                    {a.raten}
                  </Text>
                </Box>
                {/* Einfaches Formular: funktioniert ohne JavaScript und sperrt keinen Doppelklick weg —
                    eine zweite Kasse verfällt nach zwei Stunden ungenutzt. */}
                <Stack as="form" method="post" action="/api/programme/ausbildung" spacing={2.5}>
                  <Button type="submit" name="raten" value="1" variant="gold" minH="50px">
                    {a.knopf} →
                  </Button>
                  <Button type="submit" name="raten" value="2" variant="line" size="sm">
                    Oder in 2 Raten à {rate}
                  </Button>
                </Stack>
                {ABO.has(tier) ? (
                  <Text fontSize="12px" lineHeight={1.55} color="var(--cc-text-3)">
                    {a.aboHinweis}
                  </Text>
                ) : null}
              </Stack>
            )}
          </Karte>

          <Karte id="mentoring" smaragd icon={<Users size={22} strokeWidth={1.75} />} titel={m.titel} untertitel={m.untertitel} text={m.text} punkte={m.punkte}>
            <Stack spacing={4}>
              <Text fontSize="15px" color="var(--cc-text-soft)" textAlign="center">
                {m.preis}
              </Text>
              <AnalyseGespraechKnopf stelle="programme" variant="smaragd" minH="50px">
                {m.knopf}
              </AnalyseGespraechKnopf>
            </Stack>
          </Karte>
        </Grid>

        <Text fontSize="13px" lineHeight={1.6} color="var(--cc-text-3)" textAlign="center" mt={8} maxW="560px" mx="auto">
          {programme.fussnote}
        </Text>
      </Box>
    </AnalyseGespraechProvider>
  );
}

function Karte({
  id,
  icon,
  titel,
  untertitel,
  text,
  punkte,
  smaragd = false,
  children,
}: {
  id?: string;
  icon: ReactNode;
  titel: string;
  untertitel: string;
  text: string;
  punkte: readonly string[];
  /** „Persönlich begleitet" in Smaragd (Feedback 14.11.2026): Kante, Icon, Haken, Knopf. */
  smaragd?: boolean;
  children: ReactNode;
}) {
  const akzent = smaragd ? "var(--cc-smaragd-hell)" : "var(--cc-gold-light)";
  return (
    <Stack id={id} scrollMarginTop="24px" className={smaragd ? "cc-card cc-card--smaragd cc-rise" : "cc-card cc-card--still cc-rise"} p={{ base: 6, md: 8 }} spacing={6}>
      <HStack spacing={4} align="center">
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          w="48px"
          h="48px"
          borderRadius="12px"
          border={`1px solid ${smaragd ? "var(--cc-smaragd-line)" : "var(--cc-gold-line)"}`}
          bg={smaragd ? "var(--cc-smaragd-wash)" : "var(--cc-gold-wash)"}
          color={akzent}
          flexShrink={0}
        >
          {icon}
        </Box>
        <Box>
          <Text as="h2" fontSize="19px" fontWeight={600} color="var(--cc-text)" lineHeight={1.25}>
            {titel}
          </Text>
          <Text fontSize="14px" color="var(--cc-text-2)">
            {untertitel}
          </Text>
        </Box>
      </HStack>
      <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text-2)">
        {text}
      </Text>
      <Stack as="ul" listStyleType="none" spacing={2.5} flex="1">
        {punkte.map((p) => (
          <HStack as="li" key={p} spacing={3} align="flex-start">
            <Box color={akzent} pt="2px" flexShrink={0}>
              <Check size={16} strokeWidth={2.25} aria-hidden />
            </Box>
            <Text fontSize="15px" color="var(--cc-text-soft)">
              {p}
            </Text>
          </HStack>
        ))}
      </Stack>
      <Box borderTop="1px solid var(--cc-line)" pt={6}>
        {children}
      </Box>
    </Stack>
  );
}
