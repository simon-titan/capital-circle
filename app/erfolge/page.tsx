import type { Metadata } from "next";
import { Box, Grid, Stack, Text } from "@chakra-ui/react";
import { createServiceClient } from "@/lib/supabase/service";
import { getPresignedGetUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Erfolge unserer Mitglieder — Capital Circle Institut",
  description: "Ausgewaehlte, von unseren Mitgliedern eingereichte und freigegebene Trading-Nachweise.",
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
    <Box minH="100vh" bg="#080808" px={{ base: 4, md: 8 }} py={{ base: 10, md: 16 }}>
      <Stack maxW="1200px" mx="auto" gap={10}>
        <Stack gap={3} textAlign="center" align="center">
          <Text
            fontSize="xs"
            letterSpacing="0.14em"
            textTransform="uppercase"
            className="inter-semibold"
            color="#D4AF37"
          >
            Capital Circle Institut
          </Text>
          <Box as="h1" className="radley-regular" fontSize="clamp(2rem, 5vw, 3rem)" color="#F0F0F2">
            Erfolge unserer Mitglieder
          </Box>
          <Box
            h="2px"
            w="min(320px, 100%)"
            borderRadius="full"
            bg="linear-gradient(90deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.95) 45%, rgba(212, 175, 55, 0.1) 100%)"
            boxShadow="0 0 20px rgba(212, 175, 55, 0.15)"
          />
          <Text className="inter" fontSize="sm" color="rgba(240,240,242,0.6)" maxW="36rem">
            Von unserer Community selbst eingereicht und vom Team geprueft — echte Trading-Nachweise aus dem
            Capital Circle Institut.
          </Text>
        </Stack>

        {items.length === 0 ? (
          <Text textAlign="center" fontSize="sm" color="rgba(240,240,242,0.4)" className="inter">
            Aktuell sind noch keine Erfolge freigegeben.
          </Text>
        ) : (
          <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap={6}>
            {items.map((item) => (
              <Box
                key={item.id}
                borderRadius="16px"
                borderWidth="1px"
                borderColor="rgba(255,255,255,0.08)"
                bg="rgba(255,255,255,0.04)"
                backdropFilter="blur(16px)"
                overflow="hidden"
                boxShadow="0 4px 16px rgba(0,0,0,0.60)"
              >
                <Box
                  w="100%"
                  h="220px"
                  bg="rgba(0,0,0,0.3)"
                  backgroundImage={`url(${item.imageUrl})`}
                  backgroundSize="cover"
                  backgroundPosition="center"
                />
                <Stack p={4} gap={2}>
                  {item.caption ? (
                    <Text fontSize="sm" color="#F0F0F2" className="inter" noOfLines={3}>
                      {item.caption}
                    </Text>
                  ) : null}
                  <Text fontSize="xs" color="#D4AF37" className="inter-medium">
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
