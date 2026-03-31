"use client";

import { Button, FormControl, FormLabel, Select, Stack, Text } from "@chakra-ui/react";
import { useCallback, useState } from "react";

type CourseOption = { id: string; title: string; isFree: boolean };

export function AdminModuleScan({ courses }: { courses: CourseOption[] }) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onScan = useCallback(async () => {
    if (!courseId) {
      setMessage("Bitte einen Bereich (Free oder Paid) wählen.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/scan-modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, prefix: "modules" }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        modulesTouched?: number;
        videosCreated?: number;
        subcategoriesCreated?: number;
        keyCount?: number;
        moduleFolders?: number;
        errors?: string[];
      };
      if (!json.ok) {
        setMessage(json.error ?? "Scan fehlgeschlagen.");
        setLoading(false);
        return;
      }
      const errs = json.errors?.length ? ` Warnungen: ${json.errors.slice(0, 5).join(" | ")}` : "";
      setMessage(
        `OK: ${json.moduleFolders ?? 0} Ordner, ${json.keyCount ?? 0} Keys. Module aktualisiert: ${json.modulesTouched ?? 0}, neue Videos: ${json.videosCreated ?? 0}, Subkategorien neu: ${json.subcategoriesCreated ?? 0}.${errs}`,
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Netzwerkfehler.");
    }
    setLoading(false);
  }, [courseId]);

  if (courses.length === 0) return null;

  return (
    <Stack
      spacing={4}
      p={{ base: 4, md: 6 }}
      borderRadius="16px"
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      bg="whiteAlpha.50"
    >
      <Text className="inter-semibold" fontSize="sm" color="gray.200">
        Hetzner-Import in Bereich Free oder Paid (Prefix{" "}
        <Text as="span" className="jetbrains-mono" color="gray.400">
          modules/
        </Text>
        )
      </Text>
      <Text className="inter" fontSize="xs" color="gray.500">
        Ordner = Modul, optional Unterordner = Subkategorie, Dateien{" "}
        <Text as="span" className="jetbrains-mono">
          .mp4 / .webm / .mov
        </Text>
        , Thumbnail{" "}
        <Text as="span" className="jetbrains-mono">
          thumbnail.jpg|png
        </Text>
        .
      </Text>
      <FormControl maxW="420px">
        <FormLabel className="inter" fontSize="xs" color="gray.500">
          Ziel-Bereich
        </FormLabel>
        <Select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          borderColor="whiteAlpha.200"
          className="inter"
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} ({c.isFree ? "Free" : "Paid"})
            </option>
          ))}
        </Select>
      </FormControl>
      <Button colorScheme="yellow" size="sm" w="fit-content" onClick={() => void onScan()} isLoading={loading}>
        Bucket scannen & synchronisieren
      </Button>
      {message ? (
        <Text className="inter" fontSize="sm" color="gray.400" whiteSpace="pre-wrap">
          {message}
        </Text>
      ) : null}
    </Stack>
  );
}
