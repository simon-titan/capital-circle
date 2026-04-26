"use client";

import { Button, HStack, Stack, Text } from "@chakra-ui/react";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

type ScanTarget = "free-kurs" | "aufzeichnungen";

type ScanResponse = {
  ok?: boolean;
  error?: string;
  target?: ScanTarget;
  modulesTouched?: number;
  videosCreated?: number;
  subcategoriesCreated?: number;
  keyCount?: number;
  moduleFolders?: number;
  errors?: string[];
};

/**
 * Synchronisiert Bucket-Ordner "FREE-KURS/FREE-VALUE/" (Kostenloser Einblick)
 * oder "AUFZEICHNUNGEN/" (Aufzeichnungen-Kurs) in die DB.
 * Neue Module landen direkt im jeweiligen Free-Kurs und sind sofort published.
 */
export function FreeKursScan() {
  const router = useRouter();
  const [loading, setLoading] = useState<ScanTarget | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const runScan = useCallback(
    async (target: ScanTarget) => {
      setLoading(target);
      setMessage(null);
      try {
        const res = await fetch("/api/admin/scan-free-kurs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target }),
        });
        const json = (await res.json()) as ScanResponse;
        if (!json.ok) {
          setMessage(json.error ?? "Scan fehlgeschlagen.");
          setLoading(null);
          return;
        }
        const errs = json.errors?.length ? ` Warnungen: ${json.errors.slice(0, 5).join(" | ")}` : "";
        const label = target === "aufzeichnungen" ? "Aufzeichnungen" : "Kostenloser Einblick";
        setMessage(
          `${label}: ${json.moduleFolders ?? 0} Ordner, ${json.keyCount ?? 0} Keys. ` +
            `Module abgeglichen: ${json.modulesTouched ?? 0}, neue Videos: ${json.videosCreated ?? 0}, ` +
            `Subkategorien neu: ${json.subcategoriesCreated ?? 0}.${errs}`,
        );
        router.refresh();
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Netzwerkfehler.");
      }
      setLoading(null);
    },
    [router],
  );

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
        Free-Kurs Bucket-Synchronisation
      </Text>
      <Text className="inter" fontSize="xs" color="gray.500">
        Scannt die beiden Bucket-Prefixe und gleicht Module, Subkategorien und Videos ab. Neu
        erkannte Module werden automatisch dem jeweiligen Free-Kurs zugeordnet und sofort
        veroeffentlicht. Bestehende Module werden nicht verschoben oder umbenannt; nur neue Videos
        werden eingefuegt.
      </Text>
      <HStack spacing={3} flexWrap="wrap">
        <Button
          colorScheme="yellow"
          size="sm"
          onClick={() => void runScan("free-kurs")}
          isLoading={loading === "free-kurs"}
          isDisabled={loading !== null}
        >
          FREE-KURS/FREE-VALUE/ scannen
        </Button>
        <Button
          colorScheme="yellow"
          variant="outline"
          size="sm"
          onClick={() => void runScan("aufzeichnungen")}
          isLoading={loading === "aufzeichnungen"}
          isDisabled={loading !== null}
        >
          AUFZEICHNUNGEN/ scannen
        </Button>
      </HStack>
      {message ? (
        <Text className="inter" fontSize="sm" color="gray.400" whiteSpace="pre-wrap">
          {message}
        </Text>
      ) : null}
    </Stack>
  );
}
