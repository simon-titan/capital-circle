"use client";

import { Button, Input, Stack, Text, Textarea } from "@chakra-ui/react";
import { useState } from "react";

type Homework = {
  id: string;
  title: string;
  due_date: string | null;
};

const fieldSx = {
  bg: "rgba(255, 255, 255, 0.03)",
  border: "1px solid",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  color: "var(--cc-text)",
  _placeholder: { color: "var(--cc-text-3)" },
  _hover: { borderColor: "rgba(255, 255, 255, 0.22)" },
  _focusVisible: { borderColor: "var(--cc-gold-line)", boxShadow: "0 0 0 1px var(--cc-gold-line)" },
} as const;

export function AdminHomeworkManager({ initialHomework }: { initialHomework: Homework[] }) {
  const [items, setItems] = useState(initialHomework);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [weekNumber, setWeekNumber] = useState(1);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const createHomework = async () => {
    setLoading(true);
    setStatus(null);
    const res = await fetch("/api/admin/homework", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        due_date: dueDate || undefined,
        week_number: weekNumber,
      }),
    });
    const json = (await res.json()) as { ok?: boolean; item?: Homework; error?: string };
    setLoading(false);
    if (!json.ok || !json.item) {
      setStatus(json.error || "Hausaufgabe konnte nicht angelegt werden.");
      return;
    }
    setItems((prev) => [...prev, json.item!]);
    setStatus("Hausaufgabe angelegt.");
    setTitle("");
    setDescription("");
    setDueDate("");
  };

  return (
    <Stack gap={6}>
      <Stack gap={4} className="cc-card cc-card--still" p={{ base: 4, md: 5 }}>
        <Text fontSize="18px" fontWeight={600} color="var(--cc-text)">
          Hausaufgabe anlegen
        </Text>
        <Input placeholder="Titel" value={title} onChange={(e) => setTitle(e.target.value)} {...fieldSx} />
        <Textarea placeholder="Beschreibung" value={description} onChange={(e) => setDescription(e.target.value)} {...fieldSx} />
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="cc-num" {...fieldSx} />
        <Input type="number" value={weekNumber} onChange={(e) => setWeekNumber(Number(e.target.value))} className="cc-num" {...fieldSx} />
        <Button variant="gold" alignSelf="flex-start" onClick={createHomework} isLoading={loading} isDisabled={!title}>
          Hausaufgabe erstellen
        </Button>
        {status ? (
          <Text fontSize="14px" color="var(--cc-text-2)">
            {status}
          </Text>
        ) : null}
      </Stack>

      <Stack gap={0} className="cc-card cc-card--still" p={{ base: 4, md: 5 }}>
        <Text fontSize="18px" fontWeight={600} color="var(--cc-text)" mb={2}>
          Vorhandene Hausaufgaben
        </Text>
        {items.map((hw) => (
          <Text
            key={hw.id}
            py={2.5}
            fontSize="14px"
            color="var(--cc-text)"
            borderBottom="1px solid var(--cc-line)"
            _last={{ borderBottom: "none" }}
          >
            {hw.title}{" "}
            {hw.due_date ? (
              <Text as="span" className="cc-num" color="var(--cc-text-2)">
                {`- faellig am ${new Date(hw.due_date).toLocaleDateString("de-DE")}`}
              </Text>
            ) : (
              ""
            )}
          </Text>
        ))}
      </Stack>
    </Stack>
  );
}
