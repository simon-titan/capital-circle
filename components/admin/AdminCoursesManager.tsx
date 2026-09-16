"use client";

import {
  Badge,
  Box,
  Button,
  FormControl,
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
  Switch,
  Text,
  Textarea,
  Tooltip,
  useDisclosure,
} from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Trash2, Check } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type CourseRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  is_free?: boolean;
  icon?: string | null;
  accent_color?: string | null;
  /** Reihenfolge für sequenzielle Kursfreischaltung (kleiner = zuerst). */
  sort_order?: number;
  /** Von der Ketten-Freischaltung ausnehmen (z. B. Trade Recaps). */
  is_sequential_exempt?: boolean;
};

// Auswählbare Icons (Name = Lucide-Key)
const ICON_OPTIONS: string[] = [
  "TrendingUp",
  "BarChart2",
  "Layers",
  "Target",
  "Compass",
  "Lightbulb",
  "Shield",
  "Star",
  "BookOpen",
  "GraduationCap",
  "Brain",
  "Rocket",
  "Trophy",
  "Zap",
  "Globe",
  "PieChart",
  "LineChart",
  "DollarSign",
  "Briefcase",
  "Award",
];

// Auswählbare Akzentfarben — gespeicherte Kursdaten, keine UI-Akzente.
const COLOR_OPTIONS = [
  { label: "Gold",   value: "rgba(212,176,128,1)",   preview: "#d4b080" },
  { label: "Blau",   value: "rgba(99,179,237,1)",    preview: "#63B3ED" },
  { label: "Lila",   value: "rgba(154,117,255,1)",   preview: "#9A75FF" },
  { label: "Grün",   value: "rgba(74,222,128,1)",    preview: "#4ADE80" },
  { label: "Orange", value: "rgba(251,146,60,1)",    preview: "#FB923C" },
  { label: "Pink",   value: "rgba(244,114,182,1)",   preview: "#F472B6" },
  { label: "Cyan",   value: "rgba(34,211,238,1)",    preview: "#22D3EE" },
  { label: "Rot",    value: "rgba(248,113,113,1)",   preview: "#F87171" },
];

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

const labelSx = { fontSize: "13px", fontWeight: 500, color: "var(--cc-text-2)" } as const;

const switchLabelSx = { mb: 0, fontSize: "14px", color: "var(--cc-text-soft)" } as const;

const switchSx = {
  ".chakra-switch__track": { bg: "var(--cc-track)", boxShadow: "inset 0 0 0 1px var(--cc-line-strong)" },
  ".chakra-switch__track[data-checked]": { bg: "var(--cc-gold)", boxShadow: "none" },
} as const;

const pillBase = {
  borderRadius: "full",
  px: 2,
  py: 0.5,
  fontSize: "11px",
  fontWeight: 500,
  textTransform: "none",
  letterSpacing: "normal",
} as const;

const headCellSx = {
  fontSize: "12px",
  fontWeight: 500,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--cc-text-2)",
} as const;

const tooltipSx = { bg: "var(--cc-surface-2)", color: "var(--cc-text)", fontSize: "12px" } as const;

const dangerButton = {
  variant: "line",
  color: "var(--cc-danger)",
  _hover: { bg: "rgba(248, 113, 113, 0.08)", borderColor: "rgba(248, 113, 113, 0.45)", boxShadow: "none" },
} as const;

function getLucideIcon(name: string | null | undefined): LucideIcon | null {
  if (!name) return null;
  const icon = (LucideIcons as unknown as Record<string, LucideIcon>)[name];
  return typeof icon === "function" ? icon : null;
}

function IconPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <SimpleGrid columns={10} gap={1.5}>
      {ICON_OPTIONS.map((name) => {
        const Icon = getLucideIcon(name);
        if (!Icon) return null;
        const selected = value === name;
        return (
          <Tooltip key={name} label={name} placement="top" hasArrow openDelay={400} {...tooltipSx}>
            <Box
              as="button"
              type="button"
              aria-label={name}
              aria-pressed={selected}
              w="36px"
              h="36px"
              borderRadius="8px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              bg={selected ? "rgba(212, 176, 128, 0.12)" : "rgba(255, 255, 255, 0.02)"}
              borderWidth="1px"
              borderColor={selected ? "var(--cc-gold-line)" : "var(--cc-line-strong)"}
              color={selected ? "var(--cc-gold-light)" : "var(--cc-text-2)"}
              transition="background-color 150ms var(--cc-ease), border-color 150ms var(--cc-ease), color 150ms var(--cc-ease)"
              _hover={{ bg: "rgba(212, 176, 128, 0.06)", borderColor: "var(--cc-gold-line)", color: "var(--cc-text)" }}
              onClick={() => onChange(selected ? null : name)}
            >
              <Icon size={16} strokeWidth={1.75} aria-hidden />
            </Box>
          </Tooltip>
        );
      })}
    </SimpleGrid>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <HStack spacing={3} flexWrap="wrap">
      {COLOR_OPTIONS.map((c) => {
        const selected = value === c.value;
        return (
          <Tooltip key={c.value} label={c.label} placement="top" hasArrow openDelay={400} {...tooltipSx}>
            <Box
              as="button"
              type="button"
              aria-label={c.label}
              aria-pressed={selected}
              w="28px"
              h="28px"
              borderRadius="full"
              bg={c.preview}
              border="1px solid var(--cc-line-strong)"
              boxShadow={selected ? "0 0 0 2px var(--cc-panel-solid), 0 0 0 4px var(--cc-gold-line)" : "none"}
              transition="transform 150ms var(--cc-ease), box-shadow 150ms var(--cc-ease)"
              _hover={{ transform: "scale(1.1)" }}
              onClick={() => onChange(selected ? null : c.value)}
              position="relative"
            >
              {selected && (
                <Box
                  position="absolute"
                  inset={0}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  color="var(--cc-bg)"
                >
                  <Check size={12} strokeWidth={3} />
                </Box>
              )}
            </Box>
          </Tooltip>
        );
      })}
    </HStack>
  );
}

export function AdminCoursesManager({ initialCourses }: { initialCourses: CourseRow[] }) {
  const router = useRouter();
  // __unassigned__ ist ein interner Kurs und wird hier nie angezeigt
  const [courses, setCourses] = useState(initialCourses.filter((c) => c.slug !== "__unassigned__"));
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [icon, setIcon] = useState<string | null>(null);
  const [accentColor, setAccentColor] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState(0);
  const [sequentialExempt, setSequentialExempt] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editing, setEditing] = useState<CourseRow | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editFree, setEditFree] = useState(false);
  const [editIcon, setEditIcon] = useState<string | null>(null);
  const [editAccentColor, setEditAccentColor] = useState<string | null>(null);
  const [editSortOrder, setEditSortOrder] = useState(0);
  const [editSequentialExempt, setEditSequentialExempt] = useState(false);

  const createCourse = async () => {
    setLoading(true);
    setStatus(null);
    const res = await fetch("/api/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        slug,
        description,
        is_free: isFree,
        icon,
        accent_color: accentColor,
        sort_order: sortOrder,
        is_sequential_exempt: sequentialExempt,
      }),
    });
    const json = (await res.json()) as { ok?: boolean; item?: CourseRow; error?: string };
    setLoading(false);
    if (!json.ok || !json.item) {
      setStatus(json.error || "Kurs konnte nicht angelegt werden.");
      return;
    }
    setCourses((prev) => [json.item!, ...prev]);
    setTitle("");
    setSlug("");
    setDescription("");
    setIsFree(false);
    setIcon(null);
    setAccentColor(null);
    setSortOrder(0);
    setSequentialExempt(false);
    setStatus("Kurs angelegt.");
    router.refresh();
  };

  const openEdit = (c: CourseRow) => {
    setEditing(c);
    setEditTitle(c.title);
    setEditSlug(c.slug);
    setEditDescription(c.description ?? "");
    setEditFree(Boolean(c.is_free));
    setEditIcon(c.icon ?? null);
    setEditAccentColor(c.accent_color ?? null);
    setEditSortOrder(typeof c.sort_order === "number" ? c.sort_order : 0);
    setEditSequentialExempt(Boolean(c.is_sequential_exempt));
    onOpen();
  };

  const saveEdit = async () => {
    if (!editing) return;
    setLoading(true);
    const res = await fetch("/api/admin/courses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editing.id,
        updates: {
          title: editTitle.trim(),
          slug: editSlug.trim(),
          description: editDescription.trim() || null,
          is_free: editFree,
          icon: editIcon,
          accent_color: editAccentColor,
          sort_order: editSortOrder,
          is_sequential_exempt: editSequentialExempt,
        },
      }),
    });
    const json = (await res.json()) as { ok?: boolean; item?: CourseRow; error?: string };
    setLoading(false);
    if (!json.ok || !json.item) {
      setStatus(json.error || "Speichern fehlgeschlagen.");
      return;
    }
    setCourses((prev) => prev.map((x) => (x.id === json.item!.id ? json.item! : x)));
    onClose();
    setStatus(null);
    router.refresh();
  };

  const deleteCourse = async (c: CourseRow) => {
    if (!confirm(`Kurs „${c.title}" wirklich löschen?`)) return;
    const res = await fetch(`/api/admin/courses?id=${encodeURIComponent(c.id)}`, { method: "DELETE" });
    const json = (await res.json()) as { ok?: boolean };
    if (json.ok) {
      setCourses((prev) => prev.filter((x) => x.id !== c.id));
      router.refresh();
    }
  };

  return (
    <Stack spacing={10}>
      <Stack spacing={4} className="cc-card cc-card--still" p={{ base: 4, md: 6 }}>
        <Text fontSize="18px" fontWeight={600} color="var(--cc-text)">
          Neuen Kurs anlegen
        </Text>
        <FormControl>
          <FormLabel {...labelSx}>Titel</FormLabel>
          <Input placeholder="Titel" value={title} onChange={(e) => setTitle(e.target.value)} {...fieldSx} />
        </FormControl>
        <FormControl>
          <FormLabel {...labelSx}>Slug</FormLabel>
          <Input
            placeholder="z. B. capital-circle-grundlagen"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            {...fieldSx}
          />
        </FormControl>
        <FormControl>
          <FormLabel {...labelSx}>Beschreibung</FormLabel>
          <Textarea
            placeholder="Kurzbeschreibung"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            {...fieldSx}
          />
        </FormControl>
        <FormControl>
          <FormLabel {...labelSx}>Icon</FormLabel>
          <IconPicker value={icon} onChange={setIcon} />
        </FormControl>
        <FormControl>
          <FormLabel {...labelSx}>Akzentfarbe</FormLabel>
          <ColorPicker value={accentColor} onChange={setAccentColor} />
        </FormControl>
        <FormControl display="flex" alignItems="center">
          <FormLabel {...switchLabelSx}>Kostenlos</FormLabel>
          <Switch ml={3} isChecked={isFree} onChange={(e) => setIsFree(e.target.checked)} sx={switchSx} />
        </FormControl>
        <FormControl>
          <FormLabel {...labelSx}>Reihenfolge (sort_order)</FormLabel>
          <Input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number.parseInt(e.target.value, 10) || 0)}
            {...fieldSx}
            className="cc-num"
            maxW="120px"
          />
          <Text fontSize="12px" color="var(--cc-text-3)" mt={1.5}>
            Kleinere Zahl = früher in der Akademie-Kette. Bestimmt die sequenzielle Kursfreischaltung.
          </Text>
        </FormControl>
        <FormControl display="flex" alignItems="center">
          <FormLabel {...switchLabelSx}>Von Kurs-Reihenfolge ausnehmen</FormLabel>
          <Switch
            ml={3}
            isChecked={sequentialExempt}
            onChange={(e) => setSequentialExempt(e.target.checked)}
            sx={switchSx}
          />
        </FormControl>
        <Button
          alignSelf="flex-start"
          variant="gold"
          onClick={() => void createCourse()}
          isLoading={loading}
          isDisabled={!title.trim() || !slug.trim()}
        >
          Kurs erstellen
        </Button>
        {status ? (
          <Text fontSize="14px" color="var(--cc-text-2)">
            {status}
          </Text>
        ) : null}
      </Stack>

      <Box>
        <Text fontSize="18px" fontWeight={600} mb={4} color="var(--cc-text)">
          Vorhandene Kurse
        </Text>
        <Box className="cc-card cc-card--still">
          <HStack
            px={4}
            py={3}
            borderBottom="1px solid var(--cc-line)"
            spacing={4}
            display={{ base: "none", md: "flex" }}
          >
            <Text flex={1} {...headCellSx}>
              Titel
            </Text>
            <Text w="56px" {...headCellSx}>
              #
            </Text>
            <Text w="140px" {...headCellSx}>
              Slug
            </Text>
            <Text w="120px" textAlign="right" {...headCellSx}>
              Aktionen
            </Text>
          </HStack>
          {courses.map((course) => {
            const CourseIcon = getLucideIcon(course.icon);
            const accentPreview = COLOR_OPTIONS.find((c) => c.value === course.accent_color)?.preview;
            return (
              <HStack
                key={course.id}
                px={4}
                py={3.5}
                borderBottom="1px solid var(--cc-line)"
                _last={{ borderBottom: "none" }}
                spacing={4}
                align="center"
                transition="background-color 150ms var(--cc-ease)"
                _hover={{ bg: "rgba(212, 176, 128, 0.05)" }}
                flexDir={{ base: "column", md: "row" }}
              >
                <Stack flex={1} spacing={1} align="flex-start" minW={0}>
                  <HStack spacing={2} flexWrap="wrap" align="center">
                    {CourseIcon && (
                      <Box
                        w="22px"
                        h="22px"
                        borderRadius="6px"
                        bg={accentPreview ? `${accentPreview}22` : "rgba(255, 255, 255, 0.06)"}
                        color={accentPreview ?? "var(--cc-text-2)"}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        flexShrink={0}
                      >
                        <CourseIcon size={13} aria-hidden />
                      </Box>
                    )}
                    {accentPreview && (
                      <Box w="10px" h="10px" borderRadius="full" bg={accentPreview} flexShrink={0} />
                    )}
                    <Text fontSize="14px" fontWeight={500} color="var(--cc-text)">
                      {course.title}
                    </Text>
                    {course.is_free && (
                      <Badge {...pillBase} bg="rgba(212, 176, 128, 0.12)" color="var(--cc-gold-light)">
                        Kostenlos
                      </Badge>
                    )}
                    {course.is_sequential_exempt && (
                      <Badge {...pillBase} bg="rgba(255, 255, 255, 0.06)" color="var(--cc-text-2)">
                        Keine Ketten-Sperre
                      </Badge>
                    )}
                  </HStack>
                  {course.description ? (
                    <Text fontSize="12px" color="var(--cc-text-3)" noOfLines={1}>
                      {course.description}
                    </Text>
                  ) : null}
                  <Text fontSize="12px" className="cc-num" color="var(--cc-text-3)">
                    /{course.slug}
                  </Text>
                </Stack>
                <Text w="56px" fontSize="13px" className="cc-num" color="var(--cc-text-2)" flexShrink={0}>
                  {typeof course.sort_order === "number" ? course.sort_order : 0}
                </Text>
                <HStack
                  w={{ base: "full", md: "auto" }}
                  justify={{ base: "flex-start", md: "flex-end" }}
                  spacing={2}
                  flexShrink={0}
                >
                  <Button as={Link} href={`/admin/kurse/${course.id}`} size="sm" variant="line">
                    Module verwalten
                  </Button>
                  <Button size="sm" variant="line" leftIcon={<Pencil size={14} />} onClick={() => openEdit(course)}>
                    Bearbeiten
                  </Button>
                  <Button
                    size="sm"
                    {...dangerButton}
                    leftIcon={<Trash2 size={14} />}
                    onClick={() => void deleteCourse(course)}
                  >
                    Löschen
                  </Button>
                </HStack>
              </HStack>
            );
          })}
        </Box>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg">
        <ModalOverlay bg="rgba(8, 10, 12, 0.72)" backdropFilter="blur(6px)" />
        <ModalContent
          bg="var(--cc-panel-solid)"
          border="1px solid rgba(212, 176, 128, 0.28)"
          borderRadius="12px"
          boxShadow="0 24px 60px rgba(0, 0, 0, 0.6)"
          mx={4}
        >
          <ModalHeader fontSize="17px" fontWeight={600} color="var(--cc-text)">
            Kurs bearbeiten
          </ModalHeader>
          <ModalBody>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel {...labelSx}>Titel</FormLabel>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} {...fieldSx} />
              </FormControl>
              <FormControl>
                <FormLabel {...labelSx}>Slug</FormLabel>
                <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} {...fieldSx} />
              </FormControl>
              <FormControl>
                <FormLabel {...labelSx}>Beschreibung</FormLabel>
                <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} {...fieldSx} />
              </FormControl>
              <FormControl>
                <FormLabel {...labelSx}>Icon</FormLabel>
                <IconPicker value={editIcon} onChange={setEditIcon} />
              </FormControl>
              <FormControl>
                <FormLabel {...labelSx}>Akzentfarbe</FormLabel>
                <ColorPicker value={editAccentColor} onChange={setEditAccentColor} />
              </FormControl>
              <FormControl display="flex" alignItems="center">
                <FormLabel {...switchLabelSx}>Kostenlos</FormLabel>
                <Switch ml={3} isChecked={editFree} onChange={(e) => setEditFree(e.target.checked)} sx={switchSx} />
              </FormControl>
              <FormControl>
                <FormLabel {...labelSx}>Reihenfolge (sort_order)</FormLabel>
                <Input
                  type="number"
                  value={editSortOrder}
                  onChange={(e) => setEditSortOrder(Number.parseInt(e.target.value, 10) || 0)}
                  {...fieldSx}
                  className="cc-num"
                  maxW="120px"
                />
              </FormControl>
              <FormControl display="flex" alignItems="center">
                <FormLabel {...switchLabelSx}>Von Kurs-Reihenfolge ausnehmen</FormLabel>
                <Switch
                  ml={3}
                  isChecked={editSequentialExempt}
                  onChange={(e) => setEditSequentialExempt(e.target.checked)}
                  sx={switchSx}
                />
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="line" mr={3} onClick={onClose}>
              Abbrechen
            </Button>
            <Button variant="gold" onClick={() => void saveEdit()} isLoading={loading}>
              Speichern
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}
