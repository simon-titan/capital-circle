"use client";

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { Archive, ArchiveRestore, Trash2, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
  ADMIN_CARD_CLASS,
  AdminCardTitle,
  AdminCount,
  StatusPill,
  adminAlertIconColor,
  adminAlertProps,
  adminCardPadding,
  adminDangerButtonProps,
  adminEmptyProps,
  adminFormLabelProps,
  adminInputProps,
  adminModalHeaderProps,
  adminModalProps,
  adminOverlayProps,
  adminRowProps,
} from "./adminUi";
import {
  NACHFRIST_TAGE,
  hausaufgabeStatus,
  istAktuell,
  sichtbarBis,
  teileHausaufgaben,
  type HausaufgabeStatus,
} from "@/lib/hausaufgaben";

export type AdminHomework = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  week_number: number | null;
  is_active: boolean | null;
  created_at?: string | null;
  /** Mitglieder, die die Aufgabe abgehakt haben. */
  doneCount: number;
};

type ApiItem = Omit<AdminHomework, "doneCount">;

/** „So., 29.03.2026“ — mit Jahr, weil in der Liste auch alte Aufgaben stehen. */
function datumLabel(ymd: string): string {
  const d = new Date(`${ymd.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

function abgehaktLabel(n: number): string {
  if (n === 0) return "noch von niemandem abgehakt";
  return n === 1 ? "1 Mitglied hat abgehakt" : `${n} Mitglieder haben abgehakt`;
}

function OptionalHinweis() {
  return (
    <Box as="span" ml={1.5} textTransform="none" letterSpacing="normal" fontWeight={400} color="var(--cc-text-3)">
      (optional)
    </Box>
  );
}

const STATUS_PILL: Partial<Record<HausaufgabeStatus, { tone: "danger" | "neutral"; label: string }>> = {
  ueberfaellig: { tone: "danger", label: "überfällig" },
  abgelaufen: { tone: "neutral", label: "abgelaufen" },
  archiviert: { tone: "neutral", label: "archiviert" },
};

export function AdminHomeworkManager({ initialHomework, todayKey }: { initialHomework: AdminHomework[]; todayKey: string }) {
  const [items, setItems] = useState(initialHomework);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [weekNumber, setWeekNumber] = useState("");
  const [status, setStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});
  const [listError, setListError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminHomework | null>(null);

  const { aktuell, vergangen } = useMemo(() => teileHausaufgaben(items, todayKey), [items, todayKey]);

  const createHomework = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          // Leer = ohne Frist; die Route speichert dann `null`.
          due_date: dueDate || null,
          week_number: weekNumber.trim() === "" ? null : Number(weekNumber),
        }),
      });
      const json = (await res.json()) as { ok?: boolean; item?: ApiItem; error?: string };
      if (!json.ok || !json.item) {
        setStatus({ kind: "error", text: json.error || "Hausaufgabe konnte nicht angelegt werden." });
        return;
      }
      setItems((prev) => [...prev, { ...json.item!, doneCount: 0 }]);
      setStatus({
        kind: "success",
        text: json.item.due_date
          ? "Hausaufgabe angelegt."
          : "Hausaufgabe ohne Frist angelegt. Sie bleibt aktuell, bis du sie archivierst oder löschst.",
      });
      setTitle("");
      setDescription("");
      setDueDate("");
    } catch {
      setStatus({ kind: "error", text: "Hausaufgabe konnte nicht angelegt werden." });
    } finally {
      setLoading(false);
    }
  };

  const setBusy = (id: string, busy: boolean) =>
    setBusyIds((s) => {
      const n = { ...s };
      if (busy) n[id] = true;
      else delete n[id];
      return n;
    });

  const setActive = async (hw: AdminHomework, isActive: boolean) => {
    setBusy(hw.id, true);
    setListError(null);
    try {
      const res = await fetch("/api/admin/homework", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: hw.id, is_active: isActive }),
      });
      const json = (await res.json()) as { ok?: boolean; item?: ApiItem; error?: string };
      if (!json.ok || !json.item) {
        setListError(json.error || "Status konnte nicht geändert werden.");
        return;
      }
      setItems((prev) => prev.map((x) => (x.id === hw.id ? { ...json.item!, doneCount: x.doneCount } : x)));
    } catch {
      setListError("Status konnte nicht geändert werden.");
    } finally {
      setBusy(hw.id, false);
    }
  };

  const renderRow = (hw: AdminHomework) => {
    const st = hausaufgabeStatus(hw, todayKey);
    const pill = STATUS_PILL[st];
    const bis = st === "ueberfaellig" && hw.due_date ? sichtbarBis(hw.due_date) : null;
    const meta = [
      hw.week_number != null ? `Woche ${hw.week_number}` : null,
      hw.due_date ? `fällig ${datumLabel(hw.due_date)}` : "ohne Frist",
      bis ? `für Mitglieder sichtbar bis ${datumLabel(bis)}` : null,
      abgehaktLabel(hw.doneCount),
    ]
      .filter(Boolean)
      .join(" · ");
    // Reaktivieren nur, wenn die Aufgabe dadurch wieder bei den Mitgliedern
    // auftaucht — bei abgelaufener Frist bliebe sie ohnehin „vergangen“.
    const kannArchivieren = st !== "archiviert" && istAktuell(st);
    const kannReaktivieren = st === "archiviert" && istAktuell(hausaufgabeStatus({ ...hw, is_active: true }, todayKey));
    const busy = Boolean(busyIds[hw.id]);

    return (
      <Flex
        key={hw.id}
        direction={{ base: "column", md: "row" }}
        align={{ base: "stretch", md: "center" }}
        justify="space-between"
        gap={3}
        py={3}
        px={2}
        mx={-2}
        borderRadius="8px"
        {...adminRowProps}
      >
        <Stack spacing={1} minW={0} flex="1">
          <HStack spacing={2} flexWrap="wrap">
            <Text fontSize="14px" fontWeight={500} color="var(--cc-text)" overflowWrap="anywhere">
              {hw.title}
            </Text>
            {pill ? <StatusPill tone={pill.tone}>{pill.label}</StatusPill> : null}
          </HStack>
          <Text fontSize="12px" className="cc-num" color="var(--cc-text-2)">
            {meta}
          </Text>
        </Stack>
        <HStack spacing={2} flexShrink={0}>
          {kannArchivieren ? (
            <Button
              size="sm"
              variant="line"
              leftIcon={<Archive size={14} />}
              onClick={() => void setActive(hw, false)}
              isLoading={busy}
            >
              Archivieren
            </Button>
          ) : null}
          {kannReaktivieren ? (
            <Button
              size="sm"
              variant="line"
              leftIcon={<ArchiveRestore size={14} />}
              onClick={() => void setActive(hw, true)}
              isLoading={busy}
            >
              Reaktivieren
            </Button>
          ) : null}
          <Button
            size="sm"
            {...adminDangerButtonProps}
            leftIcon={<Trash2 size={14} />}
            onClick={() => setDeleteTarget(hw)}
            isDisabled={busy}
          >
            Löschen
          </Button>
        </HStack>
      </Flex>
    );
  };

  const liste = (titel: ReactNode, anzahl: number, rows: AdminHomework[], leer: string) => (
    <Stack spacing={0} className={ADMIN_CARD_CLASS} p={adminCardPadding}>
      <AdminCardTitle mb={3}>
        {titel}
        <AdminCount>{anzahl}</AdminCount>
      </AdminCardTitle>
      {rows.length > 0 ? rows.map(renderRow) : <Box {...adminEmptyProps}>{leer}</Box>}
    </Stack>
  );

  return (
    <Stack spacing={6}>
      <Stack spacing={4} className={ADMIN_CARD_CLASS} p={adminCardPadding}>
        <AdminCardTitle>Hausaufgabe anlegen</AdminCardTitle>
        <FormControl isRequired>
          <FormLabel {...adminFormLabelProps}>Titel</FormLabel>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. 100 Trades backtesten" {...adminInputProps} />
        </FormControl>
        <FormControl>
          <FormLabel {...adminFormLabelProps}>
            Beschreibung
            <OptionalHinweis />
          </FormLabel>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} {...adminInputProps} />
        </FormControl>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <FormControl>
            <FormLabel {...adminFormLabelProps}>
              Fälligkeitsdatum
              <OptionalHinweis />
            </FormLabel>
            <HStack spacing={2}>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                {...adminInputProps}
                className="cc-num"
              />
              {dueDate ? (
                <Button variant="line" flexShrink={0} leftIcon={<X size={14} />} onClick={() => setDueDate("")}>
                  Ohne Frist
                </Button>
              ) : null}
            </HStack>
            <FormHelperText color="var(--cc-text-3)" fontSize="xs" lineHeight={1.5}>
              {dueDate
                ? `Nach der Frist noch ${NACHFRIST_TAGE} Tage als überfällig sichtbar, danach unter „Vergangene Aufgaben“.`
                : "Leer lassen für eine Aufgabe ohne Frist. Sie bleibt aktuell, bis du sie archivierst oder löschst."}
            </FormHelperText>
          </FormControl>
          <FormControl>
            <FormLabel {...adminFormLabelProps}>
              Woche
              <OptionalHinweis />
            </FormLabel>
            <Input
              type="number"
              min={1}
              value={weekNumber}
              onChange={(e) => setWeekNumber(e.target.value)}
              placeholder="z. B. 3"
              {...adminInputProps}
              className="cc-num"
            />
            <FormHelperText color="var(--cc-text-3)" fontSize="xs" lineHeight={1.5}>
              Erscheint im Dashboard als „Woche 3 von 12“.
            </FormHelperText>
          </FormControl>
        </SimpleGrid>
        <Button variant="gold" alignSelf="flex-start" onClick={() => void createHomework()} isLoading={loading} isDisabled={!title.trim()}>
          Hausaufgabe erstellen
        </Button>
        {status ? (
          <Alert status={status.kind} {...adminAlertProps(status.kind)}>
            <AlertIcon color={adminAlertIconColor(status.kind)} />
            <Text fontSize="sm">{status.text}</Text>
          </Alert>
        ) : null}
      </Stack>

      {listError ? (
        <Alert status="error" {...adminAlertProps("error")}>
          <AlertIcon color={adminAlertIconColor("error")} />
          <Text fontSize="sm">{listError}</Text>
        </Alert>
      ) : null}

      {liste("Für Mitglieder aktuell", aktuell.length, aktuell, "Gerade ist keine Hausaufgabe aktuell.")}
      {liste("Vergangen & archiviert", vergangen.length, vergangen, "Noch keine vergangenen Hausaufgaben.")}

      <DeleteHomeworkModal
        homework={deleteTarget}
        todayKey={todayKey}
        onClose={() => setDeleteTarget(null)}
        onDeleted={(id) => setItems((prev) => prev.filter((x) => x.id !== id))}
      />
    </Stack>
  );
}

function DeleteHomeworkModal({
  homework,
  todayKey,
  onClose,
  onDeleted,
}: {
  homework: AdminHomework | null;
  todayKey: string;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (deleting) return;
    setError(null);
    onClose();
  };

  async function handleDelete() {
    if (!homework) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/homework?id=${encodeURIComponent(homework.id)}`, { method: "DELETE" });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!json.ok) {
        setError(json.error || "Hausaufgabe konnte nicht gelöscht werden.");
        return;
      }
      onDeleted(homework.id);
      onClose();
    } catch {
      setError("Hausaufgabe konnte nicht gelöscht werden.");
    } finally {
      setDeleting(false);
    }
  }

  const nochAktuell = homework ? istAktuell(hausaufgabeStatus(homework, todayKey)) : false;

  return (
    <Modal isOpen={Boolean(homework)} onClose={close} size="md" isCentered>
      <ModalOverlay {...adminOverlayProps} />
      <ModalContent {...adminModalProps} mx={4}>
        <ModalHeader pt={6} pb={2} {...adminModalHeaderProps}>
          Hausaufgabe löschen?
        </ModalHeader>
        <ModalBody pb={2}>
          <Stack spacing={3} fontSize="sm" color="var(--cc-text-2)" lineHeight="1.65">
            <Text>
              <Box as="span" fontWeight={600} color="var(--cc-text)">
                „{homework?.title}“
              </Box>{" "}
              wird endgültig gelöscht und verschwindet auch aus „Vergangene Aufgaben“ bei den Mitgliedern.
            </Text>
            <Text className="cc-num">
              {homework && homework.doneCount > 0
                ? `${abgehaktLabel(homework.doneCount)}, diese Häkchen werden mitgelöscht.`
                : "Noch hat niemand sie abgehakt."}{" "}
              Eigene Aufgaben, die Mitglieder dazu angelegt haben, bleiben in ihrer Checkliste.
            </Text>
            {nochAktuell ? (
              <Text>Nur aus der aktuellen Liste nehmen, ohne etwas zu verlieren? Dafür gibt es „Archivieren“.</Text>
            ) : null}
            {error ? (
              <Alert status="error" {...adminAlertProps("error")}>
                <AlertIcon color={adminAlertIconColor("error")} />
                <Text fontSize="sm">{error}</Text>
              </Alert>
            ) : null}
          </Stack>
        </ModalBody>
        <ModalFooter gap={2} pt={4} pb={5}>
          <Button variant="ghost" onClick={close} color="var(--cc-text-2)" isDisabled={deleting}>
            Abbrechen
          </Button>
          <Button {...adminDangerButtonProps} onClick={() => void handleDelete()} isLoading={deleting} loadingText="Löschen…">
            Endgültig löschen
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
