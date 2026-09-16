"use client";

import {
  DndContext,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Box, SimpleGrid, Text } from "@chakra-ui/react";
import { GripVertical } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type DraggableItem = { id: string };

/**
 * Präfix für die Ablage-Ziele. Ein Element kann gleichzeitig sortierbar sein
 * (eigene ID) und Inhalte aufnehmen (Präfix + ID) — dnd-kit braucht dafür zwei
 * getrennte Registrierungen, sonst kollidieren Sortier- und Ablage-Absicht.
 */
export const ABLAGE_PRAEFIX = "ablage:";

/** Aus einer Ablage-ID die reine Ziel-ID holen; `null`, wenn es keine Ablage ist. */
export function ablageZielAus(overId: string): string | null {
  return overId.startsWith(ABLAGE_PRAEFIX) ? overId.slice(ABLAGE_PRAEFIX.length) : null;
}

/**
 * Erst der Zeiger: liegt er in einer Ablage-Zone, gewinnt diese. Sonst der
 * übliche Mittelpunkt-Vergleich für das Sortieren. Ohne die Vorstufe läge der
 * Mittelpunkt der Ablage-Zone exakt auf dem der Zeile und beide konkurrierten.
 */
export const ablageVorSortierung: CollisionDetection = (args) => {
  const zeiger = pointerWithin(args);
  const ablage = zeiger.find((k) => String(k.id).startsWith(ABLAGE_PRAEFIX));
  if (ablage) return [ablage];
  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter((c) => !String(c.id).startsWith(ABLAGE_PRAEFIX)),
  });
};

type ListenEintrag = {
  ids: string[];
  onReorder: (orderedIds: string[]) => void;
  onDropInto?: (activeId: string, zielId: string) => void;
  items: DraggableItem[];
};

type UmgebungsWert = {
  /** ID des gerade gezogenen Elements — die Listen blenden danach ihre Ablage-Zonen ein. */
  activeId: string | null;
  melde: (key: string, eintrag: ListenEintrag) => void;
  abmelden: (key: string) => void;
};

/**
 * Verbindet alle `DraggableList`-Instanzen innerhalb einer `DragUmgebung`.
 * Zwei Aufgaben: das aktive Element durchreichen (sonst wüsste eine Liste nicht,
 * dass gerade etwas aus einer *anderen* Liste über ihr schwebt) und die Listen
 * registrieren, damit die Umgebung ein Drag-Ende an die zuständige Liste
 * weiterreichen kann.
 */
const UmgebungContext = createContext<UmgebungsWert | undefined>(undefined);

/**
 * Gemeinsame Drag-Umgebung für mehrere Listen. Nötig, sobald Elemente zwischen
 * Listen wandern sollen (Stapel → Modul): dnd-kit kann nur innerhalb **eines**
 * `DndContext` ziehen, jede Liste mit eigenem Kontext wäre eine eigene Insel.
 *
 * Verteilt ein Drag-Ende selbst:
 *   1. Quelle und Ziel in derselben Liste → deren `onReorder`.
 *   2. Ablage-Ziel, das zu einer Liste gehört → deren `onDropInto`.
 *   3. Alles andere (freie `AblageFlaeche`) → `onFreieAblage` des Aufrufers.
 *
 * Zwischen zwei Listen wird bewusst **nicht** sortiert: Ein Video wandert nur
 * über ein ausdrückliches Ablage-Ziel, nie durch Fallenlassen irgendwo in einer
 * fremden Liste. Sonst entschiede die Zeigerposition über Modulzugehörigkeit.
 */
export function DragUmgebung({
  onFreieAblage,
  onAktiv,
  children,
}: {
  onFreieAblage?: (activeId: string, zielId: string) => void;
  /**
   * Meldet Beginn und Ende eines Ziehvorgangs nach außen — nötig, damit der
   * Aufrufer nur die Ablage-Flächen einblendet, die zum gezogenen Element passen.
   */
  onAktiv?: (activeId: string | null) => void;
  children: ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const listen = useRef(new Map<string, ListenEintrag>());

  const melde = useCallback((key: string, eintrag: ListenEintrag) => {
    listen.current.set(key, eintrag);
  }, []);
  const abmelden = useCallback((key: string) => {
    listen.current.delete(key);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      onAktiv?.(null);
      const { active, over } = event;
      if (!over) return;
      const aktiv = String(active.id);
      const ueber = String(over.id);

      const ziel = ablageZielAus(ueber);
      if (ziel !== null) {
        if (ziel === aktiv) return;
        for (const eintrag of listen.current.values()) {
          if (eintrag.ids.includes(ziel)) {
            eintrag.onDropInto?.(aktiv, ziel);
            return;
          }
        }
        onFreieAblage?.(aktiv, ziel);
        return;
      }

      if (aktiv === ueber) return;
      for (const eintrag of listen.current.values()) {
        if (eintrag.ids.includes(aktiv) && eintrag.ids.includes(ueber)) {
          const alt = eintrag.ids.indexOf(aktiv);
          const neu = eintrag.ids.indexOf(ueber);
          eintrag.onReorder(arrayMove(eintrag.items, alt, neu).map((x) => x.id));
          return;
        }
      }
    },
    [onFreieAblage, onAktiv],
  );

  const wert = useMemo<UmgebungsWert>(() => ({ activeId, melde, abmelden }), [activeId, melde, abmelden]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={ablageVorSortierung}
      onDragStart={(e: DragStartEvent) => {
        setActiveId(String(e.active.id));
        onAktiv?.(String(e.active.id));
      }}
      onDragCancel={() => {
        setActiveId(null);
        onAktiv?.(null);
      }}
      onDragEnd={handleDragEnd}
    >
      <UmgebungContext.Provider value={wert}>{children}</UmgebungContext.Provider>
    </DndContext>
  );
}

/** Zone in der Zeilenmitte, die Elemente aufnimmt. Oben/unten bleibt Sortieren. */
function AblageZone({ id, label }: { id: string; label: string }) {
  const { isOver, setNodeRef } = useDroppable({ id: `${ABLAGE_PRAEFIX}${id}` });

  return (
    <Box
      ref={setNodeRef}
      position="absolute"
      left={0}
      right={0}
      top="28%"
      bottom="28%"
      borderRadius="8px"
      pointerEvents="none"
      display="flex"
      alignItems="center"
      justifyContent="center"
      border={isOver ? "1px dashed var(--cc-gold-line)" : "1px dashed transparent"}
      bg={isOver ? "rgba(212, 176, 128, 0.12)" : "transparent"}
      transition="background-color 120ms var(--cc-ease), border-color 120ms var(--cc-ease)"
      zIndex={3}
    >
      {isOver ? (
        <Text
          fontSize="12px"
          fontWeight={600}
          letterSpacing="0.04em"
          color="var(--cc-gold-light)"
          textShadow="0 1px 6px rgba(0, 0, 0, 0.6)"
        >
          {label}
        </Text>
      ) : null}
    </Box>
  );
}

/**
 * Flächige Ablage für eine ganze Liste — z. B. „hier ablegen = direkt ins Modul“
 * oder „zurück in den Stapel“. Anders als `AblageZone` hängt sie nicht an einer
 * Zeile, sondern steht als eigener Bereich im Fluss.
 */
export function AblageFlaeche({
  id,
  label,
  aktiv,
  icon,
}: {
  id: string;
  label: string;
  /** Nur während eines passenden Ziehvorgangs einblenden. */
  aktiv: boolean;
  icon?: ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `${ABLAGE_PRAEFIX}${id}` });

  if (!aktiv) return null;

  return (
    <Box
      ref={setNodeRef}
      mt={2}
      py={4}
      px={3}
      borderRadius="10px"
      border="1px dashed"
      borderColor={isOver ? "var(--cc-gold-line)" : "var(--cc-line-strong)"}
      bg={isOver ? "rgba(212, 176, 128, 0.1)" : "rgba(255, 255, 255, 0.02)"}
      color={isOver ? "var(--cc-gold-light)" : "var(--cc-text-3)"}
      textAlign="center"
      fontSize="13px"
      fontWeight={isOver ? 600 : 500}
      transition="background-color 120ms var(--cc-ease), border-color 120ms var(--cc-ease), color 120ms var(--cc-ease)"
    >
      {icon}
      <Box as="span" ml={icon ? 2 : 0}>
        {label}
      </Box>
    </Box>
  );
}

function SortableRow({
  id,
  ablageLabel,
  stretch,
  children,
}: {
  id: string;
  /** Gesetzt = die Zeile nimmt gezogene Elemente auf; der Text erscheint beim Überfahren. */
  ablageLabel: string | null;
  /** Im Raster füllen die Karten die Zellenhöhe, damit die Reihe bündig bleibt. */
  stretch?: boolean;
  children: (dragHandleProps: Record<string, unknown>) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  // Die gezogene Zeile schwebt mit Champagner-Kontur über den anderen.
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 2 : undefined,
    borderRadius: "10px",
    boxShadow: isDragging ? "0 0 0 1px var(--cc-gold-line), 0 12px 28px rgba(0, 0, 0, 0.45)" : undefined,
  };

  return (
    <Box ref={setNodeRef} style={style} position="relative" h={stretch ? "100%" : undefined}>
      {children({ ...attributes, ...listeners })}
      {ablageLabel ? <AblageZone id={id} label={ablageLabel} /> : null}
    </Box>
  );
}

/** Der Griff — überall gleich, damit Ziehen an einer Stelle aussieht wie an jeder anderen. */
export function DragGriff(handleProps: Record<string, unknown>) {
  return (
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
      borderRadius="8px"
      border="1px dashed var(--cc-line-strong)"
      bg="transparent"
      color="var(--cc-text-3)"
      flexShrink={0}
      transition="background-color 150ms var(--cc-ease), border-color 150ms var(--cc-ease), color 150ms var(--cc-ease)"
      _hover={{ bg: "rgba(212, 176, 128, 0.06)", color: "var(--cc-text)", borderColor: "var(--cc-gold-line)" }}
      _active={{ cursor: "grabbing", color: "var(--cc-gold-light)", borderColor: "var(--cc-gold-line)" }}
      _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px" }}
      {...handleProps}
    >
      <GripVertical size={20} strokeWidth={1.75} />
    </Box>
  );
}

type DraggableListProps<T extends DraggableItem> = {
  items: T[];
  onReorder: (orderedIds: string[]) => void;
  renderItem: (item: T, dragHandle: ReactNode) => ReactNode;
  /**
   * Liefert für ein Ziel-Element den Hinweistext, wenn `activeId` darauf abgelegt
   * werden darf — sonst `null`. Damit wird eine Zeile zum Ablage-Ziel (z. B. ein
   * Untermodul, das ein Video aufnimmt).
   */
  ablageLabel?: (activeId: string, zielItem: T) => string | null;
  /** Wird aufgerufen, wenn `activeId` auf `zielId` abgelegt wurde (nicht: daneben sortiert). */
  onDropInto?: (activeId: string, zielId: string) => void;
  /**
   * `liste` (Vorgabe) stapelt untereinander, `raster` legt die Elemente nebeneinander
   * in ein responsives Raster — dann greift auch die flächige Sortierstrategie.
   */
  variante?: "liste" | "raster";
  /** Spaltenzahl im Raster je Breakpoint. */
  spalten?: { base: number; md: number; xl: number; "2xl"?: number };
  /**
   * Nur nötig, wenn mehrere Listen in derselben `DragUmgebung` liegen: eindeutiger
   * Name, unter dem sich diese Liste dort registriert.
   */
  listenName?: string;
};

export function DraggableList<T extends DraggableItem>({
  items,
  onReorder,
  renderItem,
  ablageLabel,
  onDropInto,
  variante = "liste",
  spalten = { base: 1, md: 2, xl: 3, "2xl": 4 },
  listenName = "liste",
}: DraggableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Innerhalb einer `DragUmgebung` kommt das aktive Element von dort — sonst
  // verwaltet die Liste ihren eigenen Kontext und den Zustand selbst.
  const umgebung = useContext(UmgebungContext);
  const eigenerKontext = umgebung === undefined;
  const [eigenesAktives, setEigenesAktives] = useState<string | null>(null);
  const activeId = eigenerKontext ? eigenesAktives : umgebung.activeId;

  const ids = useMemo(() => items.map((i) => i.id), [items]);

  // In der gemeinsamen Umgebung verteilt diese das Drag-Ende — dafür muss sie
  // wissen, welche IDs zu dieser Liste gehören und was dann zu tun ist.
  const { melde, abmelden } = umgebung ?? {};
  useEffect(() => {
    if (!melde || !abmelden) return;
    melde(listenName, { ids, items, onReorder, onDropInto });
    return () => abmelden(listenName);
  }, [melde, abmelden, listenName, ids, items, onReorder, onDropInto]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setEigenesAktives(null);
      const { active, over } = event;
      if (!over) return;

      const ziel = ablageZielAus(String(over.id));
      if (ziel !== null) {
        if (ziel !== String(active.id)) onDropInto?.(String(active.id), ziel);
        return;
      }

      if (active.id === over.id) return;
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      const next = arrayMove(items, oldIndex, newIndex);
      onReorder(next.map((x) => x.id));
    },
    [ids, items, onDropInto, onReorder],
  );

  const inhalt = (
    <SortableContext
      items={ids}
      strategy={variante === "raster" ? rectSortingStrategy : verticalListSortingStrategy}
    >
      {variante === "raster" ? (
        <SimpleGrid columns={spalten} spacing={{ base: 3, md: 4 }} alignItems="stretch">
          {items.map((item) => (
            <SortableRow
              key={item.id}
              id={item.id}
              stretch
              ablageLabel={activeId && ablageLabel ? ablageLabel(activeId, item) : null}
            >
              {(handleProps) => renderItem(item, <DragGriff {...handleProps} />)}
            </SortableRow>
          ))}
        </SimpleGrid>
      ) : (
        items.map((item) => (
          <SortableRow
            key={item.id}
            id={item.id}
            ablageLabel={activeId && ablageLabel ? ablageLabel(activeId, item) : null}
          >
            {(handleProps) => renderItem(item, <DragGriff {...handleProps} />)}
          </SortableRow>
        ))
      )}
    </SortableContext>
  );

  // Im gemeinsamen Kontext darf hier KEIN zweiter DndContext stehen — dnd-kit
  // wuerde den inneren nehmen und das Ziehen zwischen den Listen bliebe tot.
  if (!eigenerKontext) return inhalt;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={ablageVorSortierung}
      onDragStart={(e: DragStartEvent) => setEigenesAktives(String(e.active.id))}
      onDragCancel={() => setEigenesAktives(null)}
      onDragEnd={handleDragEnd}
    >
      {inhalt}
    </DndContext>
  );
}
