"use client";

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Box } from "@chakra-ui/react";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";

export type DraggableItem = { id: string };

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (dragHandleProps: Record<string, unknown>) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <Box ref={setNodeRef} style={style} position="relative">
      {children({ ...attributes, ...listeners })}
    </Box>
  );
}

type DraggableListProps<T extends DraggableItem> = {
  items: T[];
  onReorder: (orderedIds: string[]) => void;
  renderItem: (item: T, dragHandle: ReactNode) => ReactNode;
};

export function DraggableList<T extends DraggableItem>({ items, onReorder, renderItem }: DraggableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ids = items.map((i) => i.id);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(items, oldIndex, newIndex);
    onReorder(next.map((x) => x.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <SortableRow key={item.id} id={item.id}>
            {(handleProps) =>
              renderItem(
                item,
                <Box
                  as="button"
                  type="button"
                  aria-label="Reihenfolge ändern (ziehen)"
                  title="Reihenfolge ändern"
                  display="inline-flex"
                  alignItems="center"
                  justifyContent="center"
                  cursor="grab"
                  p={2}
                  minW="40px"
                  minH="40px"
                  mr={1}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor="whiteAlpha.200"
                  bg="whiteAlpha.50"
                  color="gray.300"
                  flexShrink={0}
                  _active={{ cursor: "grabbing" }}
                  _hover={{ bg: "whiteAlpha.150", color: "white", borderColor: "whiteAlpha.300" }}
                  {...handleProps}
                >
                  <GripVertical size={22} strokeWidth={2} />
                </Box>,
              )
            }
          </SortableRow>
        ))}
      </SortableContext>
    </DndContext>
  );
}
