"use client";

import {
  Box,
  Button,
  HStack,
  Input,
  Stack,
  Text,
  Textarea,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@chakra-ui/react";
import { Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DraggableList } from "@/components/admin/DraggableList";

export type SubcategoryRow = {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  position: number;
  created_at: string;
};

type SubcategoryManagerProps = {
  moduleId: string;
  /** Wenn von ModuleForm gesteuert: externer State */
  subcategories?: SubcategoryRow[];
  onSubcategoriesChange?: (updater: SubcategoryRow[] | ((prev: SubcategoryRow[]) => SubcategoryRow[])) => void;
};

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

const modalContentProps = {
  bg: "var(--cc-panel-solid)",
  border: "1px solid rgba(212, 176, 128, 0.28)",
  borderRadius: "12px",
  boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6)",
  mx: 4,
} as const;

const dangerButton = {
  variant: "line",
  color: "var(--cc-danger)",
  _hover: { bg: "rgba(248, 113, 113, 0.08)", borderColor: "rgba(248, 113, 113, 0.45)", boxShadow: "none" },
} as const;

export function SubcategoryManager({
  moduleId,
  subcategories: externalSubs,
  onSubcategoriesChange,
}: SubcategoryManagerProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure();

  const isExternal = externalSubs !== undefined && onSubcategoriesChange !== undefined;
  const [internalItems, setInternalItems] = useState<SubcategoryRow[]>([]);
  const [loading, setLoading] = useState(!isExternal);

  const items = isExternal ? externalSubs : internalItems;
  const setItems = (updater: SubcategoryRow[] | ((prev: SubcategoryRow[]) => SubcategoryRow[])) => {
    if (isExternal) {
      onSubcategoriesChange!(updater);
    } else {
      setInternalItems(typeof updater === "function" ? updater : () => updater);
    }
  };

  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    if (isExternal) return;
    const res = await fetch(`/api/admin/subcategories?moduleId=${encodeURIComponent(moduleId)}`);
    const json = (await res.json()) as { ok?: boolean; items?: SubcategoryRow[] };
    if (json.ok && json.items) setInternalItems(json.items);
    setLoading(false);
  }, [moduleId, isExternal]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const add = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/subcategories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module_id: moduleId, title: title.trim(), position: items.length }),
    });
    const json = (await res.json()) as { ok?: boolean; item?: SubcategoryRow };
    setSaving(false);
    if (json.ok && json.item) {
      setItems((prev) => [...prev, json.item!]);
      setTitle("");
      onClose();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Subkategorie wirklich löschen? Zugehörige Videos werden mit gelöscht.")) return;
    const res = await fetch(`/api/admin/subcategories?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const json = (await res.json()) as { ok?: boolean };
    if (json.ok) setItems((prev) => prev.filter((x) => x.id !== id));
  };

  const openEdit = (row: SubcategoryRow) => {
    setEditId(row.id);
    setEditTitle(row.title);
    setEditDescription(row.description ?? "");
    onEditOpen();
  };

  const saveEdit = async () => {
    if (!editId || !editTitle.trim()) return;
    setEditSaving(true);
    const res = await fetch("/api/admin/subcategories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editId, updates: { title: editTitle.trim(), description: editDescription.trim() || null } }),
    });
    const json = (await res.json()) as { ok?: boolean; item?: SubcategoryRow };
    setEditSaving(false);
    if (json.ok && json.item) {
      setItems((prev) => prev.map((x) => (x.id === json.item!.id ? (json.item as SubcategoryRow) : x)));
      onEditClose();
      setEditId(null);
    }
  };

  const onReorder = async (orderedIds: string[]) => {
    const next = orderedIds.map((id, position) => {
      const row = items.find((x) => x.id === id);
      return row ? { ...row, position } : null;
    }).filter(Boolean) as SubcategoryRow[];
    setItems(next);
    await fetch("/api/admin/subcategories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reorder: true, moduleId, orderedSubcategoryIds: orderedIds }),
    });
  };

  if (loading) {
    return <Text fontSize="14px" color="var(--cc-text-3)">Subkategorien werden geladen…</Text>;
  }

  return (
    <Stack spacing={4}>
      <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap={3}>
        <Box>
          <Text fontSize="15px" fontWeight={600} color="var(--cc-text)">Subkategorien</Text>
          <Text mt={1} fontSize="14px" color="var(--cc-text-2)" maxW="lg">
            Unterthemen innerhalb des Moduls. Videos oben per Zuordnungs-Dropdown einer Subkategorie zuweisen.
          </Text>
        </Box>
        <Button size="sm" variant="gold" onClick={onOpen} flexShrink={0}>
          Subkategorie anlegen
        </Button>
      </HStack>

      {items.length === 0 ? (
        <Text fontSize="14px" color="var(--cc-text-2)">
          Keine Subkategorien — Videos liegen direkt im Modul, oder lege oben eine Subkategorie an.
        </Text>
      ) : (
        <DraggableList
          items={items}
          onReorder={onReorder}
          renderItem={(item, handle) => (
            <HStack
              key={item.id}
              py={2.5}
              px={{ base: 3, md: 4 }}
              mb={2}
              borderRadius="10px"
              border="1px solid var(--cc-line)"
              bg="rgba(255, 255, 255, 0.02)"
              spacing={3}
              flexWrap="wrap"
              transition="background-color 150ms var(--cc-ease)"
              _hover={{ bg: "rgba(255, 255, 255, 0.04)" }}
            >
              {handle}
              <Text flex={1} fontSize="14px" fontWeight={500} color="var(--cc-text)" minW={0}>
                {item.title}
              </Text>
              <Button size="sm" variant="line" leftIcon={<Pencil size={14} />} onClick={() => openEdit(item)}>
                Bearbeiten
              </Button>
              <Button size="sm" {...dangerButton} leftIcon={<Trash2 size={14} />} onClick={() => void remove(item.id)}>
                Löschen
              </Button>
            </HStack>
          )}
        />
      )}

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay bg="rgba(8, 10, 12, 0.72)" backdropFilter="blur(6px)" />
        <ModalContent {...modalContentProps}>
          <ModalHeader fontSize="17px" fontWeight={600} color="var(--cc-text)">Neue Subkategorie</ModalHeader>
          <ModalBody>
            <Input placeholder="Titel" value={title} onChange={(e) => setTitle(e.target.value)} {...fieldSx} />
          </ModalBody>
          <ModalFooter>
            <Button variant="line" mr={3} onClick={onClose}>Abbrechen</Button>
            <Button variant="gold" onClick={() => void add()} isLoading={saving} isDisabled={!title.trim()}>Anlegen</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isEditOpen} onClose={() => { onEditClose(); setEditId(null); }} isCentered>
        <ModalOverlay bg="rgba(8, 10, 12, 0.72)" backdropFilter="blur(6px)" />
        <ModalContent {...modalContentProps}>
          <ModalHeader fontSize="17px" fontWeight={600} color="var(--cc-text)">Subkategorie bearbeiten</ModalHeader>
          <ModalBody>
            <Stack spacing={3}>
              <Input placeholder="Titel" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} {...fieldSx} />
              <Textarea placeholder="Beschreibung (optional)" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={4} {...fieldSx} />
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="line" mr={3} onClick={() => { onEditClose(); setEditId(null); }}>Abbrechen</Button>
            <Button variant="gold" onClick={() => void saveEdit()} isLoading={editSaving} isDisabled={!editTitle.trim()}>Speichern</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}
