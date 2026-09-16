"use client";

import { Badge, Box, Button, HStack, Stack, Text } from "@chakra-ui/react";
import { Clock, Inbox, RefreshCw } from "lucide-react";
import { useCallback } from "react";
import { AblageFlaeche, DraggableList } from "@/components/admin/DraggableList";
import type { VideoRow } from "@/components/admin/VideoManager";

/** Ablage-Ziel, über das ein Video aus einem Modul zurück in den Stapel wandert. */
export const STAPEL_ABLAGE_ID = "__stapel__";

/** „12:04" — im Stapel zählt die Dauer beim Wiedererkennen mehr als eine Prosaangabe. */
function dauerText(sekunden: number | null): string | null {
  if (!sekunden || sekunden <= 0) return null;
  const m = Math.floor(sekunden / 60);
  const s = sekunden % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type UnassignedVideoPoolProps = {
  videos: VideoRow[];
  setVideos: React.Dispatch<React.SetStateAction<VideoRow[]>>;
  /** Wird gezogen? Dann die Rückgabe-Fläche einblenden. */
  ziehtVideoAusModul: boolean;
  onReload: () => void | Promise<void>;
  lädt?: boolean;
};

/**
 * Der Stapel nicht zugeordneter Videos. Liegt neben dem Modulinhalt und teilt
 * sich mit ihm eine `DragUmgebung` — von hier werden Videos in das Modul oder
 * ein Untermodul gezogen.
 *
 * Bewusst schmal gehalten: keine Bearbeitung, kein Veröffentlichen. Ein Video
 * im Stapel hängt an keinem Modul und wäre für Mitglieder ohnehin unerreichbar;
 * alles Weitere passiert, sobald es einsortiert ist.
 */
export function UnassignedVideoPool({
  videos,
  setVideos,
  ziehtVideoAusModul,
  onReload,
  lädt,
}: UnassignedVideoPoolProps) {
  const items = videos.map((v) => ({ ...v, id: `u:${v.id}` }));

  const onReorder = useCallback(
    async (orderedDndIds: string[]) => {
      const orderedIds = orderedDndIds.map((d) => d.slice(2));
      setVideos((prev) => {
        const map = new Map(prev.map((v) => [v.id, v]));
        return orderedIds
          .map((id, i) => {
            const row = map.get(id);
            return row ? { ...row, position: i } : null;
          })
          .filter(Boolean) as VideoRow[];
      });
      await fetch("/api/admin/videos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reorder: true, unassigned: true, orderedVideoIds: orderedIds }),
      });
    },
    [setVideos],
  );

  const gesamtDauer = videos.reduce((s, v) => s + (v.duration_seconds ?? 0), 0);

  return (
    <Stack
      spacing={3}
      p={{ base: 3, md: 4 }}
      borderRadius="12px"
      border="1px solid var(--cc-line)"
      bg="rgba(255, 255, 255, 0.02)"
    >
      <HStack justify="space-between" align="flex-start" spacing={2}>
        <Box minW={0}>
          <HStack spacing={2}>
            <Box as={Inbox} boxSize="15px" color="var(--cc-gold-light)" aria-hidden />
            <Text
              fontSize="12px"
              fontWeight={500}
              textTransform="uppercase"
              letterSpacing="0.08em"
              color="var(--cc-text-2)"
            >
              Nicht zugeordnet
            </Text>
            <Badge
              px={2}
              py={0.5}
              borderRadius="full"
              bg="rgba(212, 176, 128, 0.12)"
              color="var(--cc-gold-light)"
              fontSize="11px"
              fontWeight={600}
              textTransform="none"
              className="cc-num"
            >
              {videos.length}
            </Badge>
          </HStack>
          <Text mt={1} fontSize="13px" color="var(--cc-text-2)">
            Video am Griff ins Modul oder auf die Mitte eines Untermoduls ziehen.
          </Text>
        </Box>
        <Button
          size="xs"
          variant="line"
          leftIcon={<RefreshCw size={12} />}
          onClick={() => void onReload()}
          isLoading={lädt}
          flexShrink={0}
        >
          Neu laden
        </Button>
      </HStack>

      {videos.length === 0 ? (
        <Text fontSize="13px" color="var(--cc-text-3)" py={2}>
          Der Stapel ist leer — alle Videos sind einem Modul zugeordnet.
        </Text>
      ) : (
        <>
          <Box maxH="460px" overflowY="auto" pr={1}>
            <DraggableList
              items={items}
              listenName="stapel"
              onReorder={onReorder}
              renderItem={(item, handle) => (
                <HStack
                  align="center"
                  spacing={2}
                  py={2}
                  px={2.5}
                  mb={1.5}
                  borderRadius="8px"
                  border="1px solid var(--cc-line)"
                  bg="rgba(255, 255, 255, 0.02)"
                  transition="background-color 150ms var(--cc-ease), border-color 150ms var(--cc-ease)"
                  _hover={{ bg: "rgba(212, 176, 128, 0.05)", borderColor: "var(--cc-gold-line)" }}
                >
                  {handle}
                  <Text fontSize="13px" color="var(--cc-text)" flex={1} minW={0} noOfLines={2}>
                    {item.title}
                  </Text>
                  {dauerText(item.duration_seconds) ? (
                    <HStack spacing={1} flexShrink={0} color="var(--cc-text-3)">
                      <Box as={Clock} boxSize="11px" aria-hidden />
                      <Text fontSize="11px" className="cc-num">
                        {dauerText(item.duration_seconds)}
                      </Text>
                    </HStack>
                  ) : null}
                </HStack>
              )}
            />
          </Box>
          <Text fontSize="11px" color="var(--cc-text-3)" className="cc-num">
            {Math.round(gesamtDauer / 60)} Min. insgesamt
          </Text>
        </>
      )}

      <AblageFlaeche
        id={STAPEL_ABLAGE_ID}
        aktiv={ziehtVideoAusModul}
        label="Hier ablegen — zurück in den Stapel"
        icon={<Box as={Inbox} boxSize="14px" display="inline-block" verticalAlign="-2px" aria-hidden />}
      />
    </Stack>
  );
}
