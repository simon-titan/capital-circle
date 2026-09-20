"use client";

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  HStack,
  SimpleGrid,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ADMIN_CARD_CLASS,
  AdminCount,
  AdminLabel,
  StatusPill,
  adminAlertIconColor,
  adminAlertProps,
  adminCardPadding,
  adminChipProps,
  adminTableSx,
  type AdminTone,
} from "@/components/admin/adminUi";

/** Spiegelt die Antwort von `GET /api/admin/whop-umzug`. */
interface Stand {
  mail: boolean;
  dm: boolean;
}

interface Mitglied {
  email: string;
  name: string | null;
  zugangBis: string | null;
  tageRest: number | null;
  zugangOffen: boolean;
  discord: boolean;
  dmMoeglich: boolean;
  stripeAbo: boolean;
  gesendet: Record<string, Stand | null>;
  faellig: string | null;
}

interface Antwort {
  ok: boolean;
  error?: string;
  hindernis?: string | null;
  erinnerungVorlaufTage?: number;
  gesamt?: number;
  ohneAdresse?: number;
  mitDiscord?: number;
  dmMoeglich?: number;
  ohneDatum?: number;
  zugangOffen?: number;
  abgelaufen?: number;
  umgezogen?: number;
  faellig?: Record<string, number>;
  mitglieder?: Mitglied[];
}

const STUFEN = ["ankuendigung", "erinnerung", "ende"] as const;
const STUFEN_LABEL: Record<string, string> = {
  ankuendigung: "Ankündigung",
  erinnerung: "Erinnerung",
  ende: "Ende",
};

type Filter = "alle" | "faellig" | "umgezogen";

/**
 * Whop-Umzug — Leseliste, kein Knopf.
 *
 * Bewusst **ohne Versandschaltfläche.** Diese Kampagne geht an 29 echte,
 * zahlende Menschen, jede Stufe genau einmal; ein versehentlicher Klick hier
 * wäre nicht zurückzuholen. Verschickt wird über `npm run whop:umzug`, wo ein
 * Trockenlauf der Standard ist und `--write` eine bewusste Entscheidung.
 *
 * Was die Seite beantwortet: Wer ist importiert, wann endet sein bezahlter
 * Zeitraum, was hat er schon bekommen, hat er bei uns abgeschlossen — und was
 * wäre als Nächstes fällig.
 */
export function AdminWhopUmzugManager() {
  const [daten, setDaten] = useState<Antwort | null>(null);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("alle");

  const laden = useCallback(async () => {
    setLaedt(true);
    setFehler(null);
    try {
      const res = await fetch("/api/admin/whop-umzug", { cache: "no-store" });
      const json = (await res.json()) as Antwort;
      if (!json.ok) throw new Error(json.error ?? "Fehler beim Laden.");
      setDaten(json);
    } catch (err) {
      setFehler((err as Error).message);
    } finally {
      setLaedt(false);
    }
  }, []);

  useEffect(() => {
    void laden();
  }, [laden]);

  const alle = useMemo(() => daten?.mitglieder ?? [], [daten]);
  const faellige = useMemo(() => alle.filter((m) => m.faellig), [alle]);
  const umgezogene = useMemo(() => alle.filter((m) => m.stripeAbo), [alle]);
  const sichtbar = filter === "faellig" ? faellige : filter === "umgezogen" ? umgezogene : alle;

  return (
    <>
      {fehler ? (
        <Alert status="error" {...adminAlertProps("error")} mt={4}>
          <AlertIcon color={adminAlertIconColor("error")} />
          <Text fontSize="sm">{fehler}</Text>
        </Alert>
      ) : null}

      {daten?.hindernis ? (
        <Alert status="warning" {...adminAlertProps("warning")} mt={4}>
          <AlertIcon color={adminAlertIconColor("warning")} />
          <Text fontSize="sm">{daten.hindernis}</Text>
        </Alert>
      ) : null}

      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} mt={4}>
        <Kennzahl label="Importiert" wert={daten?.gesamt ?? 0} />
        <Kennzahl label="Zugang offen" wert={daten?.zugangOffen ?? 0} />
        <Kennzahl label="Bei uns abgeschlossen" wert={daten?.umgezogen ?? 0} />
        <Kennzahl label="Direktnachricht möglich" wert={daten?.dmMoeglich ?? 0} />
      </SimpleGrid>

      {(daten?.ohneDatum ?? 0) > 0 || (daten?.ohneAdresse ?? 0) > 0 ? (
        <Alert status="warning" {...adminAlertProps("warning")} mt={3}>
          <AlertIcon color={adminAlertIconColor("warning")} />
          <Text fontSize="sm">
            {(daten?.ohneDatum ?? 0) > 0
              ? `${daten?.ohneDatum} Konten ohne access_until. Sie bekommen keine Mail, weil in jeder Stufe ein Datum steht. `
              : ""}
            {(daten?.ohneAdresse ?? 0) > 0
              ? `${daten?.ohneAdresse} Konten ohne E-Mail-Adresse in auth.users.`
              : ""}
          </Text>
        </Alert>
      ) : null}

      <HStack spacing={2} flexWrap="wrap" mt={5}>
        <Button {...adminChipProps(filter === "alle")} onClick={() => setFilter("alle")}>
          Alle
          <AdminCount active={filter === "alle"}>{alle.length}</AdminCount>
        </Button>
        <Button {...adminChipProps(filter === "faellig")} onClick={() => setFilter("faellig")}>
          Fällig
          <AdminCount active={filter === "faellig"}>{faellige.length}</AdminCount>
        </Button>
        <Button {...adminChipProps(filter === "umgezogen")} onClick={() => setFilter("umgezogen")}>
          Umgezogen
          <AdminCount active={filter === "umgezogen"}>{umgezogene.length}</AdminCount>
        </Button>
        <Button {...adminChipProps(false)} onClick={() => void laden()} isLoading={laedt}>
          Neu laden
        </Button>
      </HStack>

      <Box mt={5} className={ADMIN_CARD_CLASS} p={adminCardPadding}>
        {laedt ? (
          <Box p={8} textAlign="center">
            <Text color="var(--cc-text-2)" fontSize="sm">
              Lade Stand…
            </Text>
          </Box>
        ) : sichtbar.length === 0 ? (
          <Box p={10} textAlign="center">
            <Text color="var(--cc-text-2)" fontSize="sm">
              {alle.length === 0
                ? "Noch niemand importiert. Erst npm run whop:import -- \"<csv>\" --apply laufen lassen."
                : "In dieser Ansicht steht gerade nichts."}
            </Text>
          </Box>
        ) : (
          <Box overflowX="auto" mx={{ base: -1, md: -2 }}>
            <Table variant="unstyled" size="sm" sx={adminTableSx}>
              <Thead>
                <Tr>
                  {["Person", "Zugang bis", "Ankündigung", "Erinnerung", "Ende", "Stand"].map((h) => (
                    <Th key={h}>{h}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {sichtbar.map((m) => (
                  <Tr key={m.email} verticalAlign="top">
                    <Td>
                      <Stack spacing={0} maxW="260px">
                        <Text fontSize="sm" fontWeight={600} color="var(--cc-text)" noOfLines={1}>
                          {m.name ?? "—"}
                        </Text>
                        <Text fontSize="xs" color="var(--cc-text-2)" noOfLines={1}>
                          {m.email}
                        </Text>
                        <Text fontSize="11px" color="var(--cc-text-3)">
                          {m.discord ? (m.dmMoeglich ? "Discord · DM möglich" : "Discord · DM abbestellt") : "Kein Discord"}
                        </Text>
                      </Stack>
                    </Td>
                    <Td>
                      <Text fontSize="sm" className="cc-num" color="var(--cc-text)" whiteSpace="nowrap">
                        {m.zugangBis ?? "—"}
                      </Text>
                      <Text fontSize="xs" className="cc-num" color="var(--cc-text-3)">
                        {m.tageRest === null
                          ? "kein Datum"
                          : m.tageRest > 0
                            ? `noch ${m.tageRest} Tage`
                            : `seit ${Math.abs(m.tageRest)} Tagen vorbei`}
                      </Text>
                    </Td>
                    {STUFEN.map((s) => (
                      <Td key={s}>
                        <StufenZelle stand={m.gesendet?.[s] ?? null} />
                      </Td>
                    ))}
                    <Td>
                      {m.stripeAbo ? (
                        <StatusPill tone="success">Abgeschlossen</StatusPill>
                      ) : m.faellig ? (
                        <StatusPill tone="attention">{STUFEN_LABEL[m.faellig] ?? m.faellig} fällig</StatusPill>
                      ) : m.zugangOffen ? (
                        <StatusPill tone="neutral">Läuft</StatusPill>
                      ) : (
                        <StatusPill tone="danger">Zugang ruht</StatusPill>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>

      <Text mt={4} fontSize="xs" color="var(--cc-text-3)">
        Erinnerung geht {daten?.erinnerungVorlaufTage ?? 5} Tage vor dem persönlichen Ablauf raus. Versand:{" "}
        <code>npm run whop:umzug -- --url &lt;adresse&gt;</code> (Trockenlauf), mit <code>--write</code> scharf. Der
        Nachtlauf verschickt nichts. Er meldet nur, was fällig wäre, und beendet abgelaufene Zugänge.
      </Text>
    </>
  );
}

function Kennzahl({ label, wert }: { label: string; wert: number }) {
  return (
    <Box className={ADMIN_CARD_CLASS} p={adminCardPadding}>
      <AdminLabel>{label}</AdminLabel>
      <Text className="cc-num" fontSize="2xl" fontWeight={700} color="var(--cc-text)" mt={1}>
        {wert}
      </Text>
    </Box>
  );
}

/** Was von einer Stufe rausging — Mail und Direktnachricht getrennt. */
function StufenZelle({ stand }: { stand: Stand | null }) {
  if (!stand) {
    return (
      <Text fontSize="xs" color="var(--cc-text-3)">
        —
      </Text>
    );
  }
  const ton: AdminTone = stand.mail ? "success" : "danger";
  return (
    <Stack spacing={1} align="flex-start">
      <StatusPill tone={ton}>{stand.mail ? "Mail" : "Mail fehlt"}</StatusPill>
      {stand.dm ? (
        <Text fontSize="11px" color="var(--cc-text-3)">
          + DM
        </Text>
      ) : null}
    </Stack>
  );
}
