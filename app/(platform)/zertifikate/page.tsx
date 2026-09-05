import { redirect } from "next/navigation";
import { Box, Stack, Text } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { getPresignedGetUrl } from "@/lib/storage";
import { ZertifikateManager, type CertificateItem } from "@/components/zertifikate/ZertifikateManager";

export const dynamic = "force-dynamic";

type CertificateRow = {
  id: string;
  storage_key: string;
  caption: string | null;
  status: "pending" | "approved" | "rejected";
  is_public: boolean;
  submitted_at: string;
  reviewed_at: string | null;
};

export default async function ZertifikatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("certificates")
    .select("id, storage_key, caption, status, is_public, submitted_at, reviewed_at")
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false });

  const rows = (data ?? []) as CertificateRow[];
  const initial: CertificateItem[] = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      caption: row.caption,
      status: row.status,
      isPublic: row.is_public,
      submittedAt: row.submitted_at,
      reviewedAt: row.reviewed_at,
      imageUrl: await getPresignedGetUrl(row.storage_key),
    })),
  );

  return (
    <Stack gap={{ base: 6, md: 8 }}>
      <Stack gap={3}>
        <Text
          fontSize="xs"
          letterSpacing="0.14em"
          textTransform="uppercase"
          className="inter-semibold"
          color="#D4AF37"
        >
          Erfolge
        </Text>
        <Box
          as="h1"
          className="radley-regular"
          fontSize="clamp(1.75rem, 4vw, 2.25rem)"
          color="var(--color-text-primary)"
        >
          Zertifikate &amp; Erfolge einreichen
        </Box>
        <Box
          h="2px"
          w={{ base: "100%", md: "min(320px, 100%)" }}
          borderRadius="full"
          bg="linear-gradient(90deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.95) 45%, rgba(212, 175, 55, 0.1) 100%)"
          boxShadow="0 0 20px rgba(212, 175, 55, 0.15)"
        />
        <Text className="inter" fontSize="sm" color="var(--color-text-muted)" maxW="42rem">
          Reiche einen Trading-Nachweis ein (z. B. Broker-Statement, Erfolgs-Screenshot). Nach Freigabe durch
          unser Team erscheint er &ndash; sofern du magst &ndash; auf der oeffentlichen Erfolge-Seite.
        </Text>
      </Stack>
      <ZertifikateManager initial={initial} />
    </Stack>
  );
}
