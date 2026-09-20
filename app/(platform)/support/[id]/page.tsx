import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Box, HStack, Text } from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/journal/PageHeader";
import { TicketThread, type TicketDetailRow, type TicketMessageRow } from "@/components/support/TicketThread";

export const metadata: Metadata = {
  title: "Ticket · Capital Circle Support",
};

export const dynamic = "force-dynamic";

export default async function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    redirect("/login");
  }

  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id,subject,category,status,priority,created_at,first_response_at,resolved_at,updated_at")
    .eq("id", id)
    .maybeSingle();

  if (!ticket) {
    notFound();
  }

  const { data: messages } = await supabase
    .from("support_ticket_messages")
    .select("id,sender_type,sender_id,body,created_at")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  const detail = ticket as TicketDetailRow;

  return (
    <Box maxW="800px" mx="auto" w="full">
      {/* Link aussen herum statt `as={Link}` — siehe app/(admin)/admin/page.tsx. */}
      <Link href="/support" style={{ textDecoration: "none", display: "block", width: "fit-content" }}>
        <HStack
          spacing={2}
          mb={4}
          fontSize="14px"
          color="var(--cc-text-2)"
          transition="color 150ms ease"
          _hover={{ color: "var(--cc-gold-light)" }}
        >
          <ArrowLeft size={14} aria-hidden />
          <Text>Zurück zur Übersicht</Text>
        </HStack>
      </Link>

      <PageHeader title={detail.subject} />

      <TicketThread ticket={detail} messages={(messages as TicketMessageRow[] | null) ?? []} />
    </Box>
  );
}
