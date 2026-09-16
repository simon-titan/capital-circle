import type { Metadata } from "next";
import { Box, Grid, Stack, Text } from "@chakra-ui/react";
import { createServiceClient } from "@/lib/supabase/service";
import { getPresignedGetUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Erfolge unserer Mitglieder — Capital Circle Institut",
  description: "Ausgewählte, von unseren Mitgliedern eingereichte und freigegebene Trading-Nachweise.",
};

type CertificateRow = {
  id: string;
  user_id: string;
  storage_key: string;
  caption: string | null;
  submitted_at: string;
};

type ProfileRow = { id: string; full_name: string | null };

function firstName(fullName: string | null): string | null {
  if (!fullName) return null;
  const trimmed = fullName.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0];
}

/** Zeilen begrenzen, ohne Wörter zu zerhacken (Chakras `noOfLines` setzt `word-break: break-all`). */
const clampThreeLines = {
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
  overflowWrap: "break-word" as const,
};

export default async function ErfolgePage() {
  const service = createServiceClient();
  const { data } = await service
    .from("certificates")
    .select("id, user_id, storage_key, caption, submitted_at")
    .eq("status", "approved")
    .eq("is_public", true)
    .order("submitted_at", { ascending: false });

  const rows = (data ?? []) as CertificateRow[];
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));

  let profileMap = new Map<string, ProfileRow>();
  if (userIds.length > 0) {
    const { data: profileRows } = await service.from("profiles").select("id, full_name").in("id", userIds);
    profileMap = new Map((profileRows as ProfileRow[] | null ?? []).map((p) => [p.id, p]));
  }

  const items = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      caption: row.caption,
      submittedAt: row.submitted_at,
      firstName: firstName(profileMap.get(row.user_id)?.full_name ?? null),
      imageUrl: await getPresignedGetUrl(row.storage_key),
    })),
  );

  return (
    <Box
      position="relative"
      minH="100vh"
      bg="var(--cc-bg)"
      color="var(--cc-text)"
      px={{ base: 4, md: 8 }}
      py={{ base: 10, md: 16 }}
      overflowX="clip"
    >
      {/* Graphitgrund mit Sternenfeld und Champagner-Licht (DESIGN.md v3.2) */}
      <Box className="cc-stars" aria-hidden />
      <Box className="cc-goldlight" aria-hidden />

      <Stack position="relative" zIndex={1} maxW="1200px" mx="auto" gap={10}>
        <Stack gap={3} textAlign="center" align="center" className="cc-rise">
          <Text
            fontSize="13px"
            lineHeight="18px"
            fontWeight={500}
            letterSpacing="0.12em"
            textTransform="uppercase"
            color="var(--cc-gold-light)"
          >
            Capital Circle Institut
          </Text>
          <Box
            as="h1"
            fontSize={{ base: "30px", md: "44px" }}
            fontWeight={600}
            lineHeight={1.12}
            letterSpacing="-0.01em"
            color="var(--cc-text)"
          >
            Erfolge unserer{" "}
            <Box as="span" color="var(--cc-gold-light)">
              Mitglieder
            </Box>
          </Box>
          <Box
            aria-hidden
            h="1px"
            w="min(240px, 100%)"
            bg="linear-gradient(90deg, transparent, rgba(232, 192, 148, 0.7), transparent)"
          />
          <Text fontSize={{ base: "15px", md: "16px" }} lineHeight={1.6} color="var(--cc-text-2)" maxW="36rem">
            Von unserer Community selbst eingereicht und vom Team geprüft — echte Trading-Nachweise aus dem
            Capital Circle Institut.
          </Text>
        </Stack>

        {items.length === 0 ? (
          <Text textAlign="center" fontSize="15px" color="var(--cc-text-3)">
            Aktuell sind noch keine Erfolge freigegeben.
          </Text>
        ) : (
          <Grid
            as="ul"
            listStyleType="none"
            m={0}
            p={0}
            templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }}
            gap={5}
          >
            {items.map((item, index) => (
              <Box
                as="li"
                key={item.id}
                className="cc-card cc-rise"
                style={{ animationDelay: `${150 + Math.min(index, 8) * 70}ms` }}
              >
                {/* Bild bündig oben; die Gold-Kante der Karte liegt auf dem Rand darüber */}
                <Box
                  role="img"
                  aria-label={`Trading-Nachweis von ${item.firstName ?? "Mitglied"}`}
                  w="100%"
                  h="220px"
                  borderTopRadius="11px"
                  bg="rgba(255, 255, 255, 0.02)"
                  backgroundImage={`url(${item.imageUrl})`}
                  backgroundSize="cover"
                  backgroundPosition="center"
                />
                <Stack p={5} gap={2}>
                  {item.caption ? (
                    <Text fontSize="15px" lineHeight={1.5} color="var(--cc-text)" sx={clampThreeLines}>
                      {item.caption}
                    </Text>
                  ) : null}
                  <Text fontSize="13px" fontWeight={500} color="var(--cc-gold-light)">
                    {item.firstName ?? "Mitglied"}
                  </Text>
                </Stack>
              </Box>
            ))}
          </Grid>
        )}
      </Stack>
    </Box>
  );
}
