import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { DiscordFunnelShell } from "@/components/admin/discord-funnel/DiscordFunnelShell";

export const dynamic = "force-dynamic";

export default async function DiscordFunnelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { error } = await requireAdmin();
  if (error) {
    redirect("/dashboard");
  }

  return <DiscordFunnelShell>{children}</DiscordFunnelShell>;
}
