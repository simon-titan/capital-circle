"use client";

import { Box, Button, HStack, Text } from "@chakra-ui/react";
import { ImagePlus, Upload } from "lucide-react";
import { useCallback, useRef, useState, type ReactNode } from "react";

/**
 * Bildfläche im 16:9-Format, die eine Datei per Drag & Drop entgegennimmt.
 *
 * Der Grund für Drag & Drop ist nicht Bequemlichkeit: Auf dem Rechner des
 * Nutzers friert der **Windows-Dateidialog** den ganzen Browser ein (Windows
 * protokolliert Hangs für chrome.exe und opera.exe gleichermaßen, Ereignis-ID
 * 1002). Ein Bild aus einem offenen Explorer-Fenster hierher zu ziehen umgeht
 * den Dialog vollständig. Der Knopf zum Auswählen bleibt als zweiter Weg da —
 * auf gesunden Systemen ist er der gewohnte.
 *
 * Die Komponente lädt nichts hoch: Sie liefert die Datei über `onFile` und
 * zeigt an, was der Aufrufer ihr über `busy` und `previewUrl` mitteilt.
 */
export type ImageDropZoneProps = {
  /** Aktuell hinterlegtes Bild (bereits abrufbare URL) — sonst Platzhalter. */
  previewUrl?: string | null;
  /** Wird mit der abgelegten oder ausgewählten Datei aufgerufen. */
  onFile: (file: File) => void | Promise<void>;
  /** Upload läuft gerade. */
  busy?: boolean;
  disabled?: boolean;
  /** Text im leeren Zustand. */
  platzhalter?: string;
  /** Ecke oben rechts, z. B. ein Formathinweis. */
  ecke?: ReactNode;
  /** Zusätzliche Knöpfe unter der Fläche (z. B. „Entfernen“). */
  aktionen?: ReactNode;
  maxW?: string;
};

const BILD_TYPEN = /^image\/(jpeg|png|webp|gif|avif)$/i;
const BILD_ENDUNGEN = /\.(jpe?g|png|webp|gif|avif)$/i;

function istBild(file: File): boolean {
  return BILD_TYPEN.test(file.type) || BILD_ENDUNGEN.test(file.name);
}

export function ImageDropZone({
  previewUrl,
  onFile,
  busy = false,
  disabled = false,
  platzhalter = "Bild hierher ziehen",
  ecke,
  aktionen,
  maxW = "400px",
}: ImageDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hinweis, setHinweis] = useState<string | null>(null);

  // Dragenter/-leave feuern auch für Kindelemente. Ein Zähler statt eines
  // Booleans verhindert, dass die Fläche beim Überfahren innerer Knoten flackert.
  const dragTiefe = useRef(0);
  const [dragAktiv, setDragAktiv] = useState(false);

  const gesperrt = disabled || busy;

  const nimm = useCallback(
    (dateien: FileList | null) => {
      const liste = Array.from(dateien ?? []);
      if (liste.length === 0) return;
      const bild = liste.find(istBild);
      if (!bild) {
        setHinweis("Das ist keine Bilddatei — JPG, PNG, WEBP, GIF oder AVIF.");
        return;
      }
      setHinweis(null);
      void onFile(bild);
    },
    [onFile],
  );

  return (
    <Box w="100%" maxW={maxW}>
      <Box
        position="relative"
        w="100%"
        borderRadius="10px"
        overflow="hidden"
        border="1px dashed"
        borderColor={dragAktiv ? "var(--cc-gold-line)" : "var(--cc-line-strong)"}
        boxShadow={dragAktiv ? "0 0 0 1px var(--cc-gold-line)" : "none"}
        transition="border-color 150ms var(--cc-ease), box-shadow 150ms var(--cc-ease)"
        onDragEnter={(e) => {
          e.preventDefault();
          if (gesperrt) return;
          dragTiefe.current += 1;
          setDragAktiv(true);
        }}
        onDragOver={(e) => {
          // Ohne preventDefault übernimmt der Browser den Drop und öffnet das Bild.
          e.preventDefault();
          if (!gesperrt) e.dataTransfer.dropEffect = "copy";
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
          if (gesperrt) return;
          nimm(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          hidden
          onChange={(e) => {
            const dateien = e.target.files;
            e.target.value = "";
            nimm(dateien);
          }}
        />

        {/* 16:9 über padding-top, damit die Fläche auch ohne Bild steht. */}
        <Box position="relative" w="100%" pt="56.25%" bg="var(--cc-bg)">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <Box
              position="absolute"
              inset={0}
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              gap={2}
              px={4}
              bg="radial-gradient(circle at 100% 0%, rgba(212, 176, 128, 0.16), transparent 62%), var(--cc-surface-2)"
            >
              <Box as={Upload} boxSize="22px" color="var(--cc-text-3)" aria-hidden />
              <Text fontSize="14px" textAlign="center" color="var(--cc-text-2)">
                {platzhalter}
              </Text>
            </Box>
          )}

          {/* Beim Ziehen über das vorhandene Bild legen: sonst sieht man nicht,
              dass man hier ablegen darf. */}
          {dragAktiv ? (
            <Box
              position="absolute"
              inset={0}
              display="flex"
              alignItems="center"
              justifyContent="center"
              bg="rgba(212, 176, 128, 0.16)"
              backdropFilter="blur(2px)"
            >
              <Text fontSize="15px" fontWeight={600} color="var(--cc-gold-light)">
                Loslassen zum Hochladen
              </Text>
            </Box>
          ) : null}

          {busy ? (
            <Box
              position="absolute"
              inset={0}
              display="flex"
              alignItems="center"
              justifyContent="center"
              bg="rgba(8, 10, 12, 0.6)"
            >
              <Text fontSize="14px" fontWeight={500} color="var(--cc-text)">
                Wird hochgeladen…
              </Text>
            </Box>
          ) : null}

          {ecke ? (
            <Box position="absolute" top={2} right={2}>
              {ecke}
            </Box>
          ) : null}
        </Box>
      </Box>

      <HStack mt={3} spacing={3} flexWrap="wrap">
        <Button
          size="md"
          variant="line"
          leftIcon={<ImagePlus size={18} />}
          onClick={() => inputRef.current?.click()}
          isLoading={busy}
          isDisabled={gesperrt}
        >
          {previewUrl ? "Bild ersetzen" : "Bild auswählen"}
        </Button>
        {aktionen}
      </HStack>

      {hinweis ? (
        <Text mt={2} fontSize="13px" color="var(--cc-danger)">
          {hinweis}
        </Text>
      ) : null}
    </Box>
  );
}
