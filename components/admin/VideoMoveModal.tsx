"use client";

import {
  Button,
  FormControl,
  FormLabel,
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
import { useCallback, useEffect, useState } from "react";

type CourseOption = { id: string; title: string; slug: string };
type ModuleOption = { id: string; title: string };
type SubcategoryOption = { id: string; title: string };

const UNASSIGNED_SLUG = "__unassigned__";
const DIRECT = "__direct__";

export function VideoMoveModal({
  isOpen,
  onClose,
  video,
  currentCourseId,
  currentModuleId,
  onMoved,
}: {
  isOpen: boolean;
  onClose: () => void;
  video: { id: string; title: string } | null;
  /** Vorauswahl des aktuellen Kurses */
  currentCourseId: string;
  /** Aktuelles Modul des Videos (für „bereits hier“-Hinweis) */
  currentModuleId: string;
  /** Nach erfolgreichem Verschieben: Inhalte neu laden */
  onMoved: () => void | Promise<void>;
}) {
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryOption[]>([]);

  const [courseId, setCourseId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [target, setTarget] = useState(DIRECT);

  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingModules, setLoadingModules] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kurse laden, sobald das Modal geöffnet wird
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void (async () => {
      setError(null);
      setLoadingCourses(true);
      const res = await fetch("/api/admin/courses");
      const json = (await res.json()) as { ok?: boolean; items?: CourseOption[] };
      if (cancelled) return;
      const list = (json.items ?? []).filter((c) => c.slug !== UNASSIGNED_SLUG);
      setCourses(list);
      const initial = list.some((c) => c.id === currentCourseId) ? currentCourseId : (list[0]?.id ?? "");
      setCourseId(initial);
      setLoadingCourses(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, currentCourseId]);

  // Module des gewählten Kurses laden
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!isOpen || !courseId) {
        setModules([]);
        setModuleId("");
        return;
      }
      setLoadingModules(true);
      const res = await fetch(`/api/admin/modules?courseId=${encodeURIComponent(courseId)}`);
      const json = (await res.json()) as { ok?: boolean; items?: ModuleOption[] };
      if (cancelled) return;
      const list = json.items ?? [];
      setModules(list);
      setModuleId(list[0]?.id ?? "");
      setLoadingModules(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, courseId]);

  // Subkategorien des gewählten Moduls laden
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!isOpen || !moduleId) {
        setSubcategories([]);
        setTarget(DIRECT);
        return;
      }
      const res = await fetch(`/api/admin/subcategories?moduleId=${encodeURIComponent(moduleId)}`);
      const json = (await res.json()) as { ok?: boolean; items?: SubcategoryOption[] };
      if (cancelled) return;
      setSubcategories(json.items ?? []);
      setTarget(DIRECT);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, moduleId]);

  const confirmMove = useCallback(async () => {
    if (!video?.id || !moduleId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/videos/${video.id}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetModuleId: moduleId,
          targetSubcategoryId: target === DIRECT ? null : target,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!json.ok) {
        setError(
          json.error === "already_in_target"
            ? "Das Video liegt bereits an diesem Ort."
            : (json.error ?? "Verschieben fehlgeschlagen."),
        );
        setSaving(false);
        return;
      }
      await onMoved();
      setSaving(false);
      onClose();
    } catch {
      setError("Netzwerkfehler.");
      setSaving(false);
    }
  }, [video, moduleId, target, onMoved, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={() => !saving && onClose()} isCentered size="md">
      <ModalOverlay bg="rgba(7, 8, 10, 0.75)" backdropFilter="blur(8px)" />
      <ModalContent bg="gray.900" borderWidth="1px" borderColor="whiteAlpha.200">
        <ModalHeader className="inter-semibold" fontWeight={600} color="gray.100">
          Video verschieben
        </ModalHeader>
        <ModalCloseButton isDisabled={saving} />
        <ModalBody>
          <Stack spacing={4}>
            {video ? (
              <Text className="inter" fontSize="sm" color="gray.400">
                „<Text as="span" fontWeight={600} color="gray.200">{video.title}</Text>“ in ein anderes
                Modul/Subkategorie legen. Der Lernfortschritt der Mitglieder wird übernommen.
              </Text>
            ) : null}

            <FormControl>
              <FormLabel className="inter" fontSize="xs" color="gray.500">Kurs</FormLabel>
              <Select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                borderColor="whiteAlpha.200"
                isDisabled={saving || loadingCourses}
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel className="inter" fontSize="xs" color="gray.500">Modul</FormLabel>
              <Select
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
                borderColor="whiteAlpha.200"
                isDisabled={saving || loadingModules || modules.length === 0}
              >
                {modules.length === 0 ? <option value="">Keine Module</option> : null}
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}{m.id === currentModuleId ? " (aktuelles Modul)" : ""}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel className="inter" fontSize="xs" color="gray.500">Ziel im Modul</FormLabel>
              <Select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                borderColor="whiteAlpha.200"
                isDisabled={saving}
              >
                <option value={DIRECT}>— direkt im Modul —</option>
                {subcategories.map((s) => (
                  <option key={s.id} value={s.id}>Subkategorie: {s.title}</option>
                ))}
              </Select>
            </FormControl>

            {error ? (
              <Text className="inter" fontSize="sm" color="red.300">{error}</Text>
            ) : null}
          </Stack>
        </ModalBody>
        <ModalFooter gap={3}>
          <Button variant="ghost" onClick={onClose} isDisabled={saving}>Abbrechen</Button>
          <Button
            colorScheme="yellow"
            onClick={() => void confirmMove()}
            isLoading={saving}
            isDisabled={!moduleId}
          >
            Verschieben
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
