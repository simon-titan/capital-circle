"use client";

import {
  Badge,
  Box,
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
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ArrowRightLeft, FolderOpen } from "lucide-react";

type ModuleRow = { id: string; title: string; storage_folder_key: string | null };
type CourseOption = { id: string; title: string };

export function UnassignedModulesManager({
  initialModules,
  courses,
}: {
  initialModules: ModuleRow[];
  /** Alle echten Kurse (ohne __unassigned__) */
  courses: CourseOption[];
}) {
  const router = useRouter();
  const [modules, setModules] = useState(initialModules);
  const [assignOpen, setAssignOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleRow | null>(null);
  const [targetCourseId, setTargetCourseId] = useState(courses[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const openAssign = useCallback(
    (mod: ModuleRow) => {
      setActiveModule(mod);
      setAssignError(null);
      setTargetCourseId(courses[0]?.id ?? "");
      setAssignOpen(true);
    },
    [courses],
  );

  const confirmAssign = useCallback(async () => {
    if (!activeModule?.id || !targetCourseId) return;
    setLoading(true);
    setAssignError(null);
    try {
      const res = await fetch(`/api/admin/modules/${activeModule.id}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetCourseId }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!json.ok) {
        setAssignError(json.error ?? "Zuordnung fehlgeschlagen.");
        setLoading(false);
        return;
      }
      setModules((prev) => prev.filter((m) => m.id !== activeModule.id));
      setAssignOpen(false);
      setActiveModule(null);
      router.refresh();
    } catch {
      setAssignError("Netzwerkfehler.");
    }
    setLoading(false);
  }, [activeModule, router, targetCourseId]);

  return (
    <>
      <Stack
        spacing={4}
        p={{ base: 4, md: 6 }}
        borderRadius="16px"
        border="1px solid rgba(212,175,55,0.25)"
        bg="rgba(212,175,55,0.04)"
        boxShadow="0 0 0 1px rgba(212,175,55,0.08)"
      >
        <HStack spacing={3} align="center">
          <Box
            w="32px"
            h="32px"
            borderRadius="8px"
            bg="rgba(212,175,55,0.12)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
          >
            <FolderOpen size={16} color="rgba(212,175,55,0.9)" aria-hidden />
          </Box>
          <Stack spacing={0}>
            <Text className="inter-semibold" fontSize="sm" color="gray.100">
              Nicht zugeordnete Module
            </Text>
            <Text className="inter" fontSize="xs" color="gray.500">
              Diese Module wurden beim Bucket-Scan gefunden, aber noch keinem Kurs zugewiesen.
            </Text>
          </Stack>
          {modules.length > 0 && (
            <Badge
              ml="auto"
              px={2}
              py={0.5}
              borderRadius="full"
              bg="rgba(212,175,55,0.15)"
              color="rgba(212,175,55,0.9)"
              fontSize="xs"
              className="inter"
              flexShrink={0}
            >
              {modules.length}
            </Badge>
          )}
        </HStack>

        {modules.length === 0 ? (
          <Text className="inter" fontSize="sm" color="gray.500" pl={1}>
            Alle Module sind einem Kurs zugeordnet.
          </Text>
        ) : (
          <Stack spacing={2}>
            {modules.map((mod) => (
              <HStack
                key={mod.id}
                px={4}
                py={3}
                borderRadius="12px"
                border="1px solid rgba(255,255,255,0.07)"
                bg="rgba(255,255,255,0.03)"
                spacing={3}
                align="center"
                transition="background 150ms"
                _hover={{ bg: "rgba(255,255,255,0.06)" }}
              >
                <Stack flex={1} spacing={0.5} minW={0}>
                  <Text className="inter" fontSize="sm" fontWeight={500} color="gray.100" noOfLines={1}>
                    {mod.title}
                  </Text>
                  {mod.storage_folder_key && (
                    <Text className="jetbrains-mono" fontSize="10px" color="gray.600" noOfLines={1}>
                      {mod.storage_folder_key}
                    </Text>
                  )}
                </Stack>
                <Button
                  size="sm"
                  variant="outline"
                  borderColor="rgba(212,175,55,0.4)"
                  color="rgba(212,175,55,0.9)"
                  leftIcon={<ArrowRightLeft size={13} />}
                  flexShrink={0}
                  _hover={{ bg: "rgba(212,175,55,0.08)", borderColor: "rgba(212,175,55,0.7)" }}
                  onClick={() => openAssign(mod)}
                  isDisabled={courses.length === 0}
                >
                  Kurs zuordnen
                </Button>
              </HStack>
            ))}
          </Stack>
        )}

        {courses.length === 0 && modules.length > 0 && (
          <Text className="inter" fontSize="xs" color="orange.400">
            Keine Kurse vorhanden. Bitte zuerst einen Kurs anlegen.
          </Text>
        )}
      </Stack>

      <Modal isOpen={assignOpen} onClose={() => !loading && setAssignOpen(false)} isCentered size="md">
        <ModalOverlay bg="rgba(7, 8, 10, 0.8)" backdropFilter="blur(8px)" />
        <ModalContent
          bg="rgba(10, 11, 14, 0.97)"
          border="1px solid rgba(255,255,255,0.09)"
          borderRadius="20px"
          mx={4}
        >
          <ModalHeader className="radley-regular" fontWeight={400} color="gray.100">
            Modul einem Kurs zuordnen
          </ModalHeader>
          <ModalCloseButton isDisabled={loading} />
          <ModalBody>
            <Stack spacing={4}>
              <Text className="inter" fontSize="sm" color="gray.400">
                Modul{" "}
                <Text as="span" fontWeight={600} color="gray.200">
                  „{activeModule?.title}"
                </Text>{" "}
                wird dem gewählten Kurs zugewiesen und dort ans Ende der Modulliste gesetzt.
              </Text>
              <FormControl>
                <FormLabel className="inter" fontSize="xs" color="gray.500">
                  Ziel-Kurs
                </FormLabel>
                <Select
                  value={targetCourseId}
                  onChange={(e) => setTargetCourseId(e.target.value)}
                  borderColor="whiteAlpha.200"
                  isDisabled={loading}
                  className="inter"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </Select>
              </FormControl>
              {assignError && (
                <Text className="inter" fontSize="sm" color="red.300">
                  {assignError}
                </Text>
              )}
            </Stack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={() => setAssignOpen(false)} isDisabled={loading} color="gray.400">
              Abbrechen
            </Button>
            <Button
              bg="rgba(212,175,55,0.9)"
              color="black"
              _hover={{ bg: "rgba(212,175,55,1)" }}
              onClick={() => void confirmAssign()}
              isLoading={loading}
              isDisabled={!targetCourseId}
            >
              Zuordnen
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
