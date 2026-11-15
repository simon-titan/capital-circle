"use client";

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Flex,
  HStack,
  Input,
  Progress,
  Spinner,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { Download, ExternalLink, FilePlus2, FileText, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CloudflareVideoPicker, type CloudflareVideoPick } from "@/components/admin/CloudflareVideoPicker";
import {
  CloudflareVideoUploader,
  type CloudflareVideoUploadedPayload,
} from "@/components/admin/CloudflareVideoUploader";
import {
  ADMIN_CARD_CLASS,
  AdminCardTitle,
  AdminLabel,
  adminAlertIconColor,
  adminAlertProps,
  adminCardPadding,
  adminDangerButtonProps,
  adminInputProps,
  StatusPill,
} from "@/components/admin/adminUi";
import { BLUEPRINT_DOWNLOAD_PFAD, BLUEPRINT_PFAD } from "@/config/free-bereich";
import type { TradingBlueprint } from "@/lib/trading-blueprint";

/** Gleich `BLUEPRINT_MAX_BYTES` in `lib/trading-blueprint.ts` (dort serverseitig geprüft). */
const MAX_MB = 50;

type Antwort = { ok: boolean; blueprint?: TradingBlueprint; error?: string; hinweise?: string[] };

function groesseText(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

function datumText(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "medium", timeStyle: "short" });
}

function istPdf(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

/** PUT direkt zu R2 mit Fortschritt (XHR, weil `fetch` keinen Upload-Fortschritt kennt). */
function ladeHoch(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", "application/pdf");
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) onProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload fehlgeschlagen (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Netzwerkfehler beim Upload"));
    xhr.send(file);
  });
}

/**
 * Ablagefläche für das PDF. Drag & Drop ist der Hauptweg: Auf Simons Rechner
 * friert der Windows-Dateidialog den Browser ein (siehe `ImageDropZone`). Der
 * Knopf bleibt als zweiter Weg für gesunde Systeme.
 */
function PdfDropZone({ onFile, busy, hatDatei }: { onFile: (f: File) => void; busy: boolean; hatDatei: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragTiefe = useRef(0);
  const [dragAktiv, setDragAktiv] = useState(false);
  const [hinweis, setHinweis] = useState<string | null>(null);

  const nimm = (dateien: FileList | null) => {
    const pdf = Array.from(dateien ?? []).find(istPdf);
    if (!pdf) {
      setHinweis("Das ist keine PDF-Datei.");
      return;
    }
    if (pdf.size > MAX_MB * 1024 * 1024) {
      setHinweis(`Die Datei ist größer als ${MAX_MB} MB.`);
      return;
    }
    setHinweis(null);
    onFile(pdf);
  };

  return (
    <Box>
      <Flex
        direction="column"
        align="center"
        justify="center"
        gap={2}
        minH="150px"
        px={4}
        py={6}
        borderRadius="10px"
        border="1px dashed"
        borderColor={dragAktiv ? "var(--cc-gold-line)" : "var(--cc-line-strong)"}
        bg={dragAktiv ? "rgba(212, 176, 128, 0.08)" : "rgba(255, 255, 255, 0.02)"}
        transition="border-color 150ms var(--cc-ease), background-color 150ms var(--cc-ease)"
        onDragEnter={(e) => {
          e.preventDefault();
          if (busy) return;
          dragTiefe.current += 1;
          setDragAktiv(true);
        }}
        onDragOver={(e) => {
          // Ohne preventDefault öffnet der Browser das PDF selbst.
          e.preventDefault();
          if (!busy) e.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          dragTiefe.current = Math.max(0, dragTiefe.current - 1);
          if (dragTiefe.current === 0) setDragAktiv(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          dragTiefe.current = 0;
          setDragAktiv(false);
          if (!busy) nimm(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(e) => {
            const dateien = e.target.files;
            e.target.value = "";
            nimm(dateien);
          }}
        />
        <Box color={dragAktiv ? "var(--cc-gold-light)" : "var(--cc-text-3)"}>
          <Upload size={22} aria-hidden />
        </Box>
        <Text fontSize="14px" color="var(--cc-text-2)" textAlign="center">
          {dragAktiv
            ? "Loslassen zum Hochladen"
            : hatDatei
              ? "Neues PDF hierher ziehen, um das bisherige zu ersetzen"
              : "PDF hierher ziehen"}
        </Text>
        <Text fontSize="12px" color="var(--cc-text-3)">
          Nur PDF, höchstens {MAX_MB} MB
        </Text>
      </Flex>
      <HStack mt={3} spacing={3}>
        <Button
          size="sm"
          variant="line"
          leftIcon={<FilePlus2 size={16} />}
          onClick={() => inputRef.current?.click()}
          isDisabled={busy}
        >
          Datei auswählen
        </Button>
      </HStack>
      {hinweis ? (
        <Text mt={2} fontSize="13px" color="var(--cc-danger)">
          {hinweis}
        </Text>
      ) : null}
    </Box>
  );
}

/**
 * Trading Blueprint im Admin (`/admin/training/blueprint`): PDF in R2 und
 * optional eine Videoanleitung aus Cloudflare Stream. Gespeichert in
 * `app_settings.trading_blueprint` (`lib/trading-blueprint.ts`).
 */
export function TradingBlueprintManager() {
  const [stand, setStand] = useState<TradingBlueprint | null>(null);
  const [meldung, setMeldung] = useState<{ art: "error" | "success" | "warning"; text: string } | null>(null);
  const [upload, setUpload] = useState<number | null>(null);
  const [speichert, setSpeichert] = useState(false);
  const [uidEingabe, setUidEingabe] = useState("");
  const [titel, setTitel] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [pickerSchluessel, setPickerSchluessel] = useState(0);

  const uebernimm = useCallback((b: TradingBlueprint) => {
    setStand(b);
    setTitel(b.titel ?? "");
    setBeschreibung(b.beschreibung ?? "");
    setUidEingabe("");
  }, []);

  useEffect(() => {
    let abbruch = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/training/blueprint", { cache: "no-store" });
        const json = (await res.json()) as Antwort;
        if (abbruch) return;
        if (!json.ok || !json.blueprint) throw new Error(json.error ?? "Laden fehlgeschlagen");
        uebernimm(json.blueprint);
      } catch (e) {
        if (!abbruch) setMeldung({ art: "error", text: e instanceof Error ? e.message : "Laden fehlgeschlagen" });
      }
    })();
    return () => {
      abbruch = true;
    };
  }, [uebernimm]);

  const speichere = async (patch: Partial<TradingBlueprint>, erfolg: string): Promise<boolean> => {
    if (!stand) return false;
    setSpeichert(true);
    setMeldung(null);
    try {
      const res = await fetch("/api/admin/training/blueprint", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...stand, titel, beschreibung, ...patch }),
      });
      const json = (await res.json().catch(() => ({ ok: false }))) as Antwort;
      if (!json.ok || !json.blueprint) {
        setMeldung({ art: "error", text: json.error ?? "Speichern fehlgeschlagen" });
        return false;
      }
      uebernimm(json.blueprint);
      setMeldung(
        json.hinweise?.length
          ? { art: "warning", text: `${erfolg} ${json.hinweise.join(" ")}` }
          : { art: "success", text: erfolg },
      );
      return true;
    } finally {
      setSpeichert(false);
    }
  };

  const pdfHochladen = async (file: File) => {
    setMeldung(null);
    setUpload(0);
    try {
      const res = await fetch("/api/admin/training/blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateiname: file.name, groesse: file.size }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; presignedUrl?: string; storageKey?: string; error?: string };
      if (!json.ok || !json.presignedUrl || !json.storageKey) throw new Error(json.error ?? "Upload-Adresse nicht erhalten");
      await ladeHoch(json.presignedUrl, file, setUpload);
      await speichere(
        { r2_key: json.storageKey, dateiname: file.name, groesse: file.size },
        "PDF hochgeladen und veröffentlicht.",
      );
    } catch (e) {
      setMeldung({ art: "error", text: e instanceof Error ? e.message : "Upload fehlgeschlagen" });
    } finally {
      setUpload(null);
    }
  };

  const videoSetzen = async (uid: string) => {
    const ok = await speichere({ video_uid: uid }, "Videoanleitung hinterlegt und auf signierte Wiedergabe gestellt.");
    if (ok) setPickerSchluessel((k) => k + 1);
  };

  if (!stand) {
    return meldung ? (
      <Alert status="error" {...adminAlertProps("error")}>
        <AlertIcon color={adminAlertIconColor("error")} />
        <Text fontSize="sm">{meldung.text}</Text>
      </Alert>
    ) : (
      <HStack py={10} justify="center">
        <Spinner size="sm" color="var(--cc-gold)" />
      </HStack>
    );
  }

  const beschaeftigt = speichert || upload !== null;

  return (
    <Stack spacing={6}>
      {meldung ? (
        <Alert status={meldung.art} {...adminAlertProps(meldung.art)}>
          <AlertIcon color={adminAlertIconColor(meldung.art)} />
          <Text fontSize="sm">{meldung.text}</Text>
        </Alert>
      ) : null}

      {/* ── PDF ─────────────────────────────────────────────────────────── */}
      <Stack className={ADMIN_CARD_CLASS} p={adminCardPadding} spacing={4}>
        <Flex justify="space-between" align="center" gap={3} wrap="wrap">
          <HStack spacing={3}>
            <AdminCardTitle>PDF</AdminCardTitle>
            <StatusPill tone={stand.r2_key ? "success" : "attention"}>
              {stand.r2_key ? "veröffentlicht" : "noch kein PDF · „Erscheint in Kürze“"}
            </StatusPill>
          </HStack>
          <Link href={BLUEPRINT_PFAD} target="_blank" style={{ textDecoration: "none" }}>
            <Button as="span" size="sm" variant="line" rightIcon={<ExternalLink size={14} />}>
              Als Mitglied ansehen
            </Button>
          </Link>
        </Flex>

        {stand.r2_key ? (
          <Flex
            align={{ base: "flex-start", md: "center" }}
            direction={{ base: "column", md: "row" }}
            gap={3}
            p={3}
            borderRadius="10px"
            border="1px solid var(--cc-line)"
            bg="rgba(255, 255, 255, 0.02)"
          >
            <HStack spacing={3} flex="1" minW={0}>
              <Box color="var(--cc-gold-light)" flexShrink={0}>
                <FileText size={22} aria-hidden />
              </Box>
              <Box minW={0}>
                <Text fontSize="14px" fontWeight={500} color="var(--cc-text)" wordBreak="break-all">
                  {stand.dateiname ?? "Trading-Blueprint.pdf"}
                </Text>
                <Text className="cc-num" fontSize="12px" color="var(--cc-text-3)">
                  {[groesseText(stand.groesse), datumText(stand.aktualisiert_am) && `aktualisiert ${datumText(stand.aktualisiert_am)}`]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </Box>
            </HStack>
            <HStack spacing={2} flexShrink={0}>
              <Button
                as="a"
                href={BLUEPRINT_DOWNLOAD_PFAD}
                target="_blank"
                rel="noopener"
                size="sm"
                variant="line"
                leftIcon={<Download size={14} />}
              >
                Testen
              </Button>
              <Button
                size="sm"
                {...adminDangerButtonProps}
                isDisabled={beschaeftigt}
                aria-label="PDF entfernen"
                onClick={() => {
                  if (!window.confirm("PDF entfernen? Mitglieder sehen danach wieder „Erscheint in Kürze“.")) return;
                  void speichere({ r2_key: null, dateiname: null, groesse: null }, "PDF entfernt.");
                }}
              >
                <Trash2 size={15} />
              </Button>
            </HStack>
          </Flex>
        ) : null}

        <PdfDropZone onFile={(f) => void pdfHochladen(f)} busy={beschaeftigt} hatDatei={Boolean(stand.r2_key)} />
        {upload !== null ? (
          <Stack spacing={1}>
            <Progress value={upload} size="xs" borderRadius="full" />
            <Text className="cc-num" fontSize="12px" color="var(--cc-text-2)">
              Wird hochgeladen … {upload} %
            </Text>
          </Stack>
        ) : null}
      </Stack>

      {/* ── Videoanleitung ──────────────────────────────────────────────── */}
      <Stack className={ADMIN_CARD_CLASS} p={adminCardPadding} spacing={4}>
        <HStack spacing={3}>
          <AdminCardTitle>Videoanleitung (optional)</AdminCardTitle>
          <StatusPill tone={stand.video_uid ? "success" : "neutral"}>
            {stand.video_uid ? "hinterlegt" : "kein Video · Link ausgeblendet"}
          </StatusPill>
        </HStack>
        <Text fontSize="13px" color="var(--cc-text-2)" lineHeight={1.55}>
          Ein Video aus Cloudflare Stream. Mitglieder sehen es auf {BLUEPRINT_PFAD}, das Dashboard verlinkt dorthin. Beim
          Hinterlegen wird die signierte Wiedergabe eingeschaltet — wie bei den Trainingsvideos.
        </Text>

        {stand.video_uid ? (
          <Flex align="center" gap={3} wrap="wrap">
            <Text className="cc-num" fontSize="13px" color="var(--cc-text)" fontFamily="monospace">
              {stand.video_uid}
            </Text>
            <Button
              size="sm"
              {...adminDangerButtonProps}
              isDisabled={beschaeftigt}
              onClick={() => void speichere({ video_uid: null }, "Videoanleitung entfernt.")}
            >
              Entfernen
            </Button>
          </Flex>
        ) : null}

        <Stack spacing={2}>
          <AdminLabel>Video-UID eintragen</AdminLabel>
          <HStack spacing={2} align="stretch">
            <Input
              size="sm"
              {...adminInputProps}
              value={uidEingabe}
              onChange={(e) => setUidEingabe(e.target.value.trim())}
              placeholder="32 Zeichen aus Cloudflare Stream"
              maxW="360px"
            />
            <Button
              size="sm"
              variant="line"
              isDisabled={!uidEingabe || beschaeftigt}
              onClick={() => void videoSetzen(uidEingabe)}
            >
              Übernehmen
            </Button>
          </HStack>
        </Stack>

        <Stack spacing={2}>
          <AdminLabel>Oder aus Cloudflare Stream wählen</AdminLabel>
          <CloudflareVideoPicker
            key={pickerSchluessel}
            einzeln
            buttonLabel="Als Videoanleitung hinterlegen"
            disabled={beschaeftigt}
            onAdd={(picks: CloudflareVideoPick[]) => (picks[0] ? videoSetzen(picks[0].uid) : undefined)}
          />
        </Stack>

        <Stack spacing={2}>
          <AdminLabel>Oder neu hochladen</AdminLabel>
          <CloudflareVideoUploader
            disabled={beschaeftigt}
            onUploaded={(p: CloudflareVideoUploadedPayload) => videoSetzen(p.cloudflareUid)}
          />
        </Stack>
      </Stack>

      {/* ── Texte ───────────────────────────────────────────────────────── */}
      <Stack className={ADMIN_CARD_CLASS} p={adminCardPadding} spacing={4}>
        <AdminCardTitle>Texte auf der Blueprint-Seite (optional)</AdminCardTitle>
        <Text fontSize="13px" color="var(--cc-text-2)">
          Leer lassen für den Standardtext. Die Dashboard-Karte bleibt beim Wortlaut aus dem Mockup.
        </Text>
        <Stack spacing={2}>
          <AdminLabel>Untertitel</AdminLabel>
          <Input
            size="sm"
            {...adminInputProps}
            value={titel}
            maxLength={120}
            onChange={(e) => setTitel(e.target.value)}
            placeholder="Entwickle deinen eigenen Tradingplan."
          />
        </Stack>
        <Stack spacing={2}>
          <AdminLabel>Beschreibung</AdminLabel>
          <Textarea
            size="sm"
            {...adminInputProps}
            value={beschreibung}
            maxLength={1000}
            rows={4}
            onChange={(e) => setBeschreibung(e.target.value)}
            placeholder="Eine praktische Vorlage, die dich bei der Entwicklung eines strukturierten Handelsprozesses unterstützt …"
          />
        </Stack>
        <Box>
          <Button
            size="sm"
            variant="gold"
            isLoading={speichert}
            isDisabled={beschaeftigt}
            onClick={() => void speichere({}, "Texte gespeichert.")}
          >
            Texte speichern
          </Button>
        </Box>
      </Stack>
    </Stack>
  );
}
