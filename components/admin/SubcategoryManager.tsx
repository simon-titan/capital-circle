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
    return <Text fontSize="sm" color="gray.500" className="inter">Subkategorien werden geladen…</Text>;
  }

  return (
    <Stack spacing={4}>
      <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap={3}>
        <Box>
          <Text className="radley-regular" fontSize="lg" color="whiteAlpha.950">Subkategorien</Text>
          <Text mt={1} fontSize="sm" color="gray.400" className="inter" maxW="lg">
            Unterthemen innerhalb des Moduls. Videos oben per Zuordnungs-Dropdown einer Subkategorie zuweisen.
          </Text>
        </Box>
        <Button size="md" colorScheme="blue" variant="solid" onClick={onOpen} flexShrink={0}>
          Subkategorie anlegen
        </Button>
      </HStack>

      {items.length === 0 ? (
        <Text fontSize="sm" color="gray.400" className="inter">
          Keine Subkategorien — Videos liegen direkt im Modul, oder lege oben eine Subkategorie an.
        </Text>
      ) : (
        <DraggableList
          items={items}
          onReorder={onReorder}
          renderItem={(item, handle) => (
            <HStack
              key={item.id}
              py={3}
              px={{ base: 3, md: 4 }}
              mb={2}
              borderRadius="12px"
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              bg="rgba(255,255,255,0.04)"
              spacing={3}
              flexWrap="wrap"
            >
              {handle}
              <Text flex={1} className="inter" fontSize="sm" fontWeight="500" color="gray.100" minW={0}>
                {item.title}
              </Text>
              <Button size="sm" variant="outline" borderColor="whiteAlpha.400" color="gray.100" leftIcon={<Pencil size={14} />} onClick={() => openEdit(item)}>
                Bearbeiten
              </Button>
              <Button size="sm" variant="outline" colorScheme="red" borderWidth="2px" borderColor="red.400" color="red.100" leftIcon={<Trash2 size={14} />} onClick={() => void remove(item.id)}>
                Löschen
              </Button>
            </HStack>
          )}
        />
      )}

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(4px)" />
        <ModalContent bg="rgba(10, 11, 14, 0.96)" border="1px solid rgba(255,255,255,0.09)" borderRadius="24px" mx={4}>
          <ModalHeader className="radley-regular" fontWeight={400}>Neue Subkategorie</ModalHeader>
          <ModalBody>
            <Input placeholder="Titel" value={title} onChange={(e) => setTitle(e.target.value)} borderColor="whiteAlpha.200" _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 3px rgba(59,130,246,0.12)" }} />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>Abbrechen</Button>
            <Button colorScheme="blue" onClick={() => void add()} isLoading={saving} isDisabled={!title.trim()}>Anlegen</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isEditOpen} onClose={() => { onEditClose(); setEditId(null); }} isCentered>
        <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(4px)" />
        <ModalContent bg="rgba(10, 11, 14, 0.96)" border="1px solid rgba(255,255,255,0.09)" borderRadius="24px" mx={4}>
          <ModalHeader className="radley-regular" fontWeight={400}>Subkategorie bearbeiten</ModalHeader>
          <ModalBody>
            <Stack spacing={3}>
              <Input placeholder="Titel" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} borderColor="whiteAlpha.200" _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 3px rgba(59,130,246,0.12)" }} />
              <Textarea placeholder="Beschreibung (optional)" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={4} borderColor="whiteAlpha.200" _focus={{ borderColor: "blue.500", boxShadow: "0 0 0 3px rgba(59,130,246,0.12)" }} />
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => { onEditClose(); setEditId(null); }}>Abbrechen</Button>
            <Button colorScheme="blue" onClick={() => void saveEdit()} isLoading={editSaving} isDisabled={!editTitle.trim()}>Speichern</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}
