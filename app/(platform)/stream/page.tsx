import { Box } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/journal/PageHeader";
import { StreamRoom, type StreamStatus } from "@/components/platform/StreamRoom";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/server-data";

export const dynamic = "force-dynamic";

/**
 * /stream — Free-User Live-Stream Page.
 *
 * Zugriff:
 *  - Nicht eingeloggt      -> /einsteig
 *  - membership_tier='free' -> darf streamen
 *  - is_admin=true          -> darf streamen (Testing/Moderation)
 *  - Sonstige               -> /dashboard
 */
export default async function StreamPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) redirect("/einsteig");

  const profileAny = profile as Record<string, unknown>;
  const isAdmin = profileAny.is_admin === true;
  const tier = typeof profileAny.membership_tier === "string" ? profileAny.membership_tier : "free";
  const canWatch = isAdmin || tier === "free";
  if (!canWatch) redirect("/dashboard");

  // Initiale Settings SSR-geladen, damit der Player beim ersten Render sofort den korrekten Status zeigt.
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("stream_settings")
    .select("is_live, cloudflare_stream_id, title, started_at, updated_at")
    .eq("id", 1)
    .maybeSingle();

  const row = settings as
    | {
        is_live: boolean;
        cloudflare_stream_id: string | null;
        title: string;
        started_at: string | null;
        updated_at: string;
      }
    | null;

  const initialStatus: StreamStatus = {
    isLive: Boolean(row?.is_live),
    streamId: row?.cloudflare_stream_id ?? null,
    title: row?.title ?? "Live Event Stream",
    startedAt: row?.started_at ?? null,
    updatedAt: row?.updated_at ?? null,
  };

  const customerSubdomain = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN ?? "";

  return (
    <Box>
      <PageHeader
        title="Live Event Stream"
        subtitle="Wenn Emre live geht, startet der Player hier automatisch. Diese Seite ist eine reine Ansicht! Es sind keine Interaktionen möglich. Du siehst den Stream innerhalb weniger Sekunden, sobald er online ist."
      />
      <StreamRoom initialStatus={initialStatus} customerSubdomain={customerSubdomain} />
    </Box>
  );
}
