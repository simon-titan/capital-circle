"use client";

import { Alert, AlertIcon, Box, Button, Flex, HStack, Image, Input, Spinner, Stack, Text } from "@chakra-ui/react";
import { ArrowLeftRight, ExternalLink, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CloudflareVideoPicker, type CloudflareVideoPick } from "@/components/admin/CloudflareVideoPicker";
import {
  ADMIN_CARD_CLASS,
  AdminCardTitle,
  AdminLabel,
  adminAlertIconColor,
  adminAlertProps,
  adminCardPadding,
  adminInputProps,
  adminInsetProps,
  StatusPill,
} from "@/components/admin/adminUi";

type Platz = {
  platz: "training" | "call";
  titel: string;
  pfad: string;
  beschreibung: string;
  uid: string;
  posterSekunde: number;
  ausAdmin: boolean;
  istVorgabe: boolean;
  name: string | null;
  dauer: number | null;
  status: string | null;
  vorschau: string | null;
};

type Antwort = { ok: boolean; plaetze?: Platz[]; error?: string };

const STREAM_SUBDOMAIN = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN?.trim() || null;

function standbild(uid: string, sekunde: number): string | null {
  return STREAM_SUBDOMAIN
    ? `https://${STREAM_SUBDOMAIN}.cloudflarestream.com/${uid}/thumbnails/thumbnail.jpg?time=${Math.max(0, sekunde)}s&width=480`
    : null;
}

function dauer(sekunden: number | null): string {
  if (!sekunden) return "–";
  const m = Math.floor(sekunden / 60);
  const s = sekunden % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Funnel-Videos zuordnen (`/admin/training/videos`, oben): welches Stream-Video
 * auf `/training` und welches auf `/call` läuft, samt Standbild. Speichert über
 * `/api/admin/training/funnel-videos`, das die Seite sofort neu erzeugt.
 *
 * Diese Videos laufen **unsigniert**. Kurs-, Live- und Blueprint-Videos lehnt
 * der Server ab — die wären sonst ohne Anmeldung abrufbar.
 */
export function FunnelVideosManager() {
  const [plaetze, setPlaetze] = useState<Platz[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [meldung, setMeldung] = useState<{ art: "error" | "success"; text: string } | null>(null);
  const [beschaeftigt, setBeschaeftigt] = useState(false);
  const [waehltFuer, setWaehltFuer] = useState<Platz["platz"] | null>(null);
  const [sekunden, setSekunden] = useState<Record<string, string>>({});

  const uebernehmen = (json: Antwort) => {
    if (!json.plaetze) return;
    setPlaetze(json.plaetze);
    setSekunden(Object.fromEntries(json.plaetze.map((p) => [p.platz, String(p.posterSekunde)])));
  };

  const lade = useCallback(async () => {
    setLaedt(true);
    try {
      const res = await fetch("/api/admin/training/funnel-videos", { cache: "no-store" });
      const json = (await res.json()) as Antwort;
      if (!json.ok) throw new Error(json.error ?? "Laden fehlgeschlagen");
      uebernehmen(json);
    } catch (e) {
      setMeldung({ art: "error", text: e instanceof Error ? e.message : "Laden fehlgeschlagen" });
    } finally {
      setLaedt(false);
    }
  }, []);

  useEffect(() => {
    void lade();
  }, [lade]);

  const speichern = async (
    platz: Platz["platz"],
    body: { uid: string | null; posterSekunde?: number },
    erfolg: string,
  ): Promise<boolean> => {
    setBeschaeftigt(true);
    setMeldung(null);
    try {
      const res = await fetch("/api/admin/training/funnel-videos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platz, ...body }),
      });
      const json = (await res.json().catch(() => ({ ok: false, error: "Ungültige Antwort" }))) as Antwort;
      if (!json.ok) {
        setMeldung({ art: "error", text: json.error ?? "Speichern fehlgeschlagen" });
        return false;
      }
      uebernehmen(json);
      setMeldung({ art: "success", text: erfolg });
      return true;
    } finally {
      setBeschaeftigt(false);
    }
  };

  const einsetzen = async (platz: Platz, picks: CloudflareVideoPick[]) => {
    const pick = picks[0];
    if (!pick) return;
    const ok = await speichern(
      platz.platz,
      { uid: pick.uid, posterSekunde: 3 },
      `„${pick.name}" läuft jetzt auf ${platz.pfad}. Standbild bei 3 s — unten anpassen, falls nötig.`,
    );
    if (ok) setWaehltFuer(null);
  };

  const tauschen = async () => {
    const [a, b] = plaetze;
    if (!a || !b) return;
    if (!window.confirm(`Videos tauschen? ${a.pfad} bekommt „${b.name ?? b.uid}", ${b.pfad} bekommt „${a.name ?? a.uid}".`)) return;
    const eins = await speichern(a.platz, { uid: b.uid, posterSekunde: b.posterSekunde }, "");
    if (!eins) return;
    await speichern(b.platz, { uid: a.uid, posterSekunde: a.posterSekunde }, "Videos getauscht.");
  };

  return (
    <Stack className={ADMIN_CARD_CLASS} p={adminCardPadding} spacing={4}>
      <Flex justify="space-between" align="center" gap={3} wrap="wrap">
        <AdminCardTitle>Funnel-Videos</AdminCardTitle>
        <Button
          size="sm"
          variant="line"
          leftIcon={<ArrowLeftRight size={14} />}
          onClick={() => void tauschen()}
          isDisabled={beschaeftigt || laedt || plaetze.length < 2}
        >
          Videos tauschen
        </Button>
      </Flex>
      <Text fontSize="13px" color="var(--cc-text-2)" lineHeight={1.55}>
        Welches Video auf den öffentlichen Seiten läuft. Diese Videos sind ohne Anmeldung abspielbar — deshalb nur eigens
        dafür hochgeladene Dateien einsetzen, keine Kurs-, Live- oder Blueprint-Videos (der Server lehnt sie ab). Nach dem
        Speichern ist die Seite beim nächsten Aufruf aktuell.
      </Text>

      {meldung ? (
        <Alert status={meldung.art} {...adminAlertProps(meldung.art)}>
          <AlertIcon color={adminAlertIconColor(meldung.art)} />
          <Text fontSize="sm">{meldung.text}</Text>
        </Alert>
      ) : null}

      {laedt ? (
        <HStack py={6} justify="center">
          <Spinner size="sm" color="var(--cc-gold)" />
        </HStack>
      ) : (
        <Stack spacing={3}>
          {plaetze.map((p) => {
            const roh = sekunden[p.platz] ?? String(p.posterSekunde);
            const sek = Number.parseInt(roh, 10);
            const sekGueltig = Number.isFinite(sek) && sek >= 0 && (!p.dauer || sek < p.dauer);
            const bild = standbild(p.uid, sekGueltig ? sek : p.posterSekunde) ?? p.vorschau;
            return (
              <Stack key={p.platz} {...adminInsetProps} spacing={3}>
                <Flex gap={4} direction={{ base: "column", md: "row" }} align={{ base: "stretch", md: "center" }}>
                  <Box w={{ base: "100%", md: "192px" }} aspectRatio={16 / 9} borderRadius="8px" overflow="hidden" bg="var(--cc-track)" flexShrink={0}>
                    {bild ? <Image src={bild} alt="" w="100%" h="100%" objectFit="cover" /> : null}
                  </Box>

                  <Stack flex={1} spacing={1} minW={0}>
                    <HStack spacing={2} flexWrap="wrap">
                      <Text fontWeight={600} color="var(--cc-text)">
                        {p.titel}
                      </Text>
                      <StatusPill tone={p.ausAdmin ? "success" : "neutral"}>{p.ausAdmin ? "im Admin gewählt" : "Vorgabe aus dem Code"}</StatusPill>
                      {p.status && p.status !== "ready" ? <StatusPill tone="danger">{p.status === "nicht_gefunden" ? "nicht gefunden" : p.status}</StatusPill> : null}
                    </HStack>
                    <Text fontSize="13px" color="var(--cc-text-2)">
                      {p.beschreibung}
                    </Text>
                    <Text fontSize="13px" color="var(--cc-text-2)" noOfLines={1}>
                      {p.name ?? "ohne Namen"} · <span className="cc-num">{dauer(p.dauer)}</span>
                    </Text>
                    <Text fontSize="12px" color="var(--cc-text-3)" className="cc-num" noOfLines={1}>
                      {p.uid}
                    </Text>
                  </Stack>

                  <Stack spacing={2} flexShrink={0} align={{ base: "stretch", md: "flex-end" }}>
                    <Link href={p.pfad} target="_blank" style={{ textDecoration: "none" }}>
                      <Button as="span" size="sm" variant="line" w="full" rightIcon={<ExternalLink size={14} />}>
                        Seite ansehen
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="gold"
                      onClick={() => setWaehltFuer((w) => (w === p.platz ? null : p.platz))}
                      isDisabled={beschaeftigt}
                    >
                      {waehltFuer === p.platz ? "Auswahl schließen" : "Anderes Video wählen"}
                    </Button>
                    {p.ausAdmin && !p.istVorgabe ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        leftIcon={<RotateCcw size={14} />}
                        isDisabled={beschaeftigt}
                        onClick={() => {
                          if (window.confirm(`${p.pfad} auf das Video aus dem Code zurücksetzen?`)) {
                            void speichern(p.platz, { uid: null }, `${p.pfad} läuft wieder mit der Vorgabe.`);
                          }
                        }}
                      >
                        Auf Vorgabe zurück
                      </Button>
                    ) : null}
                  </Stack>
                </Flex>

                <HStack spacing={3} align="flex-end" flexWrap="wrap">
                  <Box>
                    <AdminLabel mb={1}>Standbild bei Sekunde</AdminLabel>
                    <Input
                      size="sm"
                      w="110px"
                      type="number"
                      min={0}
                      max={p.dauer ?? undefined}
                      inputMode="numeric"
                      {...adminInputProps}
                      value={roh}
                      onChange={(e) => setSekunden((s) => ({ ...s, [p.platz]: e.target.value }))}
                      aria-label={`Standbild-Sekunde für ${p.pfad}`}
                    />
                  </Box>
                  <Button
                    size="sm"
                    variant="line"
                    isDisabled={beschaeftigt || !sekGueltig || sek === p.posterSekunde}
                    onClick={() => void speichern(p.platz, { uid: p.uid, posterSekunde: sek }, `Standbild für ${p.pfad} gespeichert.`)}
                  >
                    Standbild speichern
                  </Button>
                  {!sekGueltig ? (
                    <Text fontSize="12px" color="var(--cc-text-3)">
                      Zwischen 0 und {p.dauer ? p.dauer - 1 : "…"} Sekunden.
                    </Text>
                  ) : null}
                </HStack>

                {waehltFuer === p.platz ? (
                  <Box pt={2}>
                    <CloudflareVideoPicker
                      einzeln
                      buttonLabel={`Auf ${p.pfad} einsetzen`}
                      disabled={beschaeftigt}
                      onAdd={(picks) => einsetzen(p, picks)}
                    />
                  </Box>
                ) : null}
              </Stack>
            );
          })}

          <Flex {...adminInsetProps} justify="space-between" align="center" gap={3} wrap="wrap">
            <Stack spacing={0}>
              <Text fontWeight={600} color="var(--cc-text)">
                Trading Blueprint · Videoanleitung
              </Text>
              <Text fontSize="13px" color="var(--cc-text-2)">
                Signiert, nur für Angemeldete — eigene Verwaltung mit PDF.
              </Text>
            </Stack>
            <Link href="/admin/training/blueprint" style={{ textDecoration: "none" }}>
              <Button as="span" size="sm" variant="line">
                Zum Blueprint
              </Button>
            </Link>
          </Flex>
        </Stack>
      )}
    </Stack>
  );
}
