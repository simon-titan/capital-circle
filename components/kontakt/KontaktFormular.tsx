"use client";

import {
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  FunnelAlert,
  SuccessMark,
  funnelErrorProps,
  funnelFieldProps,
  funnelHelperProps,
  funnelLabelProps,
  funnelSelectSx,
} from "@/components/marketing/funnel-ui";
import { rechtsPfade } from "@/config/legal";
import {
  KONTAKT_EMAIL,
  KONTAKT_GRENZEN,
  KONTAKT_HONIGTOPF,
  KONTAKT_KATEGORIEN,
  istGueltigeEmail,
  type KontaktKategorie,
} from "@/lib/support/kontakt-shared";

type Feld = "name" | "email" | "betreff" | "nachricht";
type Fehler = Partial<Record<Feld, string>>;

interface Erfolg {
  verlaufUrl: string;
  bestaetigungVersendet: boolean;
  email: string;
}

/**
 * Kontaktformular ohne Anmeldung (`/kontakt`).
 *
 * Für alle, die keinen Zugang zur Plattform haben: Anmeldung klappt nicht,
 * Passwort verloren, Kauf ohne Konto, Fragen vor dem Beitritt. Nach dem
 * Absenden ersetzt die Bestätigung das Formular auf derselben Seite; der Link
 * zum Verlauf steht dort und in der Mail, denn ohne Konto ist er der einzige
 * Weg zurück zum Ticket.
 */
export function KontaktFormular() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [kategorie, setKategorie] = useState<KontaktKategorie>("account");
  const [betreff, setBetreff] = useState("");
  const [nachricht, setNachricht] = useState("");
  const [honig, setHonig] = useState("");

  const [fehler, setFehler] = useState<Fehler>({});
  const [serverFehler, setServerFehler] = useState<string | null>(null);
  const [sendet, setSendet] = useState(false);
  const [erfolg, setErfolg] = useState<Erfolg | null>(null);

  const formRef = useRef<HTMLDivElement>(null);
  const titelRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!erfolg) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
    titelRef.current?.focus();
  }, [erfolg]);

  function pruefe(): Fehler {
    const f: Fehler = {};
    if (name.trim().length < KONTAKT_GRENZEN.nameMin) f.name = "Bitte gib deinen Namen an.";
    if (!istGueltigeEmail(email.trim().toLowerCase())) {
      f.email = "Bitte gib eine gültige E-Mail-Adresse an, damit wir dir antworten können.";
    }
    if (betreff.trim().length < KONTAKT_GRENZEN.betreffMin) f.betreff = "Bitte gib einen kurzen Betreff an.";
    if (nachricht.trim().length < KONTAKT_GRENZEN.nachrichtMin) {
      f.nachricht = "Bitte beschreibe dein Anliegen etwas ausführlicher.";
    }
    return f;
  }

  async function absenden(e: FormEvent) {
    e.preventDefault();
    // Doppelklick: Die zweite Einreichung wäre ein zweites Ticket.
    if (sendet) return;
    setServerFehler(null);

    const f = pruefe();
    setFehler(f);
    if (Object.keys(f).length > 0) {
      window.requestAnimationFrame(() => {
        formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      });
      return;
    }

    setSendet(true);
    try {
      const res = await fetch("/api/kontakt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, kategorie, betreff, nachricht, [KONTAKT_HONIGTOPF]: honig }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok: true; verlaufUrl: string; bestaetigungVersendet: boolean }
        | { ok: false; error?: string; felder?: Fehler }
        | null;

      if (json && json.ok) {
        setErfolg({
          verlaufUrl: json.verlaufUrl,
          bestaetigungVersendet: json.bestaetigungVersendet,
          email: email.trim().toLowerCase(),
        });
        return;
      }
      if (json && !json.ok && json.felder) setFehler(json.felder);
      setServerFehler(
        json && !json.ok && json.error
          ? json.error
          : `Die Nachricht konnte gerade nicht gesendet werden. Bitte versuche es noch einmal oder schreib an ${KONTAKT_EMAIL}.`,
      );
      setSendet(false);
    } catch {
      setServerFehler("Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung und versuche es noch einmal.");
      setSendet(false);
    }
  }

  if (erfolg) {
    // Der Verlauf-Link trägt den Token und ist eine interne Adresse; relativ öffnen.
    const pfad = erfolg.verlaufUrl.replace(/^https?:\/\/[^/]+/, "");
    return (
      <Box className="cc-card cc-card--still cc-rise" p={{ base: 5, md: 8 }} role="status">
        <Stack spacing={6}>
          <Flex gap={5} align={{ base: "flex-start", sm: "center" }} direction={{ base: "column", sm: "row" }}>
            <SuccessMark size={56} />
            <Stack spacing={2}>
              <Box
                as="h2"
                ref={titelRef}
                tabIndex={-1}
                fontSize={{ base: "24px", md: "28px" }}
                lineHeight={1.2}
                fontWeight={600}
                outline="none"
              >
                Deine Nachricht ist angekommen.
              </Box>
              <Text fontSize="16px" lineHeight={1.6} color="var(--cc-text-2)">
                {erfolg.bestaetigungVersendet ? (
                  <>
                    Wir haben dir eine Bestätigung an{" "}
                    <Box as="span" color="var(--cc-text)" overflowWrap="anywhere">
                      {erfolg.email}
                    </Box>{" "}
                    geschickt und melden uns so schnell wie möglich per E-Mail.
                  </>
                ) : (
                  <>
                    Wir melden uns so schnell wie möglich bei{" "}
                    <Box as="span" color="var(--cc-text)" overflowWrap="anywhere">
                      {erfolg.email}
                    </Box>
                    . Die Bestätigungsmail konnten wir gerade nicht versenden. Speichere deshalb den Link unten.
                  </>
                )}
              </Text>
            </Stack>
          </Flex>

          <Stack spacing={3}>
            <Text fontSize="14px" lineHeight={1.6} color="var(--cc-text-3)">
              Über den Verlauf siehst du unsere Antworten und kannst nachschreiben. Der Link gehört nur dir, gib ihn
              nicht weiter.
            </Text>
            <Button
              as={NextLink}
              href={pfad}
              variant="gold"
              h="48px"
              alignSelf={{ base: "stretch", sm: "flex-start" }}
              px={8}
            >
              Verlauf öffnen
            </Button>
          </Stack>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      as="form"
      onSubmit={absenden}
      noValidate
      className="cc-card cc-card--still cc-rise"
      style={{ animationDelay: "150ms" }}
      p={{ base: 5, md: 8 }}
      aria-label="Kontaktformular"
    >
      <Stack spacing={6} ref={formRef}>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <FormControl isRequired isInvalid={Boolean(fehler.name)}>
            <FormLabel {...funnelLabelProps}>Dein Name</FormLabel>
            <Input
              {...funnelFieldProps}
              autoComplete="name"
              maxLength={KONTAKT_GRENZEN.nameMax}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <FormErrorMessage {...funnelErrorProps}>{fehler.name}</FormErrorMessage>
          </FormControl>
          <FormControl isRequired isInvalid={Boolean(fehler.email)}>
            <FormLabel {...funnelLabelProps}>Deine E-Mail-Adresse</FormLabel>
            <Input
              {...funnelFieldProps}
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={KONTAKT_GRENZEN.emailMax}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <FormErrorMessage {...funnelErrorProps}>{fehler.email}</FormErrorMessage>
          </FormControl>
        </SimpleGrid>

        <FormControl>
          <FormLabel {...funnelLabelProps}>Worum geht es?</FormLabel>
          <Select
            {...funnelFieldProps}
            sx={funnelSelectSx}
            value={kategorie}
            onChange={(e) => setKategorie(e.target.value as KontaktKategorie)}
          >
            {KONTAKT_KATEGORIEN.map((k) => (
              <option key={k.wert} value={k.wert}>
                {k.label}
              </option>
            ))}
          </Select>
        </FormControl>

        <FormControl isRequired isInvalid={Boolean(fehler.betreff)}>
          <FormLabel {...funnelLabelProps}>Betreff</FormLabel>
          <Input
            {...funnelFieldProps}
            maxLength={KONTAKT_GRENZEN.betreffMax}
            value={betreff}
            onChange={(e) => setBetreff(e.target.value)}
          />
          <FormErrorMessage {...funnelErrorProps}>{fehler.betreff}</FormErrorMessage>
        </FormControl>

        <FormControl isRequired isInvalid={Boolean(fehler.nachricht)}>
          <FormLabel {...funnelLabelProps}>Deine Nachricht</FormLabel>
          <Textarea
            {...funnelFieldProps}
            rows={7}
            maxLength={KONTAKT_GRENZEN.nachrichtMax}
            value={nachricht}
            onChange={(e) => setNachricht(e.target.value)}
          />
          <FormHelperText {...funnelHelperProps}>
            Bei Problemen mit der Anmeldung hilft uns die E-Mail-Adresse, mit der du gekauft hast, und die genaue
            Fehlermeldung. Passwörter schreibst du bitte nie in die Nachricht.
          </FormHelperText>
          <FormErrorMessage {...funnelErrorProps}>{fehler.nachricht}</FormErrorMessage>
        </FormControl>

        {/* Honeypot: für Menschen unsichtbar, ohne Autofill, nicht per Tab erreichbar. */}
        <Box aria-hidden position="absolute" left="-10000px" top="auto" w="1px" h="1px" overflow="hidden">
          <label htmlFor={KONTAKT_HONIGTOPF}>Dieses Feld bitte leer lassen</label>
          <input
            id={KONTAKT_HONIGTOPF}
            name={KONTAKT_HONIGTOPF}
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
            loadingText="Wird gesendet …"
          >
            Nachricht senden
          </Button>
          <Text fontSize="13px" lineHeight={1.6} color="var(--cc-text-3)" maxW="560px">
            Wir speichern deine Angaben, um dir zu antworten. Mehr dazu in der{" "}
            <NextLink href={rechtsPfade.datenschutz} style={{ textDecoration: "underline" }}>
              Datenschutzerklärung
            </NextLink>
            .
          </Text>
        </Stack>
      </Stack>
    </Box>
  );
}
