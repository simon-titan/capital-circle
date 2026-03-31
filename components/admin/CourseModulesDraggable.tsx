"use client";

import { Badge, Button, HStack, Stack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { DraggableList } from "@/components/admin/DraggableList";
import { Pencil } from "lucide-react";

type Mod = { id: string; title: string; order_index: number };

export function CourseModulesDraggable({ courseId, initialModules }: { courseId: string; initialModules: Mod[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialModules);

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
        </HStack>
      )}
    />
  );
}
