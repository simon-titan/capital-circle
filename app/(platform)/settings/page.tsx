"use client";

import {
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  HStack,
  Icon,
  Input,
  SimpleGrid,
  Stack,
  Text,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { CalendarDays, CheckCircle2, Flame, Link2, Link2Off, LogOut, Upload, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { DiscordGlyph } from "@/components/platform/DiscordBanner";
import { GlassCard } from "@/components/ui/GlassCard";
import { createClient } from "@/lib/supabase/client";
import { getDiscordAuthUrl } from "@/lib/discord";

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

export default function SettingsPage() {
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
          "id, username, full_name, avatar_url, discord_username, discord_id, streak_current, streak_longest, total_learning_minutes, codex_accepted, codex_accepted_at, is_admin, is_paid, created_at",
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
      setLearningMinutes(profile.total_learning_minutes ?? 0);
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
    const { error: dcError } = await supabase.from("discord_connections").delete().eq("user_id", profileId);
    const { error } = await supabase
      .from("profiles")
      .update({
        discord_id: null,
        discord_username: null,
        discord_access_token: null,
        discord_refresh_token: null,
      })
      .eq("id", profileId);

    setDisconnectingDiscord(false);
    if (dcError || error) {
      toast({
        title: "Discord konnte nicht getrennt werden",
        description: dcError?.message ?? error?.message,
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
    <Stack gap={6}>
      <Heading
        as="h1"
        fontFamily="var(--font-heading)"
        fontWeight={400}
        fontSize={{ base: "2xl", md: "3xl" }}
        color="var(--color-text-primary)"
      >
        Profil & Einstellungen
      </Heading>

      <GlassCard highlight>
        <Flex direction={{ base: "column", md: "row" }} gap={5} align={{ base: "flex-start", md: "center" }} justify="space-between">
          <HStack spacing={4} align="center">
            <Avatar
              size="xl"
              name={name || username || email || "User"}
              src={avatarUrl || undefined}
              border="1px solid rgba(212,175,55,0.35)"
              bg="rgba(212,175,55,0.12)"
            />
            <VStack align="flex-start" spacing={1}>
              <Text className="inter-medium" color="var(--color-text-primary)" fontSize="lg">
                {name || "Kein Anzeigename"}
              </Text>
              <Text color="var(--color-text-secondary)" fontSize="sm">
                @{username || "username-fehlt"} · {email || "keine E-Mail"}
              </Text>
              <HStack spacing={2} pt={1}>
                {isPaid ? <Badge colorScheme="yellow">Premium</Badge> : <Badge>Free</Badge>}
                {isAdmin ? <Badge colorScheme="yellow">Admin</Badge> : null}
                {discordUsername ? (
                  <Badge colorScheme="green" display="inline-flex" alignItems="center" gap={1}>
                    <Icon as={CheckCircle2} boxSize={3} />
                    Discord verbunden
                  </Badge>
                ) : (
                  <Badge>Discord nicht verbunden</Badge>
                )}
              </HStack>
            </VStack>
          </HStack>

          <SimpleGrid columns={2} spacing={3} minW={{ base: "100%", md: "320px" }}>
            <Box p={3} borderRadius="10px" border="1px solid var(--color-border-default)" bg="rgba(255,255,255,0.03)">
              <HStack spacing={2} color="var(--color-text-secondary)" mb={1}>
                <Icon as={Flame} boxSize={4} color="var(--color-accent)" />
                <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.08em">
                  Aktuelle Streak
                </Text>
              </HStack>
              <Text fontFamily="var(--font-mono)" fontWeight={700} fontSize="xl" color="var(--color-text-primary)">
                {streakCurrent} Tage
              </Text>
            </Box>
            <Box p={3} borderRadius="10px" border="1px solid var(--color-border-default)" bg="rgba(255,255,255,0.03)">
              <HStack spacing={2} color="var(--color-text-secondary)" mb={1}>
                <Icon as={CalendarDays} boxSize={4} color="var(--color-accent)" />
                <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.08em">
                  Mitglied seit
                </Text>
              </HStack>
              <Text fontFamily="var(--font-mono)" fontWeight={500} fontSize="sm" color="var(--color-text-primary)">
                {formatDate(memberSince)}
              </Text>
            </Box>
          </SimpleGrid>
        </Flex>
      </GlassCard>

      <Grid templateColumns={{ base: "1fr", xl: "1fr 1fr" }} gap={6}>
        <GridItem>
          <GlassCard>
            <Stack spacing={4}>
              <Text className="inter-semibold" color="var(--color-text-primary)" fontSize="lg">
                Persönliche Daten
              </Text>
              <FormControl>
                <FormLabel color="var(--color-text-secondary)">Anzeigename</FormLabel>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dein Name" />
              </FormControl>
              <FormControl>
                <FormLabel color="var(--color-text-secondary)">Username</FormLabel>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="dein_username" />
              </FormControl>
              <FormControl>
                <FormLabel color="var(--color-text-secondary)">Avatar</FormLabel>
                <Stack direction={{ base: "column", md: "row" }} spacing={3}>
                  <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="Avatar URL oder Storage-Key" />
                  <Button
                    leftIcon={<Icon as={Upload} boxSize={4} />}
                    variant="outline"
                    isLoading={uploadingAvatar}
                    position="relative"
                    overflow="hidden"
                  >
                    Datei wählen
                    <Input
                      type="file"
                      accept="image/*"
                      position="absolute"
                      top={0}
                      left={0}
                      width="100%"
                      height="100%"
                      opacity={0}
                      cursor="pointer"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadAvatar(file);
                        e.currentTarget.value = "";
                      }}
                    />
                  </Button>
                </Stack>
              </FormControl>
              <Button onClick={saveProfile} isLoading={savingProfile} colorScheme="yellow" alignSelf="flex-start">
                Profil speichern
              </Button>
            </Stack>
          </GlassCard>
        </GridItem>

        <GridItem>
          <GlassCard>
            <Stack spacing={4}>
              <Text className="inter-semibold" color="var(--color-text-primary)" fontSize="lg">
                Statistiken
              </Text>
              <SimpleGrid columns={2} spacing={3}>
                <Box p={3} borderRadius="10px" border="1px solid var(--color-border-default)">
                  <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="var(--color-text-secondary)">
                    Streak aktuell
                  </Text>
                  <Text fontFamily="var(--font-mono)" fontSize="2xl" color="var(--color-text-primary)">
                    {streakCurrent}
                  </Text>
                </Box>
                <Box p={3} borderRadius="10px" border="1px solid var(--color-border-default)">
                  <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="var(--color-text-secondary)">
                    Längste Streak
                  </Text>
                  <Text fontFamily="var(--font-mono)" fontSize="2xl" color="var(--color-text-primary)">
                    {streakLongest}
                  </Text>
                </Box>
                <Box p={3} borderRadius="10px" border="1px solid var(--color-border-default)">
                  <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="var(--color-text-secondary)">
                    Lernzeit gesamt
                  </Text>
                  <Text fontFamily="var(--font-mono)" fontSize="xl" color="var(--color-text-primary)">
                    {minutesToHours(learningMinutes)}
                  </Text>
                </Box>
                <Box p={3} borderRadius="10px" border="1px solid var(--color-border-default)">
                  <Text fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="var(--color-text-secondary)">
                    Codex akzeptiert
                  </Text>
                  <Text fontFamily="var(--font-mono)" fontSize="sm" color="var(--color-text-primary)">
                    {formatDate(codexAcceptedAt)}
                  </Text>
                </Box>
              </SimpleGrid>
            </Stack>
          </GlassCard>
        </GridItem>

        <GridItem>
          <GlassCard highlight>
            <Stack spacing={5}>
              <Flex direction={{ base: "column", sm: "row" }} gap={4} align={{ base: "flex-start", sm: "flex-start" }}>
                <Flex
                  align="center"
                  justify="center"
                  w="52px"
                  h="52px"
                  borderRadius="14px"
                  flexShrink={0}
                  bg="rgba(88, 101, 242, 0.18)"
                  border="1px solid rgba(88, 101, 242, 0.45)"
                  color="#5865F2"
                >
                  <DiscordGlyph size={28} />
                </Flex>
                <VStack align="flex-start" spacing={1} flex={1}>
                  <Text
                    className="inter-medium"
                    fontSize="xs"
                    letterSpacing="0.1em"
                    textTransform="uppercase"
                    color="rgba(255,255,255,0.45)"
                  >
                    Community
                  </Text>
                  <Text className="inter-semibold" color="var(--color-text-primary)" fontSize="xl">
                    Discord
                  </Text>
                  <Text className="inter" color="var(--color-text-secondary)" fontSize="sm" lineHeight="tall">
                    {discordUsername
                      ? "Dein Account ist mit Discord verknüpft. Du kannst die Verknüpfung jederzeit trennen und neu verbinden."
                      : "Verbinde deinen Discord Account, um Zugang zum exklusiven Community-Server zu erhalten."}
                  </Text>
                </VStack>
              </Flex>

              {discordUsername ? (
                <Box
                  p={4}
                  borderRadius="14px"
                  border="1px solid rgba(34, 197, 94, 0.35)"
                  bg="linear-gradient(165deg, rgba(34, 197, 94, 0.1) 0%, rgba(8, 8, 8, 0.45) 55%)"
                >
                  <Stack spacing={3}>
                    <HStack spacing={2}>
                      <Icon as={CheckCircle2} boxSize={5} color="rgb(34, 197, 94)" />
                      <Text className="inter-semibold" color="var(--color-text-primary)" fontSize="md">
                        Verbunden
                      </Text>
                    </HStack>
                    <Text className="jetbrains-mono" fontSize="lg" color="rgba(34, 197, 94, 0.95)">
                      {discordUsername.startsWith("@") ? discordUsername : `@${discordUsername}`}
                    </Text>
                    {discordUserId ? (
                      <Text fontSize="xs" className="jetbrains-mono" color="var(--color-text-muted)">
                        ID: {discordUserId}
                      </Text>
                    ) : null}
                    {discordConnectedAt ? (
                      <Text fontSize="sm" className="inter" color="var(--color-text-secondary)">
                        Verbunden seit {formatDate(discordConnectedAt)}
                      </Text>
                    ) : null}
                    <Button
                      variant="outline"
                      colorScheme="red"
                      leftIcon={<Icon as={Link2Off} boxSize={4} />}
                      onClick={disconnectDiscord}
                      isLoading={disconnectingDiscord}
                      alignSelf="flex-start"
                      borderRadius="10px"
                    >
                      Verknüpfung trennen
                    </Button>
                  </Stack>
                </Box>
              ) : (
                <Button
                  as="a"
                  href={getDiscordAuthUrl()}
                  leftIcon={<Icon as={Link2} boxSize={4} />}
                  alignSelf="flex-start"
                  borderRadius="10px"
                  bg="linear-gradient(135deg, var(--color-accent-gold-dark) 0%, var(--color-accent-gold-light) 100%)"
                  color="#0a0a0a"
                  _hover={{ filter: "brightness(1.06)", boxShadow: "0 0 24px rgba(212, 175, 55, 0.35)" }}
                >
                  Discord verbinden
                </Button>
              )}
            </Stack>
          </GlassCard>
        </GridItem>

        <GridItem>
          <GlassCard>
            <Stack spacing={4}>
              <Text className="inter-semibold" color="var(--color-text-primary)" fontSize="lg">
                Passwort ändern
              </Text>
              <FormControl>
                <FormLabel color="var(--color-text-secondary)">Neues Passwort</FormLabel>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel color="var(--color-text-secondary)">Passwort bestätigen</FormLabel>
                <Input type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} />
              </FormControl>
              <Button onClick={updatePassword} isLoading={savingPassword} colorScheme="yellow" alignSelf="flex-start">
                Passwort aktualisieren
              </Button>
            </Stack>
          </GlassCard>
        </GridItem>
      </Grid>

      <GlassCard spotlight borderColor="rgba(239,68,68,0.35)">
        <Stack spacing={4}>
          <Text className="inter-semibold" color="var(--color-text-primary)" fontSize="lg">
            Gefahrenzone
          </Text>
          <Text color="var(--color-text-secondary)" fontSize="sm">
            Du wirst aus deinem Konto abgemeldet und zur Login-Seite zurückgeleitet.
          </Text>
          <Divider borderColor="rgba(255,255,255,0.08)" />
          <Button
            leftIcon={<Icon as={LogOut} boxSize={4} />}
            onClick={signOut}
            isLoading={signingOut}
            colorScheme="red"
            variant="outline"
            alignSelf="flex-start"
          >
            Jetzt abmelden
          </Button>
        </Stack>
      </GlassCard>

      {loadingProfile ? (
        <Text fontSize="sm" color="var(--color-text-secondary)">
          Profil wird geladen...
        </Text>
      ) : null}
    </Stack>
  );
}
