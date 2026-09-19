"use client";

import {
  Avatar,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  HStack,
  Icon,
  Input,
  SimpleGrid,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { CalendarDays, CheckCircle2, Flame, Link2, Link2Off, LogOut } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { ImageDropZone } from "@/components/admin/ImageDropZone";
import { DiscordGlyph } from "@/components/platform/DiscordBanner";
import { CardValue, DashCard, IconTile, Meta } from "@/components/platform/dashboard/primitives";
import { createClient } from "@/lib/supabase/client";
import { getDiscordAuthUrl } from "@/lib/discord";
import { resolveTotalLearningSeconds } from "@/lib/learning-daily";
import { DiscordNachrichten } from "./DiscordNachrichten";

type ProfileData = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  discord_username: string | null;
  discord_id: string | null;
  streak_current: number;
  streak_longest: number;
  total_learning_minutes: number;
  total_learning_seconds?: number | null;
  codex_accepted: boolean;
  codex_accepted_at: string | null;
  is_admin: boolean;
  is_paid: boolean;
  created_at: string;
};

const minutesToHours = (minutes: number) => `${(minutes / 60).toFixed(1)}h`;
const formatDate = (dateValue: string | null) => {
  if (!dateValue) return "Nicht verfügbar";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Nicht verfügbar";
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
};

/** Eingabefelder auf Glas: Haarlinie, beim Hover Gold-Kante, Fokus in Gold. */
const FIELD_SX = {
  bg: "rgba(255, 255, 255, 0.03)",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  color: "var(--cc-text)",
  _placeholder: { color: "var(--cc-text-3)" },
  _hover: { borderColor: "rgba(212, 176, 128, 0.4)" },
  _focusVisible: { borderColor: "var(--cc-gold)", boxShadow: "0 0 0 1px var(--cc-gold)" },
};

const LABEL_PROPS = { fontSize: "14px", fontWeight: 500, color: "var(--cc-text-2)", mb: 1.5 } as const;

/**
 * Gestaffelter Einstieg (80ms + 70ms je Schritt) wie im Dashboard. Den ersten
 * Schritt belegt die Paketzeile in `page.tsx`, deshalb beginnt das Formular
 * beim zweiten — sonst stiegen zwei Karten gleichzeitig auf.
 */
const rise = (i: number) => ({ animationDelay: `${150 + i * 70}ms` });

type PillTone = "gold" | "neutral" | "success";

const PILL_TONES: Record<PillTone, { color: string; borderColor: string; bg: string }> = {
  gold: { color: "var(--cc-gold-light)", borderColor: "rgba(212, 176, 128, 0.3)", bg: "var(--cc-gold-wash)" },
  neutral: { color: "var(--cc-text-2)", borderColor: "var(--cc-line-strong)", bg: "rgba(255, 255, 255, 0.03)" },
  success: { color: "var(--cc-success)", borderColor: "rgba(74, 222, 128, 0.3)", bg: "rgba(74, 222, 128, 0.07)" },
};

function Pill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return (
    <Box
      as="span"
      display="inline-flex"
      alignItems="center"
      gap={1}
      px="10px"
      py="3px"
      borderRadius="full"
      border="1px solid"
      fontSize="12px"
      fontWeight={500}
      lineHeight="18px"
      whiteSpace="nowrap"
      {...PILL_TONES[tone]}
    >
      {children}
    </Box>
  );
}

/** Kennzahl-Kachel innerhalb einer Karte (eingelassen, keine eigene Karte). */
function StatTile({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <Box p={{ base: 3, md: 4 }} borderRadius="10px" border="1px solid var(--cc-line)" bg="rgba(255, 255, 255, 0.02)" minW={0}>
      <HStack spacing={2} color="var(--cc-text-2)" mb={1.5} align="flex-start">
        {icon}
        <Text fontSize="12px" fontWeight={500} letterSpacing="0.12em" textTransform="uppercase" lineHeight="16px">
          {label}
        </Text>
      </HStack>
      <Text className="cc-num" fontSize={{ base: "18px", md: "20px" }} fontWeight={600} lineHeight={1.25} color="var(--cc-text)">
        {value}
      </Text>
    </Box>
  );
}

/**
 * Alles, was der Nutzer an seinem Profil ändern kann — Name, Avatar, Discord,
 * Passwort, Abmelden.
 *
 * Steht als eigene Client-Komponente neben der Seite, damit `page.tsx` ein
 * Server-Bauteil bleiben und die Paketzeile mit bereits serverseitig
 * geladenen Abo-Daten füllen kann. Würde die ganze Seite im Client laufen,
 * müsste sie Tarif, Preis und Datum ein zweites Mal aus der Datenbank holen —
 * für eine Zeile, die die Abo-Seite ohnehin schon kennt.
 */
export function ProfilFormular() {
  const supabase = createClient();
  const toast = useToast();

  const [profileId, setProfileId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [discordUsername, setDiscordUsername] = useState<string | null>(null);
  const [discordUserId, setDiscordUserId] = useState<string | null>(null);
  const [discordConnectedAt, setDiscordConnectedAt] = useState<string | null>(null);
  const [streakCurrent, setStreakCurrent] = useState(0);
  const [streakLongest, setStreakLongest] = useState(0);
  const [learningMinutes, setLearningMinutes] = useState(0);
  const [codexAcceptedAt, setCodexAcceptedAt] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [disconnectingDiscord, setDisconnectingDiscord] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoadingProfile(true);
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setLoadingProfile(false);
        return;
      }

      setProfileId(authData.user.id);
      setEmail(authData.user.email ?? "");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, username, full_name, avatar_url, discord_username, discord_id, streak_current, streak_longest, total_learning_minutes, total_learning_seconds, codex_accepted, codex_accepted_at, is_admin, is_paid, created_at",
        )
        .eq("id", authData.user.id)
        .single<ProfileData>();

      if (profileError || !profile) {
        toast({
          title: "Profil konnte nicht geladen werden",
          description: profileError?.message ?? "Unbekannter Fehler",
          status: "error",
          duration: 4000,
          isClosable: true,
        });
        setLoadingProfile(false);
        return;
      }

      setName(profile.full_name ?? "");
      setUsername(profile.username ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
      setDiscordUsername(profile.discord_username);

      const { data: dcRow } = await supabase
        .from("discord_connections")
        .select("discord_username, discord_user_id, connected_at")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (dcRow) {
        setDiscordUserId((dcRow.discord_user_id as string | null) ?? null);
        setDiscordConnectedAt((dcRow.connected_at as string | null) ?? null);
        if (dcRow.discord_username) setDiscordUsername(dcRow.discord_username as string);
      } else {
        setDiscordUserId(null);
        setDiscordConnectedAt(null);
      }
      setStreakCurrent(profile.streak_current ?? 0);
      setStreakLongest(profile.streak_longest ?? 0);
      setLearningMinutes(Math.floor(resolveTotalLearningSeconds(profile) / 60));
      setCodexAcceptedAt(profile.codex_accepted ? profile.codex_accepted_at : null);
      setMemberSince(profile.created_at ?? null);
      setIsAdmin(profile.is_admin ?? false);
      setIsPaid(profile.is_paid ?? false);
      setLoadingProfile(false);
    };
    void load();
  }, [supabase, toast]);

  const saveProfile = async () => {
    if (!profileId) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: name.trim() || null,
        username: username.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      })
      .eq("id", profileId);

    setSavingProfile(false);
    toast({
      title: error ? "Profil konnte nicht gespeichert werden" : "Profil gespeichert",
      description: error?.message ?? "Deine Änderungen wurden erfolgreich übernommen.",
      status: error ? "error" : "success",
      duration: 3500,
      isClosable: true,
    });
  };

  const uploadAvatar = async (file: File) => {
    if (!profileId) return;
    setUploadingAvatar(true);
    try {
      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "X-File-Name": encodeURIComponent(file.name),
        },
        body: file,
      });

      const payload = (await response.json()) as { ok?: boolean; storageKey?: string; error?: string };
      if (!response.ok || !payload.ok || !payload.storageKey) {
        throw new Error(payload.error ?? "Upload fehlgeschlagen");
      }

      setAvatarUrl(payload.storageKey);
      toast({
        title: "Avatar hochgeladen",
        description: "Dein Profilbild wurde erfolgreich gespeichert.",
        status: "success",
        duration: 3500,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Avatar-Upload fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        status: "error",
        duration: 4500,
        isClosable: true,
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const disconnectDiscord = async () => {
    if (!profileId) return;
    setDisconnectingDiscord(true);
    /*
      Über die Route statt direkt in die Tabellen: Nur sie nimmt auch die
      Rollen ab, die das System auf Discord vergeben hat. Vorher löste dieser
      Knopf nur die Verknüpfung, und die Mitgliederrolle hing danach an einem
      Discord-Konto, das kein Abgleich mehr kannte. Vom Server wirft das
      Trennen niemanden (mehr).
    */
    let fehler: string | null = null;
    try {
      const res = await fetch("/api/discord/disconnect", { method: "POST", credentials: "same-origin" });
      const daten = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !daten.ok) fehler = daten.error ?? "Unbekannter Fehler";
    } catch (err) {
      fehler = err instanceof Error ? err.message : "Unbekannter Fehler";
    }

    setDisconnectingDiscord(false);
    if (fehler) {
      toast({
        title: "Discord konnte nicht getrennt werden",
        description: fehler,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    setDiscordUsername(null);
    setDiscordUserId(null);
    setDiscordConnectedAt(null);
    toast({
      title: "Discord getrennt",
      status: "success",
      duration: 2500,
      isClosable: true,
    });
  };

  const updatePassword = async () => {
    if (!password || password.length < 8) {
      toast({
        title: "Passwort zu kurz",
        description: "Bitte mindestens 8 Zeichen verwenden.",
        status: "warning",
        duration: 3500,
        isClosable: true,
      });
      return;
    }
    if (password !== passwordConfirm) {
      toast({
        title: "Passwörter stimmen nicht überein",
        status: "warning",
        duration: 3500,
        isClosable: true,
      });
      return;
    }

    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPassword(false);

    if (!error) {
      setPassword("");
      setPasswordConfirm("");
    }

    toast({
      title: error ? "Passwort konnte nicht aktualisiert werden" : "Passwort aktualisiert",
      description: error?.message,
      status: error ? "error" : "success",
      duration: 3500,
      isClosable: true,
    });
  };

  const signOut = async () => {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    setSigningOut(false);
    if (error) {
      toast({
        title: "Abmeldung fehlgeschlagen",
        description: error.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    window.location.href = "/login";
  };

  return (
    <Stack spacing={5}>
      {/* Profil-Überblick */}
      <Box as="section" aria-label="Profil" className="cc-card cc-rise" style={rise(0)} p={{ base: 5, md: 6 }} minW={0}>
        <Flex
          direction={{ base: "column", md: "row" }}
          gap={5}
          align={{ base: "stretch", md: "center" }}
          justify="space-between"
        >
          <HStack spacing={4} align="center" minW={0}>
            <Avatar
              size="xl"
              flexShrink={0}
              name={name || username || email || "User"}
              src={avatarUrl || undefined}
              bg="var(--cc-surface-2)"
              color="var(--cc-text)"
              border="1px solid var(--cc-gold-line)"
              boxShadow="0 0 24px rgba(212, 176, 128, 0.18)"
            />
            <Stack spacing={1} minW={0}>
              <Text
                fontSize={{ base: "18px", md: "20px" }}
                fontWeight={600}
                letterSpacing="-0.01em"
                lineHeight={1.3}
                color="var(--cc-text)"
                overflowWrap="anywhere"
              >
                {name || "Kein Anzeigename"}
              </Text>
              <Meta overflowWrap="anywhere">
                @{username || "username-fehlt"} · {email || "keine E-Mail"}
              </Meta>
              <Flex wrap="wrap" gap={2} pt={1}>
                {isPaid ? <Pill tone="gold">Premium</Pill> : <Pill tone="neutral">Free</Pill>}
                {isAdmin ? <Pill tone="gold">Admin</Pill> : null}
                {isPaid &&
                  (discordUsername ? (
                    <Pill tone="success">
                      <Icon as={CheckCircle2} boxSize={3} aria-hidden />
                      Discord verbunden
                    </Pill>
                  ) : (
                    <Pill tone="neutral">Discord nicht verbunden</Pill>
                  ))}
              </Flex>
            </Stack>
          </HStack>

          <SimpleGrid columns={2} spacing={3} w={{ base: "100%", md: "320px" }} flexShrink={0}>
            <StatTile
              label="Aktuelle Streak"
              icon={<Icon as={Flame} boxSize={4} aria-hidden flexShrink={0} />}
              value={`${streakCurrent} Tage`}
            />
            <StatTile
              label="Mitglied seit"
              icon={<Icon as={CalendarDays} boxSize={4} aria-hidden flexShrink={0} />}
              value={formatDate(memberSince)}
            />
          </SimpleGrid>
        </Flex>
      </Box>

      <Grid templateColumns={{ base: "1fr", "2xl": "1fr 1fr" }} gap={5}>
        <DashCard label="Persönliche Daten" labelId="settings-personal" className="cc-card--still cc-rise" style={rise(1)}>
          <Stack spacing={4}>
            <FormControl>
              <FormLabel {...LABEL_PROPS}>Anzeigename</FormLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dein Name" sx={FIELD_SX} />
            </FormControl>
            <FormControl>
              <FormLabel {...LABEL_PROPS}>Username</FormLabel>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="dein_username" sx={FIELD_SX} />
            </FormControl>
            <FormControl>
              <FormLabel {...LABEL_PROPS}>Avatar</FormLabel>
              {/*
                Drag & Drop statt Dateidialog: Auf dem Rechner des Nutzers friert
                der Windows-Dialog den ganzen Browser ein (Ereignis-ID 1002, Chrome
                wie Opera). Der Knopf unter der Fläche bleibt als zweiter Weg.
              */}
              <ImageDropZone
                previewUrl={avatarUrl.startsWith("http") ? avatarUrl : null}
                onFile={uploadAvatar}
                busy={uploadingAvatar}
                platzhalter="Profilbild hierher ziehen"
                maxW="280px"
              />
              <Input
                mt={3}
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="Avatar URL oder Storage-Key"
                sx={FIELD_SX}
              />
            </FormControl>
            <Button onClick={saveProfile} isLoading={savingProfile} variant="gold" alignSelf="flex-start">
              Profil speichern
            </Button>
          </Stack>
        </DashCard>

        <DashCard label="Statistiken" labelId="settings-stats" className="cc-card--still cc-rise" style={rise(2)}>
          <SimpleGrid columns={2} spacing={3}>
            <StatTile label="Streak aktuell" value={streakCurrent} />
            <StatTile label="Längste Streak" value={streakLongest} />
            <StatTile label="Lernzeit gesamt" value={minutesToHours(learningMinutes)} />
            <StatTile label="Codex akzeptiert" value={formatDate(codexAcceptedAt)} />
          </SimpleGrid>
        </DashCard>

        {isPaid && (
          <DashCard label="Community" labelId="settings-discord" className="cc-card--still cc-rise" style={rise(3)}>
            <Stack spacing={5}>
              <Flex gap={4} align="flex-start">
                <IconTile>
                  <DiscordGlyph size={26} />
                </IconTile>
                <Stack spacing={1} minW={0}>
                  <CardValue>Discord</CardValue>
                  <Meta lineHeight={1.6}>
                    {discordUsername
                      ? "Dein Account ist mit Discord verknüpft. Du kannst die Verknüpfung jederzeit trennen und neu verbinden."
                      : "Verbinde deinen Discord Account, um Zugang zum exklusiven Community-Server zu erhalten."}
                  </Meta>
                </Stack>
              </Flex>

              {discordUsername ? (
                <Box p={4} borderRadius="10px" border="1px solid var(--cc-line)" bg="rgba(255, 255, 255, 0.02)">
                  <Stack spacing={2.5}>
                    <HStack spacing={2}>
                      <Icon as={CheckCircle2} boxSize={4} color="var(--cc-success)" aria-hidden />
                      <Text fontSize="14px" fontWeight={500} color="var(--cc-text-soft)">
                        Verbunden
                      </Text>
                    </HStack>
                    <Text fontSize="17px" fontWeight={600} color="var(--cc-text)" overflowWrap="anywhere">
                      {discordUsername.startsWith("@") ? discordUsername : `@${discordUsername}`}
                    </Text>
                    {discordUserId ? (
                      <Text className="cc-num" fontSize="12px" color="var(--cc-text-3)" overflowWrap="anywhere">
                        ID: {discordUserId}
                      </Text>
                    ) : null}
                    {discordConnectedAt ? (
                      <Meta>
                        Verbunden seit{" "}
                        <Box as="span" className="cc-num">
                          {formatDate(discordConnectedAt)}
                        </Box>
                      </Meta>
                    ) : null}
                    <Button
                      variant="line"
                      size="sm"
                      leftIcon={<Icon as={Link2Off} boxSize={4} />}
                      onClick={disconnectDiscord}
                      isLoading={disconnectingDiscord}
                      alignSelf="flex-start"
                      mt={1}
                    >
                      Verknüpfung trennen
                    </Button>
                  </Stack>
                </Box>
              ) : (
                <Button
                  as="a"
                  href={getDiscordAuthUrl()}
                  variant="gold"
                  leftIcon={<Icon as={Link2} boxSize={4} />}
                  alignSelf="flex-start"
                >
                  Discord verbinden
                </Button>
              )}
            </Stack>
          </DashCard>
        )}

        {/* Für jedes verknüpfte Discord-Konto, auch ohne laufende Mitgliedschaft. */}
        {discordUsername ? <DiscordNachrichten style={rise(4)} /> : null}

        <DashCard label="Passwort ändern" labelId="settings-password" className="cc-card--still cc-rise" style={rise(4)}>
          <Stack spacing={4}>
            <FormControl>
              <FormLabel {...LABEL_PROPS}>Neues Passwort</FormLabel>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} sx={FIELD_SX} />
            </FormControl>
            <FormControl>
              <FormLabel {...LABEL_PROPS}>Passwort bestätigen</FormLabel>
              <Input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                sx={FIELD_SX}
              />
            </FormControl>
            <Button onClick={updatePassword} isLoading={savingPassword} variant="gold" alignSelf="flex-start">
              Passwort aktualisieren
            </Button>
          </Stack>
        </DashCard>
      </Grid>

      <DashCard
        label="Gefahrenzone"
        labelId="settings-danger"
        className="cc-card--still cc-rise"
        style={rise(5)}
        action={
          <Button
            variant="line"
            color="var(--cc-danger)"
            leftIcon={<Icon as={LogOut} boxSize={4} />}
            onClick={signOut}
            isLoading={signingOut}
            w={{ base: "100%", sm: "auto" }}
          >
            Jetzt abmelden
          </Button>
        }
      >
        <Meta>Du wirst aus deinem Konto abgemeldet und zur Login-Seite zurückgeleitet.</Meta>
      </DashCard>

      {loadingProfile ? <Meta role="status">Profil wird geladen...</Meta> : null}
    </Stack>
  );
}
