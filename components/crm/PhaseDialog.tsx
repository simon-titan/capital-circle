"use client";

import { Box, Flex, Input, Stack, Textarea } from "@chakra-ui/react";
import { useState } from "react";
import { adminInputProps } from "@/components/admin/adminUi";
import { VERLUSTGRUENDE, phaseLabel, type Phase } from "@/config/crm";
import { wiedervorlageVorschlaege } from "@/lib/crm/anzeige";
import { DialogRahmen } from "./Dialoge";
import { useJetzt } from "./gemeinsam";
import { Chip, Feldlabel, dunklesFeld } from "./ui";

/**
 * Phasenwechsel mit Pflichtangaben: „Verloren" braucht einen Grund, „Später"
 * ein Wiedervorlagedatum. Alle anderen Phasen gehen ohne Rückfrage.
 */
export function brauchtDialog(phase: Phase): boolean {
  return phase === "verloren" || phase === "spaeter";
}

export async function setzePhase(kontaktId: string, body: Record<string, unknown>): Promise<string | null> {
  const res = await fetch(`/api/crm/kontakte/${kontaktId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  return res.ok && json.ok ? null : (json.error ?? `Fehler ${res.status}`);
}

/** ISO → Wert für `datetime-local` (lokale Zeit des Browsers). */
export function zuLokal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function PhaseDialog({
  offen,
  phase,
  onAbbrechen,
  onBestaetigen,
}: {
  offen: boolean;
  phase: Phase | null;
  onAbbrechen: () => void;
  onBestaetigen: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [grund, setGrund] = useState("");
  const [notiz, setNotiz] = useState("");
  const [wann, setWann] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const jetzt = useJetzt();
  const ok = phase === "verloren" ? Boolean(grund) : phase === "spaeter" ? Boolean(wann) : true;
  const zuruecksetzen = () => {
    setGrund("");
    setNotiz("");
    setWann("");
  };

  return (
    <DialogRahmen
      offen={offen}
      onAbbrechen={() => {
        zuruecksetzen();
        onAbbrechen();
      }}
      titel={phase === "verloren" ? "Als verloren markieren" : phase === "spaeter" ? "Auf später legen" : phase ? phaseLabel[phase] : ""}
      unter={
        phase === "verloren"
          ? "Beendet die automatischen Verkaufsmails an diesen Kontakt."
          : phase === "spaeter"
            ? "Bis dahin ruhen die automatischen Verkaufsmails. Der Kontakt erscheint am Tag unter „Heute“."
            : undefined
      }
      knopf="Speichern"
      knopfAus={!ok}
      laeuft={laeuft}
      onKnopf={async () => {
        setLaeuft(true);
        try {
          await onBestaetigen({
            phase,
            ...(phase === "verloren" ? { verlust_grund: grund, verlust_notiz: notiz } : {}),
            ...(phase === "spaeter" ? { wiedervorlage_am: new Date(wann).toISOString() } : {}),
          });
          zuruecksetzen();
        } finally {
          setLaeuft(false);
        }
      }}
    >
      <Stack gap={4}>
        {phase === "verloren" ? (
          <>
            <Box>
              <Feldlabel>Grund</Feldlabel>
              <Flex wrap="wrap" gap={1.5}>
                {VERLUSTGRUENDE.map((g) => (
                  <Chip key={g.id} aktiv={grund === g.id} onClick={() => setGrund(g.id)}>
                    {g.label}
                  </Chip>
                ))}
              </Flex>
            </Box>
            <Box>
              <Feldlabel>Notiz (optional)</Feldlabel>
              <Textarea rows={3} value={notiz} onChange={(e) => setNotiz(e.target.value)} {...adminInputProps} />
            </Box>
          </>
        ) : null}
        {phase === "spaeter" ? (
          <Box>
            <Feldlabel>Wann meldest du dich wieder?</Feldlabel>
            <Flex wrap="wrap" gap={1.5} mb={2.5}>
              {wiedervorlageVorschlaege(jetzt).map((v) => (
                <Chip key={v.label} aktiv={wann === zuLokal(v.iso)} onClick={() => setWann(zuLokal(v.iso))}>
                  {v.label}
                </Chip>
              ))}
            </Flex>
            <Input type="datetime-local" value={wann} onChange={(e) => setWann(e.target.value)} {...adminInputProps} {...dunklesFeld} aria-label="Datum und Uhrzeit" />
          </Box>
        ) : null}
      </Stack>
    </DialogRahmen>
  );
}
