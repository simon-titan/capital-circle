"use client";

import { Box, Button, HStack, Stack, Table, Tbody, Td, Text, Th, Thead, Tr } from "@chakra-ui/react";
import { Pause, Play, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import {
  ADMIN_CARD_CLASS,
  AdminCount,
  StatusPill,
  adminCardPadding,
  adminChipProps,
  adminTableSx,
} from "@/components/admin/adminUi";
import { GRUND_LABEL, VORLAGEN, type VorlageId } from "@/lib/mailsystem/vorlagen";
import type { BoardTermin, BoardVersand, BoardZugang } from "@/lib/training/board";

/**
 * Bausteine des Trainings-Boards für das E-Mail-Playbook 1.0:
 *
 * - Bewerbungen selbst: `components/admin/TrainingBewerbungen.tsx`.
 * - `ZugangAktionen` — einmalig +7 Tage (E03) und die persönliche Kontaktpause.
 * - `VersandTabelle` — was rausging, was übersprungen oder gestoppt wurde, mit Grund.
 */

function datum(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" }) : "—";
}

const FEHLER: Record<string, string> = {
  schon_entschieden: "Darüber wurde schon entschieden.",
  adresse_unbestaetigt: "Die E-Mail-Adresse ist noch nicht bestätigt.",
  schon_verlaengert: "Die einmalige Verlängerung ist schon verbraucht.",
  noch_aktiv: "Der Zugang läuft noch — verlängert wird erst nach Ablauf.",
  zugang_fehlgeschlagen: "Der Zugang konnte nicht angelegt werden. Bitte noch einmal versuchen.",
  kein_zugang: "Dieses Konto hat keinen Trainingszugang.",
  grund: "Bitte einen Grund angeben.",
  naechster_schritt: "Bitte den nächsten Schritt festhalten.",
};

async function poste(url: string, body: unknown): Promise<{ ok: boolean; error?: string; endeAm?: string }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; endeAm?: string };
  return { ok: Boolean(res.ok && json.ok), error: json.error ?? (res.ok ? undefined : `Fehler ${res.status}`), endeAm: json.endeAm };
}

export function ZugangAktionen({ userId, zugang, pause }: { userId: string; zugang: BoardZugang | null; pause: boolean }) {
  const [z, setZ] = useState(zugang);
  const [jetztMs] = useState(() => Date.now());
  const [pausiert, setPausiert] = useState(pause);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const handle = async (aktion: "verlaengern" | "pause_setzen" | "pause_aufheben") => {
    let extra: Record<string, string> = {};
    if (aktion === "verlaengern" && !window.confirm("Zugang einmalig um 7 Tage ab jetzt verlängern? Die Bestätigung (E03) geht sofort raus.")) return;
    if (aktion === "pause_setzen") {
      const grund = window.prompt("Warum pausieren? (z. B. Antwort auf S02, Login-Problem)");
      if (!grund) return;
      extra = { grund };
    }
    if (aktion === "pause_aufheben") {
      const naechsterSchritt = window.prompt("Was ist der nächste Schritt? (wird festgehalten)");
      if (!naechsterSchritt) return;
      extra = { naechsterSchritt };
    }
    setLaeuft(true);
    setFehler(null);
    try {
      const r = await poste(`/api/admin/training/zugang/${userId}`, { aktion, ...extra });
      if (!r.ok) {
        setFehler(FEHLER[r.error ?? ""] ?? r.error ?? "Fehler");
        return;
      }
      if (aktion === "verlaengern" && z && r.endeAm) setZ({ ...z, endeAm: r.endeAm, verlaengert: true });
      if (aktion === "pause_setzen") setPausiert(true);
      if (aktion === "pause_aufheben") setPausiert(false);
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <Stack gap={1.5} minW="190px">
      {z ? (
        <Text fontSize="xs" className="cc-num" color={new Date(z.endeAm).getTime() < jetztMs ? "var(--cc-text-3)" : "var(--cc-text)"}>
          bis {datum(z.endeAm)}
          {z.verlaengert ? " · verlängert" : ""}
          {z.ausBestand ? " · Bestand" : ""}
          {z.gestartetAm ? "" : " · nicht gestartet"}
        </Text>
      ) : (
        <Text fontSize="xs" color="var(--cc-text-3)">
          kein Zugang
        </Text>
      )}
      <HStack gap={1.5}>
        {z && !z.verlaengert && new Date(z.endeAm).getTime() < jetztMs ? (
          <Button size="xs" variant="line" leftIcon={<Plus size={12} />} isLoading={laeuft} onClick={() => void handle("verlaengern")}>
            7 Tage
          </Button>
        ) : null}
        <Button
          size="xs"
          variant={pausiert ? "gold" : "line"}
          leftIcon={pausiert ? <Play size={12} /> : <Pause size={12} />}
          isLoading={laeuft}
          onClick={() => void handle(pausiert ? "pause_aufheben" : "pause_setzen")}
          title={pausiert ? "Kontaktpause aufheben" : "Persönliche Kontaktpause setzen — automatische Lern-/Verkaufsmails ruhen"}
        >
          {pausiert ? "Pause aufheben" : "Pause"}
        </Button>
      </HStack>
      {fehler ? (
        <Text fontSize="xs" color="var(--cc-danger)">
          {fehler}
        </Text>
      ) : null}
    </Stack>
  );
}

const STATUS_TON: Record<string, "success" | "neutral" | "attention" | "danger"> = {
  gesendet: "success",
  uebersprungen: "neutral",
  gestoppt: "attention",
  reserviert: "attention",
};

export function VersandTabelle({ zeilen, suche }: { zeilen: BoardVersand[]; suche: string }) {
  const [status, setStatus] = useState<string>("alle");
  const sichtbar = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return zeilen.filter((z) => (status === "alle" || z.status === status) && (!q || z.email.includes(q) || z.vorlage.toLowerCase().includes(q)));
  }, [zeilen, status, suche]);

  return (
    <Stack gap={3}>
      <HStack gap={2} wrap="wrap">
        {["alle", "gesendet", "uebersprungen", "gestoppt"].map((s) => (
          <Button key={s} {...adminChipProps(status === s)} onClick={() => setStatus(s)}>
            {s === "alle" ? "Alle" : s === "uebersprungen" ? "Übersprungen" : s[0]!.toUpperCase() + s.slice(1)}
            <AdminCount active={status === s}>{s === "alle" ? zeilen.length : zeilen.filter((z) => z.status === s).length}</AdminCount>
          </Button>
        ))}
      </HStack>
      <Box className={ADMIN_CARD_CLASS} p={adminCardPadding} overflowX="auto">
        {sichtbar.length === 0 ? (
          <Text fontSize="sm" color="var(--cc-text-2)">
            Noch keine Einträge. Jede Playbook-Mail steht hier genau einmal — gesendet, übersprungen oder gestoppt, mit Grund.
          </Text>
        ) : (
          <Table size="sm" sx={adminTableSx}>
            <Thead>
              <Tr>
                <Th>Vorlage</Th>
                <Th>Empfänger</Th>
                <Th>Status</Th>
                <Th>Grund</Th>
                <Th>Fällig</Th>
                <Th>Gesendet</Th>
              </Tr>
            </Thead>
            <Tbody>
              {sichtbar.map((z) => (
                <Tr key={z.id}>
                  <Td>
                    <Text as="span" fontWeight={600}>
                      {z.vorlage}
                    </Text>{" "}
                    <Text as="span" fontSize="xs" color="var(--cc-text-3)">
                      {VORLAGEN[z.vorlage as VorlageId]?.titel ?? ""}
                    </Text>
                  </Td>
                  <Td>{z.email}</Td>
                  <Td>
                    <StatusPill tone={STATUS_TON[z.status] ?? "neutral"}>{z.status}</StatusPill>
                  </Td>
                  <Td>
                    <Text fontSize="xs">{z.grund ? (GRUND_LABEL[z.grund] ?? z.grund) : "—"}</Text>
                  </Td>
                  <Td className="cc-num">{datum(z.faellig_am)}</Td>
                  <Td className="cc-num">{datum(z.gesendet_am)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Box>
    </Stack>
  );
}

const TERMIN_LABEL: Record<string, string> = {
  gebucht: "Gebucht",
  umgebucht: "Umgebucht",
  abgesagt_kunde: "Abgesagt (Kunde)",
  abgesagt_team: "Abgesagt (Team)",
  gefuehrt: "Geführt",
  no_show: "No-Show",
};
const TERMIN_TON: Record<string, "success" | "neutral" | "attention" | "danger"> = {
  gebucht: "attention",
  umgebucht: "neutral",
  abgesagt_kunde: "neutral",
  abgesagt_team: "neutral",
  gefuehrt: "success",
  no_show: "danger",
};

/**
 * Termine aus Calendly (Migration 111). Der Closer hält hier fest, was passiert
 * ist — daran hängen N01/N02 (No-Show) und das Ende aller Vorverkaufsmails
 * (geführt). Absagen hier schicken R02 bzw. R03.
 */
export function TermineTabelle({ termine: anfang, suche }: { termine: BoardTermin[]; suche: string }) {
  const [termine, setTermine] = useState(anfang);
  const [fehler, setFehler] = useState<Record<string, string>>({});
  const [laeuft, setLaeuft] = useState<string | null>(null);
  const [jetzt] = useState(() => Date.now());
  const q = suche.trim().toLowerCase();
  const sichtbar = termine.filter((t) => !q || t.email.includes(q) || (t.name ?? "").toLowerCase().includes(q));

  const aktion = async (t: BoardTermin, a: string, frage?: string) => {
    if (frage && !window.confirm(frage)) return;
    setLaeuft(t.id + a);
    try {
      const r = await poste(`/api/admin/training/termine/${t.id}`, { aktion: a });
      if (!r.ok) {
        setFehler((f) => ({ ...f, [t.id]: r.error === "noch_nicht_begonnen" ? "Erst nach Beginn möglich." : (r.error ?? "Fehler") }));
        return;
      }
      const status = a === "kein_interesse" ? "abgesagt_kunde" : a;
      const noShow = a === "no_show" ? new Date().toISOString() : null;
      setTermine((alt) => alt.map((x) => (x.id === t.id ? { ...x, status, no_show_am: a === "no_show" ? noShow : a === "gebucht" ? null : x.no_show_am } : x)));
      setFehler((f) => ({ ...f, [t.id]: "" }));
    } finally {
      setLaeuft(null);
    }
  };

  return (
    <Box className={ADMIN_CARD_CLASS} p={adminCardPadding} overflowX="auto">
      {sichtbar.length === 0 ? (
        <Text fontSize="sm" color="var(--cc-text-2)">
          Noch keine Termine. Sie kommen über den Calendly-Webhook (Buchung, Umbuchung, Absage, No-Show).
        </Text>
      ) : (
        <Table size="sm" sx={adminTableSx}>
          <Thead>
            <Tr>
              <Th>Termin</Th>
              <Th>Kontakt</Th>
              <Th>Berater</Th>
              <Th>Status</Th>
              <Th>Festhalten</Th>
            </Tr>
          </Thead>
          <Tbody>
            {sichtbar.map((t) => {
              const vorbei = new Date(t.start_am).getTime() < jetzt;
              const knopf = (a: string, label: string, frage?: string) => (
                <Button size="xs" variant="line" isLoading={laeuft === t.id + a} onClick={() => void aktion(t, a, frage)}>
                  {label}
                </Button>
              );
              return (
                <Tr key={t.id}>
                  <Td className="cc-num">
                    {datum(t.start_am)}
                    {t.vorgaenger_id ? (
                      <Text as="span" fontSize="xs" color="var(--cc-text-3)">
                        {" "}
                        · umgebucht
                      </Text>
                    ) : null}
                  </Td>
                  <Td>
                    <Text fontSize="sm">{t.name ?? "—"}</Text>
                    <Text fontSize="xs" color="var(--cc-text-3)">
                      {t.email} · {t.lead_art === "training" ? "Training" : "Call/Discord"}
                    </Text>
                  </Td>
                  <Td>{t.berater_name ?? "—"}</Td>
                  <Td>
                    <StatusPill tone={TERMIN_TON[t.status] ?? "neutral"}>{TERMIN_LABEL[t.status] ?? t.status}</StatusPill>
                  </Td>
                  <Td>
                    <HStack gap={1.5} wrap="wrap">
                      {t.status === "gebucht" && vorbei ? (
                        <>
                          {knopf("gefuehrt", "Geführt")}
                          {knopf("no_show", "No-Show", "No-Show bestätigen? Vorher anrufen (+15 min). N01 geht nach 24 h raus.")}
                        </>
                      ) : null}
                      {t.status === "gebucht" && !vorbei ? (
                        <>
                          {knopf("abgesagt_kunde", "Abgesagt", "Absage des Kontakts festhalten? R02 geht sofort raus.")}
                          {knopf("kein_interesse", "Kein Interesse", "Absage ohne Interesse? R02 ohne Neubuchung geht sofort raus.")}
                          {knopf("abgesagt_team", "Wir sagen ab", "Termin von unserer Seite absagen? R03 mit Neubuchungslink geht sofort raus.")}
                        </>
                      ) : null}
                      {t.status === "no_show" ? (
                        <>
                          {knopf("gefuehrt", "Doch geführt")}
                          {knopf("gebucht", "No-Show zurücknehmen")}
                        </>
                      ) : null}
                    </HStack>
                    {fehler[t.id] ? (
                      <Text fontSize="xs" color="var(--cc-danger)">
                        {fehler[t.id]}
                      </Text>
                    ) : null}
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      )}
    </Box>
  );
}
