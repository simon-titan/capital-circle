"use client";

import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  Stack,
  Text,
  type ButtonProps,
} from "@chakra-ui/react";
import { ArrowRight, CalendarDays, Check } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { buchung } from "@/config/call-funnel";
import { DISCORD_FUNNEL_QUESTIONS } from "@/config/discord-funnel-questions";
import { gespraech, mitglied, type GespraechStelle } from "@/config/training";
import { CalendlyZweiKlick } from "@/components/marketing/CalendlyZweiKlick";
import { RadioStep } from "@/components/marketing/DiscordQuestionsModal";
import {
  FunnelAlert,
  FunnelFinePrint,
  FunnelHeadline,
  FunnelLead,
  FunnelModalTopBar,
  FunnelProgress,
  FunnelStepIndicator,
  SuccessMark,
  funnelBackButtonProps,
  funnelErrorProps,
  funnelFieldProps,
  funnelHelperProps,
  funnelLabelProps,
  funnelModalContentProps,
  funnelOverlayProps,
} from "@/components/marketing/funnel-ui";

/**
 * „Analysegespräch anfragen" im Mitgliederbereich (Free Training).
 *
 * Gleicher Ablauf wie das Buchungs-Modal auf `/call` — Kontakt, sechs Fragen,
 * Calendly —, aber mit eigenem Ziel: Die Anfrage landet in `training_leads`
 * (CRM-Board `/admin/training`), samt der Stelle, an der angefragt wurde
 * (`stelle`), und dem Trainingsstand. Name und E-Mail kommen aus dem Konto.
 *
 * Calendly: `NEXT_PUBLIC_TRAINING_CALENDLY_URL`, sonst der Call-Funnel-Termin.
 * `utm_medium=training` + `utm_content=<token>` ordnet der Webhook
 * (`app/api/integrations/calendly/webhook`) dem Lead zu.
 */

type Phase = "kontakt" | "fragen" | "kalender" | "gebucht";
type Kontakt = { name: string; email: string; phone: string };
type FeldFehler = Partial<Record<keyof Kontakt, string>>;

const FRAGEN = DISCORD_FUNNEL_QUESTIONS;
const SCHRITTE = FRAGEN.length + 1;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Api = {
  oeffne: (stelle?: GespraechStelle) => void;
  gebucht: boolean;
};
const Ctx = createContext<Api | null>(null);

export function useAnalyseGespraech(): Api {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAnalyseGespraech braucht <AnalyseGespraechProvider>");
  return ctx;
}

function calendlyUrl(token: string | null, k: Kontakt): string {
  const basis =
    process.env.NEXT_PUBLIC_TRAINING_CALENDLY_URL?.trim() ||
    process.env.NEXT_PUBLIC_CALL_CALENDLY_URL?.trim() ||
    process.env.NEXT_PUBLIC_DISCORD_CALENDLY_URL?.trim() ||
    "https://calendly.com/contact-capitalcircletrading/capital-circle";
  try {
    const url = new URL(basis);
    url.searchParams.set("utm_source", "capital-circle");
    url.searchParams.set("utm_medium", "training");
    url.searchParams.set("utm_campaign", "free-training");
    if (token) url.searchParams.set("utm_content", token);
    const vorname = k.name.trim().split(/\s+/)[0];
    if (vorname) url.searchParams.set("first_name", vorname);
    if (k.email.trim()) url.searchParams.set("email", k.email.trim());
    return url.toString();
  } catch {
    return "";
  }
}

export function AnalyseGespraechProvider({
  children,
  name = "",
  email = "",
  stelle: standardStelle = "dashboard",
}: {
  children: ReactNode;
  name?: string;
  email?: string;
  stelle?: GespraechStelle;
}) {
  const [offen, setOffen] = useState(false);
  const [stelle, setStelle] = useState<GespraechStelle>(standardStelle);
  const [phase, setPhase] = useState<Phase>("kontakt");
  const [kontakt, setKontakt] = useState<Kontakt>({ name, email, phone: "" });
  const [feldFehler, setFeldFehler] = useState<FeldFehler>({});
  const [frageIndex, setFrageIndex] = useState(0);
  const [antworten, setAntworten] = useState<Record<string, string>>({});
  const [token, setToken] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [serverFehler, setServerFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const koerper = useRef<HTMLDivElement>(null);
  const perZeiger = useRef(false);
  const [autoWeiter, setAutoWeiter] = useState(false);

  const oeffne = useCallback((s?: GespraechStelle) => {
    if (s) setStelle(s);
    setOffen(true);
  }, []);
  const schliesse = useCallback(() => setOffen(false), []);

  useEffect(() => {
    koerper.current?.scrollTo({ top: 0 });
  }, [phase, frageIndex]);

  const weiter = useCallback(async () => {
    setServerFehler(null);
    if (phase === "kontakt") {
      const f: FeldFehler = {};
      if (kontakt.name.trim().length < 2) f.name = buchung.karte.felder.name.fehler;
      if (!EMAIL_RE.test(kontakt.email.trim())) f.email = buchung.karte.felder.email.fehler;
      if (kontakt.phone.trim().length < 5) f.phone = buchung.karte.felder.phone.fehler;
      setFeldFehler(f);
      if (Object.keys(f).length) return;
      setLaeuft(true);
      try {
        const res = await fetch("/api/training/gespraech", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ stelle, ...kontakt }),
        });
        const json = (await res.json().catch(() => null)) as { ok?: boolean; token?: string } | null;
        if (!res.ok || !json?.ok || !json.token) {
          setServerFehler(gespraech.fehlerServer);
          return;
        }
        setToken(json.token);
        setFrageIndex(0);
        setPhase("fragen");
      } catch {
        setServerFehler(gespraech.fehlerVerbindung);
      } finally {
        setLaeuft(false);
      }
      return;
    }
    if (phase !== "fragen") return;
    const frage = FRAGEN[frageIndex];
    if (!frage || !frage.options.includes(antworten[frage.id] ?? "")) {
      setFehler(gespraech.fehlerAuswahl);
      return;
    }
    setFehler(null);
    if (frageIndex < FRAGEN.length - 1) {
      setFrageIndex((i) => i + 1);
      return;
    }
    setLaeuft(true);
    try {
      const res = await fetch("/api/training/gespraech/antworten", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, answers: antworten }),
      });
      if (!res.ok) {
        setServerFehler(gespraech.fehlerServer);
        return;
      }
      setPhase("kalender");
    } catch {
      setServerFehler(gespraech.fehlerVerbindung);
    } finally {
      setLaeuft(false);
    }
  }, [phase, kontakt, stelle, frageIndex, antworten, token]);

  // Auto-Weiter nach Klick auf eine Option (nicht per Tastatur, nie auf der letzten Frage) — wie auf `/call`.
  useEffect(() => {
    if (!autoWeiter) return;
    const t = setTimeout(() => {
      setAutoWeiter(false);
      void weiter();
    }, 280);
    return () => clearTimeout(t);
  }, [autoWeiter, weiter]);

  // Buchung im eingebetteten Calendly → Bestätigung.
  useEffect(() => {
    if (phase !== "kalender") return;
    const meldung = (e: MessageEvent) => {
      if (!/^https:\/\/([a-z0-9-]+\.)?calendly\.com$/.test(e.origin)) return;
      if (typeof e.data === "object" && e.data !== null && (e.data as { event?: unknown }).event === "calendly.event_scheduled") {
        setPhase("gebucht");
      }
    };
    window.addEventListener("message", meldung);
    return () => window.removeEventListener("message", meldung);
  }, [phase]);

  const zurueck = () => {
    setAutoWeiter(false);
    setFehler(null);
    setServerFehler(null);
    if (phase !== "fragen") return;
    if (frageIndex > 0) setFrageIndex((i) => i - 1);
    else setPhase("kontakt");
  };

  const api = useMemo<Api>(() => ({ oeffne, gebucht: phase === "gebucht" }), [oeffne, phase]);
  const url = useMemo(() => calendlyUrl(token, kontakt), [token, kontakt]);

  const label =
    phase === "kontakt"
      ? gespraech.labelKontakt
      : phase === "fragen"
        ? gespraech.labelFragen
        : phase === "kalender"
          ? gespraech.labelKalender
          : gespraech.labelGebucht;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void weiter();
  };

  const frage = FRAGEN[frageIndex];
  const schritt = phase === "kontakt" ? 1 : frageIndex + 2;
  const letzte = phase === "fragen" && frageIndex === FRAGEN.length - 1;
  const felder = buchung.karte.felder;

  return (
    <Ctx.Provider value={api}>
      {children}
      <Modal isOpen={offen} onClose={schliesse} size="xl" scrollBehavior="inside" isCentered closeOnOverlayClick={phase !== "kalender"}>
        <ModalOverlay {...funnelOverlayProps} />
        <ModalContent
          {...funnelModalContentProps}
          aria-label={gespraech.modalTitel}
          maxW={phase === "kalender" ? "760px" : "620px"}
          maxH={{ base: "calc(100% - 24px)", md: "calc(100% - 80px)" }}
          my={{ base: 3, md: 10 }}
        >
          <Box px={{ base: 5, md: 8 }} pt={{ base: 5, md: 6 }} pb={2} flexShrink={0}>
            <FunnelModalTopBar label={label} onClose={schliesse} />
          </Box>
          <ModalBody ref={koerper} p={0}>
            {phase === "gebucht" ? (
              <Stack spacing={5} align="center" textAlign="center" px={{ base: 6, md: 10 }} pt={4} pb={{ base: 8, md: 10 }} role="status">
                <SuccessMark size={64} />
                <FunnelHeadline as="h2" scale="md">
                  {gespraech.gebuchtTitel}
                </FunnelHeadline>
                <Text fontSize="15px" lineHeight={1.7} color="var(--cc-text-soft)" maxW="520px">
                  {gespraech.gebuchtText}
                </Text>
                <Button variant="line" onClick={schliesse}>
                  {gespraech.schliessen}
                </Button>
              </Stack>
            ) : phase === "kalender" ? (
              <Box>
                <Stack spacing={2} px={{ base: 5, md: 8 }} pt={3} pb={5} textAlign="center" align="center">
                  <FunnelHeadline as="h2" scale="md">
                    {gespraech.kalenderTitel}
                  </FunnelHeadline>
                  <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text-2)" maxW="520px">
                    {gespraech.kalenderText}
                  </Text>
                </Stack>
                <Box borderTop="1px solid var(--cc-line)">
                  {url ? (
                    <CalendlyZweiKlick url={url} flaeche="var(--cc-surface)" sofort />
                  ) : (
                    <Text p={8} textAlign="center" fontSize="14px" color="var(--cc-text-3)">
                      {gespraech.keinKalender}
                    </Text>
                  )}
                </Box>
              </Box>
            ) : (
              <Box as="form" onSubmit={onSubmit} noValidate px={{ base: 5, md: 8 }} pt={3} pb={{ base: 6, md: 8 }}>
                <Stack spacing={6}>
                  <Stack spacing={4}>
                    <FunnelStepIndicator current={schritt} total={SCHRITTE} unit="Schritt" />
                    <FunnelProgress value={(schritt / SCHRITTE) * 100} label="Fortschritt der Einordnung" />
                  </Stack>

                  {phase === "kontakt" ? (
                    <Stack spacing={5}>
                      <Stack spacing={2}>
                        <FunnelHeadline as="h2" scale="sm">
                          {gespraech.kontaktHeadline}
                        </FunnelHeadline>
                        <FunnelLead fontSize="14px">{gespraech.kontaktText}</FunnelLead>
                      </Stack>
                      {(
                        [
                          { key: "name", type: "text", autoComplete: "name", ...felder.name, hinweis: null },
                          { key: "email", type: "email", autoComplete: "email", ...felder.email, hinweis: null },
                          { key: "phone", type: "tel", autoComplete: "tel", ...felder.phone, hinweis: gespraech.telefonHinweis },
                        ] as const
                      ).map((feld) => (
                        <FormControl key={feld.key} isInvalid={Boolean(feldFehler[feld.key])} isRequired>
                          <FormLabel {...funnelLabelProps} mb={1.5}>
                            {feld.label}
                          </FormLabel>
                          <Input
                            {...funnelFieldProps}
                            type={feld.type}
                            autoComplete={feld.autoComplete}
                            placeholder={feld.placeholder}
                            value={kontakt[feld.key]}
                            onChange={(e) => {
                              setKontakt((k) => ({ ...k, [feld.key]: e.target.value }));
                              setFeldFehler((f) => ({ ...f, [feld.key]: undefined }));
                            }}
                            h="52px"
                            fontSize="16px"
                          />
                          {feldFehler[feld.key] ? (
                            <FormErrorMessage {...funnelErrorProps}>{feldFehler[feld.key]}</FormErrorMessage>
                          ) : feld.hinweis ? (
                            <FormHelperText {...funnelHelperProps}>{feld.hinweis}</FormHelperText>
                          ) : null}
                        </FormControl>
                      ))}
                    </Stack>
                  ) : frage ? (
                    <Box
                      key={frage.id}
                      onClickCapture={(e) => {
                        if (e.detail > 0 && (e.target as HTMLElement).closest("label")) perZeiger.current = true;
                      }}
                      onKeyDownCapture={() => {
                        perZeiger.current = false;
                      }}
                    >
                      <RadioStep
                        question={{ ...frage, question: buchung.karte.fragen[frage.id] ?? frage.question }}
                        value={antworten[frage.id] ?? ""}
                        onChange={(a) => {
                          setAntworten((alt) => ({ ...alt, [frage.id]: a }));
                          setFehler(null);
                          if (perZeiger.current && frageIndex < FRAGEN.length - 1) setAutoWeiter(true);
                          perZeiger.current = false;
                        }}
                        error={fehler}
                      />
                    </Box>
                  ) : null}

                  {serverFehler ? <FunnelAlert>{serverFehler}</FunnelAlert> : null}

                  <Stack spacing={3}>
                    <Button
                      type="submit"
                      variant="gold"
                      w="full"
                      minH="52px"
                      fontSize="16px"
                      isLoading={laeuft}
                      loadingText={gespraech.speichert}
                      leftIcon={letzte ? <CalendarDays size={18} strokeWidth={2} /> : undefined}
                    >
                      {letzte ? gespraech.abschicken : gespraech.weiter}
                    </Button>
                    {phase === "fragen" ? (
                      <Button {...funnelBackButtonProps} type="button" onClick={zurueck}>
                        {gespraech.zurueck}
                      </Button>
                    ) : null}
                    <FunnelFinePrint textAlign="center">
                      {letzte ? `${buchung.karte.kalenderEinwilligung} Mehr dazu in der ` : "Mit dem Absenden stimmst du unserer "}
                      <Box as="a" href={letzte ? "/datenschutz#bewerbungen" : "/datenschutz"} target="_blank" color="var(--cc-text-2)" textDecoration="underline">
                        Datenschutzerklärung
                      </Box>
                      {letzte ? "." : " zu."}
                    </FunnelFinePrint>
                  </Stack>
                </Stack>
              </Box>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Ctx.Provider>
  );
}

/** Knopf „Analysegespräch anfragen" — öffnet das Modal mit der angegebenen Stelle. */
export function AnalyseGespraechKnopf({
  stelle,
  children,
  ...props
}: ButtonProps & { stelle: GespraechStelle; children?: ReactNode }) {
  const g = useAnalyseGespraech();
  return (
    <Button
      type="button"
      variant="gold"
      aria-haspopup="dialog"
      rightIcon={g.gebucht ? <Check size={17} strokeWidth={2} /> : <ArrowRight size={17} strokeWidth={2} />}
      onClick={() => g.oeffne(stelle)}
      {...props}
    >
      {g.gebucht ? "Gespräch gebucht" : (children ?? mitglied.cta.gespraech)}
    </Button>
  );
}

