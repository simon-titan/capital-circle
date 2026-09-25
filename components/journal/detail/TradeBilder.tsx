"use client";

import {
  Box,
  Button,
  Grid,
  HStack,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Progress,
  Stack,
  Text,
} from "@chakra-ui/react";
import { ImagePlus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  TRADE_BILD_MAX_ANZAHL,
  TRADE_BILD_MAX_BYTES,
  TRADE_BILD_TYPEN,
  type TradeBild,
} from "@/lib/journal/bilder";
import { SectionCard } from "../SectionCard";

type Upload = { id: string; name: string; fehler: string | null };

const FEHLERTEXTE: Record<string, string> = {
  only_png_jpeg_webp: "Nur PNG, JPG oder WEBP.",
  file_too_large: "Größer als 10 MB.",
  too_many_images: `Mehr als ${TRADE_BILD_MAX_ANZAHL} Bilder pro Trade gehen nicht.`,
  bilder_nicht_eingerichtet: "Bilder sind noch nicht freigeschaltet.",
};

function fehlerText(code: string | undefined): string {
  return (code && FEHLERTEXTE[code]) || "Hochladen fehlgeschlagen.";
}

/**
 * Bilder zu einem Trade: Chart vor dem Entry, Exit, Bookmap, TradingView …
 *
 * Hochgeladen wird per **Drag & Drop** oder **Strg+V** (Screenshot aus dem
 * Snipping-Tool direkt einfügen). Der Windows-Dateidialog friert auf dem
 * Rechner des Nutzers den ganzen Browser ein — deshalb ist er hier nur der
 * zweite Weg, vor allem für Handys, wo es kein Drag & Drop gibt.
 *
 * Ablauf je Datei: Presigned PUT holen → direkt nach R2 → bei der Route
 * anmelden (die prüft Größe und Präfix verbindlich).
 */
export function TradeBilder({ tradeId }: { tradeId: string }) {
  const [bilder, setBilder] = useState<TradeBild[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [nichtEingerichtet, setNichtEingerichtet] = useState(false);
  const [ladeFehler, setLadeFehler] = useState(false);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [hinweis, setHinweis] = useState<string | null>(null);
  const [gross, setGross] = useState<TradeBild | null>(null);
  const [loeschFrage, setLoeschFrage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dragTiefe = useRef(0);
  const [dragAktiv, setDragAktiv] = useState(false);
  // Freie Plätze = Maximum − vorhandene − gerade laufende Uploads. Refs, weil
  // mehrere Dateien im selben Tick ankommen und State dann noch alt ist.
  const bilderAnzahlRef = useRef(0);
  const laufendRef = useRef(0);
  useEffect(() => {
    bilderAnzahlRef.current = bilder.length;
  }, [bilder.length]);

  useEffect(() => {
    let abgebrochen = false;
    void (async () => {
      try {
        const res = await fetch(`/api/journal/trades/${tradeId}/bilder`);
        const json = (await res.json().catch(() => null)) as { ok?: boolean; bilder?: TradeBild[]; error?: string } | null;
        if (abgebrochen) return;
        if (json?.error === "bilder_nicht_eingerichtet") setNichtEingerichtet(true);
        else if (!res.ok || !json?.ok) setLadeFehler(true);
        else setBilder(json.bilder ?? []);
      } catch {
        if (!abgebrochen) setLadeFehler(true);
      } finally {
        if (!abgebrochen) setLaedt(false);
      }
    })();
    return () => {
      abgebrochen = true;
    };
  }, [tradeId]);

  const ladeHoch = useCallback(
    async (datei: File) => {
      const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const setFehler = (fehler: string) =>
        setUploads((u) => u.map((x) => (x.id === uploadId ? { ...x, fehler } : x)));
      setUploads((u) => [...u, { id: uploadId, name: datei.name || "Screenshot", fehler: null }]);
      laufendRef.current += 1;

      try {
        const presign = await fetch(`/api/journal/trades/${tradeId}/bilder/presign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentType: datei.type, bytes: datei.size }),
        });
        const p = (await presign.json().catch(() => null)) as
          | { ok?: boolean; presignedUrl?: string; storageKey?: string; error?: string }
          | null;
        if (!presign.ok || !p?.ok || !p.presignedUrl || !p.storageKey) {
          if (p?.error === "bilder_nicht_eingerichtet") setNichtEingerichtet(true);
          setFehler(fehlerText(p?.error));
          return;
        }

        const put = await fetch(p.presignedUrl, {
          method: "PUT",
          headers: { "Content-Type": datei.type },
          body: datei,
        });
        if (!put.ok) {
          setFehler("Hochladen fehlgeschlagen.");
          return;
        }

        const anmelden = await fetch(`/api/journal/trades/${tradeId}/bilder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storageKey: p.storageKey, contentType: datei.type }),
        });
        const a = (await anmelden.json().catch(() => null)) as { ok?: boolean; bild?: TradeBild; error?: string } | null;
        if (!anmelden.ok || !a?.ok || !a.bild) {
          setFehler(fehlerText(a?.error));
          return;
        }
        const neu = a.bild;
        bilderAnzahlRef.current += 1;
        setBilder((b) => [...b, neu]);
        setUploads((u) => u.filter((x) => x.id !== uploadId));
      } catch {
        setFehler("Keine Verbindung.");
      } finally {
        laufendRef.current = Math.max(0, laufendRef.current - 1);
      }
    },
    [tradeId],
  );

  const nimm = useCallback(
    (dateien: File[]) => {
      if (dateien.length === 0) return;
      const bilderDateien = dateien.filter((d) => TRADE_BILD_TYPEN[d.type]);
      const abgelehnt = dateien.length - bilderDateien.length;
      const zuGross = bilderDateien.filter((d) => d.size > TRADE_BILD_MAX_BYTES);
      const passend = bilderDateien.filter((d) => d.size <= TRADE_BILD_MAX_BYTES);
      const frei = Math.max(0, TRADE_BILD_MAX_ANZAHL - bilderAnzahlRef.current - laufendRef.current);
      const genommen = passend.slice(0, frei);

      const meldungen: string[] = [];
      if (abgelehnt > 0) meldungen.push("Nur PNG, JPG oder WEBP.");
      if (zuGross.length > 0) meldungen.push("Bilder über 10 MB wurden übersprungen.");
      if (passend.length > frei) meldungen.push(`Höchstens ${TRADE_BILD_MAX_ANZAHL} Bilder pro Trade.`);
      setHinweis(meldungen.length ? meldungen.join(" ") : null);

      for (const d of genommen) void ladeHoch(d);
    },
    [ladeHoch],
  );

  // Strg+V irgendwo auf der Seite: Bilder aus der Zwischenablage übernehmen.
  // Reiner Text bleibt unberührt (z. B. beim Einfügen in die Notizen).
  useEffect(() => {
    if (nichtEingerichtet) return;
    const beimEinfuegen = (e: ClipboardEvent) => {
      const dateien = Array.from(e.clipboardData?.items ?? [])
        .filter((it) => it.kind === "file" && it.type.startsWith("image/"))
        .map((it) => it.getAsFile())
        .filter((f): f is File => f !== null);
      if (dateien.length === 0) return;
      e.preventDefault();
      nimm(dateien);
    };
    document.addEventListener("paste", beimEinfuegen);
    return () => document.removeEventListener("paste", beimEinfuegen);
  }, [nimm, nichtEingerichtet]);

  const loeschen = async (bild: TradeBild) => {
    setLoeschFrage(null);
    const vorher = bilder;
    setBilder((b) => b.filter((x) => x.id !== bild.id));
    try {
      const res = await fetch(`/api/journal/trades/${tradeId}/bilder/${bild.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setBilder(vorher);
      setHinweis("Das Bild konnte nicht gelöscht werden.");
    }
  };

  const voll = bilder.length + uploads.filter((u) => !u.fehler).length >= TRADE_BILD_MAX_ANZAHL;

  return (
    <SectionCard title="Bilder" hint={bilder.length ? `${bilder.length} / ${TRADE_BILD_MAX_ANZAHL}` : undefined}>
      {nichtEingerichtet ? (
        <Text fontSize="sm" color="var(--cc-text-3)" lineHeight={1.6}>
          Bilder zu Trades werden gerade eingerichtet und stehen in Kürze zur Verfügung.
        </Text>
      ) : ladeFehler ? (
        <Text fontSize="sm" color="var(--cc-text-3)">
          Die Bilder konnten nicht geladen werden. Lade die Seite neu.
        </Text>
      ) : (
        <Stack gap={4}>
          {bilder.length > 0 || uploads.length > 0 ? (
            <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }} gap={2.5}>
              {bilder.map((bild) => (
                <Box
                  key={bild.id}
                  position="relative"
                  borderRadius="8px"
                  overflow="hidden"
                  border="1px solid var(--j-line)"
                  bg="var(--cc-surface-2)"
                  sx={{ aspectRatio: "16 / 10" }}
                  role="group"
                >
                  <Box
                    as="button"
                    type="button"
                    w="100%"
                    h="100%"
                    onClick={() => setGross(bild)}
                    aria-label="Bild groß ansehen"
                    cursor="zoom-in"
                  >
                    {bild.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={bild.url}
                        alt=""
                        loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : null}
                  </Box>
                  <Box position="absolute" top={1.5} right={1.5}>
                    {loeschFrage === bild.id ? (
                      <HStack gap={1}>
                        <Button size="xs" variant="line" bg="rgba(15,19,23,0.85)" onClick={() => setLoeschFrage(null)}>
                          Nein
                        </Button>
                        <Button
                          size="xs"
                          bg="rgba(248, 113, 113, 0.9)"
                          color="#1a0d0d"
                          _hover={{ bg: "var(--cc-danger)" }}
                          onClick={() => void loeschen(bild)}
                        >
                          Löschen
                        </Button>
                      </HStack>
                    ) : (
                      <IconButton
                        aria-label="Bild löschen"
                        icon={<Trash2 size={14} strokeWidth={2} />}
                        size="xs"
                        bg="rgba(15,19,23,0.8)"
                        color="var(--cc-text-2)"
                        _hover={{ color: "var(--cc-danger)", bg: "rgba(15,19,23,0.95)" }}
                        opacity={{ base: 1, md: 0 }}
                        _groupHover={{ opacity: 1 }}
                        _focusVisible={{ opacity: 1 }}
                        onClick={() => setLoeschFrage(bild.id)}
                      />
                    )}
                  </Box>
                </Box>
              ))}
              {uploads.map((u) => (
                <Stack
                  key={u.id}
                  justify="center"
                  gap={2}
                  p={3}
                  borderRadius="8px"
                  border="1px dashed var(--j-line)"
                  sx={{ aspectRatio: "16 / 10" }}
                >
                  <Text fontSize="xs" color="var(--cc-text-2)" isTruncated>
                    {u.name}
                  </Text>
                  {u.fehler ? (
                    <HStack justify="space-between" gap={2}>
                      <Text fontSize="xs" color="var(--cc-danger)">
                        {u.fehler}
                      </Text>
                      <Button
                        size="xs"
                        variant="ghost"
                        color="var(--cc-text-3)"
                        onClick={() => setUploads((x) => x.filter((y) => y.id !== u.id))}
                      >
                        OK
                      </Button>
                    </HStack>
                  ) : (
                    <Progress
                      size="xs"
                      isIndeterminate
                      borderRadius="full"
                      bg="var(--j-line)"
                      sx={{ "& > div": { bg: "var(--cc-gold)" } }}
                      aria-label="Wird hochgeladen"
                    />
                  )}
                </Stack>
              ))}
            </Grid>
          ) : null}

          {!voll && !laedt ? (
            <Box
              onDragEnter={(e) => {
                e.preventDefault();
                dragTiefe.current += 1;
                setDragAktiv(true);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={() => {
                dragTiefe.current = Math.max(0, dragTiefe.current - 1);
                if (dragTiefe.current === 0) setDragAktiv(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                dragTiefe.current = 0;
                setDragAktiv(false);
                nimm(Array.from(e.dataTransfer.files));
              }}
              border="1px dashed"
              borderColor={dragAktiv ? "var(--cc-gold)" : "var(--j-line-strong)"}
              bg={dragAktiv ? "rgba(212, 176, 128, 0.08)" : "transparent"}
              borderRadius="10px"
              px={4}
              py={{ base: 5, md: 6 }}
              textAlign="center"
              transition="background-color 150ms ease, border-color 150ms ease"
            >
              <Stack align="center" gap={2}>
                <Box color="var(--cc-gold-light)">
                  <ImagePlus size={22} strokeWidth={1.8} />
                </Box>
                <Text fontSize="sm" color="var(--cc-text)">
                  Bilder hierher ziehen oder mit{" "}
                  <Box as="kbd" className="cc-num" px={1.5} py={0.5} borderRadius="4px" bg="var(--j-panel-raised)" fontSize="xs">
                    Strg+V
                  </Box>{" "}
                  einfügen
                </Text>
                <Text fontSize="xs" color="var(--cc-text-3)">
                  Chart vor dem Entry, Exit, Orderflow … · PNG, JPG, WEBP bis 10 MB
                </Text>
                {/* Zweiter Weg, vor allem fürs Handy — auf Windows friert der Dialog den Browser ein. */}
                <Button
                  size="xs"
                  variant="ghost"
                  color="var(--cc-text-3)"
                  fontWeight={500}
                  _hover={{ color: "var(--cc-gold-light)", bg: "transparent" }}
                  onClick={() => inputRef.current?.click()}
                >
                  oder Datei auswählen
                </Button>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  hidden
                  onChange={(e) => {
                    nimm(Array.from(e.target.files ?? []));
                    e.target.value = "";
                  }}
                />
              </Stack>
            </Box>
          ) : null}

          {hinweis ? (
            <Text fontSize="xs" color="var(--cc-text-2)">
              {hinweis}
            </Text>
          ) : null}
        </Stack>
      )}

      <Modal isOpen={gross !== null} onClose={() => setGross(null)} size="6xl" isCentered>
        <ModalOverlay bg="rgba(8, 10, 12, 0.85)" />
        <ModalContent bg="transparent" boxShadow="none" mx={3}>
          <ModalCloseButton color="var(--cc-text)" top={-10} right={0} />
          <ModalBody p={0}>
            {gross?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={gross.url}
                alt="Bild zum Trade"
                style={{ width: "100%", maxHeight: "85vh", objectFit: "contain", borderRadius: 8 }}
              />
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>
    </SectionCard>
  );
}
