"use client";

import {
  Badge,
  Box,
  Button,
  Collapse,
  Divider,
  FormControl,
  FormLabel,
  Grid,
  HStack,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  VStack,
  useDisclosure,
} from "@chakra-ui/react";
import { ArrowRightLeft, ChevronDown, ChevronRight, Clock, FolderDown, FolderUp, ImagePlus, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { uploadSmallFilePresigned } from "@/lib/admin-upload-presigned";
import { AttachmentManager } from "@/components/admin/AttachmentManager";
import { AblageFlaeche, DragUmgebung, DraggableList } from "@/components/admin/DraggableList";
import { STAPEL_ABLAGE_ID, UnassignedVideoPool } from "@/components/admin/UnassignedVideoPool";
import type { SubcategoryRow } from "@/components/admin/SubcategoryManager";
import { VideoManager, type VideoRow } from "@/components/admin/VideoManager";
import { VideoMoveModal } from "@/components/admin/VideoMoveModal";
import {
  CloudflareVideoUploader,
  type CloudflareVideoUploadedPayload,
} from "@/components/admin/CloudflareVideoUploader";

const CLOUDFLARE_POLL_INTERVAL_MS = 8_000;
const CLOUDFLARE_POLL_MAX_MS = 5 * 60 * 1000;

export type MergedRow =
  | { dndId: string; kind: "video"; video: VideoRow }
  | { dndId: string; kind: "subcategory"; sub: SubcategoryRow };

function buildMergedRows(allVideos: VideoRow[], subcategories: SubcategoryRow[]): MergedRow[] {
  const direct = allVideos.filter((v) => v.subcategory_id == null);
  const union: Array<
    | { pos: number; kind: "video"; video: VideoRow }
    | { pos: number; kind: "sub"; sub: SubcategoryRow }
  > = [
    ...direct.map((v) => ({ pos: v.position ?? 0, kind: "video" as const, video: v })),
    ...subcategories.map((s) => ({ pos: s.position ?? 0, kind: "sub" as const, sub: s })),
  ];
  union.sort((a, b) => a.pos - b.pos);
  return union.map((u) =>
    u.kind === "video"
      ? { dndId: `v:${u.video.id}`, kind: "video" as const, video: u.video }
      : { dndId: `s:${u.sub.id}`, kind: "subcategory" as const, sub: u.sub },
  );
}

function parseDndId(dndId: string): { type: "video" | "subcategory" | "stapel"; id: string } | null {
  if (dndId.startsWith("v:")) return { type: "video", id: dndId.slice(2) };
  if (dndId.startsWith("s:")) return { type: "subcategory", id: dndId.slice(2) };
  // Videos aus dem Stapel tragen ein eigenes Praefix, damit ein Drag-Ende
  // unterscheiden kann, aus welcher Liste das Video kommt.
  if (dndId.startsWith("u:")) return { type: "stapel", id: dndId.slice(2) };
  return null;
}

/** Ablage-Ziel unter dem Modulinhalt: Video landet direkt im Modul, ohne Untermodul. */
const MODUL_ABLAGE_ID = "__modul_direkt__";

type ModuleContentManagerProps = {
  courseId: string;
  moduleId: string;
  allVideos: VideoRow[];
  setAllVideos: React.Dispatch<React.SetStateAction<VideoRow[]>>;
  subcategories: SubcategoryRow[];
  setSubcategories: React.Dispatch<React.SetStateAction<SubcategoryRow[]>>;
  /** Nach Löschen von Subkategorien o. Ä. Daten neu laden */
  onReload?: () => void | Promise<void>;
};

/* ── v3.2 „Champagner auf Graphit“: Felder, Labels, Schalter, Pills, Modals ── */
const fieldStyles = {
  bg: "rgba(255, 255, 255, 0.03)",
  border: "1px solid",
  borderColor: "var(--cc-line-strong)",
  borderRadius: "8px",
  color: "var(--cc-text)",
  _placeholder: { color: "var(--cc-text-3)" },
  _hover: { borderColor: "rgba(255, 255, 255, 0.22)" },
  _focusVisible: { borderColor: "var(--cc-gold-line)", boxShadow: "0 0 0 1px var(--cc-gold-line)" },
} as const;

const labelSx = {
  fontSize: "12px",
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--cc-text-2)",
} as const;

const switchSx = {
  ".chakra-switch__track": { bg: "var(--cc-track)" },
  ".chakra-switch__track[data-checked]": { bg: "var(--cc-gold)" },
};

const optionStyle = { background: "var(--cc-panel-solid)" };

type PillTone = "success" | "danger" | "neutral" | "gold";

const PILL_TONES: Record<PillTone, { bg: string; color: string }> = {
  success: { bg: "rgba(74, 222, 128, 0.12)", color: "var(--cc-success)" },
  danger: { bg: "rgba(248, 113, 113, 0.12)", color: "var(--cc-danger)" },
  neutral: { bg: "rgba(255, 255, 255, 0.06)", color: "var(--cc-text-2)" },
  gold: { bg: "rgba(212, 176, 128, 0.12)", color: "var(--cc-gold-light)" },
};

function pillProps(tone: PillTone) {
  return {
    ...PILL_TONES[tone],
    fontSize: "11px",
    fontWeight: 500,
    textTransform: "none",
    borderRadius: "full",
    px: 2,
    py: 0.5,
    flexShrink: 0,
  } as const;
}

/** Cloudflare: bereit = grün, Fehler = rot, alles andere läuft noch = Champagner. */
function cloudflareTone(status: string): PillTone {
  return status === "ready" ? "success" : status === "error" ? "danger" : "gold";
}

const dangerLineProps = {
  variant: "line",
  color: "var(--cc-danger)",
  borderColor: "rgba(248, 113, 113, 0.4)",
  _hover: { bg: "rgba(248, 113, 113, 0.08)", borderColor: "rgba(248, 113, 113, 0.6)", boxShadow: "none" },
} as const;

const modalOverlayProps = { bg: "rgba(8, 10, 12, 0.72)", backdropFilter: "blur(6px)" } as const;

const modalContentProps = {
  bg: "var(--cc-panel-solid)",
  border: "1px solid rgba(212, 176, 128, 0.28)",
  borderRadius: "12px",
  boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6)",
} as const;

export function ModuleContentManager({
  courseId,
  moduleId,
  allVideos,
  setAllVideos,
  subcategories,
  setSubcategories,
  onReload,
}: ModuleContentManagerProps) {
  const mergedRows = useMemo(
    () => buildMergedRows(allVideos, subcategories),
    [allVideos, subcategories],
  );

  const draggableItems = useMemo(
    () => mergedRows.map((r) => ({ ...r, id: r.dndId })),
    [mergedRows],
  );

  const orderedSubOptions = useMemo(
    () => [...subcategories].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [subcategories],
  );

  const router = useRouter();
  const [promotingSubId, setPromotingSubId] = useState<string | null>(null);
  const [moveVideo, setMoveVideo] = useState<VideoRow | null>(null);

  // ── Stapel nicht zugeordneter Videos ───────────────────────────────────────
  const [stapelVideos, setStapelVideos] = useState<VideoRow[]>([]);
  const [stapelLaedt, setStapelLaedt] = useState(false);
  /** Was gerade gezogen wird — entscheidet, welche Ablage-Flächen sichtbar sind. */
  const [ziehtGerade, setZiehtGerade] = useState<"modulvideo" | "stapelvideo" | null>(null);

  const ladeStapel = useCallback(async () => {
    setStapelLaedt(true);
    try {
      const res = await fetch("/api/admin/videos?unassigned=1");
      const json = (await res.json()) as { ok?: boolean; items?: VideoRow[] };
      if (json.ok && json.items) setStapelVideos(json.items);
    } finally {
      setStapelLaedt(false);
    }
  }, []);

  useEffect(() => {
    void ladeStapel();
  }, [ladeStapel]);

  const [expandedVideoIds, setExpandedVideoIds] = useState<Set<string>>(new Set());
  const [expandedSubIds, setExpandedSubIds] = useState<Set<string>>(new Set());
  const [detectingDuration, setDetectingDuration] = useState<Set<string>>(new Set());

  const { isOpen: isCreateSubOpen, onOpen: onCreateSubOpen, onClose: onCreateSubClose } = useDisclosure();
  const [newSubTitle, setNewSubTitle] = useState("");
  const [newSubSaving, setNewSubSaving] = useState(false);

  const {
    isOpen: isEditSubOpen,
    onOpen: onEditSubOpen,
    onClose: onEditSubClose,
  } = useDisclosure();
  const [editSubId, setEditSubId] = useState<string | null>(null);
  const [editSubTitle, setEditSubTitle] = useState("");
  const [editSubDescription, setEditSubDescription] = useState("");
  const [editSubSaving, setEditSubSaving] = useState(false);

  const toggleVideo = (id: string) => {
    setExpandedVideoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSub = (id: string) => {
    setExpandedSubIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const patchVideo = useCallback(
    async (id: string, updates: Record<string, unknown>) => {
      const res = await fetch("/api/admin/videos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, updates }),
      });
      const json = (await res.json()) as { ok?: boolean; item?: VideoRow };
      if (json.ok && json.item) {
        const updated = json.item;
        setAllVideos((prev) => prev.map((v) => (v.id === id ? updated : v)));
      }
    },
    [setAllVideos],
  );

  const onUnifiedReorder = async (orderedDndIds: string[]) => {
    const orderedItems = orderedDndIds
      .map((dndId) => parseDndId(dndId))
      .filter((x): x is NonNullable<typeof x> => x != null)
      .map((x) => ({
        type: x.type === "video" ? ("video" as const) : ("subcategory" as const),
        id: x.id,
      }));

    setAllVideos((prev) => {
      const posByVideoId = new Map<string, number>();
      orderedDndIds.forEach((dndId, i) => {
        const p = parseDndId(dndId);
        if (p?.type === "video") posByVideoId.set(p.id, i);
      });
      return prev.map((v) => {
        if (v.subcategory_id != null) return v;
        const ni = posByVideoId.get(v.id);
        return ni !== undefined ? { ...v, position: ni } : v;
      });
    });
    setSubcategories((prev) => {
      const posBySubId = new Map<string, number>();
      orderedDndIds.forEach((dndId, i) => {
        const p = parseDndId(dndId);
        if (p?.type === "subcategory") posBySubId.set(p.id, i);
      });
      return prev.map((s) => {
        const ni = posBySubId.get(s.id);
        return ni !== undefined ? { ...s, position: ni } : s;
      });
    });

    const res = await fetch("/api/admin/module-content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId, orderedItems }),
    });
    const json = (await res.json()) as { ok?: boolean };
    if (!json.ok) void onReload?.();
  };

  const onMoveVideo = async (item: VideoRow, target: string) => {
    const updates =
      target === "__direct__"
        ? { module_id: moduleId, subcategory_id: null }
        : { module_id: null, subcategory_id: target };
    const res = await fetch("/api/admin/videos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, updates }),
    });
    const json = (await res.json()) as { ok?: boolean; item?: VideoRow };
    if (!json.ok || !json.item) return;
    const updated = json.item;
    setAllVideos((prev) => prev.map((x) => (x.id === item.id ? updated : x)));

    const wasDirect = item.subcategory_id == null;
    const nowDirect = updated.subcategory_id == null;

    // Top-Level-Reihenfolge (direkte Videos + Subkategorien) nur bei Wechsel zwischen „direkt“ und Subkategorie:
    // Positionen 0…n-1 neu setzen, damit der gemeinsame Positionsraum konsistent bleibt.
    if (wasDirect && !nowDirect) {
      const orderedDndIds = mergedRows.map((r) => r.dndId).filter((id) => id !== `v:${item.id}`);
      await onUnifiedReorder(orderedDndIds);
      return;
    }
    if (!wasDirect && nowDirect) {
      const orderedDndIds = [...mergedRows.map((r) => r.dndId), `v:${item.id}`];
      await onUnifiedReorder(orderedDndIds);
      return;
    }
  };

  /**
   * Holt ein Video aus dem Stapel ins Modul — entweder direkt oder in ein
   * Untermodul. Es wird ans Ende gehängt; die Feinsortierung passiert danach
   * per Griff, damit nicht die Zeigerposition über die Reihenfolge entscheidet.
   */
  const ausStapelUebernehmen = useCallback(
    async (videoId: string, ziel: { subcategoryId: string | null }) => {
      const video = stapelVideos.find((v) => v.id === videoId);
      if (!video) return;

      const position = ziel.subcategoryId
        ? allVideos.filter((v) => v.subcategory_id === ziel.subcategoryId).length
        : mergedRows.length;

      const updates = ziel.subcategoryId
        ? { module_id: null, subcategory_id: ziel.subcategoryId, position }
        : { module_id: moduleId, subcategory_id: null, position };

      // Optimistisch: sofort aus dem Stapel nehmen, damit die Karte nicht
      // doppelt auftaucht, während die Anfrage läuft.
      setStapelVideos((prev) => prev.filter((v) => v.id !== videoId));

      const res = await fetch("/api/admin/videos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: videoId, updates }),
      });
      const json = (await res.json()) as { ok?: boolean; item?: VideoRow };
      if (!json.ok || !json.item) {
        // Fehlgeschlagen — zurück in den Stapel, sonst wäre das Video weg.
        setStapelVideos((prev) => [...prev, video]);
        return;
      }
      setAllVideos((prev) => [...prev, json.item!]);
    },
    [allVideos, mergedRows.length, moduleId, setAllVideos, stapelVideos],
  );

  /** Legt ein Video aus dem Modul zurück in den Stapel (Modul und Untermodul werden geleert). */
  const inStapelZuruecklegen = useCallback(
    async (videoId: string) => {
      const video = allVideos.find((v) => v.id === videoId);
      if (!video) return;

      setAllVideos((prev) => prev.filter((v) => v.id !== videoId));

      const res = await fetch("/api/admin/videos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: videoId,
          // `is_published` wird zusätzlich vom DB-Trigger aus Migration 070
          // erzwungen — hier nur, damit die Oberfläche sofort stimmt.
          updates: { module_id: null, subcategory_id: null, is_published: false, position: stapelVideos.length },
        }),
      });
      const json = (await res.json()) as { ok?: boolean; item?: VideoRow };
      if (!json.ok || !json.item) {
        setAllVideos((prev) => [...prev, video]);
        return;
      }
      setStapelVideos((prev) => [...prev, json.item!]);
    },
    [allVideos, setAllVideos, stapelVideos.length],
  );

  const onUploadThumbnail = async (item: VideoRow) => {
    const picker = document.createElement("input");
    picker.type = "file";
    picker.accept = "image/jpeg,image/png,image/webp";
    picker.onchange = async () => {
      const file = picker.files?.[0];
      if (!file) return;
      try {
        const storageKey = await uploadSmallFilePresigned(file, {
          folder: "videos",
          courseId,
          moduleId,
          videoId: item.id,
          kind: "thumbnail",
          ...(item.subcategory_id ? { subcategoryId: item.subcategory_id } : {}),
        });
        await patchVideo(item.id, { thumbnail_key: storageKey });
      } catch {
        // ignore
      }
    };
    picker.click();
  };

  const onDetectDuration = async (item: VideoRow) => {
    const key = item.cloudflare_uid ?? item.storage_key;
    if (!key) return;
    setDetectingDuration((prev) => new Set(prev).add(item.id));
    try {
      const res = await fetch(`/api/video-url?key=${encodeURIComponent(key)}`);
      const json = (await res.json()) as { ok?: boolean; url?: string };
      if (!json.ok || !json.url) return;
      const dur = await new Promise<number | null>((resolve) => {
        const vid = document.createElement("video");
        vid.preload = "metadata";
        vid.onloadedmetadata = () => resolve(Number.isFinite(vid.duration) ? Math.floor(vid.duration) : null);
        vid.onerror = () => resolve(null);
        vid.src = json.url!;
      });
      if (dur == null) return;
      await patchVideo(item.id, { duration_seconds: dur });
    } finally {
      setDetectingDuration((prev) => {
        const n = new Set(prev);
        n.delete(item.id);
        return n;
      });
    }
  };

  const removeVideo = async (id: string) => {
    if (!confirm("Video löschen?")) return;
    const res = await fetch(`/api/admin/videos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const json = (await res.json()) as { ok?: boolean };
    if (json.ok) setAllVideos((prev) => prev.filter((v) => v.id !== id));
  };

  /**
   * Nächste freie Position im gemeinsamen Positionsraum. Bei Mehrfach-Upload läuft
   * `onDirectVideoUploaded` mehrmals hintereinander in derselben Closure —
   * `mergedRows.length` wäre dabei für jede Datei gleich und alle Videos landeten
   * auf derselben Position. Das Maximum aus beidem heilt sich selbst, sobald der
   * State nachzieht.
   */
  const naechstePositionRef = useRef(0);

  const onDirectVideoUploaded = async (payload: CloudflareVideoUploadedPayload) => {
    const tail = Math.max(mergedRows.length, naechstePositionRef.current);
    naechstePositionRef.current = tail + 1;

    const body = {
      id: payload.videoId,
      title: payload.fileName,
      position: tail,
      cloudflare_uid: payload.cloudflareUid,
      cloudflare_status: "processing",
      duration_seconds: payload.durationSeconds,
      is_published: false,
      module_id: moduleId,
      subcategory_id: null,
    };
    const res = await fetch("/api/admin/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { ok?: boolean; item?: VideoRow };
    if (json.ok && json.item) {
      setAllVideos((prev) => [...prev, json.item!]);
      setExpandedVideoIds((prev) => new Set(prev).add(json.item!.id));
    }
  };

  const pollStartedAtRef = useRef<Map<string, number>>(new Map());

  const pollCloudflareStatus = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/admin/videos/${id}/cloudflare-status`);
      const json = (await res.json()) as { ok?: boolean; item?: VideoRow };
      if (json.ok && json.item) {
        const updated = json.item;
        setAllVideos((prev) => prev.map((v) => (v.id === id ? updated : v)));
      }
    },
    [setAllVideos],
  );

  useEffect(() => {
    const pending = allVideos.filter(
      (v) => v.subcategory_id == null && (v.cloudflare_status === "uploading" || v.cloudflare_status === "processing"),
    );
    if (pending.length === 0) return;

    const now = Date.now();
    for (const v of pending) {
      if (!pollStartedAtRef.current.has(v.id)) pollStartedAtRef.current.set(v.id, now);
    }

    const timer = setInterval(() => {
      for (const v of pending) {
        const startedAt = pollStartedAtRef.current.get(v.id) ?? Date.now();
        if (Date.now() - startedAt > CLOUDFLARE_POLL_MAX_MS) continue;
        void pollCloudflareStatus(v.id);
      }
    }, CLOUDFLARE_POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [allVideos, pollCloudflareStatus]);

  const addSubcategory = async () => {
    if (!newSubTitle.trim()) return;
    setNewSubSaving(true);
    const res = await fetch("/api/admin/subcategories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        module_id: moduleId,
        title: newSubTitle.trim(),
        position: mergedRows.length,
      }),
    });
    const json = (await res.json()) as { ok?: boolean; item?: SubcategoryRow };
    setNewSubSaving(false);
    if (json.ok && json.item) {
      setSubcategories((prev) => [...prev, json.item!]);
      setNewSubTitle("");
      onCreateSubClose();
    }
  };

  const removeSubcategory = async (id: string) => {
    if (!confirm("Subkategorie wirklich löschen? Zugehörige Videos werden mit gelöscht.")) return;
    const res = await fetch(`/api/admin/subcategories?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const json = (await res.json()) as { ok?: boolean };
    if (json.ok) {
      setSubcategories((prev) => prev.filter((x) => x.id !== id));
      setAllVideos((prev) => prev.filter((v) => v.subcategory_id !== id));
      void onReload?.();
    }
  };

  const promoteSubcategory = async (sub: SubcategoryRow) => {
    if (
      !confirm(
        `„${sub.title}" in ein eigenständiges Modul umwandeln?\n\nDie enthaltenen Videos und der Lernfortschritt der Mitglieder werden ins neue Modul übernommen. Die Subkategorie wird danach aufgelöst.`,
      )
    )
      return;
    setPromotingSubId(sub.id);
    try {
      const res = await fetch(`/api/admin/subcategories/${sub.id}/promote`, { method: "POST" });
      const json = (await res.json()) as { ok?: boolean; moduleId?: string; error?: string };
      if (!json.ok || !json.moduleId) {
        alert(json.error ?? "Umwandeln fehlgeschlagen.");
        return;
      }
      // Subkategorie + Videos liegen jetzt im neuen Modul → dorthin wechseln
      router.push(`/admin/kurse/${courseId}/module/${json.moduleId}`);
      router.refresh();
    } finally {
      setPromotingSubId(null);
    }
  };

  const onVideoMoved = useCallback(async () => {
    await onReload?.();
  }, [onReload]);

  const openEditSub = (row: SubcategoryRow) => {
    setEditSubId(row.id);
    setEditSubTitle(row.title);
    setEditSubDescription(row.description ?? "");
    onEditSubOpen();
  };

  const saveEditSub = async () => {
    if (!editSubId || !editSubTitle.trim()) return;
    setEditSubSaving(true);
    const res = await fetch("/api/admin/subcategories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editSubId,
        updates: { title: editSubTitle.trim(), description: editSubDescription.trim() || null },
      }),
    });
    const json = (await res.json()) as { ok?: boolean; item?: SubcategoryRow };
    setEditSubSaving(false);
    if (json.ok && json.item) {
      setSubcategories((prev) => prev.map((x) => (x.id === json.item!.id ? (json.item as SubcategoryRow) : x)));
      onEditSubClose();
      setEditSubId(null);
    }
  };

  const renderDirectVideoCard = (item: VideoRow, handle: ReactNode) => {
    const isExpanded = expandedVideoIds.has(item.id);
    return (
      <Stack
        key={`direct-video-${item.id}`}
        spacing={0}
        mb={3}
        borderRadius="10px"
        border="1px solid"
        borderColor={isExpanded ? "rgba(212, 176, 128, 0.3)" : "var(--cc-line)"}
        bg="rgba(255, 255, 255, 0.02)"
        overflow="hidden"
        transition="border-color 0.15s"
      >
        <HStack
          px={{ base: 3, md: 4 }}
          py={3}
          spacing={2}
          cursor="pointer"
          onClick={() => toggleVideo(item.id)}
          _hover={{ bg: "rgba(255, 255, 255, 0.03)" }}
          transition="background 0.12s"
          role="button"
          aria-expanded={isExpanded}
        >
          {handle}
          <Box flex={1} minW={0}>
            <HStack spacing={2} flexWrap="wrap">
              <Text fontSize="sm" fontWeight={600} color="var(--cc-text)" noOfLines={1} flex={1} minW={0}>
                {item.title}
              </Text>
              <Badge {...pillProps("neutral")}>Direkt im Modul</Badge>
              <Badge {...pillProps(item.is_published ? "success" : "neutral")}>
                {item.is_published ? "Veröffentlicht" : "Entwurf"}
              </Badge>
              {item.cloudflare_uid && (
                <Badge {...pillProps(cloudflareTone(item.cloudflare_status))} title={item.cloudflare_error ?? undefined}>
                  {item.cloudflare_status === "ready"
                    ? "Cloudflare: Bereit"
                    : item.cloudflare_status === "error"
                      ? "Cloudflare: Fehler"
                      : "Cloudflare: Verarbeitung…"}
                </Badge>
              )}
              {item.duration_seconds != null && (
                <Badge {...pillProps("neutral")} className="cc-num">
                  {item.duration_seconds}s
                </Badge>
              )}
            </HStack>
          </Box>
          <IconButton
            aria-label={isExpanded ? "Einklappen" : "Ausklappen"}
            icon={isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            size="sm"
            variant="ghost"
            color="var(--cc-text-2)"
            _hover={{ color: "var(--cc-text)", bg: "transparent" }}
            onClick={(e) => {
              e.stopPropagation();
              toggleVideo(item.id);
            }}
            flexShrink={0}
          />
        </HStack>

        <Collapse in={isExpanded} animateOpacity>
          <Box px={{ base: 3, md: 5 }} pt={1} pb={5} borderTop="1px solid var(--cc-line)">
            <Stack direction={{ base: "column", lg: "row" }} align={{ base: "stretch", lg: "flex-start" }} spacing={4} pt={4}>
              <HStack align="flex-start" spacing={0} flex={1} minW={0}>
                <Stack flex={1} spacing={4} minW={0}>
                  <FormControl>
                    <FormLabel {...labelSx} mb={1}>
                      Zuordnung
                    </FormLabel>
                    <Select
                      size="md"
                      value={item.subcategory_id ?? "__direct__"}
                      onChange={(e) => void onMoveVideo(item, e.target.value)}
                      {...fieldStyles}
                      maxW="md"
                    >
                      <option value="__direct__" style={optionStyle}>Direkt im Modul (ohne Subkategorie)</option>
                      {orderedSubOptions.map((s) => (
                        <option key={s.id} value={s.id} style={optionStyle}>
                          Subkategorie: {s.title}
                        </option>
                      ))}
                    </Select>
                  </FormControl>

                  <Divider borderColor="var(--cc-line)" />

                  <FormControl>
                    <FormLabel {...labelSx} mb={1}>
                      Vorschaubild (Dashboard &amp; Institut-Karte)
                    </FormLabel>
                    <Text fontSize="sm" color="var(--cc-text-2)" mb={3}>
                      Entspricht der großen Bildfläche auf der Modulkarte.
                    </Text>
                    <Box
                      position="relative"
                      w="100%"
                      maxW="360px"
                      borderRadius="10px"
                      border="1px solid var(--cc-line-strong)"
                      overflow="hidden"
                      role="img"
                    >
                      <Box position="relative" w="100%" pt="56.25%" bg="var(--cc-surface-2)">
                        {item.thumbnail_key ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/admin/storage-url?key=${encodeURIComponent(item.thumbnail_key)}`}
                            alt=""
                            style={{
                              position: "absolute",
                              inset: 0,
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        ) : (
                          <Box
                            position="absolute"
                            inset={0}
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            bg="radial-gradient(circle at 100% 0%, rgba(212, 176, 128, 0.14), transparent 60%)"
                          >
                            <Text fontSize="sm" textAlign="center" px={4} color="var(--cc-text-2)">
                              Noch kein Vorschaubild
                            </Text>
                          </Box>
                        )}
                      </Box>
                    </Box>
                    <Button mt={3} size="md" variant="line" leftIcon={<ImagePlus size={18} />} onClick={() => void onUploadThumbnail(item)}>
                      Vorschaubild hochladen oder ersetzen
                    </Button>
                  </FormControl>

                  <FormControl>
                    <FormLabel {...labelSx} mb={2}>
                      Titel
                    </FormLabel>
                    <Input
                      size="md"
                      value={item.title}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAllVideos((prev) => prev.map((x) => (x.id === item.id ? { ...x, title: v } : x)));
                      }}
                      onBlur={() => void patchVideo(item.id, { title: item.title })}
                      {...fieldStyles}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel {...labelSx}>
                      Beschreibung (für Lernende)
                    </FormLabel>
                    <Textarea
                      size="md"
                      rows={3}
                      placeholder="Kurz erklären, worum es im Video geht…"
                      value={item.description ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAllVideos((prev) => prev.map((x) => (x.id === item.id ? { ...x, description: v } : x)));
                      }}
                      onBlur={() =>
                        void patchVideo(item.id, {
                          description: item.description?.trim() ? item.description.trim() : null,
                        })
                      }
                      {...fieldStyles}
                      fontSize="sm"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel {...labelSx}>
                      Speicherort
                    </FormLabel>
                    {item.cloudflare_uid ? (
                      <Text fontSize="xs" className="cc-num" color="var(--cc-text-2)" title={item.cloudflare_uid} noOfLines={2} wordBreak="break-all">
                        Cloudflare Stream · {item.cloudflare_uid}
                      </Text>
                    ) : null}
                    {item.storage_key ? (
                      <Text
                        fontSize="xs"
                        className="cc-num"
                        color="var(--cc-text-3)"
                        title={item.storage_key}
                        noOfLines={2}
                        wordBreak="break-all"
                        mt={item.cloudflare_uid ? 1 : 0}
                      >
                        {item.cloudflare_uid ? "Legacy (Hetzner): " : ""}
                        {item.storage_key}
                      </Text>
                    ) : null}
                  </FormControl>

                  <AttachmentManager courseId={courseId} moduleId={moduleId} videoId={item.id} />
                </Stack>
              </HStack>

              <VStack
                align="stretch"
                spacing={3}
                minW={{ base: "100%", lg: "200px" }}
                pl={{ base: 0, lg: 2 }}
                borderLeftWidth={{ base: 0, lg: "1px" }}
                borderColor="var(--cc-line)"
                pt={{ base: 2, lg: 0 }}
              >
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight={500} color="var(--cc-text-soft)" mb={1}>
                    Veröffentlicht
                  </FormLabel>
                  <HStack spacing={3}>
                    <Switch
                      size="lg"
                      isChecked={item.is_published}
                      onChange={(e) => {
                        const is_published = e.target.checked;
                        setAllVideos((prev) => prev.map((x) => (x.id === item.id ? { ...x, is_published } : x)));
                        void patchVideo(item.id, { is_published });
                      }}
                      sx={switchSx}
                    />
                    <Text fontSize="sm" color="var(--cc-text-2)">
                      Sichtbar in der Plattform
                    </Text>
                  </HStack>
                </FormControl>
                <Button
                  size="md"
                  variant="line"
                  leftIcon={<Clock size={18} />}
                  isLoading={detectingDuration.has(item.id)}
                  loadingText="Ermittle…"
                  isDisabled={Boolean(item.cloudflare_uid) && item.cloudflare_status !== "ready"}
                  onClick={() => void onDetectDuration(item)}
                >
                  {item.duration_seconds != null ? "Dauer neu ermitteln" : "Dauer ermitteln"}
                </Button>
                <Button
                  size="md"
                  variant="line"
                  leftIcon={<ArrowRightLeft size={18} />}
                  onClick={() => setMoveVideo(item)}
                >
                  In anderes Modul verschieben
                </Button>
                <Button
                  size="md"
                  {...dangerLineProps}
                  leftIcon={<Trash2 size={18} />}
                  onClick={() => void removeVideo(item.id)}
                >
                  Video löschen
                </Button>
              </VStack>
            </Stack>
          </Box>
        </Collapse>
      </Stack>
    );
  };

  const renderSubcategoryCard = (sub: SubcategoryRow, handle: ReactNode) => {
    const isExpanded = expandedSubIds.has(sub.id);
    return (
      <Stack
        key={`s:${sub.id}`}
        spacing={0}
        mb={3}
        borderRadius="10px"
        border="1px solid"
        borderColor={isExpanded ? "rgba(212, 176, 128, 0.3)" : "var(--cc-line)"}
        bg="rgba(255, 255, 255, 0.02)"
        overflow="hidden"
        transition="border-color 0.15s"
      >
        <HStack
          px={{ base: 3, md: 4 }}
          py={3}
          spacing={2}
          cursor="pointer"
          onClick={() => toggleSub(sub.id)}
          _hover={{ bg: "rgba(255, 255, 255, 0.03)" }}
          transition="background 0.12s"
          role="button"
          aria-expanded={isExpanded}
        >
          {handle}
          <Box flex={1} minW={0}>
            <HStack spacing={2} flexWrap="wrap">
              <Text fontSize="sm" fontWeight={600} color="var(--cc-text)" noOfLines={1} flex={1} minW={0}>
                {sub.title}
              </Text>
              <Badge {...pillProps("neutral")}>Subkategorie</Badge>
            </HStack>
          </Box>
          <Button
            size="sm"
            variant="line"
            leftIcon={<Pencil size={14} />}
            onClick={(e) => {
              e.stopPropagation();
              openEditSub(sub);
            }}
          >
            Bearbeiten
          </Button>
          <Button
            size="sm"
            variant="line"
            leftIcon={<FolderUp size={14} />}
            isLoading={promotingSubId === sub.id}
            loadingText="Wandle um…"
            onClick={(e) => {
              e.stopPropagation();
              void promoteSubcategory(sub);
            }}
          >
            Zu eigenem Modul
          </Button>
          <Button
            size="sm"
            {...dangerLineProps}
            leftIcon={<Trash2 size={14} />}
            onClick={(e) => {
              e.stopPropagation();
              void removeSubcategory(sub.id);
            }}
          >
            Löschen
          </Button>
          <IconButton
            aria-label={isExpanded ? "Einklappen" : "Ausklappen"}
            icon={isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            size="sm"
            variant="ghost"
            color="var(--cc-text-2)"
            _hover={{ color: "var(--cc-text)", bg: "transparent" }}
            onClick={(e) => {
              e.stopPropagation();
              toggleSub(sub.id);
            }}
          />
        </HStack>

        <Collapse in={isExpanded} animateOpacity>
          <Box px={{ base: 3, md: 5 }} pt={2} pb={5} borderTop="1px solid var(--cc-line)">
            <Text fontSize="sm" color="var(--cc-text-2)" mb={4}>
              {sub.description?.trim() ? sub.description : "Keine Beschreibung."}
            </Text>
            <VideoManager
              courseId={courseId}
              moduleId={moduleId}
              subcategoryId={sub.id}
              allSubcategories={subcategories}
              externalVideos={allVideos}
              onExternalVideosChange={setAllVideos}
              onReload={onReload}
            />
          </Box>
        </Collapse>
      </Stack>
    );
  };

  return (
    <DragUmgebung
      onAktiv={(activeId) => {
        if (!activeId) return setZiehtGerade(null);
        if (activeId.startsWith("u:")) return setZiehtGerade("stapelvideo");
        // `v:`-Präfix aus dem Modulinhalt, nackte ID aus einer Subkategorie —
        // beides ist ein Modulvideo und darf zurück in den Stapel.
        const istModulvideo = activeId.startsWith("v:") || allVideos.some((v) => v.id === activeId);
        return setZiehtGerade(istModulvideo ? "modulvideo" : null);
      }}
      onFreieAblage={(activeId, zielId) => {
        const quelle = parseDndId(activeId);

        // Stapel → direkt ins Modul
        if (zielId === MODUL_ABLAGE_ID && quelle?.type === "stapel") {
          void ausStapelUebernehmen(quelle.id, { subcategoryId: null });
          return;
        }

        // → zurück in den Stapel. Videos in einer Subkategorie werden von
        // VideoManager ohne Präfix gezogen, deshalb hier auch die nackte ID
        // gegen den Modulbestand prüfen.
        if (zielId === STAPEL_ABLAGE_ID) {
          const videoId =
            quelle?.type === "video"
              ? quelle.id
              : allVideos.some((v) => v.id === activeId)
                ? activeId
                : null;
          if (videoId) void inStapelZuruecklegen(videoId);
        }
      }}
    >
      {/*
        Der Stapel bekommt auf breiten Schirmen mehr Platz mit, sonst steht er als
        schmaler Streifen neben einer sehr breiten Inhaltsspalte.
      */}
      <Grid
        templateColumns={{ base: "1fr", xl: "minmax(0, 1fr) 340px", "2xl": "minmax(0, 1fr) 420px" }}
        gap={{ base: 5, xl: 6 }}
        alignItems="start"
      >
        <Stack spacing={5} minW={0}>
          <Box>
            <Text fontSize="lg" fontWeight={600} color="var(--cc-text)">
              Inhalt des Moduls
            </Text>
            <Text mt={1} fontSize="sm" color="var(--cc-text-2)">
              Videos und Subkategorien frei per Griff sortieren. Die Reihenfolge wird gespeichert. Ein Video auf die
              Mitte einer Subkategorie ziehen verschiebt es hinein, aus dem Stapel daneben holst du neue Videos dazu.
            </Text>
          </Box>

          {draggableItems.length === 0 ? (
            <Text fontSize="sm" color="var(--cc-text-2)">
              Noch keine direkten Videos und keine Subkategorien. Unten hochladen, aus dem Stapel ziehen oder
              Subkategorie anlegen.
            </Text>
          ) : (
            <Box>
              <DraggableList
                items={draggableItems}
                listenName="modulinhalt"
                onReorder={onUnifiedReorder}
                ablageLabel={(activeId, ziel) => {
                  if (ziel.kind !== "subcategory") return null;
                  // Videos aus dem Modul und aus dem Stapel dürfen hinein —
                  // Subkategorien nicht ineinander.
                  if (activeId.startsWith("v:")) return `In „${ziel.sub.title}“ verschieben`;
                  if (activeId.startsWith("u:")) return `In „${ziel.sub.title}“ übernehmen`;
                  return null;
                }}
                onDropInto={(activeId, zielId) => {
                  const quelle = parseDndId(activeId);
                  const ziel = parseDndId(zielId);
                  if (ziel?.type !== "subcategory") return;
                  if (quelle?.type === "video") {
                    const video = allVideos.find((v) => v.id === quelle.id);
                    if (video) void onMoveVideo(video, ziel.id);
                    return;
                  }
                  if (quelle?.type === "stapel") {
                    void ausStapelUebernehmen(quelle.id, { subcategoryId: ziel.id });
                  }
                }}
                renderItem={(row, handle) => {
                  if (row.kind === "video") {
                    return renderDirectVideoCard(row.video, handle);
                  }
                  return renderSubcategoryCard(row.sub, handle);
                }}
              />
            </Box>
          )}

          <AblageFlaeche
            id={MODUL_ABLAGE_ID}
            aktiv={ziehtGerade === "stapelvideo"}
            label="Hier ablegen: direkt ins Modul, ohne Subkategorie"
            icon={<Box as={FolderDown} boxSize="14px" display="inline-block" verticalAlign="-2px" aria-hidden />}
          />

          <HStack spacing={3} flexWrap="wrap">
            <Button size="md" variant="line" onClick={onCreateSubOpen}>
              Subkategorie anlegen
            </Button>
          </HStack>

          <CloudflareVideoUploader onUploaded={onDirectVideoUploaded} />
        </Stack>

        <UnassignedVideoPool
          videos={stapelVideos}
          setVideos={setStapelVideos}
          ziehtVideoAusModul={ziehtGerade === "modulvideo"}
          onReload={ladeStapel}
          lädt={stapelLaedt}
        />
      </Grid>

      <Modal isOpen={isCreateSubOpen} onClose={onCreateSubClose} isCentered>
        <ModalOverlay {...modalOverlayProps} />
        <ModalContent {...modalContentProps} mx={4}>
          <ModalHeader fontSize="lg" fontWeight={600} color="var(--cc-text)">
            Neue Subkategorie
          </ModalHeader>
          <ModalBody>
            <Input
              placeholder="Titel"
              value={newSubTitle}
              onChange={(e) => setNewSubTitle(e.target.value)}
              {...fieldStyles}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} color="var(--cc-text-2)" onClick={onCreateSubClose}>
              Abbrechen
            </Button>
            <Button variant="gold" onClick={() => void addSubcategory()} isLoading={newSubSaving} isDisabled={!newSubTitle.trim()}>
              Anlegen
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isEditSubOpen} onClose={() => { onEditSubClose(); setEditSubId(null); }} isCentered>
        <ModalOverlay {...modalOverlayProps} />
        <ModalContent {...modalContentProps} mx={4}>
          <ModalHeader fontSize="lg" fontWeight={600} color="var(--cc-text)">
            Subkategorie bearbeiten
          </ModalHeader>
          <ModalBody>
            <Stack spacing={3}>
              <Input
                placeholder="Titel"
                value={editSubTitle}
                onChange={(e) => setEditSubTitle(e.target.value)}
                {...fieldStyles}
              />
              <Textarea
                placeholder="Beschreibung (optional)"
                value={editSubDescription}
                onChange={(e) => setEditSubDescription(e.target.value)}
                rows={4}
                {...fieldStyles}
              />
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} color="var(--cc-text-2)" onClick={() => { onEditSubClose(); setEditSubId(null); }}>
              Abbrechen
            </Button>
            <Button variant="gold" onClick={() => void saveEditSub()} isLoading={editSubSaving} isDisabled={!editSubTitle.trim()}>
              Speichern
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <VideoMoveModal
        isOpen={moveVideo != null}
        onClose={() => setMoveVideo(null)}
        video={moveVideo ? { id: moveVideo.id, title: moveVideo.title } : null}
        currentCourseId={courseId}
        currentModuleId={moduleId}
        onMoved={onVideoMoved}
      />
    </DragUmgebung>
  );
}
