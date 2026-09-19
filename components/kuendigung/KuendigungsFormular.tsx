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
  Textarea,
} from "@chakra-ui/react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  CardLabel,
  FieldError,
  FunnelAlert,
  OptionCard,
  funnelErrorProps,
  funnelFieldProps,
  funnelHelperProps,
  funnelLabelProps,
} from "@/components/marketing/funnel-ui";
import {
  GRENZEN,
  heuteBerlin,
  istGueltigeEmail,
  type KuendigungsArt,
  type KuendigungsBeleg,
  type ZeitpunktArt,
} from "@/lib/kuendigung/shared";
import { KuendigungsBestaetigung } from "./KuendigungsBestaetigung";

/** Muss mit `HONIGTOPF` in `app/api/kuendigung/route.ts` übereinstimmen. */
const HONIGTOPF = "cc_feld_url";

type Feld = "art" | "grund" | "name" | "email" | "bestaetigungEmail" | "vertragAngabe" | "datum";
type Fehler = Partial<Record<Feld, string>>;

export interface Vorbelegung {
  name: string;
  email: string;
  /** Vertrag des eingeloggten Kontos in Worten, z. B. „Mitgliedschaft · Monatlich". */
  vertrag: { bezeichnung: string; hinweis: string } | null;
}

/**
 * Formular des Kündigungsbuttons (§ 312k Abs. 2 BGB) — die „Bestätigungsseite"
 * im Sinne des Gesetzes: Art der Kündigung, Identifizierung, Vertrag,
 * Zeitpunkt, Adresse für die Bestätigung und die Schaltfläche „Jetzt kündigen".
 *
 * Was hier bewusst **fehlt**: Gründe-Abfrage bei ordentlicher Kündigung,
 * Rabatt, Pause, „Bist du sicher?"-Zwischenschritt. Der Komfortweg mit
 * Halte-Angeboten wohnt in `/einstellungen/abonnement` (`CancelFlow.tsx`) und
 * bleibt davon getrennt — dieser Weg darf keine Umwege haben.
 *
 * Nach dem Absenden ersetzt die Bestätigung das Formular auf derselben Seite
 * (kein Redirect): Der Beleg kommt als Antwort der Route und steht damit auch
 * dann, wenn die Mail nicht ankommt.
 */
export function KuendigungsFormular({ vorbelegung }: { vorbelegung: Vorbelegung | null }) {
  const [art, setArt] = useState<KuendigungsArt>("ordentlich");
  const [grund, setGrund] = useState("");
  const [name, setName] = useState(vorbelegung?.name ?? "");
  const [email, setEmail] = useState(vorbelegung?.email ?? "");
  // Die Bestätigungsadresse folgt der Konto-Adresse, bis jemand sie selbst ändert.
  const [bestaetigungEigen, setBestaetigungEigen] = useState<string | null>(null);
  const [vertragAngabe, setVertragAngabe] = useState("");
  const [zeitpunkt, setZeitpunkt] = useState<ZeitpunktArt>("naechstmoeglich");
  const [datum, setDatum] = useState("");
  const [honig, setHonig] = useState("");

  const [fehler, setFehler] = useState<Fehler>({});
  const [serverFehler, setServerFehler] = useState<string | null>(null);
  const [sendet, setSendet] = useState(false);
  const [beleg, setBeleg] = useState<KuendigungsBeleg | null>(null);

  const bestaetigungEmail = bestaetigungEigen ?? email;
  const heute = heuteBerlin();
  const fehlerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (beleg) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [beleg]);

  function pruefe(): Fehler {
    const f: Fehler = {};
    if (art === "ausserordentlich" && grund.trim().length < GRENZEN.grundMin) {
      f.grund = "Bitte nenne den Grund für die außerordentliche Kündigung (mindestens ein Satz).";
    }
    if (name.trim().length < GRENZEN.nameMin) f.name = "Bitte gib deinen Vor- und Nachnamen an.";
    if (!istGueltigeEmail(email.trim().toLowerCase())) f.email = "Bitte gib die E-Mail-Adresse deines Kontos an.";
    // Folgt das Feld noch der Konto-Adresse, meldet deren Fehler schon oben.
    if (bestaetigungEigen !== null && !istGueltigeEmail(bestaetigungEmail.trim().toLowerCase())) {
      f.bestaetigungEmail = "Bitte gib eine E-Mail-Adresse an, an die wir die Bestätigung schicken können.";
    }
    if (zeitpunkt === "datum") {
      if (!datum) f.datum = "Bitte wähle ein Datum.";
      else if (datum < heute) f.datum = "Das Datum darf nicht in der Vergangenheit liegen.";
    }
    return f;
  }

  async function absenden(e: FormEvent) {
    e.preventDefault();
    // Doppelklick: Die zweite Einreichung wäre eine zweite Kündigung mit
    // eigener Mail — der Knopf ist ab dem ersten Klick gesperrt.
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
      const res = await fetch("/api/kuendigung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          art,
          grund: art === "ausserordentlich" ? grund : "",
          name,
          email,
          bestaetigungEmail,
          vertragAngabe,
          zeitpunkt,
          datum: zeitpunkt === "datum" ? datum : "",
          [HONIGTOPF]: honig,
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok: true; beleg: KuendigungsBeleg }
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
          : "Die Kündigung konnte gerade nicht übermittelt werden. Bitte versuche es noch einmal.",
      );
      setSendet(false);
    } catch {
      setServerFehler(
        "Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung und versuche es noch einmal.",
      );
      setSendet(false);
    }
  }

  if (beleg) return <KuendigungsBestaetigung beleg={beleg} />;

  return (
    <Box
      as="form"
      onSubmit={absenden}
      noValidate
      className="cc-card cc-card--still cc-rise"
      style={{ animationDelay: "150ms" }}
      p={{ base: 5, md: 8 }}
      aria-label="Kündigungsformular"
    >
      <Stack spacing={8} ref={fehlerRef}>
        {/* ── Art ─────────────────────────────────────────────────────── */}
        <Abschnitt titel="Art der Kündigung" id="k-art">
          <Stack spacing={3} role="radiogroup" aria-labelledby="k-art">
            <OptionCard name="art" value="ordentlich" checked={art === "ordentlich"} onSelect={() => setArt("ordentlich")}>
              Ordentliche Kündigung
              <Beschreibung>Zum Ende der laufenden Abrechnungsperiode.</Beschreibung>
            </OptionCard>
            <OptionCard
              name="art"
              value="ausserordentlich"
              checked={art === "ausserordentlich"}
              onSelect={() => setArt("ausserordentlich")}
            >
              Außerordentliche Kündigung
              <Beschreibung>Aus wichtigem Grund, ohne Einhaltung einer Frist.</Beschreibung>
            </OptionCard>
          </Stack>
          {fehler.art ? <FieldError>{fehler.art}</FieldError> : null}

          {art === "ausserordentlich" ? (
            <FormControl isRequired isInvalid={Boolean(fehler.grund)}>
              <FormLabel {...funnelLabelProps}>Grund der außerordentlichen Kündigung</FormLabel>
              <Textarea
                {...funnelFieldProps}
                minH="120px"
                maxLength={GRENZEN.grundMax}
                value={grund}
                onChange={(e) => setGrund(e.target.value)}
              />
              <FormErrorMessage {...funnelErrorProps}>{fehler.grund}</FormErrorMessage>
            </FormControl>
          ) : null}
        </Abschnitt>

        <Trenner />

        {/* ── Wer kündigt ─────────────────────────────────────────────── */}
        <Abschnitt titel="Deine Angaben" id="k-person">
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
              <FormLabel {...funnelLabelProps}>E-Mail-Adresse deines Kontos</FormLabel>
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

        {/* ── Vertrag ─────────────────────────────────────────────────── */}
        <Abschnitt titel="Welcher Vertrag" id="k-vertrag">
          {vorbelegung?.vertrag ? (
            <Box
              p={4}
              borderRadius="10px"
              border="1px solid var(--cc-line-strong)"
              bg="rgba(255, 255, 255, 0.03)"
            >
              <Text fontSize="15px" fontWeight={500} color="var(--cc-text)">
                {vorbelegung.vertrag.bezeichnung}
              </Text>
              <Text fontSize="14px" color="var(--cc-text-2)" mt={1}>
                {vorbelegung.vertrag.hinweis}
              </Text>
            </Box>
          ) : (
            <Text fontSize="14px" lineHeight={1.6} color="var(--cc-text-2)">
              Gekündigt wird die Capital-Circle-Mitgliedschaft, die zu der E-Mail-Adresse oben gehört.
            </Text>
          )}
          <FormControl isInvalid={Boolean(fehler.vertragAngabe)}>
            <FormLabel {...funnelLabelProps}>Kunden-, Rechnungs- oder Vertragsnummer (optional)</FormLabel>
            <Input
              {...funnelFieldProps}
              maxLength={GRENZEN.vertragMax}
              value={vertragAngabe}
              onChange={(e) => setVertragAngabe(e.target.value)}
            />
            <FormHelperText {...funnelHelperProps}>
              Hilft bei der Zuordnung, etwa wenn du mit einer anderen E-Mail-Adresse bezahlt hast.
            </FormHelperText>
            <FormErrorMessage {...funnelErrorProps}>{fehler.vertragAngabe}</FormErrorMessage>
          </FormControl>
        </Abschnitt>

        <Trenner />

        {/* ── Zeitpunkt ───────────────────────────────────────────────── */}
        <Abschnitt titel="Zu wann" id="k-zeitpunkt">
          <Stack spacing={3} role="radiogroup" aria-labelledby="k-zeitpunkt">
            <OptionCard
              name="zeitpunkt"
              value="naechstmoeglich"
              checked={zeitpunkt === "naechstmoeglich"}
              onSelect={() => setZeitpunkt("naechstmoeglich")}
            >
              Zum nächstmöglichen Zeitpunkt
            </OptionCard>
            <OptionCard
              name="zeitpunkt"
              value="datum"
              checked={zeitpunkt === "datum"}
              onSelect={() => setZeitpunkt("datum")}
            >
              Zu einem bestimmten Datum
            </OptionCard>
          </Stack>
          {zeitpunkt === "datum" ? (
            <FormControl isRequired isInvalid={Boolean(fehler.datum)} maxW={{ base: "full", sm: "260px" }}>
              <FormLabel {...funnelLabelProps}>Gewünschtes Vertragsende</FormLabel>
              <Input
                {...funnelFieldProps}
                type="date"
                min={heute}
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
                sx={{ colorScheme: "dark" }}
              />
              <FormErrorMessage {...funnelErrorProps}>{fehler.datum}</FormErrorMessage>
            </FormControl>
          ) : null}
        </Abschnitt>

        <Trenner />

        {/* ── Bestätigung ─────────────────────────────────────────────── */}
        <Abschnitt titel="Bestätigung" id="k-bestaetigung">
          <FormControl isRequired isInvalid={Boolean(fehler.bestaetigungEmail)}>
            <FormLabel {...funnelLabelProps}>E-Mail-Adresse für die Bestätigung</FormLabel>
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
              Dorthin schicken wir die Bestätigung mit Inhalt, Datum und Uhrzeit des Eingangs.
            </FormHelperText>
            <FormErrorMessage {...funnelErrorProps}>{fehler.bestaetigungEmail}</FormErrorMessage>
          </FormControl>
        </Abschnitt>

        {/* Honeypot: für Menschen unsichtbar, ohne Autofill, nicht per Tab erreichbar. */}
        <Box
          aria-hidden
          position="absolute"
          left="-10000px"
          top="auto"
          w="1px"
          h="1px"
          overflow="hidden"
        >
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

        {serverFehler ? <FunnelAlert>{serverFehler}</FunnelAlert> : null}

        <Stack spacing={3}>
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
            Jetzt kündigen
          </Button>
          <Text fontSize="13px" lineHeight={1.6} color="var(--cc-text-3)" maxW="560px">
            Mit dem Klick geht deine Kündigung sofort bei uns ein. Direkt danach siehst du hier die Bestätigung mit
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

function Beschreibung({ children }: { children: ReactNode }) {
  return (
    <Box as="span" display="block" fontSize="14px" fontWeight={400} color="var(--cc-text-2)" mt="2px">
      {children}
    </Box>
  );
}

function Trenner() {
  return <Box h="1px" bg="var(--cc-line)" aria-hidden />;
}
