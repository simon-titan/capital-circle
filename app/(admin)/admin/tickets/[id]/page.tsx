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
      {/* Link aussen herum statt `as={Link}` — siehe app/(admin)/admin/page.tsx. */}
      <Link href="/admin/tickets" style={{ textDecoration: "none", alignSelf: "flex-start" }}>
        <HStack
          spacing={2}
          fontSize="14px"
          color="var(--cc-text-2)"
          transition="color 150ms var(--cc-ease)"
          _hover={{ color: "var(--cc-gold-light)" }}
        >
          <ArrowLeft size={14} strokeWidth={1.75} aria-hidden />
          <Text>Zurück zur Ticket-Übersicht</Text>
        </HStack>
      </Link>

      <AdminTicketDetail ticketId={id} />
    </Stack>
  );
}
