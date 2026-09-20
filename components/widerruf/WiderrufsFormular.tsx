"use client";

import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Input,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  CardLabel,
  FunnelAlert,
  funnelErrorProps,
  funnelFieldProps,
  funnelHelperProps,
  funnelLabelProps,
} from "@/components/marketing/funnel-ui";
import { BESCHRIFTUNG, ERKLAERUNG, GRENZEN, istGueltigeEmail, type WiderrufsBeleg } from "@/lib/widerruf/shared";
import { WiderrufsBestaetigung } from "./WiderrufsBestaetigung";

/** Muss mit `HONIGTOPF` in `app/api/widerruf/route.ts` übereinstimmen. */
const HONIGTOPF = "cc_feld_url";

type Feld = "name" | "email" | "bestaetigungEmail" | "vertragAngabe";
type Fehler = Partial<Record<Feld, string>>;

export interface Vorbelegung {
  name: string;
  email: string;
  /** Neuester Vertrag des eingeloggten Kontos, z. B. „Mitgliedschaft · Monatlich, abgeschlossen am …". */
  vertrag: string | null;
}

/**
 * Formular der Widerrufsfunktion (§ 356a Abs. 2 und 3 BGB).
 *
 * Abs. 2 verlangt, dass der Verbraucher „ohne Weiteres" angeben oder
 * bestätigen kann: 1. seinen Namen, 2. Angaben zur Identifizierung des
 * Vertrags, 3. das elektronische Kommunikationsmittel für die
 * Eingangsbestätigung. Genau diese drei Abschnitte stehen hier — und danach
 * die Bestätigungsfunktion „Widerruf bestätigen" (Abs. 3).
 *
 * Was bewusst **fehlt**: Anmeldung, Gründe-Abfrage, Halteangebot, Rabatt,
 * Pause, „Bist du sicher?"-Zwischenschritt. Ein Widerruf braucht keine
 * Begründung (§ 355 Abs. 1 Satz 4 BGB), und die Funktion darf keine Umwege
 * haben.
 *
 * Nach dem Absenden ersetzt die Bestätigung das Formular auf derselben Seite
 * (kein Redirect): Der Beleg kommt als Antwort der Route und steht damit auch
 * dann, wenn die Mail nicht ankommt.
 */
export function WiderrufsFormular({ vorbelegung }: { vorbelegung: Vorbelegung | null }) {
  const [name, setName] = useState(vorbelegung?.name ?? "");
  const [email, setEmail] = useState(vorbelegung?.email ?? "");
  // Die Bestätigungsadresse folgt der Konto-Adresse, bis jemand sie selbst ändert.
  const [bestaetigungEigen, setBestaetigungEigen] = useState<string | null>(null);
  const [vertragAngabe, setVertragAngabe] = useState("");
  const [honig, setHonig] = useState("");

  const [fehler, setFehler] = useState<Fehler>({});
  const [serverFehler, setServerFehler] = useState<string | null>(null);
  const [sendet, setSendet] = useState(false);
  const [beleg, setBeleg] = useState<WiderrufsBeleg | null>(null);

  const bestaetigungEmail = bestaetigungEigen ?? email;
  const fehlerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (beleg) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [beleg]);

  function pruefe(): Fehler {
    const f: Fehler = {};
    if (name.trim().length < GRENZEN.nameMin) f.name = "Bitte gib deinen Vor- und Nachnamen an.";
    if (!istGueltigeEmail(email.trim().toLowerCase())) {
      f.email = "Bitte gib die E-Mail-Adresse an, mit der du gekauft hast.";
    }
    // Folgt das Feld noch der Konto-Adresse, meldet deren Fehler schon oben.
    if (bestaetigungEigen !== null && !istGueltigeEmail(bestaetigungEmail.trim().toLowerCase())) {
      f.bestaetigungEmail = "Bitte gib eine E-Mail-Adresse an, an die wir die Eingangsbestätigung schicken können.";
    }
    return f;
  }

  async function absenden(e: FormEvent) {
    e.preventDefault();
    // Doppelklick: Die zweite Einreichung wäre ein zweiter Widerruf mit eigener
    // Mail — der Knopf ist ab dem ersten Klick gesperrt.
    if (sendet) return;
    setServerFehler(null);

    const f = pruefe();
    setFehler(f);
    if (Object.keys(f).length > 0) {
      window.requestAnimationFrame(() => {
        fehlerRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      });
      return;
    }

    setSendet(true);
    try {
      const res = await fetch("/api/widerruf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, bestaetigungEmail, vertragAngabe, [HONIGTOPF]: honig }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok: true; beleg: WiderrufsBeleg }
        | { ok: false; error?: string; felder?: Fehler }
        | null;

      if (json && json.ok) {
        setBeleg(json.beleg);
        return;
      }
      if (json && !json.ok && json.felder) setFehler(json.felder);
      setServerFehler(
        json && !json.ok && json.error
          ? json.error
          : "Der Widerruf konnte gerade nicht übermittelt werden. Bitte versuche es noch einmal.",
      );
      setSendet(false);
    } catch {
      setServerFehler(
        "Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung und versuche es noch einmal.",
      );
      setSendet(false);
    }
  }

  if (beleg) return <WiderrufsBestaetigung beleg={beleg} />;

  return (
    <Box
      as="form"
      onSubmit={absenden}
      noValidate
      className="cc-card cc-card--still cc-rise"
      style={{ animationDelay: "150ms" }}
      p={{ base: 5, md: 8 }}
      aria-label="Widerrufsformular"
    >
      <Stack spacing={8} ref={fehlerRef}>
        {/* ── 1. Name (§ 356a Abs. 2 Nr. 1) ───────────────────────────── */}
        <Abschnitt titel="Deine Angaben" id="w-person">
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl isRequired isInvalid={Boolean(fehler.name)}>
              <FormLabel {...funnelLabelProps}>Vor- und Nachname</FormLabel>
              <Input
                {...funnelFieldProps}
                autoComplete="name"
                maxLength={GRENZEN.nameMax}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <FormErrorMessage {...funnelErrorProps}>{fehler.name}</FormErrorMessage>
            </FormControl>
            <FormControl isRequired isInvalid={Boolean(fehler.email)}>
              <FormLabel {...funnelLabelProps}>E-Mail-Adresse deines Kontos bzw. beim Kauf</FormLabel>
              <Input
                {...funnelFieldProps}
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={GRENZEN.emailMax}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <FormErrorMessage {...funnelErrorProps}>{fehler.email}</FormErrorMessage>
            </FormControl>
          </SimpleGrid>
        </Abschnitt>

        <Trenner />

        {/* ── 2. Vertrag (§ 356a Abs. 2 Nr. 2) ────────────────────────── */}
        <Abschnitt titel="Welcher Vertrag" id="w-vertrag">
          {vorbelegung?.vertrag ? (
            <Box p={4} borderRadius="10px" border="1px solid var(--cc-line-strong)" bg="rgba(255, 255, 255, 0.03)">
              <Text fontSize="15px" fontWeight={500} color="var(--cc-text)">
                {vorbelegung.vertrag}
              </Text>
              <Text fontSize="14px" color="var(--cc-text-2)" mt={1}>
                Diesen Vertrag widerrufst du. Geht es um einen anderen, beschreibe ihn unten.
              </Text>
            </Box>
          ) : (
            <Text fontSize="14px" lineHeight={1.6} color="var(--cc-text-2)">
              Widerrufen wird der Vertrag mit Capital Circle, den du mit der E-Mail-Adresse oben geschlossen hast.
            </Text>
          )}
          <FormControl isInvalid={Boolean(fehler.vertragAngabe)}>
            <FormLabel {...funnelLabelProps}>Weitere Angaben zum Vertrag (optional)</FormLabel>
            <Input
              {...funnelFieldProps}
              maxLength={GRENZEN.vertragMax}
              value={vertragAngabe}
              onChange={(e) => setVertragAngabe(e.target.value)}
            />
            <FormHelperText {...funnelHelperProps}>
              Zum Beispiel Tarif, Kaufdatum oder Rechnungsnummer. Hilft, wenn du mehrere Verträge hast oder mit
              einer anderen E-Mail-Adresse bezahlt hast.
            </FormHelperText>
            <FormErrorMessage {...funnelErrorProps}>{fehler.vertragAngabe}</FormErrorMessage>
          </FormControl>
        </Abschnitt>

        <Trenner />

        {/* ── 3. Weg der Eingangsbestätigung (§ 356a Abs. 2 Nr. 3) ────── */}
        <Abschnitt titel="Eingangsbestätigung" id="w-bestaetigung">
          <FormControl isRequired isInvalid={Boolean(fehler.bestaetigungEmail)}>
            <FormLabel {...funnelLabelProps}>E-Mail-Adresse für die Eingangsbestätigung</FormLabel>
            <Input
              {...funnelFieldProps}
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={GRENZEN.emailMax}
              value={bestaetigungEmail}
              onChange={(e) => setBestaetigungEigen(e.target.value)}
            />
            <FormHelperText {...funnelHelperProps}>
              Dorthin schicken wir sofort die Bestätigung mit dem Inhalt deines Widerrufs und Datum und Uhrzeit des
              Eingangs.
            </FormHelperText>
            <FormErrorMessage {...funnelErrorProps}>{fehler.bestaetigungEmail}</FormErrorMessage>
          </FormControl>
        </Abschnitt>

        {/* Honeypot: für Menschen unsichtbar, ohne Autofill, nicht per Tab erreichbar. */}
        <Box aria-hidden position="absolute" left="-10000px" top="auto" w="1px" h="1px" overflow="hidden">
          <label htmlFor={HONIGTOPF}>Dieses Feld bitte leer lassen</label>
          <input
            id={HONIGTOPF}
            name={HONIGTOPF}
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honig}
            onChange={(e) => setHonig(e.target.value)}
          />
        </Box>

        <Trenner />

        {/* ── Erklärung und Bestätigungsfunktion (§ 356a Abs. 3) ──────── */}
        <Stack spacing={4}>
          <Box
            p={{ base: 4, md: 5 }}
            borderRadius="10px"
            border="1px solid rgba(232, 192, 148, 0.35)"
            bg="var(--cc-gold-wash)"
          >
            <Text fontSize="13px" color="var(--cc-text-2)" mb={1}>
              Deine Erklärung
            </Text>
            <Text fontSize={{ base: "16px", md: "17px" }} lineHeight={1.5} fontWeight={500} color="var(--cc-text)">
              {ERKLAERUNG}
            </Text>
          </Box>

          {serverFehler ? <FunnelAlert>{serverFehler}</FunnelAlert> : null}

          <Button
            type="submit"
            variant="gold"
            size="lg"
            h="52px"
            fontSize="17px"
            w={{ base: "full", sm: "auto" }}
            alignSelf={{ base: "stretch", sm: "flex-start" }}
            px={10}
            isLoading={sendet}
            loadingText="Wird übermittelt …"
          >
            {BESCHRIFTUNG.bestaetigen}
          </Button>
          <Text fontSize="13px" lineHeight={1.6} color="var(--cc-text-3)" maxW="560px">
            Mit dem Klick geht dein Widerruf sofort bei uns ein. Direkt danach siehst du hier die Bestätigung mit
            Datum und Uhrzeit des Eingangs; dieselbe Bestätigung kommt per E-Mail.
          </Text>
        </Stack>
      </Stack>
    </Box>
  );
}

function Abschnitt({ titel, id, children }: { titel: string; id: string; children: ReactNode }) {
  return (
    <Stack as="section" spacing={4} aria-labelledby={id}>
      <CardLabel as="h2" id={id}>
        {titel}
      </CardLabel>
      {children}
    </Stack>
  );
}

function Trenner() {
  return <Box h="1px" bg="var(--cc-line)" aria-hidden />;
}
