"use client";

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Flex,
  HStack,
  Image,
  Input,
  Spinner,
  Stack,
  Switch,
  Text,
} from "@chakra-ui/react";
import { ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CloudflareVideoPicker, type CloudflareVideoPick } from "@/components/admin/CloudflareVideoPicker";
import {
  CloudflareVideoUploader,
  type CloudflareVideoUploadedPayload,
} from "@/components/admin/CloudflareVideoUploader";
import { DraggableList } from "@/components/admin/DraggableList";
import {
  ADMIN_CARD_CLASS,
  AdminCardTitle,
  adminAlertIconColor,
  adminAlertProps,
  adminCardPadding,
  adminDangerButtonProps,
  adminInputProps,
  adminSwitchSx,
  StatusPill,
} from "@/components/admin/adminUi";
import { TRAINING_MODUL_ID, TRAINING_VIDEO_ANZAHL, TRAINING_VIDEOS_PFAD } from "@/config/training";

type TrainingVideo = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  cloudflare_uid: string | null;
  cloudflare_status: string | null;
  duration_seconds: number | null;
  is_published: boolean | null;
  thumbnailUrl: string | null;
};

type ListenAntwort = { ok: boolean; items?: TrainingVideo[]; error?: string; fehler?: string[]; angelegt?: number };

function dauer(sekunden: number | null): string {
  if (!sekunden) return "–";
  const h = Math.floor(sekunden / 3600);
  const m = Math.floor((sekunden % 3600) / 60);
  const s = sekunden % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/**
 * Videos des kostenlosen Trainings anordnen (`/admin/training/videos`).
 *
 * Reihenfolge = Freischaltreihenfolge im Mitgliederbereich (90-%-Regel), daher
 * steht vor jeder Zeile „Video n“. Neue Videos kommen aus Cloudflare Stream
 * (schon hochgeladen) oder per Drag & Drop als neue Datei; beide landen hinten.
 */
export function TrainingVideosManager() {
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [modulFehlt, setModulFehlt] = useState(false);
  const [meldung, setMeldung] = useState<{ art: "error" | "success"; text: string } | null>(null);
  const [beschaeftigt, setBeschaeftigt] = useState(false);
  const [pickerSchluessel, setPickerSchluessel] = useState(0);

  const lade = useCallback(async () => {
    setLaedt(true);
    try {
      const res = await fetch("/api/admin/training/videos", { cache: "no-store" });
      const json = (await res.json()) as ListenAntwort;
      if (json.error === "modul_fehlt") {
        setModulFehlt(true);
        return;
      }
      if (!json.ok) throw new Error(json.error ?? "Laden fehlgeschlagen");
      setModulFehlt(false);
      setVideos(json.items ?? []);
    } catch (e) {
      setMeldung({ art: "error", text: e instanceof Error ? e.message : "Laden fehlgeschlagen" });
    } finally {
      setLaedt(false);
    }
  }, []);

  useEffect(() => {
    void lade();
  }, [lade]);

  // Noch verarbeitete Videos alle 10 s nachfragen, bis Cloudflare fertig ist.
  const videosRef = useRef(videos);
  videosRef.current = videos;
  const offen = videos.some((v) => v.cloudflare_status === "processing" || v.cloudflare_status === "uploading");
  useEffect(() => {
    if (!offen) return;
    const t = setInterval(async () => {
      for (const v of videosRef.current) {
        if (v.cloudflare_status !== "processing" && v.cloudflare_status !== "uploading") continue;
        const res = await fetch(`/api/admin/videos/${v.id}/cloudflare-status`).catch(() => null);
        const json = (await res?.json().catch(() => null)) as { ok?: boolean; item?: Partial<TrainingVideo> } | null;
        if (json?.ok && json.item) {
          setVideos((prev) =>
            prev.map((p) =>
              p.id === v.id
                ? {
                    ...p,
                    cloudflare_status: json.item!.cloudflare_status ?? p.cloudflare_status,
                    duration_seconds: json.item!.duration_seconds ?? p.duration_seconds,
                  }
                : p,
            ),
          );
        }
      }
    }, 10_000);
    return () => clearInterval(t);
  }, [offen]);

  const anhaengen = async (eintraege: { uid: string; titel: string; durationSeconds: number | null }[]) => {
    setBeschaeftigt(true);
    setMeldung(null);
    try {
      const res = await fetch("/api/admin/training/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videos: eintraege }),
      });
      const json = (await res.json()) as ListenAntwort;
      if (json.items) setVideos(json.items);
      if (json.fehler?.length) {
        setMeldung({ art: "error", text: json.fehler.join(" · ") });
      } else if (json.error) {
        setMeldung({ art: "error", text: json.error });
      } else {
        const n = json.angelegt ?? 0;
        setMeldung({
          art: "success",
          text: n === 0 ? "Diese Videos sind schon im Training." : `${n} ${n === 1 ? "Video" : "Videos"} hinzugefügt und auf signierte Wiedergabe gestellt.`,
        });
      }
      setPickerSchluessel((k) => k + 1);
    } finally {
      setBeschaeftigt(false);
    }
  };

  const ausStream = (picks: CloudflareVideoPick[]) =>
    anhaengen(picks.map((p) => ({ uid: p.uid, titel: p.name, durationSeconds: p.durationSeconds })));

  const nachUpload = (p: CloudflareVideoUploadedPayload) =>
    anhaengen([{ uid: p.cloudflareUid, titel: p.fileName, durationSeconds: p.durationSeconds }]);

  const speichern = async (id: string, updates: Partial<Pick<TrainingVideo, "title" | "description" | "is_published">>) => {
    const vorher = videos;
    setVideos((prev) => prev.map((v) => (v.id === id ? { ...v, ...updates } : v)));
    const res = await fetch("/api/admin/videos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, updates }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!json.ok) {
      setVideos(vorher);
      setMeldung({ art: "error", text: json.error ?? "Speichern fehlgeschlagen" });
    }
  };

  const umsortieren = async (ids: string[]) => {
    const vorher = videos;
    const nachId = new Map(videos.map((v) => [v.id, v]));
    setVideos(ids.map((id, i) => ({ ...nachId.get(id)!, position: i })));
    const res = await fetch("/api/admin/videos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reorder: true, moduleId: TRAINING_MODUL_ID, orderedVideoIds: ids }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!json.ok) {
      setVideos(vorher);
      setMeldung({ art: "error", text: json.error ?? "Reihenfolge nicht gespeichert" });
    }
  };

  const entfernen = async (v: TrainingVideo) => {
    if (!window.confirm(`„${v.title}" aus dem Training entfernen? Die Datei bleibt in Cloudflare Stream und lässt sich unten wieder hinzufügen.`)) return;
    const res = await fetch(`/api/admin/videos?id=${encodeURIComponent(v.id)}`, { method: "DELETE" });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (json.ok) {
      setVideos((prev) => prev.filter((p) => p.id !== v.id));
      setPickerSchluessel((k) => k + 1);
    } else {
      setMeldung({ art: "error", text: json.error ?? "Entfernen fehlgeschlagen" });
    }
  };

  if (modulFehlt) {
    return (
      <Alert status="warning" {...adminAlertProps("warning")}>
        <AlertIcon color={adminAlertIconColor("warning")} />
        <Text fontSize="sm">
          Das Modul „Kostenloses Training“ fehlt in der Datenbank. Erst Migration 109 im Supabase-SQL-Editor
          einspielen (Sammeldatei: <code>supabase/migrations/_JETZT_EINSPIELEN.sql</code>), dann neu laden.
        </Text>
      </Alert>
    );
  }

  const veroeffentlicht = videos.filter((v) => v.is_published).length;

  return (
    <Stack spacing={6}>
      {meldung ? (
        <Alert status={meldung.art} {...adminAlertProps(meldung.art)}>
          <AlertIcon color={adminAlertIconColor(meldung.art)} />
          <Text fontSize="sm">{meldung.text}</Text>
        </Alert>
      ) : null}

      <Stack className={ADMIN_CARD_CLASS} p={adminCardPadding} spacing={4}>
        <Flex justify="space-between" align="center" gap={3} wrap="wrap">
          <HStack spacing={3} flexWrap="wrap">
            <AdminCardTitle>Reihenfolge im Training</AdminCardTitle>
            <StatusPill tone={veroeffentlicht === TRAINING_VIDEO_ANZAHL ? "success" : "attention"}>
              {veroeffentlicht} veröffentlicht · Funnel-Texte nennen {TRAINING_VIDEO_ANZAHL}
            </StatusPill>
          </HStack>
          <Link href={TRAINING_VIDEOS_PFAD} target="_blank" style={{ textDecoration: "none" }}>
            <Button as="span" size="sm" variant="line" rightIcon={<ExternalLink size={14} />}>
              Als Mitglied ansehen
            </Button>
          </Link>
        </Flex>
        <Text fontSize="13px" color="var(--cc-text-2)" lineHeight={1.55}>
          Am Griff ziehen, um die Reihenfolge zu ändern. Sie ist zugleich die Freischaltreihenfolge: Video 2 öffnet
          sich erst, wenn Video 1 zu 90 % gesehen ist. Titel und Beschreibung speichern beim Verlassen des Felds.
          Nur veröffentlichte Videos sieht das Mitglied.
        </Text>

        {laedt ? (
          <HStack py={6} justify="center">
            <Spinner size="sm" color="var(--cc-gold)" />
          </HStack>
        ) : videos.length === 0 ? (
          <Box py={6} textAlign="center" color="var(--cc-text-3)" fontSize="14px">
            Noch keine Videos. Unten aus Cloudflare Stream auswählen oder eine Datei hochladen.
          </Box>
        ) : (
          <DraggableList
            items={videos}
            onReorder={(ids) => void umsortieren(ids)}
            renderItem={(v, griff) => {
              const nummer = videos.findIndex((x) => x.id === v.id) + 1;
              return (
                <Flex
                  key={v.id}
                  gap={4}
                  align={{ base: "flex-start", md: "center" }}
                  direction={{ base: "column", md: "row" }}
                  p={3}
                  borderRadius="12px"
                  border="1px solid var(--cc-line)"
                  bg="rgba(255, 255, 255, 0.02)"
                  opacity={v.is_published ? 1 : 0.6}
                >
                  <HStack spacing={3} flexShrink={0}>
                    {griff}
                    <Text className="cc-num" fontSize="12px" fontWeight={600} letterSpacing="0.08em" color="var(--cc-gold-light)" minW="62px">
                      VIDEO {nummer}
                    </Text>
                    <Box w="128px" h="72px" borderRadius="8px" overflow="hidden" bg="var(--cc-track)" flexShrink={0}>
                      {v.thumbnailUrl ? (
                        <Image src={v.thumbnailUrl} alt="" w="100%" h="100%" objectFit="cover" />
                      ) : null}
                    </Box>
                  </HStack>

                  <Stack flex={1} spacing={2} w="100%" minW={0}>
                    <Input
                      size="sm"
                      {...adminInputProps}
                      defaultValue={v.title}
                      aria-label={`Titel von Video ${nummer}`}
                      onBlur={(e) => {
                        const t = e.target.value.trim();
                        if (t && t !== v.title) void speichern(v.id, { title: t });
                      }}
                    />
                    <Input
                      size="sm"
                      {...adminInputProps}
                      defaultValue={v.description ?? ""}
                      placeholder="Beschreibung (optional)"
                      aria-label={`Beschreibung von Video ${nummer}`}
                      onBlur={(e) => {
                        const d = e.target.value.trim() || null;
                        if (d !== (v.description ?? null)) void speichern(v.id, { description: d });
                      }}
                    />
                  </Stack>

                  <HStack spacing={4} flexShrink={0}>
                    <Stack spacing={1} align="flex-end">
                      <Text className="cc-num" fontSize="13px" color="var(--cc-text-2)">
                        {dauer(v.duration_seconds)}
                      </Text>
                      {v.cloudflare_status === "ready" ? null : v.cloudflare_status === "error" ? (
                        <StatusPill tone="danger">Fehler</StatusPill>
                      ) : (
                        <StatusPill tone="attention">wird verarbeitet</StatusPill>
                      )}
                    </Stack>
                    <HStack spacing={2}>
                      <Switch
                        sx={adminSwitchSx}
                        isChecked={Boolean(v.is_published)}
                        onChange={(e) => void speichern(v.id, { is_published: e.target.checked })}
                        aria-label={`Video ${nummer} veröffentlichen`}
                      />
                      <Text fontSize="12px" color="var(--cc-text-2)" minW="76px">
                        {v.is_published ? "sichtbar" : "versteckt"}
                      </Text>
                    </HStack>
                    <Button
                      size="sm"
                      {...adminDangerButtonProps}
                      aria-label={`Video ${nummer} entfernen`}
                      onClick={() => void entfernen(v)}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </HStack>
                </Flex>
              );
            }}
          />
        )}
      </Stack>

      <Stack className={ADMIN_CARD_CLASS} p={adminCardPadding} spacing={4}>
        <AdminCardTitle>Aus Cloudflare Stream hinzufügen</AdminCardTitle>
        <Text fontSize="13px" color="var(--cc-text-2)">
          Für Videos, die schon hochgeladen sind — auch direkt im Cloudflare-Dashboard. Neueste zuerst; „Schon in: Kurs“
          heißt, das Video hängt bereits irgendwo. Beim Hinzufügen wird die signierte Wiedergabe eingeschaltet.
        </Text>
        <CloudflareVideoPicker
          key={pickerSchluessel}
          onAdd={ausStream}
          buttonLabel="Zum Training hinzufügen"
          disabled={beschaeftigt}
        />
      </Stack>

      <Stack className={ADMIN_CARD_CLASS} p={adminCardPadding} spacing={4}>
        <AdminCardTitle>Neue Datei hochladen</AdminCardTitle>
        <CloudflareVideoUploader onUploaded={nachUpload} disabled={beschaeftigt} />
      </Stack>
    </Stack>
  );
}

