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
import { tageBisFrist } from "@/lib/hausaufgaben";
import { CheckCircle2, Infinity as InfinityIcon, Plus, Trash2 } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { CardValue, DashCard, Meta, ProgressBar } from "@/components/platform/dashboard/primitives";

type HomeworkFullViewProps = {
  /**
   * Alle aktuellen Hausaufgaben, fertig sortiert (Regel: `lib/hausaufgaben.ts`).
   * Seit 19.09.2026 eine Liste statt einer einzigen Aufgabe — fristlose
   * Aufgaben stehen neben denen mit Frist, statt unsichtbar dahinter.
   */
  aktuell: HomeworkRow[];
  vergangen: HomeworkRow[];
  /** Heutiger Kalendertag Europe/Berlin (`YYYY-MM-DD`) vom Server — kein `new Date()` im Render. */
  todayKey: string;
  /** Erledigt-Häkchen je Hausaufgabe (`homework_id` → true). */
  initialOfficialDone: Record<string, boolean>;
  initialCustomTasks: HomeworkCustomTaskRow[];
};

type FristStatus = "overdue" | "soon" | "ok" | "none";

function fristStatus(due: string | null, todayKey: string): FristStatus {
  if (!due) return "none";
  const diff = tageBisFrist(due, todayKey);
  if (diff == null) return "none";
  if (diff < 0) return "overdue";
  if (diff <= 3) return "soon";
  return "ok";
}

/** Reine Datumsangabe als Mittag lesen, damit sie nicht über die Zeitzone auf den Vortag rutscht. */
function parseDue(due: string): Date {
  return new Date(due + (due.includes("T") ? "" : "T12:00:00"));
}

function formatDate(due: string): string {
  return parseDue(due).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
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

function TabCount({ children }: { children: ReactNode }) {
  return (
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

type OffizielleAufgabeProps = {
  hw: HomeworkRow;
  index: number;
  todayKey: string;
  done: boolean;
  busy: boolean;
  /** Nur auf der ersten Karte: alle aktuellen Aufgaben sind abgehakt. */
  allDoneNote: string | null;
  onToggle: (homeworkId: string, done: boolean) => void;
};

/**
 * Eine offizielle Hausaufgabe. Die erste der Liste ist die Hero-Karte (der
 * nächste Schritt), die übrigen stehen als normale Karten darunter.
 * Ohne Fälligkeitsdatum zeigt die Datums-Kachel ein Unendlich-Zeichen und
 * „Ohne Fälligkeitsdatum“ — keine Status-Pill, weil nichts fällig werden kann.
 */
function OffizielleAufgabe({ hw, index, todayKey, done, busy, allDoneNote, onToggle }: OffizielleAufgabeProps) {
  const status = fristStatus(hw.due_date, todayKey);
  const dueDate = status !== "none" && hw.due_date ? parseDue(hw.due_date) : null;
  const dayNum = dueDate ? dueDate.toLocaleDateString("de-DE", { day: "2-digit" }) : null;
  const month = dueDate ? dueDate.toLocaleDateString("de-DE", { month: "short" }) : null;
  const weekday = dueDate ? dueDate.toLocaleDateString("de-DE", { weekday: "long" }) : null;

  const statusLabel = status === "overdue" ? "überfällig" : status === "soon" ? "bald fällig" : "im Plan";
  const statusTone: Tone = status === "overdue" ? "danger" : status === "soon" ? "gold" : "neutral";

  return (
    <DashCard
      hero={index === 0}
      label="Offizielle Aufgabe"
      labelId={`hw-official-${hw.id}`}
      className="cc-card--still cc-rise"
      style={riseDelay(index)}
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
        {hw.title}
      </Box>
      {hw.week_number != null ? (
        <Meta className="cc-num" mt={1.5}>
          Woche {hw.week_number}
        </Meta>
      ) : null}

      {allDoneNote ? (
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
            {allDoneNote}
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
          {dayNum ? (
            <>
              <Text className="cc-num" fontSize="20px" fontWeight={600} lineHeight={1} color="var(--cc-text)">
                {dayNum}
              </Text>
              <Text fontSize="11px" fontWeight={500} textTransform="uppercase" letterSpacing="0.12em" color="var(--cc-text-2)" mt={1}>
                {month}
              </Text>
            </>
          ) : (
            <Box color="var(--cc-text-2)">
              <InfinityIcon size={22} strokeWidth={1.5} aria-hidden />
            </Box>
          )}
        </Flex>
        {weekday ? (
          <>
            <Text fontSize="15px" color="var(--cc-text-soft)">
              {weekday}
            </Text>
            {/* Erledigt: kein „überfällig“ mehr — das Häkchen unten sagt, wie es steht. */}
            {!done ? <StatusPill tone={statusTone}>{statusLabel}</StatusPill> : null}
          </>
        ) : (
          <Box minW={0}>
            <Text fontSize="15px" color="var(--cc-text-soft)">
              Ohne Fälligkeitsdatum
            </Text>
            <Text fontSize="13px" lineHeight={1.5} color="var(--cc-text-2)">
              Erledige sie in deinem Tempo.
            </Text>
          </Box>
        )}
      </Flex>

      {hw.description ? (
        <Text
          mt={5}
          fontSize="16px"
          lineHeight={1.65}
          color="var(--cc-text-soft)"
          whiteSpace="pre-wrap"
          overflowWrap="break-word"
          maxW="46rem"
        >
          {hw.description}
        </Text>
      ) : null}

      {/* Große Abhak-Fläche: die ganze Zeile ist das Label der Checkbox (Klick und Tastatur). */}
      <Checkbox
        mt={5}
        isChecked={done}
        onChange={(e) => {
          if (!busy) onToggle(hw.id, e.target.checked);
        }}
        aria-busy={busy}
        // Mehrere Karten tragen dieselbe Beschriftung — der Titel macht das Häkchen eindeutig.
        inputProps={{ "aria-label": `Aufgabe erledigt: ${hw.title}` }}
        size="lg"
        w="100%"
        alignItems="center"
        p={4}
        borderRadius="10px"
        border="1px solid"
        borderColor={done ? "var(--cc-gold-line)" : "var(--cc-line-strong)"}
        bg={done ? "var(--cc-gold-wash)" : "rgba(255, 255, 255, 0.02)"}
        cursor={busy ? "progress" : "pointer"}
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
              Aufgabe erledigt
            </Box>
            <Box as="span" display="block" fontSize="13px" lineHeight={1.5} color="var(--cc-text-2)" mt={0.5}>
              {done ? "Gut gemacht — du hast sie abgehakt." : "Hake ab, wenn du die Aufgabe abgeschlossen hast."}
            </Box>
          </Box>
          {done ? (
            <Box as="span" color="var(--cc-gold-light)" flexShrink={0}>
              <CheckCircle2 size={22} strokeWidth={1.75} aria-hidden />
            </Box>
          ) : null}
        </Flex>
      </Checkbox>

      {hw.link ? (
        <Box mt={5}>
          <Button as="a" href={hw.link} target="_blank" rel="noopener noreferrer" variant="gold">
            {hw.link_label || "Zur Aufgabe"}
          </Button>
        </Box>
      ) : null}
    </DashCard>
  );
}

export function HomeworkFullView({
  aktuell,
  vergangen,
  todayKey,
  initialOfficialDone,
  initialCustomTasks,
}: HomeworkFullViewProps) {
  const [officialDone, setOfficialDone] = useState<Record<string, boolean>>(initialOfficialDone);
  const [busyOfficial, setBusyOfficial] = useState<Record<string, boolean>>({});
  const [customTasks, setCustomTasks] = useState(initialCustomTasks);
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});
  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [savingNew, setSavingNew] = useState(false);

  const setOfficial = useCallback(async (homeworkId: string, done: boolean) => {
    setBusyOfficial((s) => ({ ...s, [homeworkId]: true }));
    setOfficialDone((s) => ({ ...s, [homeworkId]: done }));
    const zuruecksetzen = () => setOfficialDone((s) => ({ ...s, [homeworkId]: !done }));
    try {
      const res = await fetch("/api/homework-user/official", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeworkId, done }),
      });
      const json = (await res.json()) as { ok?: boolean };
      if (!json.ok) zuruecksetzen();
    } catch {
      zuruecksetzen();
    } finally {
      setBusyOfficial((s) => {
        const n = { ...s };
        delete n[homeworkId];
        return n;
      });
    }
  }, []);

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
        // Eigene Aufgaben hängen nicht mehr an einer Hausaufgabe (siehe
        // getHomeworkDashboardState): Die Checkliste zeigt alle, egal welche
        // Hausaufgabe gerade aktuell ist.
        body: JSON.stringify({ homeworkId: null, title: t, notes: newNotes.trim() || null }),
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
  }, [newTitle, newNotes]);

  const customDoneCount = customTasks.filter((task) => task.done).length;
  const allCustomDone = customTasks.length > 0 && customDoneCount === customTasks.length;
  const allOfficialDone = aktuell.length > 0 && aktuell.every((hw) => officialDone[hw.id]);
  const allDoneNote = allOfficialDone
    ? aktuell.length === 1
      ? "Stark! Deine aktuelle Aufgabe ist erledigt."
      : "Stark! Alle aktuellen Aufgaben sind erledigt."
    : null;

  return (
    <Tabs variant="line" isLazy>
      <TabList
        borderBottom="1px solid var(--cc-line)"
        mb={{ base: 6, md: 8 }}
        overflowX="auto"
        overflowY="hidden"
        sx={{ scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}
      >
        <Tab {...tabProps}>
          Aktuell
          {aktuell.length > 1 ? <TabCount>{aktuell.length}</TabCount> : null}
        </Tab>
        <Tab {...tabProps}>
          Vergangene Aufgaben
          {vergangen.length > 0 ? <TabCount>{vergangen.length}</TabCount> : null}
        </Tab>
      </TabList>

      <TabPanels>
        {/* ── Tab 1: Aktuell ── */}
        <TabPanel p={0}>
          <Stack spacing={5}>
            {aktuell.length > 0 ? (
              aktuell.map((hw, i) => (
                <OffizielleAufgabe
                  key={hw.id}
                  hw={hw}
                  index={i}
                  todayKey={todayKey}
                  done={Boolean(officialDone[hw.id])}
                  busy={Boolean(busyOfficial[hw.id])}
                  allDoneNote={i === 0 ? allDoneNote : null}
                  onToggle={(id, done) => void setOfficial(id, done)}
                />
              ))
            ) : (
              <DashCard label="Offizielle Aufgabe" labelId="hw-official" className="cc-card--still cc-rise" style={riseDelay(0)}>
                <Meta fontSize="15px" lineHeight={1.6}>
                  Aktuell ist keine offizielle Aufgabe offen. Du kannst unten eigene Aufgaben anlegen und abhaken.
                </Meta>
              </DashCard>
            )}

            <DashCard label="Persönliche Checkliste" labelId="hw-custom" className="cc-card--still cc-rise" style={riseDelay(Math.max(aktuell.length, 1))}>
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
          {vergangen.length === 0 ? (
            <DashCard label="Vergangene Aufgaben" labelId="hw-past-empty" className="cc-card--still cc-rise" style={riseDelay(0)}>
              <Meta fontSize="15px" lineHeight={1.6}>
                Hier landen Aufgaben, deren Frist vorbei ist oder die dein Coach abgeschlossen hat. Bisher ist keine dabei.
              </Meta>
            </DashCard>
          ) : (
            <Stack spacing={4}>
              {vergangen.map((hw, i) => {
                const erledigt = Boolean(officialDone[hw.id]);
                const meta = [
                  hw.week_number != null ? `Woche ${hw.week_number}` : null,
                  hw.due_date && fristStatus(hw.due_date, todayKey) !== "none" ? formatDate(hw.due_date) : "ohne Frist",
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
                        <Meta className="cc-num" mt={1}>
                          {meta}
                        </Meta>
                      </Box>
                      <Flex gap={2} align="center" wrap="wrap" flexShrink={0}>
                        <StatusPill tone={erledigt ? "gold" : "neutral"}>{erledigt ? "erledigt" : "nicht erledigt"}</StatusPill>
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
