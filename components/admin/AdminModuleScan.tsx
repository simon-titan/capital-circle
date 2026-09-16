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
    <Stack spacing={4} className="cc-card cc-card--still" p={{ base: 4, md: 5 }}>
      <Text fontSize="15px" fontWeight={600} color="var(--cc-text)">
        Hetzner-Bucket synchronisieren (Prefix{" "}
        <Text as="span" fontWeight={500} color="var(--cc-text-2)">
          modules/
        </Text>
        )
      </Text>
      <Text fontSize="13px" lineHeight={1.5} color="var(--cc-text-2)">
        Scannt alle Ordner im Bucket. Ordner = Modul, optional Unterordner = Subkategorie, Dateien{" "}
        <Text as="span" color="var(--cc-text-soft)">
          .mp4 / .webm / .mov
        </Text>
        , Thumbnail{" "}
        <Text as="span" color="var(--cc-text-soft)">
          thumbnail.jpg|png
        </Text>
        . Neue Module landen in „Nicht zugeordnet&quot; und können dort einem Kurs zugewiesen werden.
        Bereits zugeordnete Module werden nicht verschoben.
      </Text>
      <Button variant="gold" size="sm" w="fit-content" onClick={() => void onScan()} isLoading={loading}>
        Bucket scannen & synchronisieren
      </Button>
      {message ? (
        <Text fontSize="13px" className="cc-num" color="var(--cc-text-2)" whiteSpace="pre-wrap">
          {message}
        </Text>
      ) : null}
    </Stack>
  );
}
