"use client";

import {
  Box,
  Button,
  Checkbox,
  Heading,
  HStack,
  IconButton,
  Input,
  Link as ChakraLink,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Textarea,
  Text,
  useDisclosure,
  VStack,
} from "@chakra-ui/react";
import { GlassCard } from "@/components/ui/GlassCard";
import type { HomeworkCustomTaskRow, HomeworkRow } from "@/lib/server-data";
import { CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type HomeworkCardProps = {
  homework: HomeworkRow | null;
  initialOfficialDone: boolean;
  initialCustomTasks: HomeworkCustomTaskRow[];
  spotlight?: boolean;
};

const kicker = {
  className: "inter-medium",
  fontSize: "xs",
  letterSpacing: "0.14em",
  textTransform: "uppercase" as const,
  color: "rgba(255, 255, 255, 0.5)",
};

function dueStatus(due: string | null): "overdue" | "soon" | "ok" | "none" {
  if (!due) return "none";
  const d = new Date(due + (due.includes("T") ? "" : "T12:00:00"));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return "overdue";
  if (diff <= 3) return "soon";
  return "ok";
}

export function HomeworkCard({
  homework,
  initialOfficialDone,
  initialCustomTasks,
  spotlight = true,
}: HomeworkCardProps) {
  const [officialDone, setOfficialDone] = useState(initialOfficialDone);
  const [customTasks, setCustomTasks] = useState(initialCustomTasks);
  const [busyOfficial, setBusyOfficial] = useState(false);
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [savingNew, setSavingNew] = useState(false);

  const homeworkId = homework?.id ?? null;

  const setOfficial = useCallback(
    async (done: boolean) => {
      if (!homeworkId) return;
      setBusyOfficial(true);
      setOfficialDone(done);
      try {
        const res = await fetch("/api/homework-user/official", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ homeworkId, done }),
        });
        const json = (await res.json()) as { ok?: boolean };
        if (!json.ok) setOfficialDone(!done);
      } catch {
        setOfficialDone(!done);
      } finally {
        setBusyOfficial(false);
      }
    },
    [homeworkId],
  );

  const toggleCustom = useCallback(async (id: string, done: boolean) => {
    setBusyIds((s) => ({ ...s, [id]: true }));
    setCustomTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done } : t)));
    try {
      const res = await fetch(`/api/homework-user/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done }),
      });
      const json = (await res.json()) as { ok?: boolean; task?: HomeworkCustomTaskRow };
      if (!json.ok || !json.task) {
        setCustomTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !done } : t)));
      } else {
        setCustomTasks((prev) => prev.map((t) => (t.id === id ? json.task! : t)));
      }
    } catch {
      setCustomTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !done } : t)));
    } finally {
      setBusyIds((s) => {
        const n = { ...s };
        delete n[id];
        return n;
      });
    }
  }, []);

  const removeCustom = useCallback(async (id: string) => {
    setBusyIds((s) => ({ ...s, [id]: true }));
    try {
      const res = await fetch(`/api/homework-user/tasks/${id}`, { method: "DELETE" });
      const json = (await res.json()) as { ok?: boolean };
      if (json.ok) setCustomTasks((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setBusyIds((s) => {
        const n = { ...s };
        delete n[id];
        return n;
      });
    }
  }, []);

  const submitNewTask = useCallback(async () => {
    const t = newTitle.trim();
    if (t.length < 1) return;
    setModalError(null);
    setSavingNew(true);
    try {
      const res = await fetch("/api/homework-user/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeworkId, title: t, notes: newNotes.trim() || null }),
      });
      const json = (await res.json()) as { ok?: boolean; task?: HomeworkCustomTaskRow; error?: string };
      if (json.ok && json.task) {
        setCustomTasks((prev) => [...prev, json.task!]);
        setNewTitle("");
        setNewNotes("");
        setModalError(null);
        onClose();
      } else {
        setModalError(json.error || "Aufgabe konnte nicht erstellt werden.");
      }
    } catch {
      setModalError("Aufgabe konnte nicht erstellt werden.");
    } finally {
      setSavingNew(false);
    }
  }, [newTitle, newNotes, homeworkId, onClose]);

  const hasContent = Boolean(homework) || customTasks.length > 0;
  const customDoneCount = customTasks.filter((task) => task.done).length;
  const allCustomDone = customTasks.length > 0 && customDoneCount === customTasks.length;
  const weekGoalReached = officialDone || allCustomDone;
  const sliderItems: Array<{ kind: "official"; id: string } | { kind: "custom"; id: string }> = [
    ...(homework ? [{ kind: "official" as const, id: homework.id }] : []),
    ...customTasks.map((task) => ({ kind: "custom" as const, id: task.id })),
  ];
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  useEffect(() => {
    if (sliderItems.length === 0) {
      setActiveSlideIndex(0);
      return;
    }
    if (activeSlideIndex > sliderItems.length - 1) {
      setActiveSlideIndex(sliderItems.length - 1);
    }
  }, [activeSlideIndex, sliderItems.length]);

  const activeSlide = sliderItems[activeSlideIndex] ?? null;
  const activeCustomTask =
    activeSlide?.kind === "custom" ? customTasks.find((task) => task.id === activeSlide.id) ?? null : null;
  const due = homework?.due_date ?? null;
  const status = dueStatus(due);
  const dueDate = due ? new Date(due + (due.includes("T") ? "" : "T12:00:00")) : null;
  const dayNum = dueDate ? dueDate.toLocaleDateString("de-DE", { day: "2-digit" }) : "—";
  const month = dueDate ? dueDate.toLocaleDateString("de-DE", { month: "short" }) : "";
  const weekday = dueDate ? dueDate.toLocaleDateString("de-DE", { weekday: "long" }) : "Termin offen";

  const badgeColor =
    status === "overdue"
      ? "#fca5a5"
      : status === "soon"
        ? "var(--color-accent-gold-light)"
        : "rgba(245, 236, 210, 0.85)";
  const badgeBg =
    status === "overdue"
      ? "rgba(239, 68, 68, 0.12)"
      : status === "soon"
        ? "rgba(212, 175, 55, 0.12)"
        : "rgba(255,255,255,0.06)";
  const badgeBorder =
    status === "overdue"
      ? "rgba(248, 113, 113, 0.35)"
      : status === "soon"
        ? "rgba(212, 175, 55, 0.38)"
        : "rgba(212, 175, 55, 0.22)";

  return (
    <GlassCard
      dashboard={!spotlight}
      spotlight={spotlight}
      h="100%"
      position="relative"
      overflow="hidden"
    >
      <Box display="flex" alignItems="flex-start" gap={3} mb={{ base: 4, md: 4 }}>
        <Box color="var(--color-accent-gold)" aria-hidden flexShrink={0} mt={0.5}>
          <ClipboardList size={26} strokeWidth={1.7} />
        </Box>
        <Box minW={0}>
          <Text {...kicker} mb={1.5}>
            Wochenaufgabe
          </Text>
          <Heading as="h2" size="md" className="inter-semibold" fontWeight={600} lineHeight="short">
            Hausaufgabe & Checkliste
          </Heading>
          <Text className="radley-regular-italic" fontSize={{ base: "sm", md: "sm" }} color="rgba(245, 236, 210, 0.88)" lineHeight={1.35} mt={2}>
            Erledige die aktuelle Aufgabe und ergänze eigene Schritte.
          </Text>
          <Text className="inter" fontSize="xs" color="var(--color-text-muted)" mt={2} lineHeight="tall">
            Hake ab, was erledigt ist — dein Fortschritt wird gespeichert.
          </Text>
        </Box>
      </Box>

      {!hasContent ? (
        <Box py={6} px={3} textAlign="center" borderRadius="12px" border="1px dashed var(--color-border)" bg="rgba(255,255,255,0.02)">
          <Text className="inter" color="var(--color-text-muted)" fontSize="sm" mb={4}>
            Es gibt keine offizielle Wochenaufgabe. Lege eigene Aufgaben an, die dir helfen, dranzubleiben.
          </Text>
          <Button
            size="sm"
            leftIcon={<Plus size={16} />}
            onClick={onOpen}
            borderRadius="10px"
            bg="linear-gradient(135deg, var(--color-accent-gold-light) 0%, var(--color-accent-gold) 45%, var(--color-accent-gold-dark) 100%)"
            color="#0a0a0a"
            _hover={{ boxShadow: "0 0 20px var(--color-accent-glow)" }}
          >
            Eigene Aufgabe
          </Button>
        </Box>
      ) : (
        <Box
          position="relative"
          overflow="hidden"
          display="flex"
          flexDirection="column"
          p={{ base: 2.5, md: 3 }}
          borderRadius="12px"
          border="1px solid rgba(212, 175, 55, 0.32)"
          bg="linear-gradient(165deg, rgba(212, 175, 55, 0.08) 0%, rgba(8, 8, 8, 0.38) 55%)"
          transition="border-color 0.2s ease"
          _hover={{ borderColor: "rgba(212, 175, 55, 0.55)" }}
        >
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            h="3px"
            bgGradient="linear(to-r, #E8C547, rgba(212, 175, 55, 0.2))"
            pointerEvents="none"
          />

          {weekGoalReached ? (
            <HStack
              spacing={2}
              align="center"
              justify="center"
              mb={3}
              py={2}
              px={3}
              borderRadius="10px"
              bg="rgba(74, 222, 128, 0.14)"
              border="1px solid rgba(74, 222, 128, 0.4)"
            >
              <CheckCircle2 size={16} />
              <Text className="inter-semibold" fontSize="sm" color="rgba(187, 247, 208, 0.95)">
                Stark! Deine Wochenaufgabe ist erledigt.
              </Text>
            </HStack>
          ) : null}

          <Box display="flex" flexDirection="column" alignItems="center" textAlign="center" gap={2.5}>
            {activeSlide?.kind === "official" && homework ? (
              <>
                <HStack
                  spacing={3}
                  py={2}
                  px={3}
                  borderRadius="12px"
                  bg="rgba(212, 175, 55, 0.12)"
                  border="1px solid rgba(212, 175, 55, 0.32)"
                  minW="120px"
                  justify="center"
                >
                  <Text className="jetbrains-mono" fontSize="lg" fontWeight={500} lineHeight={1} color="var(--color-text-primary)">
                    {dayNum}
                  </Text>
                  {month ? (
                    <Text className="inter-medium" fontSize="xs" textTransform="uppercase" letterSpacing="0.14em" color="var(--color-accent-gold-light)">
                      {month}
                    </Text>
                  ) : null}
                </HStack>

                <Text className="inter" fontSize="xs" color="var(--color-text-muted)" textTransform="uppercase" letterSpacing="0.08em">
                  {weekday}
                  {homework.week_number != null ? ` · Woche ${homework.week_number}` : ""}
                </Text>

                <Text as="h3" className="radley-regular" fontSize="md" fontWeight={400} lineHeight="short" noOfLines={3} color="var(--color-text-primary)">
                  {homework.title}
                </Text>

                {homework.description ? (
                  <Text className="inter" fontSize="xs" color="rgba(240, 240, 242, 0.72)" lineHeight="tall" textAlign="center" noOfLines={3}>
                    {homework.description}
                  </Text>
                ) : null}

                {dueDate ? (
                  <HStack spacing={2} flexWrap="wrap" justify="center">
                    <Text
                      className="jetbrains-mono"
                      fontSize="xs"
                      px={2.5}
                      py={1.5}
                      borderRadius="md"
                      bg={badgeBg}
                      color={badgeColor}
                      borderWidth="1px"
                      borderColor={badgeBorder}
                    >
                      Fällig
                    </Text>
                    <Text
                      className="jetbrains-mono"
                      fontSize="xs"
                      px={2.5}
                      py={1.5}
                      borderRadius="md"
                      bg={badgeBg}
                      color={badgeColor}
                      borderWidth="1px"
                      borderColor={badgeBorder}
                    >
                      {status === "overdue" ? "überfällig" : status === "soon" ? "bald fällig" : "im Plan"}
                    </Text>
                  </HStack>
                ) : null}

                <Box w="100%" maxW="420px" textAlign="left" pt={0.5}>
                  <Checkbox
                    isChecked={officialDone}
                    isDisabled={busyOfficial}
                    onChange={(e) => void setOfficial(e.target.checked)}
                    size="md"
                    colorScheme="yellow"
                    className="inter"
                    sx={{
                      ".chakra-checkbox__label": { fontSize: "0.9rem", color: "rgba(245, 236, 210, 0.95)", fontWeight: 500 },
                      ".chakra-checkbox__control": {
                        borderColor: "rgba(212, 175, 55, 0.55)",
                        _checked: {
                          bg: "linear-gradient(135deg, #e8c547 0%, #a67c00 100%)",
                          borderColor: "#e8c547",
                        },
                      },
                    }}
                  >
                    Wochenaufgabe erledigt
                  </Checkbox>
                </Box>
              </>
            ) : null}

            {activeSlide?.kind === "custom" && activeCustomTask ? (
              <>
                <HStack
                  spacing={2}
                  py={2}
                  px={4}
                  borderRadius="12px"
                  bg="rgba(212, 175, 55, 0.14)"
                  border="1px solid rgba(212, 175, 55, 0.38)"
                  justify="center"
                >
                  <Text className="inter-semibold" fontSize="sm" color="var(--color-accent-gold-light)" letterSpacing="0.06em">
                    Eigene Aufgabe
                  </Text>
                </HStack>
                <Text className="inter" fontSize="xs" color="var(--color-text-muted)" textTransform="uppercase" letterSpacing="0.08em">
                  Persönliche Checkliste
                </Text>
                <HStack align="flex-start" spacing={2} w="100%" maxW="420px">
                  <Checkbox
                    isChecked={activeCustomTask.done}
                    isDisabled={Boolean(busyIds[activeCustomTask.id])}
                    onChange={(e) => void toggleCustom(activeCustomTask.id, e.target.checked)}
                    mt={1}
                    colorScheme="yellow"
                    sx={{
                      ".chakra-checkbox__control": {
                        borderColor: "rgba(212, 175, 55, 0.45)",
                        _checked: {
                          bg: "linear-gradient(135deg, #e8c547 0%, #a67c00 100%)",
                          borderColor: "#e8c547",
                        },
                      },
                    }}
                  />
                  <Box flex="1" textAlign="left" pt={0.5}>
                    <Text
                      className="inter-semibold"
                      fontSize="sm"
                      color={activeCustomTask.done ? "rgba(245, 236, 210, 0.45)" : "rgba(245, 236, 210, 0.92)"}
                      textDecoration={activeCustomTask.done ? "line-through" : undefined}
                      noOfLines={2}
                    >
                      {activeCustomTask.title}
                    </Text>
                    {activeCustomTask.notes ? (
                      <Text className="inter" fontSize="xs" color="rgba(245, 236, 210, 0.62)" mt={0.5} noOfLines={3}>
                        {activeCustomTask.notes}
                      </Text>
                    ) : null}
                  </Box>
                  <IconButton
                    aria-label="Aufgabe entfernen"
                    icon={<Trash2 size={16} />}
                    size="xs"
                    variant="ghost"
                    color="rgba(255,255,255,0.35)"
                    _hover={{ color: "#fca5a5", bg: "rgba(239,68,68,0.12)" }}
                    isDisabled={Boolean(busyIds[activeCustomTask.id])}
                    onClick={() => void removeCustom(activeCustomTask.id)}
                  />
                </HStack>
              </>
            ) : null}

            {sliderItems.length > 1 ? (
              <HStack justify="space-between" align="center" w="100%" maxW="420px" pt={1}>
                <IconButton
                  aria-label="Vorherige Aufgabe"
                  icon={<ChevronLeft size={16} />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setActiveSlideIndex((prev) => (prev - 1 + sliderItems.length) % sliderItems.length)}
                />
                <Text className="jetbrains-mono" fontSize="xs" color="var(--color-text-muted)">
                  {activeSlideIndex + 1}/{sliderItems.length}
                </Text>
                <IconButton
                  aria-label="Nächste Aufgabe"
                  icon={<ChevronRight size={16} />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setActiveSlideIndex((prev) => (prev + 1) % sliderItems.length)}
                />
              </HStack>
            ) : null}

            {customTasks.length > 0 ? (
              <Text className="jetbrains-mono" fontSize="xs" color={allCustomDone ? "rgba(187, 247, 208, 0.95)" : "rgba(255,255,255,0.5)"}>
                Eigene Aufgaben: {customDoneCount}/{customTasks.length} erledigt
              </Text>
            ) : null}

            <HStack spacing={3} flexWrap="wrap" justify="center" pt={2.5} w="100%">
              {homework?.link ? (
                <Button
                  as={ChakraLink}
                  href={homework.link}
                  isExternal
                  size="sm"
                  borderRadius="10px"
                  className="inter-semibold"
                  bg="linear-gradient(135deg, var(--color-accent-gold-light) 0%, var(--color-accent-gold) 45%, var(--color-accent-gold-dark) 100%)"
                  color="#0a0a0a"
                  _hover={{ boxShadow: "0 0 20px var(--color-accent-glow)" }}
                >
                  {homework.link_label || "Zur Aufgabe"}
                </Button>
              ) : null}
              <Button
                size="sm"
                leftIcon={<Plus size={16} />}
                onClick={onOpen}
                borderRadius="10px"
                variant="outline"
                borderColor="rgba(212, 175, 55, 0.45)"
                color="var(--color-accent-gold-light)"
                _hover={{ bg: "rgba(212, 175, 55, 0.12)" }}
              >
                Eigene Aufgabe
              </Button>
            </HStack>
          </Box>
        </Box>
      )}

      <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
        <ModalOverlay bg="rgba(7, 8, 10, 0.75)" backdropFilter="blur(8px)" />
        <ModalContent
          bg="rgba(14, 14, 16, 0.96)"
          border="1px solid rgba(212, 175, 55, 0.35)"
          borderRadius="14px"
          boxShadow="0 24px 64px rgba(0,0,0,0.55)"
        >
          <ModalHeader className="radley-regular" fontWeight={400} color="var(--color-text-primary)" pb={2}>
            Eigene Aufgabe
          </ModalHeader>
          <ModalCloseButton color="rgba(255,255,255,0.6)" />
          <ModalBody>
            <Text className="inter" fontSize="sm" color="var(--color-text-muted)" mb={3}>
              Beschreibe kurz, was du dir für diese Woche vornimmst.
            </Text>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="z. B. Modul-Quiz wiederholen"
              size="md"
              borderRadius="10px"
              borderColor="rgba(212, 175, 55, 0.35)"
              bg="rgba(0,0,0,0.35)"
              color="var(--color-text-primary)"
              _placeholder={{ color: "rgba(255,255,255,0.35)" }}
              _focus={{ borderColor: "var(--color-accent-gold-light)", boxShadow: "0 0 0 1px rgba(232, 197, 71, 0.35)" }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitNewTask();
              }}
            />
            <Textarea
              mt={3}
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Optional: Details, Deadline, Unterpunkte ..."
              minH="96px"
              borderRadius="10px"
              borderColor="rgba(212, 175, 55, 0.35)"
              bg="rgba(0,0,0,0.35)"
              color="var(--color-text-primary)"
              _placeholder={{ color: "rgba(255,255,255,0.35)" }}
              _focus={{ borderColor: "var(--color-accent-gold-light)", boxShadow: "0 0 0 1px rgba(232, 197, 71, 0.35)" }}
            />
            {modalError ? (
              <Text className="inter" fontSize="sm" color="#fca5a5" mt={3}>
                {modalError}
              </Text>
            ) : null}
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={onClose} color="var(--color-text-muted)">
              Abbrechen
            </Button>
            <Button
              onClick={() => void submitNewTask()}
              isLoading={savingNew}
              isDisabled={newTitle.trim().length < 1}
              borderRadius="10px"
              bg="linear-gradient(135deg, var(--color-accent-gold-light) 0%, var(--color-accent-gold) 45%, var(--color-accent-gold-dark) 100%)"
              color="#0a0a0a"
            >
              Hinzufügen
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </GlassCard>
  );
}
