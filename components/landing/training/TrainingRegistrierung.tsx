"use client";

import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  Stack,
  Text,
  Textarea,
  type ButtonProps,
} from "@chakra-ui/react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Script from "next/script";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { BEWERBUNG_MIN_ZEICHEN, bewerbung, landing, registrierung } from "@/config/training";
import { leseHerkunft } from "@/lib/training/herkunft";
import {
  FunnelAlert,
  FunnelFinePrint,
  FunnelHeadline,
  FunnelLead,
  FunnelModalTopBar,
  funnelErrorProps,
  funnelFieldProps,
  funnelLabelProps,
  funnelModalContentProps,
  funnelOverlayProps,
} from "@/components/marketing/funnel-ui";

/**
 * Bewerbung für das kostenlose Training (`/training`) — als Modal.
 *
 * Seit 07.11.2026 (E-Mail-Playbook 1.0, Emre) kein Sofort-Zugang mehr: Wer das
 * Training sehen will, beantwortet drei Fragen; Emre entscheidet. Zwei Schritte:
 *
 *   1. Fragen   — Emres drei Fragen, dazu „Möchtest du, dass wir dich
 *                 kontaktieren?" (Ja/Nein, bei Ja optional Telefon)
 *   2. Konto    — Name, E-Mail, Passwort, Turnstile, Hinweis „Absage endgültig"
 *
 * Danach „Bestätige deine E-Mail": Erst mit dem Link kommt die Bewerbung bei
 * Emre an (`/auth/confirm` → `/training/status`, Mail A01).
 *
 * `eingeloggt`: Ein bestehendes Konto ohne Trainingszugang bewirbt sich ohne
 * Schritt 2 (`/api/training/bewerbung`), z. B. auf `/kostenloses-training`.
 *
 * Exportnamen bleiben (`TrainingRegistrierungProvider`, `TrainingStartKnopf`),
 * damit beide Landingpages unverändert funktionieren.
 */

type FrageId = (typeof bewerbung.fragen)[number]["id"];
type Konto = { name: string; email: string; passwort: string };
type FeldFehler = Partial<Record<FrageId | "kontakt" | "telefon" | keyof Konto, string>>;
type Phase = "fragen" | "konto" | "eingegangen";

type RegistrierungApi = { oeffne: () => void; phase: Phase };
const Ctx = createContext<RegistrierungApi | null>(null);

function useRegistrierung(): RegistrierungApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRegistrierung braucht <TrainingRegistrierungProvider>");
  return ctx;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const leer = () => Object.fromEntries(bewerbung.fragen.map((f) => [f.id, ""])) as Record<FrageId, string>;

export function TrainingRegistrierungProvider({
  children,
  eingeloggt = false,
  sofortOffen = false,
}: {
  children: ReactNode;
  eingeloggt?: boolean;
  sofortOffen?: boolean;
}) {
  const siteKey = eingeloggt ? "" : (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "");
  const [offen, setOffen] = useState(sofortOffen);
  const [phase, setPhase] = useState<Phase>("fragen");
  const [antworten, setAntworten] = useState<Record<FrageId, string>>(leer);
  const [kontakt, setKontakt] = useState<boolean | null>(null);
  const [telefon, setTelefon] = useState("");
  const [konto, setKonto] = useState<Konto>({ name: "", email: "", passwort: "" });
  const [feldFehler, setFeldFehler] = useState<FeldFehler>({});
  const [serverFehler, setServerFehler] = useState<ReactNode | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const widgetId = useRef<string | null>(null);
  const widgetBox = useRef<HTMLDivElement | null>(null);

  const oeffne = useCallback(() => setOffen(true), []);
  const schliesse = useCallback(() => setOffen(false), []);

  // Turnstile rendern, sobald der Kontoschritt im Modal steht.
  useEffect(() => {
    if (!offen || phase !== "konto" || !siteKey) return;
    const versuche = () => {
      if (widgetId.current || !window.turnstile || !widgetBox.current) return Boolean(widgetId.current);
      widgetId.current = window.turnstile.render(widgetBox.current, {
        sitekey: siteKey,
        theme: "dark",
        appearance: "interaction-only",
        callback: (token) => setTurnstileToken(token),
        "error-callback": () => setTurnstileToken(null),
        "expired-callback": () => setTurnstileToken(null),
      });
      return true;
    };
    if (versuche()) return;
    const intervall = window.setInterval(() => {
      if (versuche()) window.clearInterval(intervall);
    }, 200);
    return () => window.clearInterval(intervall);
  }, [offen, phase, siteKey]);

  // Beim Schließen oder Zurückblättern das Widget abbauen — das DOM verschwindet mit.
  useEffect(() => {
    if (offen && phase === "konto") return;
    if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
    widgetId.current = null;
    setTurnstileToken(null);
  }, [offen, phase]);

  const fehlerWeg = (k: keyof FeldFehler) => {
    setFeldFehler((f) => ({ ...f, [k]: undefined }));
    setServerFehler(null);
  };

  const pruefeFragen = (): boolean => {
    const f: FeldFehler = {};
    for (const q of bewerbung.fragen) if (antworten[q.id].trim().length < BEWERBUNG_MIN_ZEICHEN) f[q.id] = bewerbung.fehlerKurz;
    if (kontakt === null) f.kontakt = bewerbung.fehlerKontakt;
    if (kontakt === true && telefon.trim().length < 6) f.telefon = "Bitte trag deine Telefonnummer ein.";
    setFeldFehler(f);
    return Object.keys(f).length === 0;
  };

  const nutzlast = () => ({
    antworten: Object.fromEntries(bewerbung.fragen.map((q) => [q.id, antworten[q.id].trim()])),
    kontaktGewuenscht: kontakt === true,
    telefon: kontakt ? telefon.trim() : "",
  });

  const fehlerAus = (code: string | undefined, felder?: Record<string, true>) => {
    if (felder?.telefon) setFeldFehler((f) => ({ ...f, telefon: "Bitte prüf deine Telefonnummer." }));
    if (code === "schon_registriert") {
      setServerFehler(
        <>
          {registrierung.schonRegistriert}{" "}
          <Box as="a" href="/login" color="var(--cc-gold-light)" textDecoration="underline">
            Zum Login
          </Box>
        </>,
      );
    } else if (code === "schon_beworben") setServerFehler(bewerbung.schonBeworben);
    else if (code === "turnstile") setServerFehler(registrierung.fehler.turnstile);
    else if (code === "zu_oft") setServerFehler(registrierung.fehler.zuOft);
    else setServerFehler(bewerbung.fehler.server);
  };

  const weiterNachFragen = async (e: FormEvent) => {
    e.preventDefault();
    if (!pruefeFragen()) return;
    if (!eingeloggt) {
      setPhase("konto");
      return;
    }
    setLaeuft(true);
    setServerFehler(null);
    try {
      const res = await fetch("/api/training/bewerbung", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(nutzlast()),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; felder?: Record<string, true> } | null;
      if (res.ok && json?.ok) {
        setPhase("eingegangen");
        return;
      }
      fehlerAus(json?.error, json?.felder);
    } catch {
      setServerFehler(bewerbung.fehler.server);
    } finally {
      setLaeuft(false);
    }
  };

  const absenden = async (e: FormEvent) => {
    e.preventDefault();
    const t = registrierung.felder;
    const f: FeldFehler = {};
    if (konto.name.trim().length < 2) f.name = t.name.fehler;
    if (!EMAIL_RE.test(konto.email.trim())) f.email = t.email.fehler;
    if (konto.passwort.length < 8) f.passwort = t.passwort.fehler;
    setFeldFehler(f);
    if (Object.keys(f).length) return;
    if (siteKey && !turnstileToken) {
      setServerFehler(registrierung.fehler.turnstile);
      return;
    }
    setLaeuft(true);
    setServerFehler(null);
    try {
      const res = await fetch("/api/training/registrieren", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: konto.name.trim(),
          email: konto.email.trim(),
          password: konto.passwort,
          turnstileToken,
          herkunft: leseHerkunft(),
          ...nutzlast(),
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        felder?: Record<string, true>;
        angemeldet?: boolean;
        weiter?: string;
      } | null;
      if (res.ok && json?.ok) {
        // Keine E-Mail-Bestätigung mehr: angemeldet direkt auf die Statusseite.
        if (json.angemeldet && json.weiter) {
          window.location.assign(json.weiter);
          return;
        }
        setPhase("eingegangen");
        return;
      }
      // Fehler in den Fragen (Server prüft dieselbe Regel) → zurück zu Schritt 1.
      if (json?.felder && bewerbung.fragen.some((q) => json.felder?.[q.id])) {
        pruefeFragen();
        setPhase("fragen");
      }
      fehlerAus(json?.error, json?.felder);
      // Ein verbrauchtes Turnstile-Token gilt nicht noch einmal.
      if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
      setTurnstileToken(null);
    } catch {
      setServerFehler(bewerbung.fehler.server);
    } finally {
      setLaeuft(false);
    }
  };

  const api = useMemo(() => ({ oeffne, phase }), [oeffne, phase]);
  const t = registrierung.felder;

  return (
    <Ctx.Provider value={api}>
      {siteKey ? <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer strategy="afterInteractive" /> : null}
      {children}
      <Modal isOpen={offen} onClose={schliesse} size="lg" isCentered scrollBehavior="inside">
        <ModalOverlay {...funnelOverlayProps} />
        {/* Smaragd-Fassung der Funnel-Modalfläche: Schein oben rechts und
            Lichtkante in Smaragd statt Gold (Feedback 14.11.2026). */}
        <ModalContent
          {...funnelModalContentProps}
          aria-label={bewerbung.modalTitel}
          maxW="560px"
          my={{ base: 3, md: 10 }}
          border="1px solid rgba(111, 208, 166, 0.26)"
          bgImage="radial-gradient(circle at 100% 0%, rgba(28, 122, 90, 0.2), transparent 48%), radial-gradient(circle at 0% 100%, rgba(232, 192, 148, 0.04), transparent 50%)"
          boxShadow="0 24px 60px rgba(0, 0, 0, 0.6), 0 0 44px rgba(28, 122, 90, 0.14)"
          _before={{
            ...funnelModalContentProps._before,
            bgImage: "linear-gradient(90deg, transparent 0%, rgba(111, 208, 166, 0.9) 45%, rgba(28, 122, 90, 0.3) 100%)",
          }}
        >
          <Box px={{ base: 5, md: 8 }} pt={{ base: 5, md: 6 }} pb={3} borderBottom="1px solid var(--cc-line)">
            <FunnelModalTopBar label={bewerbung.modalTitel} onClose={schliesse} />
            {!eingeloggt && (phase === "fragen" || phase === "konto") ? (
              <SchrittLeiste schritt={phase === "fragen" ? 1 : 2} />
            ) : null}
          </Box>
          <ModalBody className="cc-scroll" px={{ base: 5, md: 8 }} pt={3} pb={{ base: 6, md: 8 }}>
            {phase === "eingegangen" ? (
              <Stack spacing={4} align="center" textAlign="center" role="status" py={4}>
                <Box color="var(--cc-smaragd-hell)">
                  <CheckCircle2 size={44} strokeWidth={1.5} aria-hidden />
                </Box>
                <FunnelHeadline as="h2" scale="sm">
                  {bewerbung.eingegangenTitel}
                </FunnelHeadline>
                <Text fontSize="15px" lineHeight={1.65} color="var(--cc-text-2)">
                  {bewerbung.eingegangenText}
                </Text>
                <Button
                  variant="line"
                  onClick={() => {
                    schliesse();
                    window.location.reload();
                  }}
                >
                  Schließen
                </Button>
              </Stack>
            ) : phase === "fragen" ? (
              <Box as="form" onSubmit={weiterNachFragen} noValidate>
                <Stack spacing={5}>
                  <Stack spacing={2}>
                    <FunnelHeadline as="h2" scale="sm">
                      {bewerbung.headline}
                    </FunnelHeadline>
                    <FunnelLead fontSize="14px">{bewerbung.text}</FunnelLead>
                    <Text fontSize="13px" color="var(--cc-text-3)">
                      — {bewerbung.unterschrift}
                    </Text>
                  </Stack>

                  {bewerbung.fragen.map((q, i) => (
                    <FormControl key={q.id} isInvalid={Boolean(feldFehler[q.id])} isRequired>
                      <FormLabel {...funnelLabelProps} mb={1.5}>
                        {i + 1}. {q.frage}
                      </FormLabel>
                      <Textarea
                        {...funnelFieldProps}
                        name={q.id}
                        placeholder={q.placeholder}
                        value={antworten[q.id]}
                        onChange={(e) => {
                          const wert = e.target.value;
                          setAntworten((a) => ({ ...a, [q.id]: wert }));
                          fehlerWeg(q.id);
                        }}
                        rows={3}
                        fontSize="16px"
                        resize="vertical"
                      />
                      {feldFehler[q.id] ? <FormErrorMessage {...funnelErrorProps}>{feldFehler[q.id]}</FormErrorMessage> : null}
                    </FormControl>
                  ))}

                  <FormControl isInvalid={Boolean(feldFehler.kontakt)} isRequired>
                    <FormLabel {...funnelLabelProps} mb={2}>
                      {bewerbung.kontaktFrage}
                    </FormLabel>
                    <HStack spacing={3} role="radiogroup" aria-label={bewerbung.kontaktFrage}>
                      {([true, false] as const).map((wert) => (
                        <Button
                          key={String(wert)}
                          type="button"
                          role="radio"
                          aria-checked={kontakt === wert}
                          variant={kontakt === wert ? "smaragd" : "line"}
                          flex="1"
                          minH="48px"
                          fontSize="15px"
                          onClick={() => {
                            setKontakt(wert);
                            fehlerWeg("kontakt");
                          }}
                        >
                          {wert ? bewerbung.kontaktJa : bewerbung.kontaktNein}
                        </Button>
                      ))}
                    </HStack>
                    {feldFehler.kontakt ? <FormErrorMessage {...funnelErrorProps}>{feldFehler.kontakt}</FormErrorMessage> : null}
                  </FormControl>

                  {kontakt ? (
                    <FormControl isInvalid={Boolean(feldFehler.telefon)} isRequired>
                      <FormLabel {...funnelLabelProps} mb={1.5}>
                        {bewerbung.telefon.label}
                      </FormLabel>
                      <Input
                        {...funnelFieldProps}
                        type="tel"
                        autoComplete="tel"
                        placeholder={bewerbung.telefon.placeholder}
                        value={telefon}
                        onChange={(e) => {
                          setTelefon(e.target.value);
                          fehlerWeg("telefon");
                        }}
                        h="52px"
                        fontSize="16px"
                      />
                      {feldFehler.telefon ? (
                        <FormErrorMessage {...funnelErrorProps}>{feldFehler.telefon}</FormErrorMessage>
                      ) : (
                        <Text fontSize="12px" color="var(--cc-text-3)" mt={1.5}>
                          {bewerbung.telefon.hinweis}
                        </Text>
                      )}
                    </FormControl>
                  ) : null}

                  {eingeloggt ? <FunnelFinePrint>{bewerbung.endgueltig}</FunnelFinePrint> : null}
                  {serverFehler ? <FunnelAlert>{serverFehler}</FunnelAlert> : null}

                  <Button
                    type="submit"
                    variant="smaragd"
                    w="full"
                    minH="52px"
                    fontSize="16px"
                    isLoading={laeuft}
                    loadingText={bewerbung.laeuft}
                    rightIcon={<ArrowRight size={18} strokeWidth={2} />}
                  >
                    {eingeloggt ? bewerbung.knopfEingeloggt : bewerbung.weiter}
                  </Button>
                </Stack>
              </Box>
            ) : (
              <Box as="form" onSubmit={absenden} noValidate>
                <Stack spacing={5}>
                  <Stack spacing={2}>
                    <FunnelHeadline as="h2" scale="sm">
                      {bewerbung.kontoHeadline}
                    </FunnelHeadline>
                    <FunnelLead fontSize="14px">{bewerbung.kontoText}</FunnelLead>
                  </Stack>

                  {(
                    [
                      { key: "name", type: "text", autoComplete: "name", ...t.name },
                      { key: "email", type: "email", autoComplete: "email", ...t.email },
                      { key: "passwort", type: "password", autoComplete: "new-password", ...t.passwort },
                    ] as const
                  ).map((feld) => (
                    <FormControl key={feld.key} isInvalid={Boolean(feldFehler[feld.key])} isRequired>
                      <FormLabel {...funnelLabelProps} mb={1.5}>
                        {feld.label}
                      </FormLabel>
                      <Input
                        {...funnelFieldProps}
                        type={feld.type}
                        name={feld.key}
                        autoComplete={feld.autoComplete}
                        placeholder={feld.placeholder}
                        value={konto[feld.key]}
                        onChange={(e) => {
                          const wert = e.target.value;
                          setKonto((k) => ({ ...k, [feld.key]: wert }));
                          fehlerWeg(feld.key);
                        }}
                        h="52px"
                        fontSize="16px"
                      />
                      {feldFehler[feld.key] ? (
                        <FormErrorMessage {...funnelErrorProps}>{feldFehler[feld.key]}</FormErrorMessage>
                      ) : null}
                    </FormControl>
                  ))}

                  <FunnelFinePrint>{bewerbung.endgueltig}</FunnelFinePrint>
                  {siteKey ? <Box ref={widgetBox} /> : null}
                  {serverFehler ? <FunnelAlert>{serverFehler}</FunnelAlert> : null}

                  <Button
                    type="submit"
                    variant="smaragd"
                    w="full"
                    minH="52px"
                    fontSize="16px"
                    isLoading={laeuft}
                    loadingText={bewerbung.laeuft}
                    rightIcon={<ArrowRight size={18} strokeWidth={2} />}
                  >
                    {bewerbung.knopf}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" alignSelf="center" onClick={() => setPhase("fragen")}>
                    {bewerbung.zurueck}
                  </Button>
                  <FunnelFinePrint textAlign="center">
                    {registrierung.einwilligung}{" "}
                    <Box as="a" href="/datenschutz" target="_blank" color="var(--cc-text-2)" textDecoration="underline">
                      Datenschutzerklärung
                    </Box>
                  </FunnelFinePrint>
                  <Text fontSize="13px" color="var(--cc-text-3)" textAlign="center">
                    Schon registriert?{" "}
                    <Box as="a" href="/login" color="var(--cc-smaragd-hell)">
                      Anmelden
                    </Box>
                  </Text>
                </Stack>
              </Box>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Ctx.Provider>
  );
}

/** „Schritt 1 von 2" mit zwei Segmenten in Smaragd — Fragen, dann Konto. */
function SchrittLeiste({ schritt }: { schritt: 1 | 2 }) {
  return (
    <HStack spacing={3} mt={3} align="center">
      <HStack spacing={1.5} flex="1" aria-hidden>
        {[1, 2].map((n) => (
          <Box
            key={n}
            flex="1"
            h="3px"
            borderRadius="full"
            bg={n <= schritt ? "var(--cc-smaragd-grad)" : "rgba(255, 255, 255, 0.08)"}
            boxShadow={n <= schritt ? "0 0 10px rgba(46, 170, 120, 0.45)" : "none"}
            transition="background 240ms var(--cc-ease)"
          />
        ))}
      </HStack>
      <Text className="cc-num" fontSize="12px" color="var(--cc-text-3)" flexShrink={0}>
        Schritt {schritt} von 2
      </Text>
    </HStack>
  );
}

/** Hauptaktion der Landing: öffnet die Bewerbung. */
export function TrainingStartKnopf({ children, ...props }: ButtonProps) {
  const r = useRegistrierung();
  return (
    <Button
      type="button"
      variant="smaragd"
      w={{ base: "full", sm: "auto" }}
      h="auto"
      minH={{ base: "52px", md: "56px" }}
      py={3}
      px={{ base: 6, md: 9 }}
      fontSize={{ base: "16px", md: "17px" }}
      aria-haspopup="dialog"
      rightIcon={<ArrowRight size={18} strokeWidth={2} />}
      onClick={r.oeffne}
      {...props}
    >
      {children ?? landing.hero.cta}
    </Button>
  );
}
