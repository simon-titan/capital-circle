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
      <ModalOverlay bg="rgba(0,0,0,0.75)" backdropFilter="blur(4px)" />
      <ModalContent
        bg="rgba(10, 11, 14, 0.96)"
        border="1px solid rgba(255,255,255,0.09)"
        borderRadius="24px"
        boxShadow="0 32px 80px rgba(0,0,0,0.9)"
      >
        <ModalHeader className="inter-semibold" fontSize="md">
          Journale verwalten
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Stack gap={3}>
            {journals.map((j) => (
              <Stack key={j.id} direction="row" justify="space-between" align="center" py={2} borderBottom="1px solid rgba(255,255,255,0.06)">
                <Text
                  as="button"
                  type="button"
                  fontWeight={600}
                  fontSize="sm"
                  color={j.id === currentId ? "var(--color-accent-gold)" : "var(--color-text-primary)"}
                  className="inter-medium"
                  onClick={() => {
                    onSelect(j.id);
                  }}
                  textAlign="left"
                >
                  {j.name}
                </Text>
                <Stack direction="row" gap={2}>
                  <Button size="xs" variant="ghost" onClick={() => void renameJournal(j.id, j.name)} isDisabled={busy}>
                    Umbenennen
                  </Button>
                  {journals.length > 1 ? (
                    <Button size="xs" variant="outline" colorScheme="red" onClick={() => void deleteJournal(j.id)} isDisabled={busy}>
                      Löschen
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
            ))}
            <Stack direction="row" gap={2} pt={2}>
              <Input
                placeholder="Neues Journal..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void addJournal()}
                bg="rgba(255,255,255,0.04)"
                borderColor="rgba(255,255,255,0.09)"
                _focus={{ borderColor: "rgba(212, 175, 55, 0.55)" }}
              />
              <Button size="md" onClick={() => void addJournal()} isLoading={busy} colorScheme="yellow">
                + Hinzufügen
              </Button>
            </Stack>
            <Button variant="outline" borderColor="rgba(255,255,255,0.12)" onClick={onClose}>
              Schließen
            </Button>
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
