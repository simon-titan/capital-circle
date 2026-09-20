import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/journal/PageHeader";
import { SupportTicketsList, type SupportTicketRow } from "@/components/support/SupportTicketsList";

export const metadata: Metadata = {
  title: "Support · Capital Circle",
};

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("support_tickets")
    .select("id,subject,category,status,priority,created_at,first_response_at,resolved_at,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const tickets = (data as SupportTicketRow[] | null) ?? [];

  return (
    <Box maxW="900px" mx="auto" w="full">
      <PageHeader
        title="Hilfe & Anfragen"
        subtitle="Stelle eine Anfrage an unser Team. Wir antworten direkt hier im Ticket."
      />
      <SupportTicketsList tickets={tickets} />
    </Box>
  );
}
