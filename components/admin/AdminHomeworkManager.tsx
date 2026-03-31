"use client";

import { Button, Input, Stack, Text, Textarea } from "@chakra-ui/react";
import { useState } from "react";

type Homework = {
  id: string;
  title: string;
  due_date: string | null;
};

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
    <Stack gap={4}>
      <Text fontSize="xl">Hausaufgabe anlegen</Text>
      <Input placeholder="Titel" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea placeholder="Beschreibung" value={description} onChange={(e) => setDescription(e.target.value)} />
      <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      <Input type="number" value={weekNumber} onChange={(e) => setWeekNumber(Number(e.target.value))} />
      <Button onClick={createHomework} isLoading={loading} isDisabled={!title}>
        Hausaufgabe erstellen
      </Button>
      {status ? <Text fontSize="sm">{status}</Text> : null}

      <Text mt={4} fontSize="lg">
        Vorhandene Hausaufgaben
      </Text>
      {items.map((hw) => (
        <Text key={hw.id}>
          {hw.title} {hw.due_date ? `- faellig am ${new Date(hw.due_date).toLocaleDateString("de-DE")}` : ""}
        </Text>
      ))}
    </Stack>
  );
}
