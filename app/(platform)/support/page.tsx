import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Stack, Text } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { SupportTicketsList, type SupportTicketRow } from "@/components/support/SupportTicketsList";

export const metadata: Metadata = {
  title: "Support — Capital Circle",
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
    <Stack spacing={{ base: 6, md: 8 }} maxW="900px" mx="auto" w="full">
      <Stack spacing={2}>
        <Text
          fontSize="xs"
          letterSpacing="0.22em"
          textTransform="uppercase"
          color="var(--color-accent-gold)"
          className="inter-semibold"
        >
          Support
        </Text>
        <Text
          as="h1"
          className="radley-regular"
          fontWeight={400}
          fontSize={{ base: "3xl", md: "4xl" }}
          lineHeight="1.15"
          color="var(--color-text-primary)"
        >
          Hilfe & Anfragen
        </Text>
        <Text className="inter" fontSize="sm" color="var(--color-text-secondary)">
          Stelle eine Anfrage an unser Team — wir antworten direkt hier im Ticket.
        </Text>
      </Stack>

      <SupportTicketsList tickets={tickets} />
    </Stack>
  );
}
