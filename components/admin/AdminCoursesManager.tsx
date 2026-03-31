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
  Stack,
  Switch,
  Text,
  Textarea,
  useDisclosure,
} from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

export type CourseRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  is_free?: boolean;
};

export function AdminCoursesManager({ initialCourses }: { initialCourses: CourseRow[] }) {
  const router = useRouter();
  const [courses, setCourses] = useState(initialCourses);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editing, setEditing] = useState<CourseRow | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editFree, setEditFree] = useState(false);

  const createCourse = async () => {
    setLoading(true);
    setStatus(null);
    const res = await fetch("/api/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, slug, description, is_free: isFree }),
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
    setStatus("Kurs angelegt.");
    router.refresh();
  };

  const openEdit = (c: CourseRow) => {
    setEditing(c);
    setEditTitle(c.title);
    setEditSlug(c.slug);
    setEditDescription(c.description ?? "");
    setEditFree(Boolean(c.is_free));
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
    if (!confirm(`Kurs „${c.title}“ wirklich löschen?`)) return;
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
          {courses.map((course) => (
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
                <HStack spacing={2} flexWrap="wrap">
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
          ))}
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
