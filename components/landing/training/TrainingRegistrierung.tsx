"use client";

import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
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
import { ArrowRight, MailCheck } from "lucide-react";
import Script from "next/script";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { landing, registrierung } from "@/config/training";
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
 * Registrierung für das kostenlose Training (`/training`) — als Modal.
 *
 * Jede Hauptaktion der Seite ist ein `TrainingStartKnopf` und öffnet dasselbe
 * Modal; der Zustand liegt im Provider (wie `CallBuchung` auf `/call`). Nach dem
 * Absenden zeigt das Modal „Bestätige deine E-Mail" — eingeloggt wird erst über
 * den Link in der Mail (`/api/training/registrieren` → `/auth/confirm`).
 */

type Felder = { name: string; email: string; passwort: string };
type FeldFehler = Partial<Record<keyof Felder, string>>;
type Phase = "formular" | "bestaetigen";

type RegistrierungApi = { oeffne: () => void; phase: Phase };
const Ctx = createContext<RegistrierungApi | null>(null);

function useRegistrierung(): RegistrierungApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRegistrierung braucht <TrainingRegistrierungProvider>");
  return ctx;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function pruefe(f: Felder): FeldFehler {
  const t = registrierung.felder;
  const fehler: FeldFehler = {};
  if (f.name.trim().length < 2) fehler.name = t.name.fehler;
  if (!EMAIL_RE.test(f.email.trim())) fehler.email = t.email.fehler;
  if (f.passwort.length < 8) fehler.passwort = t.passwort.fehler;
  return fehler;
}

export function TrainingRegistrierungProvider({ children }: { children: ReactNode }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const [offen, setOffen] = useState(false);
  const [phase, setPhase] = useState<Phase>("formular");
  const [felder, setFelder] = useState<Felder>({ name: "", email: "", passwort: "" });
  const [feldFehler, setFeldFehler] = useState<FeldFehler>({});
  const [serverFehler, setServerFehler] = useState<ReactNode | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const widgetId = useRef<string | null>(null);
  const widgetBox = useRef<HTMLDivElement | null>(null);

  const oeffne = useCallback(() => setOffen(true), []);
  const schliesse = useCallback(() => setOffen(false), []);

  // Turnstile rendern, sobald das Formular im Modal steht.
  useEffect(() => {
    if (!offen || phase !== "formular" || !siteKey) return;
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

  // Beim Schließen das Widget abbauen — das Modal-DOM verschwindet mit.
  useEffect(() => {
    if (offen) return;
    if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
    widgetId.current = null;
    setTurnstileToken(null);
  }, [offen]);

  const setze = (k: keyof Felder, v: string) => {
    setFelder((f) => ({ ...f, [k]: v }));
    setFeldFehler((f) => ({ ...f, [k]: undefined }));
    setServerFehler(null);
  };

  const absenden = async (e: FormEvent) => {
    e.preventDefault();
    const pruefung = pruefe(felder);
    setFeldFehler(pruefung);
    if (Object.values(pruefung).some(Boolean)) return;
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
          name: felder.name.trim(),
          email: felder.email.trim(),
          password: felder.passwort,
          turnstileToken,
          herkunft: leseHerkunft(),
        }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (res.ok && json?.ok) {
        setPhase("bestaetigen");
        return;
      }
      const code = json?.error;
      if (code === "schon_registriert") {
        setServerFehler(
          <>
            {registrierung.schonRegistriert}{" "}
            <Box as="a" href="/login" color="var(--cc-gold-light)" textDecoration="underline">
              Zum Login
            </Box>
          </>,
        );
      } else if (code === "turnstile") setServerFehler(registrierung.fehler.turnstile);
      else if (code === "zu_oft") setServerFehler(registrierung.fehler.zuOft);
      else setServerFehler(registrierung.fehler.server);
      // Ein verbrauchtes Turnstile-Token gilt nicht noch einmal.
      if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
      setTurnstileToken(null);
    } catch {
      setServerFehler(registrierung.fehler.server);
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
        <ModalContent {...funnelModalContentProps} aria-label={registrierung.modalTitel} maxW="520px" my={{ base: 3, md: 10 }}>
          <Box px={{ base: 5, md: 8 }} pt={{ base: 5, md: 6 }} pb={2}>
            <FunnelModalTopBar label={registrierung.modalTitel} onClose={schliesse} />
          </Box>
          <ModalBody px={{ base: 5, md: 8 }} pt={3} pb={{ base: 6, md: 8 }}>
            {phase === "bestaetigen" ? (
              <Stack spacing={4} align="center" textAlign="center" role="status" py={4}>
                <Box color="var(--cc-gold-light)">
                  <MailCheck size={44} strokeWidth={1.5} aria-hidden />
                </Box>
                <FunnelHeadline as="h2" scale="sm">
                  {registrierung.bestaetigenTitel}
                </FunnelHeadline>
                <Text fontSize="15px" lineHeight={1.65} color="var(--cc-text-2)">
                  {registrierung.bestaetigenText.replace("{email}", felder.email.trim())}
                </Text>
                <Button variant="line" onClick={schliesse}>
                  Schließen
                </Button>
              </Stack>
            ) : (
              <Box as="form" onSubmit={absenden} noValidate>
                <Stack spacing={5}>
                  <Stack spacing={2}>
                    <FunnelHeadline as="h2" scale="sm">
                      {registrierung.headline}
                    </FunnelHeadline>
                    <FunnelLead fontSize="14px">{registrierung.text}</FunnelLead>
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
                        value={felder[feld.key]}
                        onChange={(e) => setze(feld.key, e.target.value)}
                        h="52px"
                        fontSize="16px"
                      />
                      {feldFehler[feld.key] ? (
                        <FormErrorMessage {...funnelErrorProps}>{feldFehler[feld.key]}</FormErrorMessage>
                      ) : null}
                    </FormControl>
                  ))}

                  {siteKey ? <Box ref={widgetBox} /> : null}
                  {serverFehler ? <FunnelAlert>{serverFehler}</FunnelAlert> : null}

                  <Button
                    type="submit"
                    variant="gold"
                    w="full"
                    minH="52px"
                    fontSize="16px"
                    isLoading={laeuft}
                    loadingText={registrierung.laeuft}
                    rightIcon={<ArrowRight size={18} strokeWidth={2} />}
                  >
                    {registrierung.knopf}
                  </Button>
                  <FunnelFinePrint textAlign="center">
                    {registrierung.einwilligung}{" "}
                    <Box as="a" href="/datenschutz" target="_blank" color="var(--cc-text-2)" textDecoration="underline">
                      Datenschutzerklärung
                    </Box>
                  </FunnelFinePrint>
                  <Text fontSize="13px" color="var(--cc-text-3)" textAlign="center">
                    Schon registriert?{" "}
                    <Box as="a" href="/login" color="var(--cc-gold-light)">
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

/** Hauptaktion der Landing: öffnet die Registrierung. */
export function TrainingStartKnopf({ children, ...props }: ButtonProps) {
  const r = useRegistrierung();
  return (
    <Button
      type="button"
      variant="gold"
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
