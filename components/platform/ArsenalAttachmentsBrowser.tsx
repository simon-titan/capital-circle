"use client";

import { Box, Button, Flex, Input, InputGroup, InputLeftElement, Select, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import type { ArsenalAttachmentListItem } from "@/lib/server-data";
import NextLink from "next/link";
import { FileDown, Lock, Search } from "lucide-react";
import { useCallback, useId, useMemo, useState, type ReactNode } from "react";
import { Meta, clampLines } from "@/components/platform/dashboard/primitives";

/**
 * @deprecated Seit v3.2 gibt es nur noch einen Akzent (Champagner-Gold). Der Wert
 * wird ignoriert und bleibt nur, damit bestehende Aufrufer kompilieren.
 */
export type ArsenalBrowserAccent = "purple" | "orange";

/** Eingabefelder im Schema v3.2: Haarlinie, Gold-Kante bei Fokus. */
const fieldSx = {
  h: "42px",
  bg: "rgba(255, 255, 255, 0.03)",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  color: "var(--cc-text)",
  fontSize: "15px",
  _placeholder: { color: "var(--cc-text-3)" },
  _hover: { borderColor: "rgba(212, 176, 128, 0.35)" },
  _focusVisible: { borderColor: "var(--cc-gold-line)", boxShadow: "0 0 0 1px var(--cc-gold-line)" },
};

const selectSx = {
  ...fieldSx,
  cursor: "pointer",
  sx: { "& option": { background: "var(--cc-panel-solid)", color: "var(--cc-text)" } },
};

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <Text
      as="label"
      htmlFor={htmlFor}
      display="block"
      fontSize="12px"
      lineHeight="16px"
      fontWeight={500}
      letterSpacing="0.12em"
      textTransform="uppercase"
      color="var(--cc-text-2)"
      mb={2}
    >
      {children}
    </Text>
  );
}

function Pill({ children, locked = false }: { children: ReactNode; locked?: boolean }) {
  return (
    <Flex
      as="span"
      display="inline-flex"
      align="center"
      gap={1.5}
      px={2}
      py={0.5}
      borderRadius="full"
      border="1px solid"
      borderColor={locked ? "var(--cc-gold-line)" : "var(--cc-line-strong)"}
      bg={locked ? "var(--cc-gold-wash)" : "rgba(255, 255, 255, 0.03)"}
      color={locked ? "var(--cc-gold-light)" : "var(--cc-text-soft)"}
      fontSize="12px"
      lineHeight="16px"
      fontWeight={500}
      whiteSpace="nowrap"
    >
      {children}
    </Flex>
  );
}

function riseDelay(i: number) {
  return { animationDelay: `${80 + Math.min(i, 10) * 70}ms` };
}

/** Lowercase + NFD + strip combining marks for tolerant substring search (z. B. „Ubersicht“ vs. „Übersicht“). */
function normalizeSearchText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Eine Datei-Zeile. Das Modul steht in der Gruppen-Überschrift, nicht hier. */
function AttachmentRow({
  item,
  delay,
  isLoading,
  onDownload,
}: {
  item: ArsenalAttachmentListItem;
  delay: { animationDelay: string };
  isLoading: boolean;
  onDownload: (attachmentId: string, filename: string) => void | Promise<void>;
}) {
  return (
    <Box as="li" className="cc-card cc-rise" style={delay} px={{ base: 4, md: 5 }} py={4}>
      <Flex
        direction={{ base: "column", sm: "row" }}
        align={{ base: "stretch", sm: "center" }}
        justify="space-between"
        gap={{ base: 3, sm: 4 }}
      >
        <Flex minW={0} gap={3} align="flex-start" flex="1">
          <Flex
            w="40px"
            h="40px"
            flexShrink={0}
            align="center"
            justify="center"
            borderRadius="10px"
            border="1px solid var(--cc-line-strong)"
            bg="rgba(255, 255, 255, 0.02)"
            color={item.hasAccess ? "var(--cc-text)" : "var(--cc-text-3)"}
            aria-hidden
          >
            <FileDown size={18} strokeWidth={1.5} />
          </Flex>
          <Stack spacing={1.5} minW={0}>
            <Text
              fontSize="16px"
              fontWeight={600}
              lineHeight={1.35}
              color={item.hasAccess ? "var(--cc-text)" : "var(--cc-text-2)"}
              sx={clampLines(2)}
            >
              {item.filename}
            </Text>
            <Meta fontSize="13px" overflowWrap="anywhere">
              {item.video_title}
            </Meta>
            {item.category_name || !item.hasAccess ? (
              <Flex gap={2} wrap="wrap" pt={0.5}>
                {item.category_name ? <Pill>{item.category_name}</Pill> : null}
                {!item.hasAccess ? (
                  <Pill locked>
                    <Lock size={12} strokeWidth={1.75} aria-hidden />
                    Nur für Mitglieder
                  </Pill>
                ) : null}
              </Flex>
            ) : null}
          </Stack>
        </Flex>

        <Box flexShrink={0} pl={{ base: "52px", sm: 0 }}>
          {item.hasAccess ? (
            <Button
              size="sm"
              variant="line"
              onClick={() => void onDownload(item.id, item.filename)}
              isLoading={isLoading}
              aria-label={`${item.filename} herunterladen`}
            >
              Download
            </Button>
          ) : (
            <Button as={NextLink} href="/bewerbung" size="sm" variant="line">
              Mitglied werden
            </Button>
          )}
        </Box>
      </Flex>
    </Box>
  );
}

/**
 * Datei-Browser für Templates und PDFs. Den Seitenkopf (Titel, Untertitel)
 * rendert die Seite selbst per `PageHeader` — `title` benennt hier nur die
 * Suche für Screenreader, `subtitle` bleibt für bestehende Aufrufer im Typ.
 */
export function ArsenalAttachmentsBrowser({
  items,
  title,
}: {
  items: ArsenalAttachmentListItem[];
  title: string;
  subtitle?: string;
  /** @deprecated Wird ignoriert (v3.2: nur Champagner-Gold). */
  accentColor?: ArsenalBrowserAccent;
}) {
  const uid = useId();
  const ids = {
    search: `${uid}-search`,
    module: `${uid}-module`,
    video: `${uid}-video`,
    category: `${uid}-category`,
  };

  const [moduleId, setModuleId] = useState<string>("all");
  const [videoId, setVideoId] = useState<string>("all");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const modules = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of items) {
      m.set(it.module_id, it.module_title);
    }
    return [...m.entries()].sort((x, y) => x[1].localeCompare(y[1], "de"));
  }, [items]);

  const videos = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of items) {
      if (moduleId !== "all" && it.module_id !== moduleId) continue;
      m.set(it.video_id, it.video_title);
    }
    return [...m.entries()].sort((x, y) => x[1].localeCompare(y[1], "de"));
  }, [items, moduleId]);

  const categories = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of items) {
      if (it.arsenal_category_id && it.category_name) {
        m.set(it.arsenal_category_id, it.category_name);
      }
    }
    return [...m.entries()].sort((x, y) => x[1].localeCompare(y[1], "de"));
  }, [items]);

  const filtered = useMemo(() => {
    const q = normalizeSearchText(search.trim());
    return items.filter((it) => {
      if (moduleId !== "all" && it.module_id !== moduleId) return false;
      if (videoId !== "all" && it.video_id !== videoId) return false;
      if (categoryId === "none") {
        if (it.arsenal_category_id) return false;
      } else if (categoryId !== "all") {
        if (it.arsenal_category_id !== categoryId) return false;
      }
      if (!q) return true;
      const hay = normalizeSearchText(
        [it.filename, it.module_title, it.video_title, it.category_name ?? "", it.course_title].join(" "),
      );
      return hay.includes(q);
    });
  }, [items, moduleId, videoId, categoryId, search]);

  /**
   * Nach Modul gruppiert statt flach: Man sieht ohne einen einzigen Filterklick,
   * welche Dateien zu welchem Modul gehören — der Modul-Filter darüber bleibt für
   * den Fall, dass man sich auf eines beschränken will.
   */
  const gruppen = useMemo(() => {
    const nachModul = new Map<string, { title: string; items: ArsenalAttachmentListItem[] }>();
    for (const it of filtered) {
      const vorhanden = nachModul.get(it.module_id);
      if (vorhanden) vorhanden.items.push(it);
      else nachModul.set(it.module_id, { title: it.module_title, items: [it] });
    }
    return [...nachModul.values()].sort((a, b) => a.title.localeCompare(b.title, "de"));
  }, [filtered]);

  const hasActiveSearchOrFilters = useMemo(
    () =>
      search.trim() !== "" || moduleId !== "all" || videoId !== "all" || categoryId !== "all",
    [search, moduleId, videoId, categoryId],
  );

  const resetSearchAndFilters = useCallback(() => {
    setSearch("");
    setModuleId("all");
    setVideoId("all");
    setCategoryId("all");
  }, []);

  const onDownload = useCallback(async (attachmentId: string, filename: string) => {
    setLoadingId(attachmentId);
    try {
      const res = await fetch(`/api/attachment-url?id=${encodeURIComponent(attachmentId)}`);
      const json = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!json.ok || !json.url) {
        console.error(json.error ?? "attachment-url failed");
        return;
      }
      const a = document.createElement("a");
      a.href = json.url;
      a.download = filename;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setLoadingId(null);
    }
  }, []);

  const onModuleChange = (v: string) => {
    setModuleId(v);
    setVideoId("all");
  };

  return (
    <Stack gap={5}>
      <Box
        role="search"
        aria-label={`${title} durchsuchen`}
        className="cc-card cc-card--still cc-rise"
        style={riseDelay(0)}
        p={{ base: 5, md: 6 }}
      >
        <Stack gap={4}>
          <Box>
            <FieldLabel htmlFor={ids.search}>Suche</FieldLabel>
            <InputGroup>
              <InputLeftElement pointerEvents="none" h="42px" color="var(--cc-text-3)">
                <Search size={17} strokeWidth={1.75} aria-hidden />
              </InputLeftElement>
              <Input
                id={ids.search}
                type="search"
                pl={10}
                placeholder="Dateiname, Modul, Video, Kategorie …"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                {...fieldSx}
              />
            </InputGroup>
          </Box>

          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={{ base: 3, md: 4 }}>
            <Box minW={0}>
              <FieldLabel htmlFor={ids.module}>Modul</FieldLabel>
              <Select id={ids.module} w="100%" value={moduleId} onChange={(e) => onModuleChange(e.target.value)} {...selectSx}>
                <option value="all">Alle Module</option>
                {modules.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </Select>
            </Box>
            <Box minW={0}>
              <FieldLabel htmlFor={ids.video}>Video</FieldLabel>
              <Select id={ids.video} w="100%" value={videoId} onChange={(e) => setVideoId(e.target.value)} {...selectSx}>
                <option value="all">Alle Videos</option>
                {videos.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </Select>
            </Box>
            <Box minW={0}>
              <FieldLabel htmlFor={ids.category}>Kategorie</FieldLabel>
              <Select id={ids.category} w="100%" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} {...selectSx}>
                <option value="all">Alle Kategorien</option>
                <option value="none">Ohne Kategorie</option>
                {categories.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </Select>
            </Box>
          </SimpleGrid>
        </Stack>
      </Box>

      {filtered.length === 0 ? (
        <Box className="cc-card cc-card--still cc-rise" style={riseDelay(1)} p={{ base: 6, md: 8 }}>
          <Stack spacing={4} align="center" textAlign="center">
            <Meta fontSize="16px" maxW="36rem">
              Keine Treffer. Filter oder Suche anpassen — oder es sind noch keine Dateien vom Team hinterlegt.
            </Meta>
            {hasActiveSearchOrFilters ? (
              <Button size="sm" variant="line" onClick={resetSearchAndFilters}>
                Suche & Filter zurücksetzen
              </Button>
            ) : null}
          </Stack>
        </Box>
      ) : (
        <Stack gap={6}>
          {gruppen.map((gruppe, gi) => (
            <Stack key={gruppe.title} gap={3}>
              <Flex
                align="baseline"
                justify="space-between"
                gap={3}
                pb={2}
                borderBottom="1px solid var(--cc-line)"
                className="cc-rise"
                style={riseDelay(gi + 1)}
              >
                <Text
                  as="h2"
                  fontSize="13px"
                  lineHeight="18px"
                  fontWeight={500}
                  letterSpacing="0.12em"
                  textTransform="uppercase"
                  color="var(--cc-text-soft)"
                >
                  {gruppe.title}
                </Text>
                <Meta fontSize="13px" className="cc-num" flexShrink={0}>
                  {gruppe.items.length}
                </Meta>
              </Flex>
              <Stack as="ul" listStyleType="none" gap={3} aria-label={`${title} — ${gruppe.title}`}>
                {gruppe.items.map((it, i) => (
                  <AttachmentRow
                    key={it.id}
                    item={it}
                    delay={riseDelay(gi + i + 1)}
                    isLoading={loadingId === it.id}
                    onDownload={onDownload}
                  />
                ))}
              </Stack>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
