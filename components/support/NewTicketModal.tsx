"use client";

import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
  Text,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_LABELS, CATEGORY_OPTIONS } from "@/lib/support/shared";

/** Eingabefelder im Modal: Haarlinie, beim Hover Gold-Kante, Fokus in Gold. */
const FIELD_SX = {
  bg: "rgba(255, 255, 255, 0.03)",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  color: "var(--cc-text)",
  _placeholder: { color: "var(--cc-text-3)" },
  _hover: { borderColor: "rgba(212, 176, 128, 0.4)" },
  _focusVisible: { borderColor: "var(--cc-gold)", boxShadow: "0 0 0 1px var(--cc-gold)" },
};

const LABEL_PROPS = { fontSize: "14px", fontWeight: 500, color: "var(--cc-text-2)", mb: 1.5 } as const;

export function NewTicketModal() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("technical");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setSubject("");
    setCategory("technical");
    setMessage("");
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, category, message }),
      });
      const json = (await res.json()) as { ok?: boolean; ticket?: { id: string }; error?: string };
      if (!res.ok || !json.ok || !json.ticket) {
        toast({ title: "Ticket konnte nicht erstellt werden", description: json.error, status: "error", duration: 4000 });
        return;
      }
      toast({ title: "Ticket erstellt", status: "success", duration: 2500 });
      reset();
      setOpen(false);
      router.push(`/support/${json.ticket.id}`);
      router.refresh();
    } catch {
      toast({ title: "Netzwerkfehler", description: "Bitte versuche es erneut.", status: "error", duration: 4000 });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button leftIcon={<Plus size={16} aria-hidden />} onClick={() => setOpen(true)} variant="gold">
        Neues Ticket
      </Button>

      <Modal isOpen={open} onClose={() => setOpen(false)} isCentered size="lg" scrollBehavior="inside">
        <ModalOverlay bg="rgba(5, 7, 10, 0.72)" backdropFilter="blur(6px)" />
        {/* Das Modal rendert im Portal außerhalb der Shell — `data-platform` holt die Plattform-Stile hinein. */}
        <ModalContent
          data-platform
          bg="var(--cc-panel-solid)"
          border="1px solid var(--cc-gold-line)"
          borderRadius="12px"
          boxShadow="0 24px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(212, 176, 128, 0.08)"
          mx={4}
        >
          <ModalHeader fontSize="18px" fontWeight={600} letterSpacing="-0.01em" color="var(--cc-text)" pr={12}>
            Neues Support-Ticket
          </ModalHeader>
          <ModalCloseButton color="var(--cc-text-2)" _hover={{ color: "var(--cc-text)", bg: "rgba(255, 255, 255, 0.06)" }} />
          <ModalBody>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel {...LABEL_PROPS}>Betreff</FormLabel>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Kurze Zusammenfassung deines Anliegens"
                  sx={FIELD_SX}
                />
              </FormControl>
              <FormControl>
                <FormLabel {...LABEL_PROPS}>Kategorie</FormLabel>
                <Select value={category} onChange={(e) => setCategory(e.target.value)} sx={FIELD_SX}>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c} style={{ background: "var(--cc-panel-solid)" }}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel {...LABEL_PROPS}>Nachricht</FormLabel>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Beschreibe dein Anliegen so genau wie möglich."
                  rows={6}
                  sx={FIELD_SX}
                />
              </FormControl>
              <Text fontSize="13px" color="var(--cc-text-3)">
                Unser Team meldet sich so schnell wie möglich direkt im Ticket.
              </Text>
            </Stack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="line" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button
              variant="gold"
              onClick={() => void submit()}
              isLoading={submitting}
              isDisabled={subject.trim().length < 3 || message.trim().length < 5}
            >
              Ticket senden
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
