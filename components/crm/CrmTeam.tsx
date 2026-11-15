"use client";

import { Box, Button, Grid, Input, Stack, Switch, Table, Tbody, Td, Text, Th, Thead, Tr } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { ADMIN_CARD_CLASS, AdminCardTitle, adminCardPadding, adminInputProps, adminTableSx } from "@/components/admin/adminUi";
import { SeitenKopf } from "./CrmRahmen";
import type { TeamMitglied } from "@/lib/crm/zuweisung";

/**
 * Das Vertriebsteam: wer ins CRM darf, mit Kürzel (für Kassenlinks), Calendly-
 * Adresse und festem Call-Block. Termine, die in einem Block beginnen, gehen an
 * diesen Closer. Ändern dürfen nur Admins.
 */
const VORSCHLAG = [
  { name: "Daniel", kuerzel: "daniel", block_von: "13:00", block_bis: "14:00" },
  { name: "Kevin", kuerzel: "kevin", block_von: "15:00", block_bis: "17:00" },
  { name: "Simon", kuerzel: "simon", block_von: "17:00", block_bis: "19:00" },
];

type Form = { email: string; name: string; kuerzel: string; calendly_email: string; block_von: string; block_bis: string; aktiv: boolean };
const LEER: Form = { email: "", name: "", kuerzel: "", calendly_email: "", block_von: "", block_bis: "", aktiv: true };

export function CrmTeam({ istAdmin }: { istAdmin: boolean }) {
  const [team, setTeam] = useState<TeamMitglied[]>([]);
  const [form, setForm] = useState<Form>(LEER);
  const [meldung, setMeldung] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/crm/team", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { team?: TeamMitglied[] }) => setTeam(j.team ?? []));
  }, []);

  const speichern = async () => {
    setMeldung(null);
    const res = await fetch("/api/crm/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const j = (await res.json()) as { ok: boolean; team?: TeamMitglied[]; error?: string };
    if (!j.ok) {
      setMeldung(
        j.error === "kein_konto"
          ? "Zu dieser Login-Mail gibt es kein Konto. Erst ein Konto anlegen (Admin → Mitglieder)."
          : j.error === "block"
            ? "Block: Beginn und Ende angeben, Beginn vor Ende."
            : j.error === "kuerzel_vergeben"
              ? "Das Kürzel ist schon vergeben."
              : (j.error ?? "Fehler"),
      );
      return;
    }
    setTeam(j.team ?? []);
    setForm(LEER);
    setMeldung("Gespeichert.");
  };

  const kurz = (t: string | null) => (t ? t.slice(0, 5) : "—");

  return (
    <Stack gap={4}>
      <SeitenKopf titel="Team" unter="Closer, Calendly-Gastgeber und Call-Blöcke für die automatische Zuweisung" />
      <Box className={ADMIN_CARD_CLASS} p={adminCardPadding} overflowX="auto">
        <Table size="sm" sx={adminTableSx}>
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Kürzel</Th>
              <Th>Calendly-Gastgeber</Th>
              <Th>Call-Block</Th>
              <Th>Aktiv</Th>
              {istAdmin ? <Th /> : null}
            </Tr>
          </Thead>
          <Tbody>
            {team.map((t) => (
              <Tr key={t.user_id}>
                <Td fontWeight={500}>{t.name}</Td>
                <Td>{t.kuerzel}</Td>
                <Td>{t.calendly_email ?? "—"}</Td>
                <Td className="cc-num">
                  {kurz(t.block_von)}–{kurz(t.block_bis)} Uhr
                </Td>
                <Td>{t.aktiv ? "Ja" : "Nein"}</Td>
                {istAdmin ? (
                  <Td>
                    <Button
                      size="xs"
                      variant="line"
                      onClick={() =>
                        setForm({
                          email: "",
                          name: t.name,
                          kuerzel: t.kuerzel,
                          calendly_email: t.calendly_email ?? "",
                          block_von: t.block_von?.slice(0, 5) ?? "",
                          block_bis: t.block_bis?.slice(0, 5) ?? "",
                          aktiv: t.aktiv,
                        })
                      }
                    >
                      Bearbeiten
                    </Button>
                  </Td>
                ) : null}
              </Tr>
            ))}
          </Tbody>
        </Table>
        {team.length === 0 ? (
          <Text fontSize="sm" color="var(--cc-text-2)" mt={3}>
            Noch niemand eingetragen. Vorschlag: Daniel 13–14 Uhr, Kevin 15–17 Uhr, Simon 17–19 Uhr.
          </Text>
        ) : null}
      </Box>

      {istAdmin ? (
        <Box className={ADMIN_CARD_CLASS} p={adminCardPadding}>
          <AdminCardTitle mb={3}>Mitglied eintragen oder ändern</AdminCardTitle>
          <Text fontSize="xs" color="var(--cc-text-3)" mb={3}>
            Login-Mail = das Konto, mit dem sich der Closer anmeldet (braucht keine Adminrechte). Beim Bearbeiten die Login-Mail erneut
            eingeben.
          </Text>
          <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={3}>
            <Input placeholder="Login-Mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} {...adminInputProps} />
            <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} {...adminInputProps} />
            <Input placeholder="Kürzel (kevin, simon, daniel)" value={form.kuerzel} onChange={(e) => setForm({ ...form, kuerzel: e.target.value })} {...adminInputProps} />
            <Input
              placeholder="Calendly-Gastgeber-Mail"
              value={form.calendly_email}
              onChange={(e) => setForm({ ...form, calendly_email: e.target.value })}
              {...adminInputProps}
            />
            <Input type="time" value={form.block_von} onChange={(e) => setForm({ ...form, block_von: e.target.value })} {...adminInputProps} />
            <Input type="time" value={form.block_bis} onChange={(e) => setForm({ ...form, block_bis: e.target.value })} {...adminInputProps} />
          </Grid>
          <Stack direction="row" align="center" gap={4} mt={3} wrap="wrap">
            <Stack direction="row" align="center" gap={2}>
              <Switch isChecked={form.aktiv} onChange={(e) => setForm({ ...form, aktiv: e.target.checked })} />
              <Text fontSize="sm">Aktiv</Text>
            </Stack>
            {VORSCHLAG.map((v) => (
              <Button key={v.kuerzel} size="xs" variant="ghost" onClick={() => setForm({ ...form, ...v })}>
                Vorlage {v.name}
              </Button>
            ))}
            <Button size="sm" variant="gold" ml="auto" onClick={() => void speichern()}>
              Speichern
            </Button>
          </Stack>
          {meldung ? (
            <Text fontSize="sm" mt={2} color={meldung === "Gespeichert." ? "var(--cc-gold-light)" : "var(--cc-danger)"}>
              {meldung}
            </Text>
          ) : null}
        </Box>
      ) : null}
    </Stack>
  );
}
