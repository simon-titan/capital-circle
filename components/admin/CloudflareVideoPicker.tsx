"use client";

import { Box, Button, Checkbox, Flex, HStack, Input, Spinner, Stack, Text } from "@chakra-ui/react";
import { Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/** Was der Aufrufer pro gewähltem Video bekommt. */
export type CloudflareVideoPick = {
  uid: string;
  /** Name aus Cloudflare ohne Dateiendung, als Vorgabe für den Titel. */
  name: string;
  durationSeconds: number | null;
};

type ListItem = {
  uid: string;
  name: string;
  durationSeconds: number | null;
  readyToStream: boolean;
  state: string;
  createdAt: string;
  thumbnailUrl: string | null;
  verwendetIn: string[];
};

type ListResponse = { ok: boolean; items?: ListItem[]; next?: string | null; error?: string };

function titelAusName(name: string): string {
  return name.replace(/\.[a-z0-9]{2,4}$/i, "").trim() || name;
}

function dauer(sekunden: number | null): string {
  if (!sekunden) return "";
  const h = Math.floor(sekunden / 3600);
  const m = Math.floor((sekunden % 3600) / 60);
  const s = sekunden % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

const fieldSx = {
  bg: "rgba(255, 255, 255, 0.03)",
  border: "1px solid",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  color: "var(--cc-text)",
  _placeholder: { color: "var(--cc-text-3)" },
  _hover: { borderColor: "rgba(255, 255, 255, 0.22)" },
  _focusVisible: { borderColor: "var(--cc-gold-line)", boxShadow: "0 0 1px var(--cc-gold-line)" },
} as const;

/**
 * Auswahl von Videos aus Cloudflare Stream (Admin).
 *
 * Listet die Videos des Stream-Kontos, neueste zuerst, mit Suche im Namen. Das
 * Vorschaubild ist signiert (die API liefert es fertig), bereits eingebundene
 * Videos tragen einen Vermerk. Mehrfachauswahl, danach ein Klick auf
 * „hinzufügen“: Der Aufrufer legt die Zeilen an.
 *
 * Kein Dateidialog: Die Auswahl ist eine Liste im Seitenkörper, und neue Dateien
 * kommen über `CloudflareVideoUploader` (Drag & Drop).
 */
export function CloudflareVideoPicker({
  onAdd,
  einzeln = false,
  buttonLabel = "Ausgewählte hinzufügen",
  disabled = false,
}: {
  onAdd: (videos: CloudflareVideoPick[]) => void | Promise<void>;
  /** Nur ein Video wählbar (z. B. Schnell-Recap). */
  einzeln?: boolean;
  buttonLabel?: string;
  disabled?: boolean;
}) {
  const [suche, setSuche] = useState("");
  const [items, setItems] = useState<ListItem[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [gewaehlt, setGewaehlt] = useState<Map<string, CloudflareVideoPick>>(new Map());
  const [fuegtHinzu, setFuegtHinzu] = useState(false);
  // Antworten veralteter Anfragen (schnelles Tippen) verwerfen.
  const anfrage = useRef(0);

  const lade = useCallback(async (begriff: string, cursor: string | null) => {
    const nr = ++anfrage.current;
    setLaedt(true);
    setFehler(null);
    try {
      const q = new URLSearchParams();
      if (begriff.trim()) q.set("search", begriff.trim());
      if (cursor) q.set("before", cursor);
      const res = await fetch(`/api/admin/cloudflare/videos?${q.toString()}`);
      const json = (await res.json().catch(() => null)) as ListResponse | null;
      if (nr !== anfrage.current) return;
      if (!res.ok || !json?.ok) {
        setFehler(json?.error || `Cloudflare-Liste nicht abrufbar (${res.status}).`);
        return;
      }
      setItems((prev) => (cursor ? [...prev, ...(json.items ?? [])] : (json.items ?? [])));
      setNext(json.next ?? null);
    } catch {
      if (nr === anfrage.current) setFehler("Keine Verbindung zum Server.");
    } finally {
      if (nr === anfrage.current) setLaedt(false);
    }
  }, []);

  // Erste Ladung und Suche (leicht verzögert, damit nicht jeder Buchstabe eine Anfrage auslöst).
  /* eslint-disable react-hooks/set-state-in-effect -- Daten aus der Admin-API */
  useEffect(() => {
    const t = window.setTimeout(() => void lade(suche, null), suche ? 350 : 0);
    return () => window.clearTimeout(t);
  }, [suche, lade]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const umschalten = (item: ListItem) => {
    setGewaehlt((prev) => {
      const neu = new Map(einzeln ? [] : prev);
      if (prev.has(item.uid)) {
        neu.delete(item.uid);
      } else {
        neu.set(item.uid, { uid: item.uid, name: titelAusName(item.name), durationSeconds: item.durationSeconds });
      }
      return neu;
    });
  };

  const hinzufuegen = async () => {
    if (gewaehlt.size === 0 || fuegtHinzu) return;
    setFuegtHinzu(true);
    try {
      await onAdd([...gewaehlt.values()]);
      setGewaehlt(new Map());
      // Vermerke „schon eingebunden“ auffrischen.
      void lade(suche, null);
    } finally {
      setFuegtHinzu(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Box position="relative" maxW="420px">
        <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="var(--cc-text-3)" pointerEvents="none">
          <Search size={16} aria-hidden />
        </Box>
        <Input
          placeholder="In Cloudflare nach Namen suchen"
          aria-label="Cloudflare-Videos durchsuchen"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          pl={9}
          {...fieldSx}
        />
      </Box>

      <Box
        border="1px solid var(--cc-line)"
        borderRadius="8px"
        maxH="380px"
        overflowY="auto"
        bg="rgba(255, 255, 255, 0.02)"
      >
        {items.length === 0 && !laedt && !fehler ? (
          <Text p={4} fontSize="sm" color="var(--cc-text-3)">
            {suche.trim() ? "Kein Video mit diesem Namen." : "Keine Videos in Cloudflare Stream."}
          </Text>
        ) : null}

        {items.map((v) => {
          const bereit = v.readyToStream;
          const an = gewaehlt.has(v.uid);
          return (
            <Flex
              key={v.uid}
              as="label"
              align="center"
              gap={3}
              px={3}
              py={2}
              cursor={bereit ? "pointer" : "not-allowed"}
              opacity={bereit ? 1 : 0.55}
              borderBottom="1px solid var(--cc-line)"
              bg={an ? "var(--cc-gold-wash)" : "transparent"}
              _hover={bereit ? { bg: an ? "var(--cc-gold-wash)" : "rgba(255, 255, 255, 0.04)" } : undefined}
              _last={{ borderBottom: "none" }}
            >
              <Checkbox
                isChecked={an}
                isDisabled={!bereit || disabled}
                onChange={() => umschalten(v)}
                aria-label={`${v.name} auswählen`}
                colorScheme="yellow"
              />
              <Box
                flexShrink={0}
                w="96px"
                h="54px"
                borderRadius="6px"
                overflow="hidden"
                bg="rgba(255, 255, 255, 0.05)"
              >
                {v.thumbnailUrl && bereit ? (
                  <Box as="img" src={v.thumbnailUrl} alt="" loading="lazy" w="100%" h="100%" objectFit="cover" />
                ) : null}
              </Box>
              <Box minW={0} flex={1}>
                <Text fontSize="sm" fontWeight={500} color="var(--cc-text)" noOfLines={1}>
                  {v.name}
                </Text>
                <HStack spacing={2} fontSize="xs" color="var(--cc-text-3)" flexWrap="wrap">
                  {v.durationSeconds ? <Text className="cc-num">{dauer(v.durationSeconds)}</Text> : null}
                  {!bereit ? (
                    <Text color={v.state === "error" ? "var(--cc-danger)" : "var(--cc-gold-light)"}>
                      {v.state === "error" ? "Fehlerhaft" : "Wird verarbeitet"}
                    </Text>
                  ) : null}
                  {v.verwendetIn.length > 0 ? <Text>Schon in: {v.verwendetIn.join(", ")}</Text> : null}
                </HStack>
              </Box>
            </Flex>
          );
        })}

        {laedt ? (
          <Flex justify="center" p={3}>
            <Spinner size="sm" color="var(--cc-gold)" />
          </Flex>
        ) : null}
      </Box>

      {fehler ? (
        <Text fontSize="sm" color="var(--cc-danger)" role="alert">
          {fehler}
        </Text>
      ) : null}

      <HStack spacing={3} flexWrap="wrap">
        <Button
          variant="gold"
          size="sm"
          onClick={() => void hinzufuegen()}
          isLoading={fuegtHinzu}
          isDisabled={gewaehlt.size === 0 || disabled}
        >
          {einzeln ? buttonLabel : `${buttonLabel}${gewaehlt.size > 0 ? ` (${gewaehlt.size})` : ""}`}
        </Button>
        {next ? (
          <Button size="sm" variant="line" onClick={() => void lade(suche, next)} isDisabled={laedt}>
            Mehr laden
          </Button>
        ) : null}
      </HStack>
    </Stack>
  );
}
