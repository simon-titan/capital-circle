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

const fieldSx = {
  bg: "rgba(255, 255, 255, 0.03)",
  border: "1px solid",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  color: "var(--cc-text)",
  _hover: { borderColor: "rgba(255, 255, 255, 0.22)" },
  _focusVisible: { borderColor: "var(--cc-gold-line)", boxShadow: "0 0 0 1px var(--cc-gold-line)" },
} as const;

const optionStyle = { background: "var(--cc-panel-solid)" };

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
      <Stack spacing={4} className="cc-card cc-card--still" p={{ base: 4, md: 5 }}>
        <HStack spacing={3} align="center">
          <Box
            w="36px"
            h="36px"
            borderRadius="10px"
            border="1px solid var(--cc-line-strong)"
            bg="rgba(255, 255, 255, 0.02)"
            color="var(--cc-text)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
          >
            <FolderOpen size={17} strokeWidth={1.75} aria-hidden />
          </Box>
          <Stack spacing={0}>
            <Text fontSize="15px" fontWeight={600} color="var(--cc-text)">
              Nicht zugeordnete Module
            </Text>
            <Text fontSize="13px" color="var(--cc-text-2)">
              Diese Module wurden beim Bucket-Scan gefunden, aber noch keinem Kurs zugewiesen.
            </Text>
          </Stack>
          {modules.length > 0 && (
            <Badge
              ml="auto"
              px={2}
              py={0.5}
              borderRadius="full"
              bg="rgba(212, 176, 128, 0.12)"
              color="var(--cc-gold-light)"
              fontSize="11px"
              fontWeight={500}
              textTransform="none"
              className="cc-num"
              flexShrink={0}
            >
              {modules.length}
            </Badge>
          )}
        </HStack>

        {modules.length === 0 ? (
          <Text fontSize="14px" color="var(--cc-text-3)" pl={1}>
            Alle Module sind einem Kurs zugeordnet.
          </Text>
        ) : (
          <Stack spacing={2}>
            {modules.map((mod) => (
              <HStack
                key={mod.id}
                px={4}
                py={2.5}
                borderRadius="10px"
                border="1px solid var(--cc-line)"
                bg="rgba(255, 255, 255, 0.02)"
                spacing={3}
                align="center"
                transition="background-color 150ms var(--cc-ease)"
                _hover={{ bg: "rgba(255, 255, 255, 0.04)" }}
              >
                <Stack flex={1} spacing={0.5} minW={0}>
                  <Text fontSize="14px" fontWeight={500} color="var(--cc-text)" noOfLines={1}>
                    {mod.title}
                  </Text>
                  {mod.storage_folder_key && (
                    <Text className="cc-num" fontSize="11px" color="var(--cc-text-3)" noOfLines={1}>
                      {mod.storage_folder_key}
                    </Text>
                  )}
                </Stack>
                <Button
                  size="sm"
                  variant="line"
                  leftIcon={<ArrowRightLeft size={13} />}
                  flexShrink={0}
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
          <Text fontSize="13px" color="var(--cc-gold-light)">
            Keine Kurse vorhanden. Bitte zuerst einen Kurs anlegen.
          </Text>
        )}
      </Stack>

      <Modal isOpen={assignOpen} onClose={() => !loading && setAssignOpen(false)} isCentered size="md">
        <ModalOverlay bg="rgba(8, 10, 12, 0.72)" backdropFilter="blur(6px)" />
        <ModalContent
          bg="var(--cc-panel-solid)"
          border="1px solid rgba(212, 176, 128, 0.28)"
          borderRadius="12px"
          boxShadow="0 24px 60px rgba(0, 0, 0, 0.6)"
          mx={4}
        >
          <ModalHeader fontSize="17px" fontWeight={600} color="var(--cc-text)">
            Modul einem Kurs zuordnen
          </ModalHeader>
          <ModalCloseButton isDisabled={loading} color="var(--cc-text-2)" />
          <ModalBody>
            <Stack spacing={4}>
              <Text fontSize="14px" lineHeight={1.5} color="var(--cc-text-2)">
                Modul{" "}
                <Text as="span" fontWeight={600} color="var(--cc-text)">
                  „{activeModule?.title}&quot;
                </Text>{" "}
                wird dem gewählten Kurs zugewiesen und dort ans Ende der Modulliste gesetzt.
              </Text>
              <FormControl>
                <FormLabel fontSize="13px" fontWeight={500} color="var(--cc-text-2)">
                  Ziel-Kurs
                </FormLabel>
                <Select
                  value={targetCourseId}
                  onChange={(e) => setTargetCourseId(e.target.value)}
                  {...fieldSx}
                  isDisabled={loading}
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id} style={optionStyle}>
                      {c.title}
                    </option>
                  ))}
                </Select>
              </FormControl>
              {assignError && (
                <Text fontSize="14px" color="var(--cc-danger)">
                  {assignError}
                </Text>
              )}
            </Stack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="line" onClick={() => setAssignOpen(false)} isDisabled={loading}>
              Abbrechen
            </Button>
            <Button
              variant="gold"
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
