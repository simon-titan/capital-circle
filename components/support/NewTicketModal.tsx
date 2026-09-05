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
      <Button
        leftIcon={<Plus size={16} />}
        onClick={() => setOpen(true)}
        bg="linear-gradient(135deg, #D4AF37 0%, #A67C00 100%)"
        color="#0a0a0a"
        className="inter-semibold"
        _hover={{ filter: "brightness(1.08)", boxShadow: "0 0 24px rgba(212,175,55,0.35)" }}
        borderRadius="10px"
      >
        Neues Ticket
      </Button>

      <Modal isOpen={open} onClose={() => setOpen(false)} isCentered size="lg">
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg="#0C0D10" border="1px solid rgba(255,255,255,0.10)" borderRadius="16px">
          <ModalHeader className="radley-regular" fontWeight={400} color="var(--color-text-primary)">
            Neues Support-Ticket
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel color="var(--color-text-secondary)">Betreff</FormLabel>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Kurze Zusammenfassung deines Anliegens"
                />
              </FormControl>
              <FormControl>
                <FormLabel color="var(--color-text-secondary)">Kategorie</FormLabel>
                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel color="var(--color-text-secondary)">Nachricht</FormLabel>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Beschreibe dein Anliegen so genau wie möglich."
                  rows={6}
                />
              </FormControl>
              <Text fontSize="xs" color="var(--color-text-tertiary)">
                Unser Team meldet sich so schnell wie möglich direkt im Ticket.
              </Text>
            </Stack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => void submit()}
              isLoading={submitting}
              isDisabled={subject.trim().length < 3 || message.trim().length < 5}
              bg="linear-gradient(135deg, #D4AF37 0%, #A67C00 100%)"
              color="#0a0a0a"
              className="inter-semibold"
              _hover={{ filter: "brightness(1.08)" }}
            >
              Ticket senden
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
