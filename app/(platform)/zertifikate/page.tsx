import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { getPresignedGetUrl } from "@/lib/storage";
import { PageHeader } from "@/components/journal/PageHeader";
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
    <Box>
      <PageHeader
        title="Zertifikate & Erfolge einreichen"
        subtitle="Reiche einen Trading-Nachweis ein (z. B. Broker-Statement, Erfolgs-Screenshot). Nach Freigabe durch unser Team erscheint er – sofern du magst – auf der öffentlichen Erfolge-Seite."
      />
      <ZertifikateManager initial={initial} />
    </Box>
  );
}
