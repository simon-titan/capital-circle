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
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Textarea,
  Text,
  VStack,
} from "@chakra-ui/react";
import { GlassCard } from "@/components/ui/GlassCard";
import type { HomeworkCustomTaskRow, HomeworkRow } from "@/lib/server-data";
import { CheckCircle2, ClipboardList, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";

type HomeworkFullViewProps = {
  homework: HomeworkRow | null;
  initialOfficialDone: boolean;
  initialCustomTasks: HomeworkCustomTaskRow[];
  pastHomework: HomeworkRow[];
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

function formatDate(due: string): string {
  const d = new Date(due + (due.includes("T") ? "" : "T12:00:00"));
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
}

const checkboxSx = {
  ".chakra-checkbox__label": {
    fontSize: "1rem",
    color: "rgba(245, 236, 210, 0.95)",
    fontWeight: 600,
  },
  ".chakra-checkbox__control": {
    w: "22px",
    h: "22px",
    borderColor: "rgba(212, 175, 55, 0.55)",
    _checked: {
      bg: "linear-gradient(135deg, #e8c547 0%, #a67c00 100%)",
      borderColor: "#e8c547",
    },
  },
};

const customCheckboxSx = {
  ".chakra-checkbox__control": {
    borderColor: "rgba(212, 175, 55, 0.45)",
    _checked: {
      bg: "linear-gradient(135deg, #e8c547 0%, #a67c00 100%)",
      borderColor: "#e8c547",
    },
  },
};

export function HomeworkFullView({
  homework,
  initialOfficialDone,
  initialCustomTasks,
  pastHomework,
}: HomeworkFullViewProps) {
  const [officialDone, setOfficialDone] = useState(initialOfficialDone);
  const [customTasks, setCustomTasks] = useState(initialCustomTasks);
  const [busyOfficial, setBusyOfficial] = useState(false);
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});
  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
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
    setFormError(null);
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
        setFormError(null);
      } else {
        setFormError(json.error || "Aufgabe konnte nicht erstellt werden.");
      }
    } catch {
      setFormError("Aufgabe konnte nicht erstellt werden.");
    } finally {
      setSavingNew(false);
    }
  }, [newTitle, newNotes, homeworkId]);

  const customDoneCount = customTasks.filter((task) => task.done).length;
  const allCustomDone = customTasks.length > 0 && customDoneCount === customTasks.length;
  const weekGoalReached = officialDone || allCustomDone;

  const due = homework?.due_date ?? null;
  const status = dueStatus(due);
  const dueDate = due ? new Date(due + (due.includes("T") ? "" : "T12:00:00")) : null;
  const dayNum = dueDate ? dueDate.toLocaleDateString("de-DE", { day: "2-digit" }) : "—";
  const month = dueDate ? dueDate.toLocaleDateString("de-DE", { month: "short" }) : "";
  const weekday = dueDate ? dueDate.toLocaleDateString("de-DE", { weekday: "long" }) : "Termin offen";

  const statusLabel =
    status === "overdue" ? "überfällig" : status === "soon" ? "bald fällig" : "im Plan";
  const badgeColor =
    status === "overdue"
      ? "#fca5a5"
      : status === "soon"
        ? "var(--color-accent-gold-light)"
        : "rgba(187, 247, 208, 0.9)";
  const badgeBg =
    status === "overdue"
      ? "rgba(239, 68, 68, 0.12)"
      : status === "soon"
        ? "rgba(212, 175, 55, 0.12)"
        : "rgba(74, 222, 128, 0.1)";
  const badgeBorder =
    status === "overdue"
      ? "rgba(248, 113, 113, 0.35)"
      : status === "soon"
        ? "rgba(212, 175, 55, 0.38)"
        : "rgba(74, 222, 128, 0.35)";

  const tabSx = {
    color: "rgba(255,255,255,0.55)",
    className: "inter-medium",
    fontSize: "sm",
    _selected: {
      color: "var(--color-accent-gold-light)",
      borderColor: "var(--color-accent-gold)",
    },
    _hover: { color: "var(--color-text-primary)" },
    pb: 3,
  };

  return (
    <Tabs variant="line" colorScheme="yellow" isLazy>
      <TabList
        borderBottomColor="rgba(212, 175, 55, 0.22)"
        mb={{ base: 6, md: 8 }}
      >
        <Tab {...tabSx}>Aktuelle Woche</Tab>
        <Tab {...tabSx}>
          Vergangene Aufgaben
          {pastHomework.length > 0 ? (
            <Box
              as="span"
              ml={2}
              px={1.5}
              py={0.5}
              borderRadius="full"
              bg="rgba(212, 175, 55, 0.18)"
              color="var(--color-accent-gold-light)"
              fontSize="10px"
              className="jetbrains-mono"
            >
              {pastHomework.length}
            </Box>
          ) : null}
        </Tab>
      </TabList>

      <TabPanels>
        {/* ── Tab 1: Aktuelle Woche ── */}
        <TabPanel p={0}>
          <VStack spacing={{ base: 6, md: 8 }} align="stretch">
            {homework ? (
              <GlassCard dashboard spotlight={false} overflow="hidden" position="relative">
                <Box display="flex" alignItems="flex-start" gap={3} mb={5}>
                  <Box color="var(--color-accent-gold)" aria-hidden flexShrink={0} mt={0.5}>
                    <ClipboardList size={28} strokeWidth={1.7} />
                  </Box>
                  <Box minW={0}>
                    <Text {...kicker} mb={1.5}>
                      Offizielle Wochenaufgabe
                    </Text>
                    <Heading as="h2" size="lg" className="inter-semibold" fontWeight={600} lineHeight="short">
                      {homework.title}
                    </Heading>
                    {homework.week_number != null ? (
                      <Text className="inter" fontSize="sm" color="var(--color-text-muted)" mt={2}>
                        Woche {homework.week_number}
                      </Text>
                    ) : null}
                  </Box>
                </Box>

                {weekGoalReached ? (
                  <HStack
                    spacing={2}
                    align="center"
                    mb={5}
                    py={3}
                    px={4}
                    borderRadius="10px"
                    bg="rgba(74, 222, 128, 0.14)"
                    border="1px solid rgba(74, 222, 128, 0.4)"
                  >
                    <CheckCircle2 size={18} color="rgba(187, 247, 208, 0.95)" />
                    <Text className="inter-semibold" fontSize="sm" color="rgba(187, 247, 208, 0.95)">
                      Stark! Deine Wochenaufgabe ist erledigt.
                    </Text>
                  </HStack>
                ) : null}

                <VStack align="stretch" spacing={4}>
                  <HStack spacing={3} flexWrap="wrap" align="center">
                    <HStack
                      spacing={3}
                      py={2}
                      px={3}
                      borderRadius="12px"
                      bg="rgba(212, 175, 55, 0.12)"
                      border="1px solid rgba(212, 175, 55, 0.32)"
                    >
                      <Text className="jetbrains-mono" fontSize="xl" fontWeight={500} lineHeight={1} color="var(--color-text-primary)">
                        {dayNum}
                      </Text>
                      {month ? (
                        <Text className="inter-medium" fontSize="xs" textTransform="uppercase" letterSpacing="0.14em" color="var(--color-accent-gold-light)">
                          {month}
                        </Text>
                      ) : null}
                    </HStack>
                    <Text className="inter" fontSize="sm" color="var(--color-text-muted)">
                      {weekday}
                    </Text>
                    {dueDate ? (
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
                        {statusLabel}
                      </Text>
                    ) : null}
                  </HStack>

                  {homework.description ? (
                    <Text className="inter" fontSize="md" color="rgba(240, 240, 242, 0.88)" lineHeight="tall" whiteSpace="pre-wrap">
                      {homework.description}
                    </Text>
                  ) : null}

                  {/* Auffällige Checkbox */}
                  <Box
                    display="flex"
                    alignItems="center"
                    gap={4}
                    p={4}
                    borderRadius="12px"
                    border="1px solid"
                    borderColor={officialDone ? "rgba(74, 222, 128, 0.5)" : "rgba(212, 175, 55, 0.4)"}
                    bg={officialDone ? "rgba(74, 222, 128, 0.08)" : "rgba(212, 175, 55, 0.06)"}
                    cursor={busyOfficial ? "not-allowed" : "pointer"}
                    transition="all 0.2s ease"
                    onClick={() => { if (!busyOfficial) void setOfficial(!officialDone); }}
                    _hover={busyOfficial ? {} : {
                      borderColor: officialDone ? "rgba(74, 222, 128, 0.7)" : "rgba(212, 175, 55, 0.65)",
                      bg: officialDone ? "rgba(74, 222, 128, 0.12)" : "rgba(212, 175, 55, 0.1)",
                    }}
                  >
                    <Checkbox
                      isChecked={officialDone}
                      isDisabled={busyOfficial}
                      size="lg"
                      colorScheme="yellow"
                      className="inter"
                      sx={checkboxSx}
                      pointerEvents="none"
                      readOnly
                    />
                    <Box flex="1">
                      <Text className="inter-semibold" fontSize="md" color={officialDone ? "rgba(187, 247, 208, 0.95)" : "rgba(245, 236, 210, 0.95)"}>
                        Wochenaufgabe erledigt
                      </Text>
                      <Text className="inter" fontSize="xs" color={officialDone ? "rgba(187, 247, 208, 0.7)" : "var(--color-text-muted)"} mt={0.5}>
                        {officialDone ? "Gut gemacht — du hast diese Woche abgehakt." : "Hake ab, wenn du die Aufgabe abgeschlossen hast."}
                      </Text>
                    </Box>
                    {officialDone ? (
                      <CheckCircle2 size={22} color="rgba(187, 247, 208, 0.9)" />
                    ) : null}
                  </Box>

                  {homework.link ? (
                    <Button
                      as={ChakraLink}
                      href={homework.link}
                      isExternal
                      size="md"
                      alignSelf="flex-start"
                      borderRadius="10px"
                      className="inter-semibold"
                      bg="linear-gradient(135deg, var(--color-accent-gold-light) 0%, var(--color-accent-gold) 45%, var(--color-accent-gold-dark) 100%)"
                      color="#0a0a0a"
                      _hover={{ boxShadow: "0 0 20px var(--color-accent-glow)" }}
                    >
                      {homework.link_label || "Zur Aufgabe"}
                    </Button>
                  ) : null}
                </VStack>
              </GlassCard>
            ) : (
              <GlassCard dashboard spotlight={false}>
                <Text {...kicker} mb={2}>
                  Offizielle Wochenaufgabe
                </Text>
                <Text className="inter" color="var(--color-text-muted)" fontSize="sm" lineHeight="tall">
                  Aktuell ist keine offizielle Wochenaufgabe aktiv. Du kannst unten eigene Aufgaben anlegen und abhaken.
                </Text>
              </GlassCard>
            )}

            <GlassCard dashboard spotlight={false}>
              <Box display="flex" alignItems="flex-start" gap={3} mb={5}>
                <Box color="var(--color-accent-gold)" aria-hidden flexShrink={0} mt={0.5}>
                  <ClipboardList size={24} strokeWidth={1.7} />
                </Box>
                <Box minW={0}>
                  <Text {...kicker} mb={1.5}>
                    Persönliche Checkliste
                  </Text>
                  <Heading as="h3" size="md" className="inter-semibold" fontWeight={600}>
                    Eigene Aufgaben
                  </Heading>
                  <Text className="inter" fontSize="sm" color="var(--color-text-muted)" mt={2} lineHeight="tall">
                    Ergänze Schritte, die dir helfen, dranzubleiben — inklusive optionaler Notizen.
                  </Text>
                </Box>
              </Box>

              {customTasks.length > 0 ? (
                <VStack align="stretch" spacing={3} mb={6}>
                  {customTasks.map((task) => (
                    <Box
                      key={task.id}
                      p={4}
                      borderRadius="12px"
                      border="1px solid rgba(212, 175, 55, 0.28)"
                      bg="rgba(8, 8, 8, 0.35)"
                    >
                      <HStack align="flex-start" spacing={3}>
                        <Checkbox
                          isChecked={task.done}
                          isDisabled={Boolean(busyIds[task.id])}
                          onChange={(e) => void toggleCustom(task.id, e.target.checked)}
                          mt={1}
                          colorScheme="yellow"
                          sx={customCheckboxSx}
                        />
                        <Box flex="1" minW={0}>
                          <Text
                            className="inter-semibold"
                            fontSize="md"
                            color={task.done ? "rgba(245, 236, 210, 0.45)" : "rgba(245, 236, 210, 0.95)"}
                            textDecoration={task.done ? "line-through" : undefined}
                          >
                            {task.title}
                          </Text>
                          {task.notes ? (
                            <Text className="inter" fontSize="sm" color="rgba(245, 236, 210, 0.7)" mt={2} whiteSpace="pre-wrap">
                              {task.notes}
                            </Text>
                          ) : null}
                        </Box>
                        <IconButton
                          aria-label="Aufgabe entfernen"
                          icon={<Trash2 size={18} />}
                          size="sm"
                          variant="ghost"
                          color="rgba(255,255,255,0.35)"
                          _hover={{ color: "#fca5a5", bg: "rgba(239,68,68,0.12)" }}
                          isDisabled={Boolean(busyIds[task.id])}
                          onClick={() => void removeCustom(task.id)}
                          flexShrink={0}
                        />
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              ) : (
                <Text className="inter" fontSize="sm" color="var(--color-text-muted)" mb={6}>
                  Noch keine eigenen Aufgaben — füge unten die erste hinzu.
                </Text>
              )}

              <Text
                className="jetbrains-mono"
                fontSize="sm"
                color={allCustomDone && customTasks.length > 0 ? "rgba(187, 247, 208, 0.95)" : "rgba(255,255,255,0.55)"}
                mb={4}
              >
                Fortschritt: {customDoneCount}/{customTasks.length} erledigt
              </Text>

              <Box
                p={{ base: 4, md: 5 }}
                borderRadius="12px"
                border="1px dashed rgba(212, 175, 55, 0.35)"
                bg="rgba(255,255,255,0.02)"
              >
                <Text className="inter-semibold" fontSize="sm" mb={3} color="var(--color-text-primary)">
                  Neue Aufgabe hinzufügen
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
                  mb={3}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void submitNewTask();
                    }
                  }}
                />
                <Textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Optional: Details, Deadline, Unterpunkte …"
                  minH="100px"
                  borderRadius="10px"
                  borderColor="rgba(212, 175, 55, 0.35)"
                  bg="rgba(0,0,0,0.35)"
                  color="var(--color-text-primary)"
                  _placeholder={{ color: "rgba(255,255,255,0.35)" }}
                  _focus={{ borderColor: "var(--color-accent-gold-light)", boxShadow: "0 0 0 1px rgba(232, 197, 71, 0.35)" }}
                  mb={3}
                />
                {formError ? (
                  <Text className="inter" fontSize="sm" color="#fca5a5" mb={3}>
                    {formError}
                  </Text>
                ) : null}
                <Button
                  leftIcon={<Plus size={18} />}
                  onClick={() => void submitNewTask()}
                  isLoading={savingNew}
                  isDisabled={newTitle.trim().length < 1}
                  borderRadius="10px"
                  bg="linear-gradient(135deg, var(--color-accent-gold-light) 0%, var(--color-accent-gold) 45%, var(--color-accent-gold-dark) 100%)"
                  color="#0a0a0a"
                  _hover={{ boxShadow: "0 0 20px var(--color-accent-glow)" }}
                >
                  Hinzufügen
                </Button>
              </Box>
            </GlassCard>
          </VStack>
        </TabPanel>

        {/* ── Tab 2: Vergangene Aufgaben ── */}
        <TabPanel p={0}>
          {pastHomework.length === 0 ? (
            <GlassCard dashboard spotlight={false}>
              <Text {...kicker} mb={2}>Vergangene Aufgaben</Text>
              <Text className="inter" fontSize="sm" color="var(--color-text-muted)" lineHeight="tall">
                Es wurden noch keine abgeschlossenen Wochenaufgaben archiviert.
              </Text>
            </GlassCard>
          ) : (
            <VStack align="stretch" spacing={4}>
              {pastHomework.map((hw) => {
                const hwStatus = dueStatus(hw.due_date);
                const hwStatusLabel =
                  hwStatus === "overdue" ? "überfällig" : hwStatus === "soon" ? "bald fällig" : hwStatus === "ok" ? "abgeschlossen" : null;
                const hwBadgeColor =
                  hwStatus === "overdue" ? "#fca5a5" : "rgba(187, 247, 208, 0.8)";
                const hwBadgeBg =
                  hwStatus === "overdue" ? "rgba(239, 68, 68, 0.1)" : "rgba(74, 222, 128, 0.08)";
                const hwBadgeBorder =
                  hwStatus === "overdue" ? "rgba(248, 113, 113, 0.3)" : "rgba(74, 222, 128, 0.3)";

                return (
                  <GlassCard key={hw.id} dashboard spotlight={false}>
                    <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap={2} mb={hw.description ? 3 : 0}>
                      <Box flex="1" minW={0}>
                        <HStack spacing={2} mb={1.5} flexWrap="wrap">
                          {hw.week_number != null ? (
                            <Text {...kicker}>Woche {hw.week_number}</Text>
                          ) : null}
                          {hw.due_date ? (
                            <Text {...kicker}>{formatDate(hw.due_date)}</Text>
                          ) : null}
                        </HStack>
                        <Text className="inter-semibold" fontSize="md" color="rgba(245, 236, 210, 0.85)" lineHeight="short">
                          {hw.title}
                        </Text>
                      </Box>
                      <HStack spacing={2} flexShrink={0}>
                        {hwStatusLabel ? (
                          <Text
                            className="jetbrains-mono"
                            fontSize="10px"
                            px={2}
                            py={1}
                            borderRadius="md"
                            bg={hwBadgeBg}
                            color={hwBadgeColor}
                            borderWidth="1px"
                            borderColor={hwBadgeBorder}
                          >
                            {hwStatusLabel}
                          </Text>
                        ) : null}
                        {hw.link ? (
                          <Button
                            as={ChakraLink}
                            href={hw.link}
                            isExternal
                            size="xs"
                            borderRadius="8px"
                            variant="outline"
                            borderColor="rgba(212, 175, 55, 0.35)"
                            color="var(--color-accent-gold-light)"
                            _hover={{ bg: "rgba(212, 175, 55, 0.1)" }}
                          >
                            {hw.link_label || "Link"}
                          </Button>
                        ) : null}
                      </HStack>
                    </HStack>
                    {hw.description ? (
                      <Text className="inter" fontSize="sm" color="rgba(240, 240, 242, 0.65)" lineHeight="tall" whiteSpace="pre-wrap" mt={3}>
                        {hw.description}
                      </Text>
                    ) : null}
                  </GlassCard>
                );
              })}
            </VStack>
          )}
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}
