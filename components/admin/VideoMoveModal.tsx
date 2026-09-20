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

const fieldSx = {
  bg: "rgba(255, 255, 255, 0.03)",
  border: "1px solid",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  color: "var(--cc-text)",
  _hover: { borderColor: "rgba(255, 255, 255, 0.22)" },
  _focusVisible: { borderColor: "var(--cc-gold-line)", boxShadow: "0 0 0 1px var(--cc-gold-line)" },
} as const;

const labelSx = { fontSize: "13px", fontWeight: 500, color: "var(--cc-text-2)" } as const;

const optionStyle = { background: "var(--cc-panel-solid)" };

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
      <ModalOverlay bg="rgba(8, 10, 12, 0.72)" backdropFilter="blur(6px)" />
      <ModalContent
        bg="var(--cc-panel-solid)"
        border="1px solid rgba(212, 176, 128, 0.28)"
        borderRadius="12px"
        boxShadow="0 24px 60px rgba(0, 0, 0, 0.6)"
        mx={4}
      >
        <ModalHeader fontSize="17px" fontWeight={600} color="var(--cc-text)">
          Video verschieben
        </ModalHeader>
        <ModalCloseButton isDisabled={saving} color="var(--cc-text-2)" />
        <ModalBody>
          <Stack spacing={4}>
            {video ? (
              <Text fontSize="14px" lineHeight={1.5} color="var(--cc-text-2)">
                „<Text as="span" fontWeight={600} color="var(--cc-text)">{video.title}</Text>“ in ein anderes
                Modul/Subkategorie legen. Der Lernfortschritt der Mitglieder wird übernommen.
              </Text>
            ) : null}

            <FormControl>
              <FormLabel {...labelSx}>Kurs</FormLabel>
              <Select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                {...fieldSx}
                isDisabled={saving || loadingCourses}
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id} style={optionStyle}>{c.title}</option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel {...labelSx}>Modul</FormLabel>
              <Select
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
                {...fieldSx}
                isDisabled={saving || loadingModules || modules.length === 0}
              >
                {modules.length === 0 ? <option value="" style={optionStyle}>Keine Module</option> : null}
                {modules.map((m) => (
                  <option key={m.id} value={m.id} style={optionStyle}>
                    {m.title}{m.id === currentModuleId ? " (aktuelles Modul)" : ""}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel {...labelSx}>Ziel im Modul</FormLabel>
              <Select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                {...fieldSx}
                isDisabled={saving}
              >
                <option value={DIRECT} style={optionStyle}>(direkt im Modul)</option>
                {subcategories.map((s) => (
                  <option key={s.id} value={s.id} style={optionStyle}>Subkategorie: {s.title}</option>
                ))}
              </Select>
            </FormControl>

            {error ? (
              <Text fontSize="14px" color="var(--cc-danger)">{error}</Text>
            ) : null}
          </Stack>
        </ModalBody>
        <ModalFooter gap={3}>
          <Button variant="line" onClick={onClose} isDisabled={saving}>Abbrechen</Button>
          <Button
            variant="gold"
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
