"use client";

import {
  Badge,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
  Text,
} from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { DraggableList } from "@/components/admin/DraggableList";
import { ArrowRightLeft, Pencil } from "lucide-react";
import { UNASSIGNED_COURSE_ID } from "@/lib/scan-modules";

type Mod = { id: string; title: string; order_index: number };

type CourseOption = { id: string; title: string };

export function CourseModulesDraggable({
  courseId,
  initialModules,
  allCourses = [],
}: {
  courseId: string;
  initialModules: Mod[];
  /** Alle Kurse für „Modul verschieben“ (ohne aktuellen werden gefiltert) */
  allCourses?: CourseOption[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialModules);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveModule, setMoveModule] = useState<Mod | null>(null);
  const [targetCourseId, setTargetCourseId] = useState("");
  const [moveLoading, setMoveLoading] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  // Verschieben ist nur im "Nicht zugeordnet"-Kurs erlaubt.
  // Einmal einem echten Kurs zugeordnet, bleibt ein Modul dort.
  const canMove = courseId === UNASSIGNED_COURSE_ID;

  const otherCourses = useMemo(
    () => allCourses.filter((c) => c.id !== courseId && c.id !== UNASSIGNED_COURSE_ID),
    [allCourses, courseId],
  );

  const openMove = useCallback(
    (m: Mod) => {
      setMoveModule(m);
      setMoveError(null);
      setTargetCourseId(otherCourses[0]?.id ?? "");
      setMoveOpen(true);
    },
    [otherCourses],
  );

  const confirmMove = useCallback(async () => {
    if (!moveModule?.id || !targetCourseId) return;
    setMoveLoading(true);
    setMoveError(null);
    try {
      const res = await fetch(`/api/admin/modules/${moveModule.id}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetCourseId }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!json.ok) {
        setMoveError(json.error ?? "Verschieben fehlgeschlagen.");
        setMoveLoading(false);
        return;
      }
      setMoveOpen(false);
      setMoveModule(null);
      router.refresh();
    } catch {
      setMoveError("Netzwerkfehler.");
    }
    setMoveLoading(false);
  }, [moveModule, router, targetCourseId]);

  const onReorder = useCallback(
    async (orderedIds: string[]) => {
      setItems((prev) => {
        const map = new Map(prev.map((m) => [m.id, m]));
        return orderedIds
          .map((id, idx) => {
            const row = map.get(id);
            return row ? { ...row, order_index: idx + 1 } : null;
          })
          .filter(Boolean) as Mod[];
      });
      await fetch("/api/admin/modules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reorder: true, courseId, orderedModuleIds: orderedIds }),
      });
      router.refresh();
    },
    [courseId, router],
  );

  if (items.length === 0) {
    return (
      <Text className="inter" fontSize="sm" color="gray.400">
        Noch keine Module — oben auf „+ Neues Modul" klicken.
      </Text>
    );
  }

  return (
    <>
    <DraggableList
      items={items}
      onReorder={onReorder}
      renderItem={(item, handle) => (
        <HStack
          key={item.id}
          align="center"
          py={3.5}
          px={4}
          mb={2}
          borderRadius="16px"
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          bg="rgba(255,255,255,0.05)"
          spacing={3}
          transition="background 150ms"
          _hover={{ bg: "rgba(255,255,255,0.08)" }}
        >
          {handle}
          <Stack flex={1} spacing={0.5} minW={0}>
            <Text className="inter" fontSize="sm" fontWeight={500} color="gray.100" noOfLines={1}>
              {item.title}
            </Text>
          </Stack>
          <Badge
            px={2}
            py={0.5}
            borderRadius="md"
            variant="subtle"
            colorScheme="blue"
            fontSize="xs"
            className="inter"
            flexShrink={0}
          >
            #{item.order_index}
          </Badge>
          <Button
            as={Link}
            href={`/admin/kurse/${courseId}/module/${item.id}`}
            size="sm"
            colorScheme="blue"
            variant="solid"
            leftIcon={<Pencil size={14} />}
            flexShrink={0}
          >
            Bearbeiten
          </Button>
          {canMove && otherCourses.length > 0 ? (
            <Button
              size="sm"
              variant="outline"
              borderColor="whiteAlpha.300"
              color="gray.200"
              leftIcon={<ArrowRightLeft size={14} />}
              flexShrink={0}
              onClick={() => openMove(item)}
            >
              Verschieben
            </Button>
          ) : null}
        </HStack>
      )}
    />
    <Modal isOpen={moveOpen} onClose={() => !moveLoading && setMoveOpen(false)} isCentered size="md">
      <ModalOverlay bg="rgba(7, 8, 10, 0.75)" backdropFilter="blur(8px)" />
      <ModalContent bg="gray.900" borderWidth="1px" borderColor="whiteAlpha.200">
        <ModalHeader className="inter-semibold" fontWeight={600} color="gray.100">
          Modul verschieben
        </ModalHeader>
        <ModalCloseButton isDisabled={moveLoading} />
        <ModalBody>
          <Stack spacing={4}>
            <Text className="inter" fontSize="sm" color="gray.400">
              {moveModule ? (
                <>
                  „<Text as="span" fontWeight={600} color="gray.200">{moveModule.title}</Text>“ in einen anderen Kurs legen.
                  Reihenfolge dort: ans Ende der Liste.
                </>
              ) : null}
            </Text>
            <FormControl>
              <FormLabel className="inter" fontSize="xs" color="gray.500">
                Ziel-Kurs
              </FormLabel>
              <Select
                value={targetCourseId}
                onChange={(e) => setTargetCourseId(e.target.value)}
                borderColor="whiteAlpha.200"
                isDisabled={moveLoading}
              >
                {otherCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </Select>
            </FormControl>
            {moveError ? (
              <Text className="inter" fontSize="sm" color="red.300">
                {moveError}
              </Text>
            ) : null}
          </Stack>
        </ModalBody>
        <ModalFooter gap={3}>
          <Button variant="ghost" onClick={() => setMoveOpen(false)} isDisabled={moveLoading}>
            Abbrechen
          </Button>
          <Button colorScheme="yellow" onClick={() => void confirmMove()} isLoading={moveLoading} isDisabled={!targetCourseId}>
            Verschieben
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
    </>
  );
}
