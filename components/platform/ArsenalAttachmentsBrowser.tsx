"use client";

import { Box, Button, Flex, HStack, Input, InputGroup, InputLeftElement, Select, Stack, Text } from "@chakra-ui/react";
import type { ArsenalAttachmentListItem } from "@/lib/server-data";
import { FileDown, FileText, Layers, Search } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

export type ArsenalBrowserAccent = "purple" | "orange";

const ACCENT = {
  purple: {
    border: "rgba(139, 92, 246, 0.42)",
    borderHover: "rgba(139, 92, 246, 0.58)",
    focus: "rgba(167, 139, 250, 0.85)",
    focusRing: "rgba(139, 92, 246, 0.38)",
    iconBg: "linear-gradient(145deg, rgba(139, 92, 246, 0.38), rgba(88, 28, 135, 0.22))",
    iconBorder: "rgba(167, 139, 250, 0.5)",
    iconGlow: "0 0 28px rgba(139, 92, 246, 0.28)",
    downloadBg: "rgba(139, 92, 246, 0.22)",
    downloadBorder: "rgba(167, 139, 250, 0.48)",
    downloadHover: "rgba(139, 92, 246, 0.34)",
    badgeBorder: "rgba(167, 139, 250, 0.52)",
    badgeBg: "rgba(139, 92, 246, 0.16)",
    badgeColor: "#ddd6fe",
    fileIcon: "#c4b5fd",
    filterBoxBorder: "rgba(139, 92, 246, 0.28)",
    rowBorder: "rgba(139, 92, 246, 0.18)",
    searchIcon: "#a78bfa",
  },
  orange: {
    border: "rgba(255, 140, 60, 0.45)",
    borderHover: "rgba(255, 160, 90, 0.62)",
    focus: "rgba(255, 170, 100, 0.9)",
    focusRing: "rgba(255, 140, 60, 0.4)",
    iconBg: "linear-gradient(145deg, rgba(255, 130, 70, 0.35), rgba(180, 60, 20, 0.2))",
    iconBorder: "rgba(255, 170, 100, 0.48)",
    iconGlow: "0 0 28px rgba(255, 130, 70, 0.26)",
    downloadBg: "rgba(255, 130, 70, 0.2)",
    downloadBorder: "rgba(255, 170, 100, 0.45)",
    downloadHover: "rgba(255, 130, 70, 0.32)",
    badgeBorder: "rgba(255, 170, 100, 0.5)",
    badgeBg: "rgba(255, 130, 70, 0.14)",
    badgeColor: "#fed7aa",
    fileIcon: "#fdba74",
    filterBoxBorder: "rgba(255, 140, 60, 0.3)",
    rowBorder: "rgba(255, 140, 60, 0.2)",
    searchIcon: "#fb923c",
  },
} as const;

const labelStyles = {
  fontSize: "11px",
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  className: "inter-semibold",
  color: "var(--color-text-tertiary)",
  mb: 1,
};

export function ArsenalAttachmentsBrowser({
  items,
  title,
  subtitle,
  accentColor = "purple",
}: {
  items: ArsenalAttachmentListItem[];
  title: string;
  subtitle: string;
  accentColor?: ArsenalBrowserAccent;
}) {
  const a = ACCENT[accentColor];
  const HeaderIcon = accentColor === "orange" ? FileText : Layers;

  const selectFieldProps = useMemo(
    () => ({
      bg: "rgba(7, 8, 10, 0.72)",
      borderColor: a.border,
      color: "var(--color-text-primary)",
      borderRadius: "10px",
      borderWidth: "1px",
      fontSize: "sm",
      h: "42px",
      cursor: "pointer",
      _hover: { borderColor: a.borderHover, bg: "rgba(12, 13, 16, 0.85)" },
      _focusVisible: {
        borderColor: a.focus,
        boxShadow: `0 0 0 1px ${a.focusRing}`,
      },
      sx: {
        "& option": { background: "#0c0d10", color: "var(--color-text-primary)" },
      },
    }),
    [a],
  );

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
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (moduleId !== "all" && it.module_id !== moduleId) return false;
      if (videoId !== "all" && it.video_id !== videoId) return false;
      if (categoryId === "none") {
        if (it.arsenal_category_id) return false;
      } else if (categoryId !== "all") {
        if (it.arsenal_category_id !== categoryId) return false;
      }
      if (!q) return true;
      const hay = [it.filename, it.module_title, it.video_title, it.category_name ?? "", it.course_title].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [items, moduleId, videoId, categoryId, search]);

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
    <Stack gap={6}>
      <HStack align="flex-start" gap={{ base: 3, md: 5 }} flexWrap="wrap">
        <Flex
          align="center"
          justify="center"
          w={{ base: "48px", md: "56px" }}
          h={{ base: "48px", md: "56px" }}
          borderRadius="14px"
          flexShrink={0}
          bg={a.iconBg}
          borderWidth="1px"
          borderColor={a.iconBorder}
          boxShadow={a.iconGlow}
        >
          <HeaderIcon size={26} color="white" strokeWidth={1.75} aria-hidden />
        </Flex>
        <Box flex={1} minW={0}>
          <Text className="radley-regular" fontSize={{ base: "2xl", md: "3xl" }} color="var(--color-text-primary)" mb={2}>
            {title}
          </Text>
          <Text className="inter" fontSize="sm" color="var(--color-text-muted)" maxW="3xl">
            {subtitle}
          </Text>
        </Box>
      </HStack>

      <Box
        className="glass-card-dashboard"
        p={{ base: 4, md: 5 }}
        borderRadius="14px"
        borderWidth="1px"
        borderColor={a.filterBoxBorder}
        position="relative"
        overflow="hidden"
      >
        <Box
          position="absolute"
          top={0}
          right={0}
          w="45%"
          h="55%"
          pointerEvents="none"
          bg={
            accentColor === "purple"
              ? "radial-gradient(circle at 100% 0%, rgba(139, 92, 246, 0.12), transparent 55%)"
              : "radial-gradient(circle at 100% 0%, rgba(255, 130, 70, 0.1), transparent 55%)"
          }
          zIndex={0}
        />
        <Stack gap={4} position="relative" zIndex={1}>
          <Box maxW={{ base: "100%", md: "420px" }}>
            <Text {...labelStyles}>Suche</Text>
            <InputGroup>
              <InputLeftElement pointerEvents="none" h="42px" pl={1}>
                <Search size={18} color={a.searchIcon} strokeWidth={2} />
              </InputLeftElement>
              <Input
                pl={10}
                h="42px"
                borderRadius="10px"
                placeholder="Dateiname, Modul, Video, Kategorie …"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                bg="rgba(7, 8, 10, 0.5)"
                borderColor={a.border}
                color="var(--color-text-primary)"
                _placeholder={{ color: "var(--color-text-tertiary)" }}
                _hover={{ borderColor: a.borderHover }}
                _focusVisible={{ borderColor: a.focus, boxShadow: `0 0 0 1px ${a.focusRing}` }}
                className="inter"
              />
            </InputGroup>
          </Box>

          <HStack flexWrap="wrap" gap={{ base: 3, md: 4 }} align="flex-end">
            <Box minW={{ base: "100%", sm: "200px" }} flex={{ md: 1 }}>
              <Text {...labelStyles}>Modul</Text>
              <Select w="100%" value={moduleId} onChange={(e) => onModuleChange(e.target.value)} className="inter" {...selectFieldProps}>
                <option value="all">Alle Module</option>
                {modules.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </Select>
            </Box>
            <Box minW={{ base: "100%", sm: "200px" }} flex={{ md: 1 }}>
              <Text {...labelStyles}>Video</Text>
              <Select w="100%" value={videoId} onChange={(e) => setVideoId(e.target.value)} className="inter" {...selectFieldProps}>
                <option value="all">Alle Videos</option>
                {videos.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </Select>
            </Box>
            <Box minW={{ base: "100%", sm: "200px" }} flex={{ md: 1 }}>
              <Text {...labelStyles}>Kategorie</Text>
              <Select w="100%" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="inter" {...selectFieldProps}>
                <option value="all">Alle Kategorien</option>
                <option value="none">Ohne Kategorie</option>
                {categories.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </Select>
            </Box>
          </HStack>
        </Stack>
      </Box>

      {filtered.length === 0 ? (
        <Box className="glass-card-dashboard" p={8} borderRadius="14px" textAlign="center" borderWidth="1px" borderColor={a.filterBoxBorder}>
          <Text className="inter" color="var(--color-text-muted)">
            Keine Treffer. Filter oder Suche anpassen — oder es sind noch keine Dateien vom Team hinterlegt.
          </Text>
        </Box>
      ) : (
        <Stack gap={3}>
          {filtered.map((it) => (
            <HStack
              key={it.id}
              className="glass-card-dashboard"
              p={4}
              borderRadius="12px"
              justify="space-between"
              align="center"
              flexWrap="wrap"
              gap={3}
              borderWidth="1px"
              borderColor={a.rowBorder}
              position="relative"
              overflow="hidden"
            >
              <Box
                position="absolute"
                left={0}
                top={0}
                bottom={0}
                w="3px"
                bg={accentColor === "purple" ? "rgba(139, 92, 246, 0.75)" : "rgba(255, 140, 60, 0.75)"}
                borderRadius="sm"
              />
              <HStack minW={0} spacing={3} align="flex-start" pl={2}>
                <Box color={a.fileIcon} pt={0.5} flexShrink={0}>
                  <FileDown size={20} />
                </Box>
                <Stack spacing={1} minW={0}>
                  <HStack flexWrap="wrap" gap={2} align="center">
                    <Text className="inter-semibold" fontSize="sm" color="var(--color-text-primary)" noOfLines={2}>
                      {it.filename}
                    </Text>
                    {it.category_name ? (
                      <Text
                        as="span"
                        fontSize="10px"
                        textTransform="uppercase"
                        letterSpacing="0.06em"
                        px={2}
                        py={0.5}
                        borderRadius="md"
                        borderWidth="1px"
                        borderColor={a.badgeBorder}
                        bg={a.badgeBg}
                        color={a.badgeColor}
                        className="inter-semibold"
                      >
                        {it.category_name}
                      </Text>
                    ) : null}
                  </HStack>
                  <Text className="inter" fontSize="xs" color="var(--color-text-tertiary)">
                    {it.module_title} · {it.video_title}
                  </Text>
                </Stack>
              </HStack>
              <Button
                size="sm"
                onClick={() => void onDownload(it.id, it.filename)}
                isLoading={loadingId === it.id}
                bg={a.downloadBg}
                borderWidth="1px"
                borderColor={a.downloadBorder}
                color="var(--color-text-primary)"
                _hover={{ bg: a.downloadHover }}
                className="inter-medium"
                flexShrink={0}
              >
                Download
              </Button>
            </HStack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
