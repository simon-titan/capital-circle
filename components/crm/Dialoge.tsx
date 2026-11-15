"use client";

import { Box, Button, Flex, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Stack, Text, Textarea } from "@chakra-ui/react";
import { Check } from "lucide-react";
import { useState, type ReactNode } from "react";
import { adminInputProps, adminModalHeaderProps, adminModalProps, adminOverlayProps } from "@/components/admin/adminUi";
import type { TeamMitglied } from "@/lib/crm/zuweisung";
import { Avatar, Chip, Feldlabel } from "./ui";

/**
 * Dialoge des CRM — ersetzen `window.prompt`/`confirm`, die auf dem Handy
 * hässlich sind, sich nicht gestalten lassen und Eingaben bei einem Fehltipp
 * verlieren. Einheitlich: Graphit-Panel mit Gold-Haarlinie, Vorschläge als
 * Chips, Hauptaktion in Gold rechts unten.
 */

type Basis = { offen: boolean; onAbbrechen: () => void };

/** Gemeinsamer Rahmen: Titel, optionaler Untertitel, Inhalt, Abbrechen + Hauptaktion. */
export function DialogRahmen({
  offen,
  onAbbrechen,
  titel,
  unter,
  children,
  knopf,
  knopfAus = false,
  laeuft = false,
  onKnopf,
  groesse = "md",
}: Basis & {
  titel: string;
  unter?: string;
  children: ReactNode;
  knopf: string;
  knopfAus?: boolean;
  laeuft?: boolean;
  onKnopf: () => void;
  groesse?: "md" | "lg";
}) {
  return (
    <Modal isOpen={offen} onClose={onAbbrechen} isCentered size={groesse} scrollBehavior="inside">
      <ModalOverlay {...adminOverlayProps} backdropFilter="blur(2px)" />
      <ModalContent {...adminModalProps} mx={3} data-crm>
        <ModalHeader {...adminModalHeaderProps} pb={unter ? 1 : 3} pr={12}>
          {titel}
          {unter ? (
            <Text fontSize="13px" fontWeight={400} color="var(--cc-text-2)" mt={1}>
              {unter}
            </Text>
          ) : null}
        </ModalHeader>
        <ModalCloseButton color="var(--cc-text-3)" top={4} right={4} _hover={{ color: "var(--cc-text)", bg: "rgba(255,255,255,0.05)" }} />
        <ModalBody pt={2}>{children}</ModalBody>
        <ModalFooter gap={2} borderTop="1px solid var(--cc-line)" mt={2}>
          <Button variant="line" size="sm" onClick={onAbbrechen}>
            Abbrechen
          </Button>
          <Button variant="gold" size="sm" isDisabled={knopfAus} isLoading={laeuft} onClick={onKnopf}>
            {knopf}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/** Ein Pflichttext mit Vorschlägen (Grund der Pause, nächster Schritt …). */
export function TextDialog({
  offen,
  onAbbrechen,
  titel,
  beschreibung,
  label,
  vorschlaege = [],
  knopf = "Speichern",
  onBestaetigen,
}: Basis & {
  titel: string;
  beschreibung?: string;
  label: string;
  vorschlaege?: string[];
  knopf?: string;
  onBestaetigen: (text: string) => Promise<void> | void;
}) {
  const [text, setText] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const schliessen = () => {
    setText("");
    onAbbrechen();
  };
  return (
    <DialogRahmen
      offen={offen}
      onAbbrechen={schliessen}
      titel={titel}
      unter={beschreibung}
      knopf={knopf}
      knopfAus={!text.trim()}
      laeuft={laeuft}
      onKnopf={async () => {
        setLaeuft(true);
        try {
          await onBestaetigen(text.trim());
          setText("");
        } finally {
          setLaeuft(false);
        }
      }}
    >
      <Stack gap={3}>
        {vorschlaege.length ? (
          <Flex wrap="wrap" gap={1.5}>
            {vorschlaege.map((v) => (
              <Chip key={v} aktiv={text === v} onClick={() => setText(v)}>
                {v}
              </Chip>
            ))}
          </Flex>
        ) : null}
        <Box>
          <Feldlabel>{label}</Feldlabel>
          <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} autoFocus {...adminInputProps} />
        </Box>
      </Stack>
    </DialogRahmen>
  );
}

const WECHSEL_GRUENDE = ["Call-Block", "Übernommen aus dem Pool", "Urlaub/Krankheit", "Kunde wünscht anderen Closer", "Auslastung"];

/**
 * Closer wechseln: Ziel und Pflichtgrund (Tracking-Playbook 9.4) in einem Schritt.
 * `aktuell === undefined` heißt Mehrfachauswahl (Liste) — dann ist jedes Ziel wählbar.
 */
export function CloserDialog({
  offen,
  onAbbrechen,
  team,
  aktuell,
  anzahl = 1,
  onBestaetigen,
}: Basis & {
  team: TeamMitglied[];
  aktuell: string | null | undefined;
  anzahl?: number;
  onBestaetigen: (closerId: string | null, grund: string) => Promise<void> | void;
}) {
  const [ziel, setZiel] = useState<string>("");
  const [grund, setGrund] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const zielId = ziel === "pool" ? null : ziel;
  const ok = Boolean(ziel) && (aktuell === undefined || zielId !== aktuell) && Boolean(grund.trim());
  const schliessen = () => {
    setZiel("");
    setGrund("");
    onAbbrechen();
  };
  const optionen = [
    ...team.filter((t) => t.aktiv && t.user_id !== aktuell).map((t) => ({ id: t.user_id, name: t.name, unter: t.block_von && t.block_bis ? `Call-Block ${t.block_von.slice(0, 5)}–${t.block_bis.slice(0, 5)} Uhr` : "Kein Call-Block" })),
    ...(aktuell !== null ? [{ id: "pool", name: "Pool", unter: "Niemandem zugewiesen — wer zuerst anruft, übernimmt" }] : []),
  ];
  return (
    <DialogRahmen
      offen={offen}
      onAbbrechen={schliessen}
      titel={anzahl > 1 ? `${anzahl} Kontakte zuweisen` : "Closer wechseln"}
      unter="Ein schon erfolgter Kauf bleibt dem Closer gutgeschrieben, der ihn abgeschlossen hat."
      knopf={anzahl > 1 ? "Zuweisen" : "Wechseln"}
      knopfAus={!ok}
      laeuft={laeuft}
      onKnopf={async () => {
        setLaeuft(true);
        try {
          await onBestaetigen(zielId, grund.trim());
          setZiel("");
          setGrund("");
        } finally {
          setLaeuft(false);
        }
      }}
    >
      <Stack gap={4}>
        <Box>
          <Feldlabel>An wen?</Feldlabel>
          <Stack gap={1.5} role="radiogroup">
            {optionen.map((o) => {
              const an = ziel === o.id;
              return (
                <Flex
                  key={o.id}
                  as="button"
                  type="button"
                  role="radio"
                  aria-checked={an}
                  onClick={() => setZiel(o.id)}
                  align="center"
                  gap={3}
                  px={3}
                  py={2.5}
                  borderRadius="10px"
                  border="1px solid"
                  borderColor={an ? "var(--cc-gold-line)" : "var(--cc-line)"}
                  bg={an ? "var(--cc-gold-wash)" : "rgba(255,255,255,0.02)"}
                  textAlign="left"
                  _hover={an ? undefined : { borderColor: "var(--cc-line-strong)", bg: "rgba(255,255,255,0.04)" }}
                >
                  <Avatar name={o.id === "pool" ? null : o.name} groesse={30} gold={an} />
                  <Box flex="1">
                    <Text fontSize="14px" fontWeight={500} color={an ? "var(--cc-gold-light)" : "var(--cc-text)"}>
                      {o.name}
                    </Text>
                    <Text fontSize="12px" color="var(--cc-text-3)">
                      {o.unter}
                    </Text>
                  </Box>
                  {an ? <Check size={16} color="var(--cc-gold-light)" /> : null}
                </Flex>
              );
            })}
          </Stack>
        </Box>
        <Box>
          <Feldlabel>Grund (Pflicht)</Feldlabel>
          <Flex wrap="wrap" gap={1.5} mb={2}>
            {WECHSEL_GRUENDE.map((v) => (
              <Chip key={v} klein aktiv={grund === v} onClick={() => setGrund(v)}>
                {v}
              </Chip>
            ))}
          </Flex>
          <Textarea rows={2} placeholder="Oder eigenen Grund schreiben" value={grund} onChange={(e) => setGrund(e.target.value)} {...adminInputProps} />
        </Box>
      </Stack>
    </DialogRahmen>
  );
}

/** Ja/Nein mit Erklärung (No-Show bestätigen, Termin absagen). */
export function BestaetigenDialog({
  offen,
  onAbbrechen,
  titel,
  text,
  knopf,
  onBestaetigen,
}: Basis & { titel: string; text: string; knopf: string; onBestaetigen: () => Promise<void> | void }) {
  const [laeuft, setLaeuft] = useState(false);
  return (
    <DialogRahmen
      offen={offen}
      onAbbrechen={onAbbrechen}
      titel={titel}
      knopf={knopf}
      laeuft={laeuft}
      onKnopf={async () => {
        setLaeuft(true);
        try {
          await onBestaetigen();
        } finally {
          setLaeuft(false);
        }
      }}
    >
      <Text fontSize="14px" color="var(--cc-text-2)">
        {text}
      </Text>
    </DialogRahmen>
  );
}
