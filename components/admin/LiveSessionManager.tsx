"use client";

import {
  Box,
  Button,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Progress,
  Select,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { createClient } from "@/lib/supabase/client";
import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type EventOpt = { id: string; title: string; start_time: string; event_type: string | null };

type CategoryRow = { id: string; title: string; position: number };

type SessionRow = {
  id: string;
  category_id: string;
  event_id: string | null;
  title: string;
  description: string | null;
  thumbnail_storage_key: string | null;
  recorded_at: string | null;
  position: number;
};

type SubRow = { id: string; session_id: string; title: string; position: number };

type VideoRow = {
  id: string;
  session_id: string;
  subcategory_id: string | null;
  title: string;
  description: string | null;
  storage_key: string;
  thumbnail_key: string | null;
  duration_seconds: number | null;
  position: number;
};

/** Für `<input type="datetime-local" />` (lokale Zeit). */
function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const adminSelectStyles = {
  bg: "rgba(7, 8, 10, 0.85)",
  borderColor: "rgba(212, 175, 55, 0.35)",
  color: "gray.100",
  borderRadius: "10px",
  h: "40px",
  _hover: { borderColor: "rgba(212, 175, 55, 0.5)" },
  _focusVisible: { borderColor: "rgba(212, 175, 55, 0.65)", boxShadow: "0 0 0 1px rgba(212, 175, 55, 0.25)" },
  sx: { "& option": { bg: "#0c0d10" } },
};

async function uploadCover(file: File): Promise<string> {
  const params = new URLSearchParams({ folder: "covers" });
  const res = await fetch(`/api/admin/upload-proxy?${params}`, {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-File-Name": encodeURIComponent(file.name),
    },
    body: file,
  });
  const json = (await res.json()) as { ok?: boolean; storageKey?: string; error?: string };
  if (!res.ok || !json.ok || !json.storageKey) {
    throw new Error(json.error || "Upload fehlgeschlagen.");
  }
  return json.storageKey;
}

function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const d = video.duration;
      resolve(Number.isFinite(d) ? Math.floor(d) : null);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
}

function uploadLiveSessionVideoViaProxy(
  file: File,
  meta: { sessionId: string; videoId: string },
  onProgress: (pct: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      folder: "live-sessions",
      sessionId: meta.sessionId,
      videoId: meta.videoId,
      kind: "original",
    });
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/admin/upload-proxy?${params.toString()}`);
    xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
    xhr.setRequestHeader("X-File-Name", encodeURIComponent(file.name));
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) onProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        try {
          const j = JSON.parse(xhr.responseText) as { error?: string };
          reject(new Error(j.error || `Upload fehlgeschlagen (${xhr.status})`));
        } catch {
          reject(new Error(`Upload fehlgeschlagen (${xhr.status})`));
        }
        return;
      }
      try {
        const j = JSON.parse(xhr.responseText) as { ok?: boolean; storageKey?: string; error?: string };
        if (!j.ok || !j.storageKey) reject(new Error(j.error || "Upload fehlgeschlagen"));
        else resolve(j.storageKey);
      } catch {
        reject(new Error("Ungültige Server-Antwort"));
      }
    };
    xhr.onerror = () => reject(new Error("Netzwerkfehler beim Upload"));
    xhr.send(file);
  });
}

async function uploadLiveSessionThumb(file: File, sessionId: string, videoId: string): Promise<string> {
  const params = new URLSearchParams({
    folder: "live-sessions",
    sessionId,
    videoId,
    kind: "thumbnail",
  });
  const res = await fetch(`/api/admin/upload-proxy?${params}`, {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-File-Name": encodeURIComponent(file.name),
    },
    body: file,
  });
  const json = (await res.json()) as { ok?: boolean; storageKey?: string; error?: string };
  if (!res.ok || !json.ok || !json.storageKey) {
    throw new Error(json.error || "Thumbnail-Upload fehlgeschlagen.");
  }
  return json.storageKey;
}

export function LiveSessionManager({ initialEvents }: { initialEvents: EventOpt[] }) {
  const [events] = useState(initialEvents);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [videos, setVideos] = useState<VideoRow[]>([]);

  const [catTitle, setCatTitle] = useState("");
  const [catPosition, setCatPosition] = useState(0);

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionDesc, setSessionDesc] = useState("");
  const [sessionCategoryId, setSessionCategoryId] = useState("");
  const [sessionEventId, setSessionEventId] = useState("");
  const [sessionRecordedAt, setSessionRecordedAt] = useState("");
  const [sessionThumbKey, setSessionThumbKey] = useState<string | null>(null);
  const [sessionBusy, setSessionBusy] = useState(false);

  const [subTitle, setSubTitle] = useState("");
  const [subPosition, setSubPosition] = useState(0);

  const [videoTitle, setVideoTitle] = useState("");
  const [videoDesc, setVideoDesc] = useState("");
  const [videoSubId, setVideoSubId] = useState("");
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoStatus, setVideoStatus] = useState<string | null>(null);

  const [status, setStatus] = useState<string | null>(null);
  const [thumbBusy, setThumbBusy] = useState(false);
  const videoFileRef = useRef<HTMLInputElement>(null);

  const [recapCategoryId, setRecapCategoryId] = useState("");
  const [recapEventId, setRecapEventId] = useState("");
  const [recapTitle, setRecapTitle] = useState("");
  const [recapRecordedAt, setRecapRecordedAt] = useState("");
  const [recapDesc, setRecapDesc] = useState("");
  const [recapSource, setRecapSource] = useState<"url" | "file">("file");
  const [recapUrl, setRecapUrl] = useState("");
  const [recapBusy, setRecapBusy] = useState(false);
  const [recapProgress, setRecapProgress] = useState(0);
  const [recapStatus, setRecapStatus] = useState<string | null>(null);
  const [recapFileName, setRecapFileName] = useState<string | null>(null);
  const [recapFileSize, setRecapFileSize] = useState<number | null>(null);
  const recapFileRef = useRef<HTMLInputElement>(null);
  /** Bearbeitung im Tab „Schnell-Recap“ */
  const [recapEditingId, setRecapEditingId] = useState<string | null>(null);
  const [recapFirstVideoId, setRecapFirstVideoId] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("live_session_categories")
      .select("id, title, position")
      .order("position", { ascending: true });
    setCategories((data as CategoryRow[]) ?? []);
  }, []);

  const loadSessions = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("live_sessions")
      .select("id, category_id, event_id, title, description, thumbnail_storage_key, recorded_at, position")
      .order("recorded_at", { ascending: false, nullsFirst: false });
    setSessions((data as SessionRow[]) ?? []);
  }, []);

  const loadSubsAndVideos = useCallback(async (sessionId: string) => {
    if (!sessionId) {
      setSubs([]);
      setVideos([]);
      return;
    }
    const supabase = createClient();
    const [{ data: sData }, { data: vData }] = await Promise.all([
      supabase.from("live_session_subcategories").select("*").eq("session_id", sessionId).order("position"),
      supabase.from("live_session_videos").select("*").eq("session_id", sessionId).order("position"),
    ]);
    setSubs((sData as SubRow[]) ?? []);
    setVideos((vData as VideoRow[]) ?? []);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- initiale Daten aus Supabase */
  useEffect(() => {
    void loadCategories();
    void loadSessions();
  }, [loadCategories, loadSessions]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect -- Session-Wechsel: Subs/Videos nachladen */
  useEffect(() => {
    void loadSubsAndVideos(selectedSessionId);
  }, [selectedSessionId, loadSubsAndVideos]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const clearRecapForm = () => {
    setRecapEditingId(null);
    setRecapFirstVideoId(null);
    setRecapCategoryId("");
    setRecapEventId("");
    setRecapTitle("");
    setRecapRecordedAt("");
    setRecapDesc("");
    setRecapUrl("");
    setRecapSource("file");
    setRecapStatus(null);
    setRecapProgress(0);
    setRecapFileName(null);
    setRecapFileSize(null);
    if (recapFileRef.current) recapFileRef.current.value = "";
  };

  const startEditRecap = async (s: SessionRow) => {
    setRecapEditingId(s.id);
    setRecapCategoryId(s.category_id);
    setRecapEventId(s.event_id ?? "");
    setRecapTitle(s.title);
    setRecapDesc(s.description ?? "");
    setRecapRecordedAt(s.recorded_at ? toDatetimeLocalValue(s.recorded_at) : "");
    setRecapStatus(null);
    const supabase = createClient();
    const { data: v } = await supabase
      .from("live_session_videos")
      .select("id, storage_key")
      .eq("session_id", s.id)
      .order("position", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (v) {
      setRecapFirstVideoId(v.id);
      const sk = String(v.storage_key ?? "").trim();
      if (/^https?:\/\//i.test(sk)) {
        setRecapSource("url");
        setRecapUrl(sk);
      } else {
        setRecapSource("file");
        setRecapUrl("");
      }
    } else {
      setRecapFirstVideoId(null);
      setRecapSource("file");
      setRecapUrl("");
    }
    if (recapFileRef.current) recapFileRef.current.value = "";
  };

  const pickSessionThumb = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setThumbBusy(true);
      setStatus(null);
      try {
        const key = await uploadCover(file);
        setSessionThumbKey(key);
        setStatus("Session-Thumbnail hochgeladen.");
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Thumbnail-Fehler.");
      }
      setThumbBusy(false);
    };
    input.click();
  };

  const addCategory = async () => {
    if (!catTitle.trim()) {
      setStatus("Kategorie-Titel fehlt.");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from("live_session_categories").insert({
      title: catTitle.trim(),
      position: catPosition,
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    setCatTitle("");
    setCatPosition(0);
    void loadCategories();
    setStatus("Kategorie gespeichert.");
  };

  const removeCategory = async (id: string) => {
    if (!confirm("Kategorie löschen? Sessions müssen vorher verschoben werden.")) return;
    const supabase = createClient();
    const { error } = await supabase.from("live_session_categories").delete().eq("id", id);
    if (!error) void loadCategories();
    else setStatus(error.message);
  };

  const clearSessionForm = () => {
    setEditingSessionId(null);
    setSessionTitle("");
    setSessionDesc("");
    setSessionCategoryId("");
    setSessionEventId("");
    setSessionRecordedAt("");
    setSessionThumbKey(null);
  };

  const startEditSession = (s: SessionRow) => {
    setEditingSessionId(s.id);
    setSessionTitle(s.title);
    setSessionDesc(s.description ?? "");
    setSessionCategoryId(s.category_id);
    setSessionEventId(s.event_id ?? "");
    setSessionRecordedAt(s.recorded_at ? s.recorded_at.slice(0, 16) : "");
    setSessionThumbKey(s.thumbnail_storage_key);
  };

  const saveSession = async () => {
    if (!sessionTitle.trim() || !sessionCategoryId) {
      setStatus("Titel und Kategorie sind Pflicht.");
      return;
    }
    setSessionBusy(true);
    setStatus(null);
    const supabase = createClient();
    const payload = {
      title: sessionTitle.trim(),
      description: sessionDesc.trim() || null,
      category_id: sessionCategoryId,
      event_id: sessionEventId || null,
      thumbnail_storage_key: sessionThumbKey,
      recorded_at: sessionRecordedAt ? new Date(sessionRecordedAt).toISOString() : null,
    };
    if (editingSessionId) {
      const { error } = await supabase.from("live_sessions").update(payload).eq("id", editingSessionId);
      setSessionBusy(false);
      if (error) {
        setStatus(error.message);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("live_sessions")
        .insert({ ...payload, position: sessions.length })
        .select("id")
        .single();
      setSessionBusy(false);
      if (error) {
        setStatus(error.message);
        return;
      }
      if (data?.id) setSelectedSessionId(data.id as string);
    }
    clearSessionForm();
    void loadSessions();
    setStatus("Session gespeichert.");
  };

  const deleteSession = async (id: string) => {
    if (!confirm("Session mitsamt Videos löschen?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("live_sessions").delete().eq("id", id);
    if (!error) {
      if (selectedSessionId === id) setSelectedSessionId("");
      if (recapEditingId === id) clearRecapForm();
      void loadSessions();
    } else setStatus(error.message);
  };

  const addSubcategory = async () => {
    if (!selectedSessionId || !subTitle.trim()) {
      setStatus("Session wählen und Abschnitts-Titel angeben.");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from("live_session_subcategories").insert({
      session_id: selectedSessionId,
      title: subTitle.trim(),
      position: subPosition,
    });
    if (error) setStatus(error.message);
    else {
      setSubTitle("");
      setSubPosition(0);
      void loadSubsAndVideos(selectedSessionId);
      setStatus("Abschnitt angelegt.");
    }
  };

  const removeSub = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("live_session_subcategories").delete().eq("id", id);
    if (!error && selectedSessionId) void loadSubsAndVideos(selectedSessionId);
  };

  const onPickVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selectedSessionId) {
      setVideoStatus("Session wählen und Videodatei wählen.");
      return;
    }
    if (!file.type.startsWith("video/")) {
      setVideoStatus("Bitte eine Videodatei (z. B. MP4).");
      return;
    }
    if (!videoTitle.trim()) {
      setVideoStatus("Titel für das Video eingeben.");
      return;
    }

    setVideoBusy(true);
    setVideoProgress(0);
    setVideoStatus("Upload…");
    const videoId = crypto.randomUUID();
    const durationSeconds = await readVideoDuration(file);

    try {
      const storageKey = await uploadLiveSessionVideoViaProxy(
        file,
        { sessionId: selectedSessionId, videoId },
        setVideoProgress,
      );
      const supabase = createClient();
      const nextPos = videos.length;
      const { error } = await supabase.from("live_session_videos").insert({
        id: videoId,
        session_id: selectedSessionId,
        subcategory_id: videoSubId.trim() ? videoSubId : null,
        title: videoTitle.trim(),
        description: videoDesc.trim() || null,
        storage_key: storageKey,
        duration_seconds: durationSeconds,
        position: nextPos,
      });
      if (error) {
        setVideoStatus(error.message);
        setVideoBusy(false);
        return;
      }
      setVideoTitle("");
      setVideoDesc("");
      setVideoSubId("");
      void loadSubsAndVideos(selectedSessionId);
      setVideoStatus("Video gespeichert.");
    } catch (err) {
      setVideoStatus(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
    }
    setVideoBusy(false);
  };

  const pickVideoThumb = (videoId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !selectedSessionId) return;
      try {
        const key = await uploadLiveSessionThumb(file, selectedSessionId, videoId);
        const supabase = createClient();
        await supabase.from("live_session_videos").update({ thumbnail_key: key }).eq("id", videoId);
        void loadSubsAndVideos(selectedSessionId);
        setStatus("Video-Thumbnail gesetzt.");
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Fehler.");
      }
    };
    input.click();
  };

  const removeVideo = async (id: string) => {
    if (!confirm("Video löschen?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("live_session_videos").delete().eq("id", id);
    if (!error && selectedSessionId) void loadSubsAndVideos(selectedSessionId);
  };

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
  );

  const submitRecap = async () => {
    if (!recapCategoryId || !recapTitle.trim()) {
      setRecapStatus("Kategorie und Titel sind Pflicht.");
      return;
    }

    // ── Bestehende Session bearbeiten (nur Metadaten; Video-URL optional ändern) ──
    if (recapEditingId) {
      setRecapBusy(true);
      setRecapStatus(null);
      const supabase = createClient();
      const recordedAt = recapRecordedAt ? new Date(recapRecordedAt).toISOString() : null;
      const { error: uErr } = await supabase
        .from("live_sessions")
        .update({
          title: recapTitle.trim(),
          description: recapDesc.trim() || null,
          category_id: recapCategoryId,
          event_id: recapEventId || null,
          recorded_at: recordedAt,
        })
        .eq("id", recapEditingId);
      if (uErr) {
        setRecapBusy(false);
        setRecapStatus(uErr.message);
        return;
      }
      if (recapSource === "url" && recapFirstVideoId) {
        const u = recapUrl.trim();
        if (!u || !/^https?:\/\//i.test(u)) {
          setRecapBusy(false);
          setRecapStatus("Bitte eine gültige Video-URL (https://…) angeben oder auf Datei wechseln.");
          return;
        }
        const { error: vErr } = await supabase
          .from("live_session_videos")
          .update({ storage_key: u })
          .eq("id", recapFirstVideoId);
        if (vErr) {
          setRecapBusy(false);
          setRecapStatus(vErr.message);
          return;
        }
      }
      setRecapBusy(false);
      void loadSessions();
      clearRecapForm();
      setRecapStatus("Recap aktualisiert.");
      return;
    }

    // ── Neu: Session + Video ──
    if (recapSource === "url") {
      const u = recapUrl.trim();
      if (!u || !/^https?:\/\//i.test(u)) {
        setRecapStatus("Bitte eine gültige Video-URL (https://…) angeben.");
        return;
      }
    }
    if (recapSource === "file" && !recapFileRef.current?.files?.[0]) {
      setRecapStatus("Bitte eine Videodatei wählen oder auf „Externe URL“ wechseln.");
      return;
    }

    setRecapBusy(true);
    setRecapProgress(0);
    setRecapStatus("Session wird angelegt…");
    setRecapFileName(null);
    setRecapFileSize(null);
    const supabase = createClient();
    const recordedAt = recapRecordedAt ? new Date(recapRecordedAt).toISOString() : null;
    const videoId = crypto.randomUUID();

    const { data: sess, error: sErr } = await supabase
      .from("live_sessions")
      .insert({
        category_id: recapCategoryId,
        event_id: recapEventId || null,
        title: recapTitle.trim(),
        description: recapDesc.trim() || null,
        recorded_at: recordedAt,
        position: sessions.length,
      })
      .select("id")
      .single();

    if (sErr || !sess?.id) {
      setRecapBusy(false);
      setRecapStatus(sErr?.message ?? "Session konnte nicht angelegt werden.");
      return;
    }
    const sessionId = sess.id as string;

    try {
      if (recapSource === "url") {
        const { error: vErr } = await supabase.from("live_session_videos").insert({
          id: videoId,
          session_id: sessionId,
          subcategory_id: null,
          title: recapTitle.trim(),
          description: recapDesc.trim() || null,
          storage_key: recapUrl.trim(),
          position: 0,
        });
        if (vErr) {
          setRecapStatus(vErr.message);
          setRecapBusy(false);
          return;
        }
      } else {
        const file = recapFileRef.current?.files?.[0];
        if (!file) {
          setRecapStatus("Keine Datei gewählt.");
          setRecapBusy(false);
          return;
        }
        if (!file.type.startsWith("video/")) {
          setRecapStatus("Bitte eine Videodatei (z. B. MP4) wählen.");
          setRecapBusy(false);
          return;
        }
        setRecapFileName(file.name);
        setRecapFileSize(file.size);
        setRecapStatus("Video wird hochgeladen…");
        const storageKey = await uploadLiveSessionVideoViaProxy(file, { sessionId, videoId }, setRecapProgress);
        setRecapStatus("Dauer wird ermittelt…");
        const durationSeconds = await readVideoDuration(file);
        const { error: vErr } = await supabase.from("live_session_videos").insert({
          id: videoId,
          session_id: sessionId,
          subcategory_id: null,
          title: recapTitle.trim(),
          description: recapDesc.trim() || null,
          storage_key: storageKey,
          duration_seconds: durationSeconds,
          position: 0,
        });
        if (vErr) {
          setRecapStatus(vErr.message);
          setRecapBusy(false);
          return;
        }
      }
    } catch (e) {
      setRecapStatus(e instanceof Error ? e.message : "Fehler beim Speichern.");
      setRecapBusy(false);
      return;
    }

    setRecapBusy(false);
    setRecapProgress(0);
    void loadSessions();
    clearRecapForm();
    setRecapStatus("Recap gespeichert (Session + Video).");
  };

  return (
    <Tabs variant="enclosed" colorScheme="yellow">
      <TabList flexWrap="wrap">
        <Tab>Kategorien</Tab>
        <Tab>Schnell-Recap</Tab>
        <Tab>Sessions</Tab>
        <Tab>Videos &amp; Abschnitte</Tab>
      </TabList>
      <TabPanels>
        <TabPanel px={0} pt={6}>
          <Stack gap={4} maxW="720px">
            <Text fontSize="sm" color="gray.400">
              Kategorien gruppieren die Live Sessions in der Mitglieder-Übersicht (Filter-Tabs).
            </Text>
            <HStack flexWrap="wrap" gap={3}>
              <Input
                placeholder="Titel"
                value={catTitle}
                onChange={(e) => setCatTitle(e.target.value)}
                bg="whiteAlpha.50"
                maxW="280px"
              />
              <Input
                type="number"
                placeholder="Position"
                value={catPosition}
                onChange={(e) => setCatPosition(Number(e.target.value))}
                bg="whiteAlpha.50"
                maxW="120px"
              />
              <Button colorScheme="yellow" onClick={() => void addCategory()}>
                Hinzufügen
              </Button>
            </HStack>
            <Stack gap={2}>
              {categories.map((c) => (
                <HStack
                  key={c.id}
                  justify="space-between"
                  p={3}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor="whiteAlpha.200"
                >
                  <Text>
                    {c.title}{" "}
                    <Text as="span" fontSize="xs" color="gray.500">
                      (pos. {c.position})
                    </Text>
                  </Text>
                  <IconButton
                    aria-label="Löschen"
                    size="sm"
                    variant="outline"
                    colorScheme="red"
                    icon={<Trash2 size={16} />}
                    onClick={() => void removeCategory(c.id)}
                  />
                </HStack>
              ))}
            </Stack>
          </Stack>
        </TabPanel>

        <TabPanel px={0} pt={6}>
          <Stack gap={5} maxW="720px">
            <Text fontSize="sm" color="gray.400">
              Nach einem Kalender-Event: zuerst Event wählen — Titel und Datum werden übernommen (anpassbar). Dann Kategorie
              und Video (Upload oder externe URL).
            </Text>

            <Box>
              <FormLabel fontSize="xs" fontWeight="600" color="yellow.400">
                Kalender-Event
              </FormLabel>
              <Text fontSize="xs" color="gray.500" mb={1}>
                Optional. Wenn gesetzt, füllen wir Titel und Datum aus dem Event vor.
              </Text>
              <Select
                placeholder="Kein Event — Datum manuell"
                value={recapEventId}
                onChange={(e) => {
                  const id = e.target.value;
                  setRecapEventId(id);
                  if (!id || recapEditingId) return;
                  const ev = sortedEvents.find((x) => x.id === id);
                  if (!ev) return;
                  setRecapTitle((prev) => (prev.trim() ? prev : ev.title));
                  setRecapRecordedAt((prev) => (prev.trim() ? prev : toDatetimeLocalValue(ev.start_time)));
                }}
                bg="whiteAlpha.50"
                maxW="480px"
                sx={adminSelectStyles.sx}
              >
                <option value="">Kein Event — Datum manuell</option>
                {sortedEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    [{ev.event_type ?? "?"}] {ev.title} —{" "}
                    {new Date(ev.start_time).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
                  </option>
                ))}
              </Select>
            </Box>

            <Box>
              <FormLabel fontSize="xs">Kategorie</FormLabel>
              <Select
                placeholder="Kategorie wählen"
                value={recapCategoryId}
                onChange={(e) => setRecapCategoryId(e.target.value)}
                bg="whiteAlpha.50"
                maxW="400px"
                sx={adminSelectStyles.sx}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </Select>
            </Box>

            <Input
              placeholder="Titel der Session / des Recaps"
              value={recapTitle}
              onChange={(e) => setRecapTitle(e.target.value)}
              bg="whiteAlpha.50"
            />

            <Box>
              <FormLabel fontSize="xs">Datum / Aufzeichnung</FormLabel>
              <Text fontSize="xs" color="gray.500" mb={1}>
                Vom Event übernommen oder manuell — steuert die Anzeige im Mitglieder-Bereich.
              </Text>
              <Input
                type="datetime-local"
                value={recapRecordedAt}
                onChange={(e) => setRecapRecordedAt(e.target.value)}
                bg="whiteAlpha.50"
                maxW="280px"
              />
            </Box>

            <Textarea
              placeholder="Beschreibung (optional)"
              value={recapDesc}
              onChange={(e) => setRecapDesc(e.target.value)}
              bg="whiteAlpha.50"
            />

            {!recapEditingId ? (
              <>
                <Box>
                  <FormLabel fontSize="xs">Video-Quelle (nur bei neuer Session)</FormLabel>
                  <Select
                    value={recapSource}
                    onChange={(e) => setRecapSource(e.target.value as "url" | "file")}
                    bg="whiteAlpha.50"
                    maxW="320px"
                    sx={adminSelectStyles.sx}
                  >
                    <option value="file">Datei-Upload (Hetzner Storage)</option>
                    <option value="url">Externe Video-URL (z. B. Zoom-Cloud)</option>
                  </Select>
                </Box>
                {recapSource === "url" ? (
                  <Input
                    placeholder="https://…"
                    value={recapUrl}
                    onChange={(e) => setRecapUrl(e.target.value)}
                    bg="whiteAlpha.50"
                  />
                ) : (
                  <Box>
                    <input
                      ref={recapFileRef}
                      type="file"
                      accept="video/*"
                      hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setRecapFileName(f.name);
                          setRecapFileSize(f.size);
                        }
                      }}
                    />
                    <HStack gap={3} flexWrap="wrap">
                      <Button size="sm" variant="outline" onClick={() => recapFileRef.current?.click()}>
                        Videodatei wählen
                      </Button>
                      {recapFileName ? (
                        <Text fontSize="xs" color="gray.300" className="inter" noOfLines={1} maxW="280px">
                          {recapFileName}
                          {recapFileSize ? ` (${(recapFileSize / 1024 / 1024).toFixed(1)} MB)` : ""}
                        </Text>
                      ) : null}
                    </HStack>
                  </Box>
                )}
              </>
            ) : (
              <Box p={3} borderRadius="md" borderWidth="1px" borderColor="whiteAlpha.200" bg="whiteAlpha.50">
                <Text fontSize="sm" color="gray.300" mb={2}>
                  Video ist bereits hinterlegt. Du kannst die Metadaten oben ändern.
                </Text>
                <FormLabel fontSize="xs">Externe Video-URL ändern (optional)</FormLabel>
                <Select
                  value={recapSource}
                  onChange={(e) => setRecapSource(e.target.value as "url" | "file")}
                  bg="whiteAlpha.50"
                  maxW="320px"
                  mb={2}
                  sx={adminSelectStyles.sx}
                >
                  <option value="file">Aktuelles Video beibehalten (Storage)</option>
                  <option value="url">Auf externe URL umstellen / URL ändern</option>
                </Select>
                {recapSource === "url" ? (
                  <Input
                    placeholder="https://…"
                    value={recapUrl}
                    onChange={(e) => setRecapUrl(e.target.value)}
                    bg="whiteAlpha.50"
                  />
                ) : null}
              </Box>
            )}

            {recapBusy && recapSource === "file" ? (
              <Box
                p={4}
                borderRadius="12px"
                borderWidth="1px"
                borderColor="rgba(59, 130, 246, 0.4)"
                bg="rgba(30, 58, 138, 0.15)"
              >
                <HStack justify="space-between" mb={2} flexWrap="wrap" gap={1}>
                  <Text fontSize="sm" className="inter-semibold" color="blue.200" noOfLines={1} maxW="70%">
                    {recapFileName ?? "Video wird hochgeladen…"}
                  </Text>
                  <Text fontSize="sm" className="jetbrains-mono" color="blue.300" flexShrink={0}>
                    {recapProgress}%
                  </Text>
                </HStack>
                {recapFileSize ? (
                  <Text fontSize="xs" color="gray.400" className="inter" mb={2}>
                    {(recapFileSize / 1024 / 1024).toFixed(1)} MB
                    {recapProgress > 0 && recapProgress < 100
                      ? ` — ${((recapFileSize / 1024 / 1024) * (recapProgress / 100)).toFixed(1)} MB übertragen`
                      : ""}
                  </Text>
                ) : null}
                <Progress
                  value={recapProgress}
                  size="sm"
                  borderRadius="full"
                  colorScheme="blue"
                  hasStripe={recapProgress < 100}
                  isAnimated={recapProgress < 100}
                />
                {recapStatus ? (
                  <Text fontSize="xs" color="blue.300" className="inter" mt={2}>
                    {recapStatus}
                  </Text>
                ) : null}
              </Box>
            ) : null}

            <HStack flexWrap="wrap" gap={3}>
              <Button
                colorScheme="yellow"
                onClick={() => void submitRecap()}
                isLoading={recapBusy}
                isDisabled={recapBusy}
              >
                {recapEditingId ? "Änderungen speichern" : "Recap anlegen"}
              </Button>
              {recapEditingId ? (
                <Button variant="ghost" onClick={clearRecapForm}>
                  Abbrechen
                </Button>
              ) : null}
            </HStack>

            {!recapBusy && recapStatus ? (
              <Text
                fontSize="sm"
                color={recapStatus.includes("fehlgeschlagen") || recapStatus.includes("Fehler") || recapStatus.includes("Bitte") ? "red.300" : "green.300"}
              >
                {recapStatus}
              </Text>
            ) : null}

            <Stack gap={2} pt={4} borderTopWidth="1px" borderColor="whiteAlpha.200">
              <Text fontSize="md" className="inter-semibold">
                Vorhandene Recaps / Sessions
              </Text>
              <Text fontSize="xs" color="gray.500">
                Schnell bearbeiten oder löschen (Löschen entfernt auch alle zugehörigen Videos).
              </Text>
              <Stack gap={2} maxH="320px" overflowY="auto">
                {sessions.map((s) => {
                  const ev = s.event_id ? events.find((e) => e.id === s.event_id) : null;
                  const dateStr = ev
                    ? new Date(ev.start_time).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })
                    : s.recorded_at
                      ? new Date(s.recorded_at).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })
                      : "—";
                  return (
                    <HStack
                      key={s.id}
                      justify="space-between"
                      p={3}
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor={recapEditingId === s.id ? "rgba(212,175,55,0.45)" : "whiteAlpha.200"}
                      align="flex-start"
                      flexWrap="wrap"
                      gap={2}
                    >
                      <Box minW={0} flex={1}>
                        <Text fontWeight="600" noOfLines={2}>
                          {s.title}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {categories.find((c) => c.id === s.category_id)?.title ?? "—"} · {dateStr}
                        </Text>
                        {ev ? (
                          <Text fontSize="xs" color="blue.200" noOfLines={1}>
                            Event: {ev.title}
                          </Text>
                        ) : null}
                      </Box>
                      <HStack flexShrink={0}>
                        <Button size="sm" variant="outline" onClick={() => void startEditRecap(s)}>
                          Bearbeiten
                        </Button>
                        <IconButton
                          aria-label="Löschen"
                          size="sm"
                          variant="outline"
                          colorScheme="red"
                          icon={<Trash2 size={16} />}
                          onClick={() => void deleteSession(s.id)}
                        />
                      </HStack>
                    </HStack>
                  );
                })}
              </Stack>
            </Stack>
          </Stack>
        </TabPanel>

        <TabPanel px={0} pt={6}>
          <Stack gap={6} maxW="900px">
            <Text fontSize="sm" color="gray.400">
              Pro Session ein Eintrag: Metadaten, optionales Event, Thumbnail. Videos legst du im Tab „Videos &amp;
              Abschnitte“ an.
            </Text>
            <Stack gap={3}>
              <Input
                placeholder="Titel"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                bg="whiteAlpha.50"
              />
              <Textarea
                placeholder="Beschreibung"
                value={sessionDesc}
                onChange={(e) => setSessionDesc(e.target.value)}
                bg="whiteAlpha.50"
              />
              <HStack flexWrap="wrap" gap={4} align="flex-end">
                <Box flex={1} minW="200px">
                  <FormLabel fontSize="xs">Kategorie</FormLabel>
                  <Select
                    placeholder="Kategorie wählen"
                    value={sessionCategoryId}
                    onChange={(e) => setSessionCategoryId(e.target.value)}
                    bg="whiteAlpha.50"
                    sx={adminSelectStyles.sx}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </Select>
                </Box>
                <Box flex={1} minW="200px">
                  <FormLabel fontSize="xs">Event (optional)</FormLabel>
                  <Select
                    placeholder="Kein Event"
                    value={sessionEventId}
                    onChange={(e) => setSessionEventId(e.target.value)}
                    bg="whiteAlpha.50"
                    sx={adminSelectStyles.sx}
                  >
                    <option value="">Kein Event</option>
                    {sortedEvents.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        [{ev.event_type ?? "?"}] {ev.title}
                      </option>
                    ))}
                  </Select>
                </Box>
              </HStack>
              <Box>
                <FormLabel fontSize="xs">Aufzeichnungsdatum</FormLabel>
                <Input
                  type="datetime-local"
                  value={sessionRecordedAt}
                  onChange={(e) => setSessionRecordedAt(e.target.value)}
                  bg="whiteAlpha.50"
                  maxW="280px"
                />
              </Box>
              <HStack gap={3}>
                <Button size="sm" variant="outline" onClick={() => void pickSessionThumb()} isLoading={thumbBusy}>
                  Session-Thumbnail
                </Button>
                {sessionThumbKey ? (
                  <Text fontSize="xs" color="green.300">
                    Bild gesetzt
                  </Text>
                ) : (
                  <Text fontSize="xs" color="gray.500">
                    Kein Thumbnail
                  </Text>
                )}
              </HStack>
              <HStack gap={3}>
                <Button colorScheme="blue" onClick={() => void saveSession()} isLoading={sessionBusy}>
                  {editingSessionId ? "Änderungen speichern" : "Session anlegen"}
                </Button>
                {editingSessionId ? (
                  <Button variant="ghost" onClick={clearSessionForm}>
                    Abbrechen
                  </Button>
                ) : null}
              </HStack>
            </Stack>

            <Stack gap={2}>
              <Text fontSize="lg" className="inter-semibold">
                Vorhandene Sessions
              </Text>
              {sessions.map((s) => (
                <HStack
                  key={s.id}
                  justify="space-between"
                  p={3}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor="whiteAlpha.200"
                  align="flex-start"
                >
                  <Box minW={0}>
                    <Text fontWeight="600">{s.title}</Text>
                    <Text fontSize="xs" color="gray.500">
                      Kategorie: {categories.find((c) => c.id === s.category_id)?.title ?? "—"}
                    </Text>
                  </Box>
                  <HStack>
                    <Button size="sm" variant="outline" onClick={() => startEditSession(s)}>
                      Bearbeiten
                    </Button>
                    <IconButton
                      aria-label="Löschen"
                      size="sm"
                      variant="outline"
                      colorScheme="red"
                      icon={<Trash2 size={16} />}
                      onClick={() => void deleteSession(s.id)}
                    />
                  </HStack>
                </HStack>
              ))}
            </Stack>
          </Stack>
        </TabPanel>

        <TabPanel px={0} pt={6}>
          <Stack gap={6} maxW="900px">
            <Box>
              <FormLabel fontSize="xs">Session auswählen</FormLabel>
              <Select
                placeholder="Session wählen…"
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                bg="whiteAlpha.50"
                maxW="480px"
                sx={adminSelectStyles.sx}
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </Select>
            </Box>

            {!selectedSessionId ? (
              <Text fontSize="sm" color="gray.500">
                Bitte zuerst eine Session wählen oder im Tab „Sessions“ anlegen.
              </Text>
            ) : (
              <>
                <Stack gap={3}>
                  <Text fontSize="md" className="inter-semibold">
                    Abschnitte (Sub-Kategorien)
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    Optional: Videos einer Session in Accordions gruppieren (z. B. „Teil 1“, „Q&amp;A“).
                  </Text>
                  <HStack flexWrap="wrap" gap={3}>
                    <Input
                      placeholder="Abschnitts-Titel"
                      value={subTitle}
                      onChange={(e) => setSubTitle(e.target.value)}
                      bg="whiteAlpha.50"
                      maxW="280px"
                    />
                    <Input
                      type="number"
                      value={subPosition}
                      onChange={(e) => setSubPosition(Number(e.target.value))}
                      bg="whiteAlpha.50"
                      maxW="100px"
                    />
                    <Button size="sm" onClick={() => void addSubcategory()}>
                      Abschnitt hinzufügen
                    </Button>
                  </HStack>
                  <Stack gap={1}>
                    {subs.map((sub) => (
                      <HStack key={sub.id} justify="space-between" p={2} borderRadius="md" bg="whiteAlpha.50">
                        <Text fontSize="sm">
                          {sub.title}{" "}
                          <Text as="span" fontSize="xs" color="gray.500">
                            (pos. {sub.position})
                          </Text>
                        </Text>
                        <IconButton
                          aria-label="Löschen"
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          icon={<Trash2 size={14} />}
                          onClick={() => void removeSub(sub.id)}
                        />
                      </HStack>
                    ))}
                  </Stack>
                </Stack>

                <Stack gap={3}>
                  <Text fontSize="md" className="inter-semibold">
                    Video (Hetzner / S3)
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    Titel eingeben, optional Abschnitt wählen, dann MP4 hochladen. Pro Session typischerweise ein Video;
                    die Struktur erlaubt mehrere Clips.
                  </Text>
                  <Input
                    placeholder="Video-Titel"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    bg="whiteAlpha.50"
                  />
                  <Textarea
                    placeholder="Beschreibung (optional)"
                    value={videoDesc}
                    onChange={(e) => setVideoDesc(e.target.value)}
                    bg="whiteAlpha.50"
                  />
                  <Box maxW="320px">
                    <FormLabel fontSize="xs">Abschnitt (optional)</FormLabel>
                    <Select
                      placeholder="Kein Abschnitt"
                      value={videoSubId}
                      onChange={(e) => setVideoSubId(e.target.value)}
                      bg="whiteAlpha.50"
                      sx={adminSelectStyles.sx}
                    >
                      <option value="">Kein Abschnitt</option>
                      {subs.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.title}
                        </option>
                      ))}
                    </Select>
                  </Box>
                  <Box>
                    <input
                      ref={videoFileRef}
                      type="file"
                      accept="video/*"
                      hidden
                      onChange={(e) => void onPickVideo(e)}
                    />
                    <Button
                      size="md"
                      colorScheme="blue"
                      isLoading={videoBusy}
                      isDisabled={videoBusy}
                      onClick={() => videoFileRef.current?.click()}
                    >
                      Videodatei auswählen
                    </Button>
                  </Box>
                  {videoBusy || videoProgress > 0 ? (
                    <Progress value={videoProgress} size="sm" borderRadius="full" colorScheme="blue" maxW="400px" />
                  ) : null}
                  {videoStatus ? (
                    <Text fontSize="sm" color="blue.200">
                      {videoStatus}
                    </Text>
                  ) : null}

                  <Stack gap={2} mt={4}>
                    <Text fontSize="sm" className="inter-semibold">
                      Hochgeladene Videos
                    </Text>
                    {videos.map((v) => (
                      <HStack
                        key={v.id}
                        justify="space-between"
                        p={3}
                        borderRadius="md"
                        borderWidth="1px"
                        borderColor="whiteAlpha.200"
                        align="flex-start"
                      >
                        <Box minW={0}>
                          <Text fontWeight="600">{v.title}</Text>
                          <Text fontSize="xs" color="gray.500" noOfLines={2}>
                            {v.storage_key}
                          </Text>
                        </Box>
                        <HStack>
                          <Button size="xs" variant="outline" onClick={() => pickVideoThumb(v.id)}>
                            Thumb
                          </Button>
                          <IconButton
                            aria-label="Löschen"
                            size="sm"
                            variant="outline"
                            colorScheme="red"
                            icon={<Trash2 size={16} />}
                            onClick={() => void removeVideo(v.id)}
                          />
                        </HStack>
                      </HStack>
                    ))}
                  </Stack>
                </Stack>
              </>
            )}
          </Stack>
        </TabPanel>
      </TabPanels>
      {status ? (
        <Text mt={4} fontSize="sm" color="green.300">
          {status}
        </Text>
      ) : null}
    </Tabs>
  );
}
