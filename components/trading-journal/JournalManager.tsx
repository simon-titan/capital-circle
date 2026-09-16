"use client";

import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type JournalRow = { id: string; name: string; created_at: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  journals: JournalRow[];
  currentId: string;
  onChanged: () => void;
  onSelect: (id: string) => void;
};

const inputSx = {
  bg: "rgba(255, 255, 255, 0.03)",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  _hover: { borderColor: "var(--cc-gold-line)" },
  _focusVisible: { borderColor: "var(--cc-gold)", boxShadow: "0 0 0 1px var(--cc-gold)" },
};

/** Destruktive Aktion: Line-Button in Rot statt Gold-Kante. */
const dangerLineSx = {
  variant: "line" as const,
  color: "var(--cc-danger)",
  borderColor: "rgba(248, 113, 113, 0.35)",
  _hover: { bg: "rgba(248, 113, 113, 0.08)", borderColor: "rgba(248, 113, 113, 0.6)", boxShadow: "none" },
  _active: { bg: "rgba(248, 113, 113, 0.12)" },
};

export function JournalManager({ isOpen, onClose, journals, currentId, onChanged, onSelect }: Props) {
  const supabase = createClient();
  const toast = useToast();
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const addJournal = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setBusy(false);
      return;
    }
    const { data, error } = await supabase
      .from("trading_journals")
      .insert({ user_id: u.user.id, name })
      .select("id")
      .single();
    setBusy(false);
    if (error) {
      toast({ title: "Konnte Journal nicht anlegen", description: error.message, status: "error" });
      return;
    }
    setNewName("");
    onChanged();
    if (data?.id) onSelect(data.id);
  };

  const renameJournal = async (id: string, name: string) => {
    const next = window.prompt("Neuer Name:", name)?.trim();
    if (!next) return;
    setBusy(true);
    const { error } = await supabase.from("trading_journals").update({ name: next }).eq("id", id);
    setBusy(false);
    if (error) {
      toast({ title: "Umbenennen fehlgeschlagen", description: error.message, status: "error" });
      return;
    }
    onChanged();
  };

  const deleteJournal = async (id: string) => {
    if (journals.length <= 1) return;
    if (!window.confirm("Journal löschen? Alle Trades darin werden gelöscht.")) return;
    setBusy(true);
    const { error } = await supabase.from("trading_journals").delete().eq("id", id);
    setBusy(false);
    if (error) {
      toast({ title: "Löschen fehlgeschlagen", description: error.message, status: "error" });
      return;
    }
    const next = journals.find((j) => j.id !== id);
    if (next) onSelect(next.id);
    onChanged();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay bg="rgba(5, 7, 10, 0.7)" backdropFilter="blur(6px)" />
      <ModalContent
        bg="var(--cc-panel-solid)"
        border="1px solid var(--cc-gold-line)"
        borderRadius="14px"
        boxShadow="0 24px 64px rgba(0, 0, 0, 0.6), 0 0 32px rgba(212, 176, 128, 0.08)"
        color="var(--cc-text)"
      >
        <ModalHeader fontSize="17px" fontWeight={600} color="var(--cc-text)">
          Journale verwalten
        </ModalHeader>
        <ModalCloseButton color="var(--cc-text-2)" _hover={{ color: "var(--cc-text)", bg: "rgba(255, 255, 255, 0.05)" }} />
        <ModalBody pb={6}>
          <Stack gap={3}>
            {journals.map((j) => {
              const active = j.id === currentId;
              return (
                <Stack
                  key={j.id}
                  direction="row"
                  justify="space-between"
                  align="center"
                  py={2}
                  borderBottom="1px solid var(--cc-line)"
                >
                  <Text
                    as="button"
                    type="button"
                    fontWeight={active ? 600 : 500}
                    fontSize="sm"
                    color={active ? "var(--cc-gold-light)" : "var(--cc-text)"}
                    _hover={{ color: "var(--cc-gold-light)" }}
                    transition="color 150ms var(--cc-ease)"
                    onClick={() => {
                      onSelect(j.id);
                    }}
                    textAlign="left"
                  >
                    {j.name}
                  </Text>
                  <Stack direction="row" gap={2}>
                    <Button size="xs" variant="line" onClick={() => void renameJournal(j.id, j.name)} isDisabled={busy}>
                      Umbenennen
                    </Button>
                    {journals.length > 1 ? (
                      <Button size="xs" {...dangerLineSx} onClick={() => void deleteJournal(j.id)} isDisabled={busy}>
                        Löschen
                      </Button>
                    ) : null}
                  </Stack>
                </Stack>
              );
            })}
            <Stack direction="row" gap={2} pt={2}>
              <Input
                placeholder="Neues Journal..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void addJournal()}
                {...inputSx}
              />
              <Button size="md" variant="gold" flexShrink={0} onClick={() => void addJournal()} isLoading={busy}>
                + Hinzufügen
              </Button>
            </Stack>
            <Button variant="line" onClick={onClose}>
              Schließen
            </Button>
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
