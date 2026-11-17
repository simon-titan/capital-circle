import { redirect } from "next/navigation";
import { Box, Table, Tbody, Td, Text, Th, Thead, Tr } from "@chakra-ui/react";
import { ADMIN_CARD_CLASS, AdminPageHeader, StatusPill, adminTableSx } from "@/components/admin/adminUi";
import { GEHEIMHALTUNG_FASSUNG } from "@/config/geheimhaltung";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { ladeAuthInfos } from "@/lib/training/board";

export const dynamic = "force-dynamic";

type Zustimmung = { user_id: string; name: string; zugestimmt_am: string; ip: string | null };

/**
 * `/admin/geheimhaltung` — wer der Geheimhaltungsvereinbarung (aktuelle Fassung)
 * zugestimmt hat und wer noch nicht. Nur zahlende Mitglieder müssen (Migration 116).
 */
export default async function AdminGeheimhaltungPage() {
  const { error } = await requireAdmin();
  if (error) redirect("/dashboard");

  const service = createServiceClient();
  const [{ data: profile }, { data: zustimmungen, error: zFehler }] = await Promise.all([
    service.from("profiles").select("id,full_name").eq("is_paid", true).or("is_admin.is.null,is_admin.eq.false").limit(5000),
    service.from("geheimhaltung_zustimmung").select("user_id,name,zugestimmt_am,ip").eq("fassung", GEHEIMHALTUNG_FASSUNG).limit(5000),
  ]);
  const migrationFehlt = Boolean(zFehler);
  const je = new Map(((zustimmungen ?? []) as Zustimmung[]).map((z) => [z.user_id, z]));
  const liste = ((profile ?? []) as { id: string; full_name: string | null }[]).map((p) => ({ ...p, z: je.get(p.id) ?? null }));
  const auth = await ladeAuthInfos(service, new Set(liste.map((p) => p.id)));
  liste.sort((a, b) => Number(Boolean(a.z)) - Number(Boolean(b.z)) || (b.z?.zugestimmt_am ?? "").localeCompare(a.z?.zugestimmt_am ?? ""));
  const zugestimmt = liste.filter((p) => p.z).length;

  return (
    <Box>
      <AdminPageHeader
        title="Geheimhaltung"
        subtitle={`Fassung ${GEHEIMHALTUNG_FASSUNG} · ${zugestimmt} von ${liste.length} zahlenden Mitgliedern haben zugestimmt. Ohne Zustimmung sperrt ein Popup den Mitgliederbereich (Abo und Abrechnung bleiben offen).`}
      />
      {migrationFehlt ? (
        <Text className={ADMIN_CARD_CLASS} p={4} color="var(--cc-text-2)" mb={5}>
          Migration 116 ist noch nicht eingespielt. Bis dahin erscheint das Popup nicht.
        </Text>
      ) : null}
      <Box className={ADMIN_CARD_CLASS} p={{ base: 2, md: 3 }} overflowX="auto">
        <Table size="sm" sx={adminTableSx}>
          <Thead>
            <Tr>
              <Th>Mitglied</Th>
              <Th>E-Mail</Th>
              <Th>Status</Th>
              <Th>Unterschrieben als</Th>
              <Th>IP</Th>
            </Tr>
          </Thead>
          <Tbody>
            {liste.map((p) => (
              <Tr key={p.id}>
                <Td>{p.full_name || "—"}</Td>
                <Td>{auth.get(p.id)?.email ?? "—"}</Td>
                <Td>
                  {p.z ? (
                    <StatusPill tone="success">
                      {new Date(p.z.zugestimmt_am).toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "short", timeStyle: "short" })}
                    </StatusPill>
                  ) : (
                    <StatusPill tone="attention">offen</StatusPill>
                  )}
                </Td>
                <Td>{p.z?.name ?? "—"}</Td>
                <Td>{p.z?.ip ?? "—"}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}
