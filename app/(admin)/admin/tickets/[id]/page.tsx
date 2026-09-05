import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { HStack, Stack, Text } from "@chakra-ui/react";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { AdminTicketDetail } from "@/components/admin/AdminTicketDetail";

export const dynamic = "force-dynamic";

export default async function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) {
    redirect("/dashboard");
  }

  const { id } = await params;

  return (
    <Stack gap={6} maxW="var(--adminMaxWidth, 1100px)" mx="auto">
      <HStack
        as={Link}
        href="/admin/tickets"
        spacing={2}
        fontSize="xs"
        color="gray.500"
        className="inter"
        _hover={{ color: "var(--color-accent-gold-light)" }}
      >
        <ArrowLeft size={14} />
        <Text>Zurück zur Ticket-Übersicht</Text>
      </HStack>

      <AdminTicketDetail ticketId={id} />
    </Stack>
  );
}
