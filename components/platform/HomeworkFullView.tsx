"use client";

import {
  Box,
  Button,
  Checkbox,
  Flex,
  IconButton,
  Input,
  Stack,
  StackDivider,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
} from "@chakra-ui/react";
import type { HomeworkCustomTaskRow, HomeworkRow } from "@/lib/server-data";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { CardValue, DashCard, Meta, ProgressBar } from "@/components/platform/dashboard/primitives";

type HomeworkFullViewProps = {
  homework: HomeworkRow | null;
  initialOfficialDone: boolean;
  initialCustomTasks: HomeworkCustomTaskRow[];
  pastHomework: HomeworkRow[];
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

function riseDelay(i: number) {
  return { animationDelay: `${80 + Math.min(i, 10) * 70}ms` };
}

/** Eingabefelder im Schema v3.2: Haarlinie, Gold-Kante bei Fokus. */
const fieldSx = {
  bg: "rgba(255, 255, 255, 0.03)",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  color: "var(--cc-text)",
  fontSize: "15px",
  _placeholder: { color: "var(--cc-text-3)" },
  _hover: { borderColor: "rgba(212, 176, 128, 0.35)" },
  _focusVisible: { borderColor: "var(--cc-gold-line)", boxShadow: "0 0 0 1px var(--cc-gold-line)" },
};

/** Häkchen: offen = Haarlinie, erledigt = Gold-Verlauf mit dunkler Tinte (ausgewählter Zustand in Gold). */
const checkboxControlSx = {
  ".chakra-checkbox__control": {
    borderWidth: "1.5px",
    borderColor: "var(--cc-line-strong)",
    bg: "rgba(255, 255, 255, 0.02)",
    borderRadius: "6px",
    color: "var(--cc-on-gold)",
    transition: "background 180ms var(--cc-ease), border-color 180ms var(--cc-ease)",
    _hover: { borderColor: "var(--cc-gold-line)" },
    _checked: {
      bg: "var(--cc-gold-grad)",
      borderColor: "var(--cc-gold-light)",
      color: "var(--cc-on-gold)",
      _hover: { bg: "var(--cc-gold-grad)", borderColor: "var(--cc-gold-light)" },
    },
  },
};

type Tone = "danger" | "gold" | "neutral";

const TONES: Record<Tone, { color: string; border: string; bg: string }> = {
  danger: { color: "var(--cc-danger)", border: "rgba(248, 113, 113, 0.35)", bg: "rgba(248, 113, 113, 0.08)" },
  gold: { color: "var(--cc-gold-light)", border: "var(--cc-gold-line)", bg: "var(--cc-gold-wash)" },
  neutral: { color: "var(--cc-text-soft)", border: "var(--cc-line-strong)", bg: "rgba(255, 255, 255, 0.03)" },
};

function StatusPill({ tone, children }: { tone: Tone; children: ReactNode }) {
  const t = TONES[tone];
  return (
    <Box
      as="span"
      display="inline-flex"
      alignItems="center"
      px={2.5}
      py={0.5}
      borderRadius="full"
      border="1px solid"
      borderColor={t.border}
      bg={t.bg}
      color={t.color}
      fontSize="12px"
      lineHeight="18px"
      fontWeight={500}
      whiteSpace="nowrap"
    >
      {children}
    </Box>
  );
}

const tabProps = {
  color: "var(--cc-text-2)",
  fontSize: "15px",
  fontWeight: 500,
  px: { base: 3, md: 4 },
  pb: 3,
  flexShrink: 0,
  borderBottomWidth: "2px",
  mb: "-1px",
  _selected: { color: "var(--cc-gold-light)", borderColor: "var(--cc-gold)" },
  _hover: { color: "var(--cc-text)" },
  _active: { bg: "transparent" },
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
  const statusTone: Tone = status === "overdue" ? "danger" : status === "soon" ? "gold" : "neutral";

  return (
    <Tabs variant="line" isLazy>
      <TabList
        borderBottom="1px solid var(--cc-line)"
        mb={{ base: 6, md: 8 }}
        overflowX="auto"
        overflowY="hidden"
        sx={{ scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}
      >
        <Tab {...tabProps}>Aktuelle Woche</Tab>
        <Tab {...tabProps}>
          Vergangene Aufgaben
          {pastHomework.length > 0 ? (
            <Box
              as="span"
              className="cc-num"
              ml={2}
              px={1.5}
              minW="20px"
              borderRadius="full"
              bg="rgba(255, 255, 255, 0.06)"
              border="1px solid var(--cc-line-strong)"
              color="var(--cc-text-soft)"
              fontSize="11px"
              lineHeight="16px"
              textAlign="center"
            >
              {pastHomework.length}
            </Box>
          ) : null}
        </Tab>
      </TabList>

      <TabPanels>
        {/* ── Tab 1: Aktuelle Woche ── */}
        <TabPanel p={0}>
          <Stack spacing={5}>
            {homework ? (
              <DashCard
                hero
                label="Offizielle Wochenaufgabe"
                labelId="hw-official"
                className="cc-card--still cc-rise"
                style={riseDelay(0)}
              >
                <Box
                  as="h3"
                  fontSize={{ base: "20px", md: "24px" }}
                  fontWeight={600}
                  lineHeight={1.25}
                  letterSpacing="-0.01em"
                  color="var(--cc-text)"
                  overflowWrap="break-word"
                >
                  {homework.title}
                </Box>
                {homework.week_number != null ? (
                  <Meta className="cc-num" mt={1.5}>
                    Woche {homework.week_number}
                  </Meta>
                ) : null}

                {weekGoalReached ? (
                  <Flex
                    role="status"
                    align="center"
                    gap={2.5}
                    mt={5}
                    py={3}
                    px={4}
                    borderRadius="10px"
                    bg="var(--cc-gold-wash)"
                    border="1px solid rgba(212, 176, 128, 0.3)"
                  >
                    <Box color="var(--cc-gold-light)" flexShrink={0}>
                      <CheckCircle2 size={18} strokeWidth={1.75} aria-hidden />
                    </Box>
                    <Text fontSize="15px" fontWeight={500} color="var(--cc-text)">
                      Stark! Deine Wochenaufgabe ist erledigt.
                    </Text>
                  </Flex>
                ) : null}

                <Flex align="center" gap={3} wrap="wrap" mt={5}>
                  {/* Datums-Kachel: neutral wie die Icon-Kacheln */}
                  <Flex
                    direction="column"
                    align="center"
                    justify="center"
                    w="56px"
                    h="56px"
                    flexShrink={0}
                    borderRadius="12px"
                    border="1px solid var(--cc-line-strong)"
                    bg="rgba(255, 255, 255, 0.02)"
                    boxShadow="inset 0 1px 0 rgba(255, 255, 255, 0.05)"
                  >
                    <Text className="cc-num" fontSize="20px" fontWeight={600} lineHeight={1} color="var(--cc-text)">
                      {dayNum}
                    </Text>
                    {month ? (
                      <Text fontSize="11px" fontWeight={500} textTransform="uppercase" letterSpacing="0.12em" color="var(--cc-text-2)" mt={1}>
                        {month}
                      </Text>
                    ) : null}
                  </Flex>
                  <Text fontSize="15px" color="var(--cc-text-soft)">
                    {weekday}
                  </Text>
                  {dueDate ? <StatusPill tone={statusTone}>{statusLabel}</StatusPill> : null}
                </Flex>

                {homework.description ? (
                  <Text
                    mt={5}
                    fontSize="16px"
                    lineHeight={1.65}
                    color="var(--cc-text-soft)"
                    whiteSpace="pre-wrap"
                    overflowWrap="break-word"
                    maxW="46rem"
                  >
                    {homework.description}
                  </Text>
                ) : null}

                {/* Große Abhak-Fläche: die ganze Zeile ist das Label der Checkbox (Klick und Tastatur). */}
                <Checkbox
                  mt={5}
                  isChecked={officialDone}
                  onChange={(e) => {
                    if (!busyOfficial) void setOfficial(e.target.checked);
                  }}
                  aria-busy={busyOfficial}
                  size="lg"
                  w="100%"
                  alignItems="center"
                  p={4}
                  borderRadius="10px"
                  border="1px solid"
                  borderColor={officialDone ? "var(--cc-gold-line)" : "var(--cc-line-strong)"}
                  bg={officialDone ? "var(--cc-gold-wash)" : "rgba(255, 255, 255, 0.02)"}
                  cursor={busyOfficial ? "progress" : "pointer"}
                  transition="border-color 180ms var(--cc-ease), background-color 180ms var(--cc-ease)"
                  _hover={{ borderColor: "var(--cc-gold-line)" }}
                  sx={{
                    ...checkboxControlSx,
                    ".chakra-checkbox__label": { flex: 1, minW: 0, ml: 4 },
                  }}
                >
                  <Flex as="span" align="center" gap={3}>
                    <Box as="span" display="block" flex="1" minW={0}>
                      <Box as="span" display="block" fontSize="16px" fontWeight={600} color="var(--cc-text)">
                        Wochenaufgabe erledigt
                      </Box>
                      <Box as="span" display="block" fontSize="13px" lineHeight={1.5} color="var(--cc-text-2)" mt={0.5}>
                        {officialDone ? "Gut gemacht — du hast diese Woche abgehakt." : "Hake ab, wenn du die Aufgabe abgeschlossen hast."}
                      </Box>
                    </Box>
                    {officialDone ? (
                      <Box as="span" color="var(--cc-gold-light)" flexShrink={0}>
                        <CheckCircle2 size={22} strokeWidth={1.75} aria-hidden />
                      </Box>
                    ) : null}
                  </Flex>
                </Checkbox>

                {homework.link ? (
                  <Box mt={5}>
                    <Button
                      as="a"
                      href={homework.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="gold"
                    >
                      {homework.link_label || "Zur Aufgabe"}
                    </Button>
                  </Box>
                ) : null}
              </DashCard>
            ) : (
              <DashCard label="Offizielle Wochenaufgabe" labelId="hw-official" className="cc-card--still cc-rise" style={riseDelay(0)}>
                <Meta fontSize="15px" lineHeight={1.6}>
                  Aktuell ist keine offizielle Wochenaufgabe aktiv. Du kannst unten eigene Aufgaben anlegen und abhaken.
                </Meta>
              </DashCard>
            )}

            <DashCard label="Persönliche Checkliste" labelId="hw-custom" className="cc-card--still cc-rise" style={riseDelay(1)}>
              <CardValue as="h3">Eigene Aufgaben</CardValue>
              <Meta mt={1}>Ergänze Schritte, die dir helfen, dranzubleiben — inklusive optionaler Notizen.</Meta>

              <Flex align="center" gap={4} wrap="wrap" mt={5} mb={customTasks.length > 0 ? 3 : 5}>
                {customTasks.length > 0 ? (
                  <ProgressBar
                    value={(customDoneCount / customTasks.length) * 100}
                    label="Fortschritt der eigenen Aufgaben"
                    flex="1"
                    minW="140px"
                  />
                ) : null}
                <Text className="cc-num" fontSize="14px" color={allCustomDone ? "var(--cc-text)" : "var(--cc-text-2)"}>
                  Fortschritt: {customDoneCount}/{customTasks.length} erledigt
                </Text>
              </Flex>

              {customTasks.length > 0 ? (
                <Stack as="ul" listStyleType="none" spacing={0} mb={5} divider={<StackDivider borderColor="var(--cc-line)" />}>
                  {customTasks.map((task) => (
                    <Flex as="li" key={task.id} align="flex-start" gap={3} py={4}>
                      <Checkbox
                        isChecked={task.done}
                        isDisabled={Boolean(busyIds[task.id])}
                        onChange={(e) => void toggleCustom(task.id, e.target.checked)}
                        inputProps={{ "aria-label": task.title }}
                        mt={0.5}
                        sx={checkboxControlSx}
                      />
                      <Box flex="1" minW={0}>
                        <Text
                          fontSize="16px"
                          fontWeight={500}
                          lineHeight={1.4}
                          color={task.done ? "var(--cc-text-3)" : "var(--cc-text)"}
                          textDecoration={task.done ? "line-through" : undefined}
                          overflowWrap="break-word"
                        >
                          {task.title}
                        </Text>
                        {task.notes ? (
                          <Meta mt={1.5} whiteSpace="pre-wrap" overflowWrap="break-word">
                            {task.notes}
                          </Meta>
                        ) : null}
                      </Box>
                      <IconButton
                        aria-label={`Aufgabe „${task.title}“ entfernen`}
                        icon={<Trash2 size={17} strokeWidth={1.75} />}
                        size="sm"
                        variant="ghost"
                        color="var(--cc-text-3)"
                        _hover={{ color: "var(--cc-danger)", bg: "rgba(248, 113, 113, 0.1)" }}
                        isDisabled={Boolean(busyIds[task.id])}
                        onClick={() => void removeCustom(task.id)}
                        flexShrink={0}
                      />
                    </Flex>
                  ))}
                </Stack>
              ) : (
                <Meta mb={5}>Noch keine eigenen Aufgaben — füge unten die erste hinzu.</Meta>
              )}

              <Box pt={5} borderTop="1px solid var(--cc-line)">
                <Box as="h4" fontSize="15px" fontWeight={600} color="var(--cc-text)" mb={3}>
                  Neue Aufgabe hinzufügen
                </Box>
                <Input
                  aria-label="Titel der neuen Aufgabe"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="z. B. Modul-Quiz wiederholen"
                  size="md"
                  mb={3}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void submitNewTask();
                    }
                  }}
                  {...fieldSx}
                />
                <Textarea
                  aria-label="Notizen zur neuen Aufgabe (optional)"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Optional: Details, Deadline, Unterpunkte …"
                  minH="100px"
                  mb={3}
                  {...fieldSx}
                />
                {formError ? (
                  <Text role="alert" fontSize="14px" color="var(--cc-danger)" mb={3}>
                    {formError}
                  </Text>
                ) : null}
                <Button
                  variant="line"
                  leftIcon={<Plus size={17} strokeWidth={1.75} aria-hidden />}
                  onClick={() => void submitNewTask()}
                  isLoading={savingNew}
                  isDisabled={newTitle.trim().length < 1}
                >
                  Hinzufügen
                </Button>
              </Box>
            </DashCard>
          </Stack>
        </TabPanel>

        {/* ── Tab 2: Vergangene Aufgaben ── */}
        <TabPanel p={0}>
          {pastHomework.length === 0 ? (
            <DashCard label="Vergangene Aufgaben" labelId="hw-past-empty" className="cc-card--still cc-rise" style={riseDelay(0)}>
              <Meta fontSize="15px" lineHeight={1.6}>
                Es wurden noch keine abgeschlossenen Wochenaufgaben archiviert.
              </Meta>
            </DashCard>
          ) : (
            <Stack spacing={4}>
              {pastHomework.map((hw, i) => {
                const hwStatus = dueStatus(hw.due_date);
                const hwStatusLabel =
                  hwStatus === "overdue" ? "überfällig" : hwStatus === "soon" ? "bald fällig" : hwStatus === "ok" ? "abgeschlossen" : null;
                const hwTone: Tone = hwStatus === "overdue" ? "danger" : hwStatus === "soon" ? "gold" : "neutral";
                const meta = [
                  hw.week_number != null ? `Woche ${hw.week_number}` : null,
                  hw.due_date ? formatDate(hw.due_date) : null,
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <Box
                    as="article"
                    key={hw.id}
                    className="cc-card cc-card--still cc-rise"
                    style={riseDelay(i)}
                    p={{ base: 5, md: 6 }}
                  >
                    <Flex
                      direction={{ base: "column", sm: "row" }}
                      justify="space-between"
                      align={{ base: "stretch", sm: "flex-start" }}
                      gap={3}
                    >
                      <Box flex="1" minW={0}>
                        <Box
                          as="h2"
                          fontSize={{ base: "17px", md: "18px" }}
                          fontWeight={600}
                          lineHeight={1.3}
                          letterSpacing="-0.01em"
                          color="var(--cc-text)"
                          overflowWrap="break-word"
                        >
                          {hw.title}
                        </Box>
                        {meta ? (
                          <Meta className="cc-num" mt={1}>
                            {meta}
                          </Meta>
                        ) : null}
                      </Box>
                      <Flex gap={2} align="center" wrap="wrap" flexShrink={0}>
                        {hwStatusLabel ? <StatusPill tone={hwTone}>{hwStatusLabel}</StatusPill> : null}
                        {hw.link ? (
                          <Button as="a" href={hw.link} target="_blank" rel="noopener noreferrer" size="sm" variant="line">
                            {hw.link_label || "Link"}
                          </Button>
                        ) : null}
                      </Flex>
                    </Flex>
                    {hw.description ? (
                      <Meta mt={3} lineHeight={1.6} whiteSpace="pre-wrap" overflowWrap="break-word">
                        {hw.description}
                      </Meta>
                    ) : null}
                  </Box>
                );
              })}
            </Stack>
          )}
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}
