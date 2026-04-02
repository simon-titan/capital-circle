"use client";

import { Button, Stack, Text } from "@chakra-ui/react";
import { useCallback, useState } from "react";

/**
 * Scannt den gesamten Hetzner-Bucket (Prefix `modules/`) und synchronisiert
 * alle gefundenen Module global in die DB.
 * Neue Module landen automatisch im "Nicht zugeordnet"-Kurs.
 */
export function AdminModuleScan() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onScan = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/scan-modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix: "modules" }),
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
        `OK: ${json.moduleFolders ?? 0} Ordner, ${json.keyCount ?? 0} Keys. ` +
          `Module abgeglichen: ${json.modulesTouched ?? 0}, neue Videos: ${json.videosCreated ?? 0}, ` +
          `Subkategorien neu: ${json.subcategoriesCreated ?? 0}.${errs}`,
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Netzwerkfehler.");
    }
    setLoading(false);
  }, []);

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
        Hetzner-Bucket synchronisieren (Prefix{" "}
        <Text as="span" className="jetbrains-mono" color="gray.400">
          modules/
        </Text>
        )
      </Text>
      <Text className="inter" fontSize="xs" color="gray.500">
        Scannt alle Ordner im Bucket. Ordner = Modul, optional Unterordner = Subkategorie, Dateien{" "}
        <Text as="span" className="jetbrains-mono">
          .mp4 / .webm / .mov
        </Text>
        , Thumbnail{" "}
        <Text as="span" className="jetbrains-mono">
          thumbnail.jpg|png
        </Text>
        . Neue Module landen in „Nicht zugeordnet" und können dort einem Kurs zugewiesen werden.
        Bereits zugeordnete Module werden nicht verschoben.
      </Text>
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
