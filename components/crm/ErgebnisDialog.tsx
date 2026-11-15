"use client";

import { Box, Flex, Input, Stack, Text, Textarea } from "@chakra-ui/react";
import { useState } from "react";
import { adminInputProps } from "@/components/admin/adminUi";
import {
  CALL_GRUENDE,
  CALL_OUTCOMES,
  CALL_PRODUKTE,
  OUTCOME_ZU_PHASE,
  followUpPflicht,
  grundPflicht,
  phaseLabel,
  type CallGrund,
  type CallOutcome,
  type CallProdukt,
} from "@/config/crm";
import { wiedervorlageVorschlaege } from "@/lib/crm/anzeige";
import type { ErgebnisZeile } from "@/lib/crm/ergebnis";
import { DialogRahmen } from "./Dialoge";
import { useJetzt } from "./gemeinsam";
import { zuLokal } from "./PhaseDialog";
import { Chip, Feldlabel, dunklesFeld } from "./ui";

export type ErgebnisWerte = { outcome: CallOutcome; produkt: CallProdukt; grund: CallGrund | null; notiz: string | null; followUpAm: string | null };

/**
 * Ergebnis-Maske nach dem Gespräch (Tracking-Playbook 9.2). Öffnet sich beim
 * Klick auf „Geführt" und zum Nachtragen/Ändern. Pflicht: Ergebnis, Produkt,
 * Grund (bei verloren, nicht qualifiziert, offen), Follow-up (bei offen und
 * Zusage ohne Zahlung). Nach einem geführten Call gehen keine automatischen
 * Verkaufsmails raus — nachgefasst wird persönlich per WhatsApp oder Telefon.
 */
export function ErgebnisDialog({
  offen,
  titel,
  vorher,
  mitNoShow,
  onAbbrechen,
  onSpeichern,
}: {
  offen: boolean;
  titel: string;
  vorher: ErgebnisZeile | null;
  /** „Nicht erschienen" anbieten (nur beim ersten Erfassen aus einem gebuchten Termin). */
  mitNoShow: boolean;
  onAbbrechen: () => void;
  onSpeichern: (w: ErgebnisWerte) => Promise<string | null>;
}) {
  const [outcome, setOutcome] = useState<CallOutcome | "">(vorher?.outcome ?? "");
  const [produkt, setProdukt] = useState<CallProdukt | "">(vorher?.produkt ?? "");
  const [grund, setGrund] = useState<CallGrund | "">(vorher?.grund ?? "");
  const [notiz, setNotiz] = useState(vorher?.notiz ?? "");
  const [follow, setFollow] = useState(zuLokal(vorher?.follow_up_am));
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const jetzt = useJetzt();

  const o = outcome || null;
  const brauchtGrund = o ? grundPflicht(o) : false;
  const brauchtFollow = o ? followUpPflicht(o) : false;
  const ohneProdukt = o === "no_show";
  const mitFollow = !ohneProdukt && o !== "lost" && o !== "unqualified";
  const ok = Boolean(o) && (ohneProdukt || Boolean(produkt)) && (!brauchtGrund || Boolean(grund)) && (!brauchtFollow || Boolean(follow));

  const speichern = async () => {
    if (!o) return;
    setLaeuft(true);
    setFehler(null);
    const err = await onSpeichern({
      outcome: o,
      produkt: ohneProdukt ? "none" : (produkt as CallProdukt),
      grund: ohneProdukt ? null : (grund as CallGrund) || null,
      notiz: notiz.trim() || null,
      followUpAm: follow && mitFollow ? new Date(follow).toISOString() : null,
    });
    setLaeuft(false);
    if (err) setFehler(FEHLER[err] ?? `Nicht gespeichert: ${err}`);
  };

  return (
    <DialogRahmen
      offen={offen}
      onAbbrechen={onAbbrechen}
      titel={titel}
      unter="Nach dem Gespräch gehen keine automatischen Verkaufsmails raus. Nachfassen persönlich per WhatsApp oder Telefon."
      knopf="Ergebnis speichern"
      knopfAus={!ok}
      laeuft={laeuft}
      onKnopf={() => void speichern()}
      groesse="lg"
    >
      <Stack gap={5}>
        <Box>
          <Feldlabel>Wie ist das Gespräch ausgegangen?</Feldlabel>
          <Flex wrap="wrap" gap={1.5}>
            {CALL_OUTCOMES.filter((x) => mitNoShow || x.id !== "no_show").map((x) => (
              <Chip key={x.id} aktiv={outcome === x.id} ton={x.id === "lost" || x.id === "no_show" ? "danger" : undefined} onClick={() => setOutcome(x.id)}>
                {x.label}
              </Chip>
            ))}
          </Flex>
          {o ? (
            <Text fontSize="12px" color="var(--cc-text-3)" mt={2}>
              Phase im CRM danach:{" "}
              <Text as="span" color="var(--cc-text-2)">
                {phaseLabel[OUTCOME_ZU_PHASE[o]]}
              </Text>
            </Text>
          ) : null}
        </Box>
        {!ohneProdukt ? (
          <Box>
            <Feldlabel>Besprochenes Produkt</Feldlabel>
            <Flex wrap="wrap" gap={1.5}>
              {CALL_PRODUKTE.map((x) => (
                <Chip key={x.id} aktiv={produkt === x.id} onClick={() => setProdukt(x.id)}>
                  {x.label}
                </Chip>
              ))}
            </Flex>
          </Box>
        ) : null}
        {!ohneProdukt ? (
          <Box>
            <Feldlabel>{`Grund${brauchtGrund ? "" : " (optional)"}`}</Feldlabel>
            <Flex wrap="wrap" gap={1.5}>
              {CALL_GRUENDE.map((x) => (
                <Chip key={x.id} klein aktiv={grund === x.id} onClick={() => setGrund(grund === x.id ? "" : x.id)}>
                  {x.label}
                </Chip>
              ))}
            </Flex>
          </Box>
        ) : null}
        {mitFollow ? (
          <Box>
            <Feldlabel>{`Nächstes Follow-up${brauchtFollow ? "" : " (optional)"}`}</Feldlabel>
            <Flex wrap="wrap" gap={1.5} mb={2}>
              {wiedervorlageVorschlaege(jetzt).map((v) => (
                <Chip key={v.label} klein aktiv={follow === zuLokal(v.iso)} onClick={() => setFollow(zuLokal(v.iso))}>
                  {v.label}
                </Chip>
              ))}
            </Flex>
            <Input type="datetime-local" value={follow} onChange={(e) => setFollow(e.target.value)} {...adminInputProps} {...dunklesFeld} aria-label="Follow-up Datum und Uhrzeit" />
          </Box>
        ) : null}
        <Box>
          <Feldlabel>Notiz (optional, nur intern)</Feldlabel>
          <Textarea rows={3} value={notiz} onChange={(e) => setNotiz(e.target.value)} {...adminInputProps} />
        </Box>
        {fehler ? (
          <Text fontSize="13px" color="var(--cc-danger)">
            {fehler}
          </Text>
        ) : null}
      </Stack>
    </DialogRahmen>
  );
}

const FEHLER: Record<string, string> = {
  follow_up: "Bitte ein Follow-up setzen.",
  follow_up_vergangen: "Das Follow-up liegt in der Vergangenheit.",
  grund: "Bitte einen Grund wählen.",
  produkt: "Bitte ein Produkt wählen.",
  noch_nicht_begonnen: "Der Termin hat noch nicht begonnen.",
  status: "Der Termin hat schon einen anderen Status.",
};
