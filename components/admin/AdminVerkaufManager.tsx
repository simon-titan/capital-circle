"use client";

import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Input,
  Link,
  Stack,
  Switch,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { ExternalLink, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ADMIN_CARD_CLASS,
  AdminCardTitle,
  StatusPill,
  adminAlertIconColor,
  adminAlertProps,
  adminCardPadding,
  adminInputProps,
  adminSwitchSx,
} from "@/components/admin/adminUi";

export type AdminVerkaufFelder = {
  geschlossen: boolean;
  knopf: boolean;
  ueberschrift: string;
  nachricht: string;
  zielUrl: string;
  zielLabel: string;
};

type Props = {
  /** Gespeicherte Eingaben (leere Felder = Standardtext). */
  initial: AdminVerkaufFelder;
  /** Standardtexte als Platzhalter. */
  standard: Omit<AdminVerkaufFelder, "geschlossen">;
  /** Vorlagen „Übergang" und „Funnel" zum Einsetzen. */
  vorlagen: Record<"uebergang" | "funnel", Omit<AdminVerkaufFelder, "geschlossen">>;
  updatedAt: string | null;
};

const TEXTFELDER = ["ueberschrift", "nachricht", "zielUrl", "zielLabel"] as const;

export function AdminVerkaufManager({ initial, standard, vorlagen, updatedAt: initialUpdatedAt }: Props) {
  const [gespeichert, setGespeichert] = useState(initial);
  const [felder, setFelder] = useState(initial);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; msg: string } | null>(null);

  const dirty = useMemo(
    () =>
      felder.geschlossen !== gespeichert.geschlossen ||
      felder.knopf !== gespeichert.knopf ||
      TEXTFELDER.some((k) => felder[k].trim() !== gespeichert[k].trim()),
    [felder, gespeichert],
  );

  useEffect(() => {
    if (!feedback || feedback.kind === "error") return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  const setze = <K extends keyof AdminVerkaufFelder>(k: K, v: AdminVerkaufFelder[K]) =>
    setFelder((alt) => ({ ...alt, [k]: v }));

  const save = useCallback(async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/settings/verkauf", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(felder),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        gespeichert?: AdminVerkaufFelder;
      };
      if (!res.ok || json.ok !== true || !json.gespeichert) {
        setFeedback({ kind: "error", msg: json.error ?? `Fehler ${res.status}` });
        return;
      }
      setGespeichert(json.gespeichert);
      setFelder(json.gespeichert);
      setUpdatedAt(new Date().toISOString());
      setFeedback({
        kind: "success",
        msg: json.gespeichert.geschlossen
          ? "Gespeichert. Der Verkauf ist geschlossen (Startseite nach spätestens 15 Sekunden)."
          : "Gespeichert. Der Verkauf ist offen.",
      });
    } catch (e) {
      setFeedback({ kind: "error", msg: e instanceof Error ? e.message : "Unbekannter Fehler" });
    } finally {
      setSaving(false);
    }
  }, [felder]);

  return (
    <Stack gap={5}>
      <Box className={ADMIN_CARD_CLASS} p={adminCardPadding}>
        <Stack gap={5}>
          <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
            <HStack gap={3}>
              <AdminCardTitle>Aktueller Status</AdminCardTitle>
              {gespeichert.geschlossen ? (
                <StatusPill tone="attention">Geschlossen · nur über Funnel</StatusPill>
              ) : (
                <StatusPill tone="success">Offen</StatusPill>
              )}
            </HStack>
            <Link
              href="/geschlossen?vorschau=1"
              isExternal
              fontSize="sm"
              color="var(--cc-gold-light)"
              display="inline-flex"
              alignItems="center"
              gap={1.5}
            >
              Hinweisseite ansehen <ExternalLink size={13} aria-hidden />
            </Link>
          </Flex>

          {updatedAt ? (
            <Text className="cc-num" fontSize="xs" color="var(--cc-text-3)">
              Zuletzt geändert: {new Date(updatedAt).toLocaleString("de-DE")}
            </Text>
          ) : null}

          {feedback ? (
            <Alert status={feedback.kind === "success" ? "success" : "error"} {...adminAlertProps(feedback.kind)}>
              <AlertIcon color={adminAlertIconColor(feedback.kind)} />
              <Text fontSize="sm">{feedback.msg}</Text>
            </Alert>
          ) : null}

          <FormControl display="flex" alignItems="center" justifyContent="space-between" gap={4}>
            <Box>
              <FormLabel htmlFor="verkauf-switch" mb={1} fontWeight={600} color="var(--cc-text)">
                Normalen Zugang schließen
              </FormLabel>
              <Text fontSize="xs" color="var(--cc-text-2)">
                Wenn aktiv: Die Startseite zeigt statt der Verkaufsseite den Hinweis unten, und neue Mitgliedschaften
                lassen sich nicht mehr direkt kaufen.
              </Text>
            </Box>
            <Switch
              id="verkauf-switch"
              size="lg"
              sx={adminSwitchSx}
              isChecked={felder.geschlossen}
              onChange={(e) => setze("geschlossen", e.target.checked)}
            />
          </FormControl>

          <Box borderTop="1px solid var(--cc-line)" pt={4}>
            <Text fontSize="xs" fontWeight={600} color="var(--cc-text)" mb={2}>
              Was „geschlossen“ bewirkt
            </Text>
            <Stack as="ul" gap={1} pl={4} fontSize="xs" color="var(--cc-text-2)" lineHeight={1.55}>
              <li>Startseite / zeigt die Hinweisseite (die Verkaufsseite bleibt unter /vorschau erreichbar).</li>
              <li>Kauflinks /go/… — auch die aus dem Whop-Umzug — öffnen keine Kasse mehr.</li>
              <li>Im Mitgliederbereich: kein neues Abo für Konten ohne laufendes Abo, kein Lifetime-Angebot.</li>
              <li>Folgemails der Plattform-Umzugskampagne und der Whop-Umzug pausieren.</li>
            </Stack>
            <Text fontSize="xs" fontWeight={600} color="var(--cc-text)" mt={3} mb={2}>
              Was weiterläuft
            </Text>
            <Stack as="ul" gap={1} pl={4} fontSize="xs" color="var(--cc-text-2)" lineHeight={1.55}>
              <li>Laufende Abos: Verlängerung, Wechsel aufs Jahr, Kündigung, Mahnungen.</li>
              <li>Login, Mitgliederbereich und Rechtstexte.</li>
            </Stack>
          </Box>
        </Stack>
      </Box>

      <Box className={ADMIN_CARD_CLASS} p={adminCardPadding}>
        <Stack gap={5}>
          <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
            <AdminCardTitle>Hinweisseite</AdminCardTitle>
            <HStack gap={2}>
              <Button size="xs" variant="line" onClick={() => setFelder((alt) => ({ ...alt, ...vorlagen.uebergang }))}>
                Vorlage: Übergang
              </Button>
              <Button size="xs" variant="line" onClick={() => setFelder((alt) => ({ ...alt, ...vorlagen.funnel }))}>
                Vorlage: Funnel
              </Button>
            </HStack>
          </Flex>
          <Text fontSize="xs" color="var(--cc-text-2)" mt={-2}>
            Leere Felder zeigen den Standardtext (grau im Feld) — das ist die Übergangs-Ankündigung „Etwas Großes steht
            an“. Die Vorlage „Funnel“ zeigt mit Knopf auf /training; erst einsetzen, wenn das Training live ist.
          </Text>

          <FormControl>
            <FormLabel fontWeight={600} color="var(--cc-text)">
              Überschrift
            </FormLabel>
            <Input
              value={felder.ueberschrift}
              onChange={(e) => setze("ueberschrift", e.target.value)}
              placeholder={standard.ueberschrift}
              maxLength={160}
              {...adminInputProps}
            />
          </FormControl>

          <FormControl>
            <FormLabel fontWeight={600} color="var(--cc-text)">
              Text
            </FormLabel>
            <Textarea
              value={felder.nachricht}
              onChange={(e) => setze("nachricht", e.target.value)}
              placeholder={standard.nachricht}
              rows={4}
              maxLength={1000}
              {...adminInputProps}
            />
          </FormControl>

          <FormControl display="flex" alignItems="center" justifyContent="space-between" gap={4}>
            <Box>
              <FormLabel htmlFor="verkauf-knopf" mb={1} fontWeight={600} color="var(--cc-text)">
                Knopf anzeigen
              </FormLabel>
              <Text fontSize="xs" color="var(--cc-text-2)">
                Aus in der Übergangsphase. An, sobald es ein Ziel gibt (z. B. /training oder /tg für den Telegram-Kanal).
              </Text>
            </Box>
            <Switch
              id="verkauf-knopf"
              sx={adminSwitchSx}
              isChecked={felder.knopf}
              onChange={(e) => setze("knopf", e.target.checked)}
            />
          </FormControl>

          <Flex gap={4} direction={{ base: "column", md: "row" }} opacity={felder.knopf ? 1 : 0.5}>
            <FormControl>
              <FormLabel fontWeight={600} color="var(--cc-text)">
                Knopf-Text
              </FormLabel>
              <Input
                value={felder.zielLabel}
                onChange={(e) => setze("zielLabel", e.target.value)}
                placeholder={standard.zielLabel}
                maxLength={60}
                {...adminInputProps}
              />
            </FormControl>
            <FormControl>
              <FormLabel fontWeight={600} color="var(--cc-text)">
                Knopf-Ziel
              </FormLabel>
              <Input
                value={felder.zielUrl}
                onChange={(e) => setze("zielUrl", e.target.value)}
                placeholder={standard.zielUrl}
                maxLength={300}
                {...adminInputProps}
              />
              <FormHelperText color="var(--cc-text-2)" fontSize="xs">
                Pfad wie /training oder eine https://-Adresse.
              </FormHelperText>
            </FormControl>
          </Flex>
        </Stack>
      </Box>

      <Flex justify="flex-end" gap={3}>
        {dirty ? (
          <Text fontSize="xs" alignSelf="center" color="var(--cc-gold-light)">
            Ungespeicherte Änderungen
          </Text>
        ) : null}
        <Button
          onClick={() => void save()}
          isLoading={saving}
          loadingText="Speichert"
          leftIcon={<Save size={14} />}
          variant="gold"
          isDisabled={!dirty}
        >
          Übernehmen
        </Button>
      </Flex>
    </Stack>
  );
}
