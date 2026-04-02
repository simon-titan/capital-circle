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

// Auswählbare Akzentfarben
const COLOR_OPTIONS = [
  { label: "Gold",   value: "rgba(212,175,55,1)",   preview: "#D4AF37" },
  { label: "Blau",   value: "rgba(99,179,237,1)",    preview: "#63B3ED" },
  { label: "Lila",   value: "rgba(154,117,255,1)",   preview: "#9A75FF" },
  { label: "Grün",   value: "rgba(74,222,128,1)",    preview: "#4ADE80" },
  { label: "Orange", value: "rgba(251,146,60,1)",    preview: "#FB923C" },
  { label: "Pink",   value: "rgba(244,114,182,1)",   preview: "#F472B6" },
  { label: "Cyan",   value: "rgba(34,211,238,1)",    preview: "#22D3EE" },
  { label: "Rot",    value: "rgba(248,113,113,1)",   preview: "#F87171" },
];

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
          <Tooltip key={name} label={name} placement="top" hasArrow openDelay={400}>
            <Box
              as="button"
              type="button"
              w="36px"
              h="36px"
              borderRadius="8px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              bg={selected ? "rgba(212,175,55,0.18)" : "rgba(255,255,255,0.04)"}
              borderWidth="1px"
              borderColor={selected ? "rgba(212,175,55,0.7)" : "rgba(255,255,255,0.1)"}
              color={selected ? "var(--color-accent-gold)" : "rgba(240,240,242,0.55)"}
              transition="all 0.15s ease"
              _hover={{ bg: "rgba(212,175,55,0.1)", borderColor: "rgba(212,175,55,0.4)", color: "var(--color-accent-gold)" }}
              onClick={() => onChange(selected ? null : name)}
            >
              <Icon size={16} aria-hidden />
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
    <HStack spacing={2} flexWrap="wrap">
      {COLOR_OPTIONS.map((c) => {
        const selected = value === c.value;
        return (
          <Tooltip key={c.value} label={c.label} placement="top" hasArrow openDelay={400}>
            <Box
              as="button"
              type="button"
              w="28px"
              h="28px"
              borderRadius="full"
              bg={c.preview}
              borderWidth="2px"
              borderColor={selected ? "white" : "transparent"}
              boxShadow={selected ? `0 0 0 2px ${c.preview}` : "none"}
              transition="all 0.15s ease"
              _hover={{ transform: "scale(1.15)" }}
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
                >
                  <Check size={12} color="white" strokeWidth={3} />
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

  const createCourse = async () => {
    setLoading(true);
    setStatus(null);
    const res = await fetch("/api/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, slug, description, is_free: isFree, icon, accent_color: accentColor }),
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
      <Stack
        spacing={4}
        p={{ base: 4, md: 6 }}
        borderRadius="16px"
        border="1px solid rgba(255,255,255,0.08)"
        bg="rgba(255,255,255,0.04)"
        boxShadow="var(--shadow-card, 0 4px 16px rgba(0,0,0,0.6))"
      >
        <Text className="radley-regular" fontSize="2xl" color="whiteAlpha.900">
          Neuen Kurs anlegen
        </Text>
        <FormControl>
          <FormLabel className="inter" fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="gray.500">
            Titel
          </FormLabel>
          <Input
            placeholder="Titel"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            borderColor="whiteAlpha.200"
            _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 3px rgba(59,130,246,0.12)" }}
          />
        </FormControl>
        <FormControl>
          <FormLabel className="inter" fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="gray.500">
            Slug
          </FormLabel>
          <Input
            placeholder="z. B. capital-circle-grundlagen"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            borderColor="whiteAlpha.200"
          />
        </FormControl>
        <FormControl>
          <FormLabel className="inter" fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="gray.500">
            Beschreibung
          </FormLabel>
          <Textarea
            placeholder="Kurzbeschreibung"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            borderColor="whiteAlpha.200"
          />
        </FormControl>
        <FormControl>
          <FormLabel className="inter" fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="gray.500">
            Icon
          </FormLabel>
          <IconPicker value={icon} onChange={setIcon} />
        </FormControl>
        <FormControl>
          <FormLabel className="inter" fontSize="xs" textTransform="uppercase" letterSpacing="0.08em" color="gray.500">
            Akzentfarbe
          </FormLabel>
          <ColorPicker value={accentColor} onChange={setAccentColor} />
        </FormControl>
        <FormControl display="flex" alignItems="center">
          <FormLabel mb={0} className="inter" fontSize="sm" color="gray.300">
            Kostenlos
          </FormLabel>
          <Switch ml={3} isChecked={isFree} onChange={(e) => setIsFree(e.target.checked)} colorScheme="blue" />
        </FormControl>
        <Button
          alignSelf="flex-start"
          colorScheme="blue"
          onClick={() => void createCourse()}
          isLoading={loading}
          isDisabled={!title.trim() || !slug.trim()}
        >
          Kurs erstellen
        </Button>
        {status ? (
          <Text fontSize="sm" className="inter" color="gray.400">
            {status}
          </Text>
        ) : null}
      </Stack>

      <Box>
        <Text className="radley-regular" fontSize="xl" mb={4} color="whiteAlpha.900">
          Vorhandene Kurse
        </Text>
        <Box
          borderRadius="12px"
          border="1px solid rgba(255,255,255,0.07)"
          overflow="hidden"
          bg="#0C0D10"
        >
          <HStack
            px={4}
            py={3}
            borderBottom="1px solid rgba(255,255,255,0.07)"
            bg="rgba(255,255,255,0.02)"
            spacing={4}
            display={{ base: "none", md: "flex" }}
          >
            <Text flex={1} fontSize="11px" className="inter" fontWeight={500} letterSpacing="0.08em" textTransform="uppercase" color="gray.600">
              Titel
            </Text>
            <Text w="140px" fontSize="11px" className="inter" fontWeight={500} letterSpacing="0.08em" textTransform="uppercase" color="gray.600">
              Slug
            </Text>
            <Text w="120px" textAlign="right" fontSize="11px" className="inter" fontWeight={500} letterSpacing="0.08em" textTransform="uppercase" color="gray.600">
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
                py={4}
                borderBottom="1px solid rgba(255,255,255,0.05)"
                spacing={4}
                align="center"
                transition="background 150ms ease"
                _hover={{ bg: "rgba(255,255,255,0.04)" }}
                flexDir={{ base: "column", md: "row" }}
              >
                <Stack flex={1} spacing={1} align="flex-start" minW={0}>
                  <HStack spacing={2} flexWrap="wrap" align="center">
                    {CourseIcon && (
                      <Box
                        w="22px"
                        h="22px"
                        borderRadius="6px"
                        bg={accentPreview ? `${accentPreview}22` : "rgba(255,255,255,0.06)"}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        flexShrink={0}
                      >
                        <CourseIcon size={13} style={{ color: accentPreview ?? "rgba(240,240,242,0.55)" }} aria-hidden />
                      </Box>
                    )}
                    {accentPreview && (
                      <Box w="10px" h="10px" borderRadius="full" bg={accentPreview} flexShrink={0} />
                    )}
                    <Text className="inter" fontSize="sm" fontWeight={500} color="gray.100">
                      {course.title}
                    </Text>
                    {course.is_free && (
                      <Badge colorScheme="green" variant="subtle" fontSize="10px" className="inter">
                        Kostenlos
                      </Badge>
                    )}
                  </HStack>
                  {course.description ? (
                    <Text fontSize="xs" className="inter" color="gray.500" noOfLines={1}>
                      {course.description}
                    </Text>
                  ) : null}
                  <Text fontSize="xs" className="jetbrains-mono" color="gray.600">
                    /{course.slug}
                  </Text>
                </Stack>
                <HStack
                  w={{ base: "full", md: "auto" }}
                  justify={{ base: "flex-start", md: "flex-end" }}
                  spacing={2}
                  flexShrink={0}
                >
                  <Button
                    as={Link}
                    href={`/admin/kurse/${course.id}`}
                    size="sm"
                    colorScheme="blue"
                    variant="solid"
                  >
                    Module verwalten
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    borderColor="whiteAlpha.300"
                    color="gray.200"
                    leftIcon={<Pencil size={14} />}
                    onClick={() => openEdit(course)}
                  >
                    Bearbeiten
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    colorScheme="red"
                    borderColor="red.400"
                    color="red.200"
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
        <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(4px)" />
        <ModalContent
          bg="rgba(10, 11, 14, 0.96)"
          border="1px solid rgba(255,255,255,0.09)"
          borderRadius="24px"
          mx={4}
        >
          <ModalHeader className="radley-regular" fontWeight={400}>
            Kurs bearbeiten
          </ModalHeader>
          <ModalBody>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel fontSize="xs" className="inter" color="gray.500">
                  Titel
                </FormLabel>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} borderColor="whiteAlpha.200" />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="xs" className="inter" color="gray.500">
                  Slug
                </FormLabel>
                <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} borderColor="whiteAlpha.200" />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="xs" className="inter" color="gray.500">
                  Beschreibung
                </FormLabel>
                <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} borderColor="whiteAlpha.200" />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="xs" className="inter" color="gray.500">
                  Icon
                </FormLabel>
                <IconPicker value={editIcon} onChange={setEditIcon} />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="xs" className="inter" color="gray.500">
                  Akzentfarbe
                </FormLabel>
                <ColorPicker value={editAccentColor} onChange={setEditAccentColor} />
              </FormControl>
              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0} className="inter" fontSize="sm">
                  Kostenlos
                </FormLabel>
                <Switch ml={3} isChecked={editFree} onChange={(e) => setEditFree(e.target.checked)} colorScheme="blue" />
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Abbrechen
            </Button>
            <Button colorScheme="blue" onClick={() => void saveEdit()} isLoading={loading}>
              Speichern
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}
