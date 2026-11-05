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
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  Stack,
  Text,
  type ButtonProps,
} from "@chakra-ui/react";
import { ArrowRight, CalendarDays, Check } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { buchung, ctaLabel } from "@/config/call-funnel";
import { DISCORD_FUNNEL_QUESTIONS } from "@/config/discord-funnel-questions";
import { CalendlyZweiKlick } from "@/components/marketing/CalendlyZweiKlick";
import { EMAIL_RE, RadioStep, type ContactValue } from "@/components/marketing/DiscordQuestionsModal";
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
  noMotion,
} from "@/components/marketing/funnel-ui";
import { CALL_LEAD_SOURCE, readCallTracking } from "./call-ui";

/**
 * Fragebogen und Terminbuchung auf `/call` — als Modal.
 *
 * ── Ablauf ──────────────────────────────────────────────────────────────────
 *
 * Kontakt (Name, E-Mail, Telefon) → sechs Fragen (eine je Schritt) → Calendly
 * → Bestätigung. Dieselben APIs wie das Popup auf `/termin`:
 * `/api/discord-funnel/lead` legt den Lead an (ohne Discord-Invite,
 * `source_origin: "call_funnel"`), `/api/discord-funnel/questions` speichert
 * die Antworten. Die Schritt-Komponenten kommen aus `DiscordQuestionsModal`.
 * Anders als dort gibt es **kein** Warn-Overlay mit Countdown: Die Seite soll
 * einladen, nicht abschrecken.
 *
 * ── Ein Modal, viele Knöpfe ─────────────────────────────────────────────────
 *
 * Auf der Seite stehen nur Knöpfe (`CallBuchungKnopf`), die alle dasselbe
 * Modal öffnen. Der Zustand liegt im `CallBuchungProvider`, nicht im Modal:
 * Wer es schließt und später wieder öffnet, landet im selben Schritt mit
 * denselben Antworten, und der Lead wird nur einmal angelegt. Ältere Links auf
 * `/call#termin` öffnen das Modal direkt.
 *
 * Während der Kalender offen ist, schließt ein Klick neben das Modal es nicht —
 * ein versehentlicher Tipp daneben würde mitten in der Terminwahl das Widget
 * abbauen. Schließen geht dort über das X oder Escape.
 *
 * ── Vorschau ────────────────────────────────────────────────────────────────
 *
 * Mit `vorschau` (Route `/vorschau/mentoring/call`) läuft der Ablauf komplett
 * durch, schickt aber nichts ab: kein Lead, keine Antworten, kein Calendly.
 * So kann Emre die Seite durchklicken, ohne die Funnel-Auswertung zu verfälschen.
 */

type Phase = "kontakt" | "fragen" | "kalender" | "gebucht";
type FeldFehler = Partial<Record<keyof ContactValue, string>>;

/** Sprungmarken, unter denen `/call` früher die Buchungskarten hatte — sie öffnen jetzt das Modal. */
const ALTE_SPRUNGMARKEN = ["#termin", "#termin-abschluss"];

interface BuchungApi {
  phase: Phase;
  kontakt: ContactValue;
  frageIndex: number;
  antworten: Record<string, string>;
  leadToken: string | null;
  vorschau: boolean;
  feldFehler: FeldFehler;
  fehler: string | null;
  serverFehler: string | null;
  laeuft: boolean;
  calendlyUrl: string;
  offen: boolean;
  oeffne: () => void;
  schliesse: () => void;
  setKontakt: (patch: Partial<ContactValue>) => void;
  /** `weiterNach`: per Klick/Tipp gewählt — dann geht es von selbst zur nächsten Frage. */
  waehle: (antwort: string, weiterNach?: boolean) => void;
  weiter: () => Promise<void>;
  zurueck: () => void;
}

const BuchungContext = createContext<BuchungApi | null>(null);

export function useCallBuchung(): BuchungApi {
  const ctx = useContext(BuchungContext);
  if (!ctx) throw new Error("useCallBuchung braucht <CallBuchungProvider>");
  return ctx;
}

const FRAGEN = DISCORD_FUNNEL_QUESTIONS;
/** Kontakt zählt als Schritt 1, danach eine Frage je Schritt. */
const SCHRITTE_GESAMT = FRAGEN.length + 1;

function leereAntworten(): Record<string, string> {
  const init: Record<string, string> = {};
  for (const q of FRAGEN) init[q.id] = "";
  return init;
}

/**
 * Calendly-Adresse, gebaut wie in `DiscordDankeClient`.
 *
 * Basis: `NEXT_PUBLIC_CALL_CALENDLY_URL` (eigener Event für den Call-Funnel),
 * Rückfall auf den Discord-Funnel-Event, dann auf die feste Adresse.
 *
 * **`utm_medium=discord` ist kein Versehen.** Genau daran erkennt der Webhook
 * (`app/api/integrations/calendly/webhook/route.ts`) eine Buchung aus den
 * Funnel-Leads (`discord_leads`) und löst den Lead über `utm_content` = Token
 * auf. Mit einem anderen Wert liefe die Buchung in den Zweig für
 * `/bewerbung` und fände dort keinen Nutzer — der Lead bliebe „nicht gebucht".
 * Die Herkunft `/call` steckt in `utm_campaign=call` und in
 * `discord_leads.source_origin`.
 */
function baueCalendlyUrl(token: string | null, kontakt: ContactValue): string {
  const basis =
    process.env.NEXT_PUBLIC_CALL_CALENDLY_URL?.trim() ||
    process.env.NEXT_PUBLIC_DISCORD_CALENDLY_URL?.trim() ||
    "https://calendly.com/contact-capitalcircletrading/capital-circle";
  try {
    const url = new URL(basis);
    url.searchParams.set("utm_source", "capital-circle");
    url.searchParams.set("utm_medium", "discord");
    url.searchParams.set("utm_campaign", "call");
    if (token) url.searchParams.set("utm_content", token);
    const vorname = kontakt.name.trim().split(/\s+/)[0];
    if (vorname) url.searchParams.set("first_name", vorname);
    if (kontakt.email.trim()) url.searchParams.set("email", kontakt.email.trim());
    return url.toString();
  } catch {
    return "";
  }
}

/** Fehler je Kontaktfeld; leer, wenn alles passt. */
function pruefeKontakt(k: ContactValue): FeldFehler {
  const f = buchung.karte.felder;
  const fehler: FeldFehler = {};
  if (!k.name.trim()) fehler.name = f.name.fehler;
  if (!EMAIL_RE.test(k.email.trim())) fehler.email = f.email.fehler;
  if (!k.phone.trim()) fehler.phone = f.phone.fehler;
  return fehler;
}

export function CallBuchungProvider({ children, vorschau = false }: { children: ReactNode; vorschau?: boolean }) {
  const t = buchung.karte;
  const [phase, setPhase] = useState<Phase>("kontakt");
  const [kontakt, setKontaktState] = useState<ContactValue>({ name: "", email: "", phone: "" });
  const [frageIndex, setFrageIndex] = useState(0);
  const [antworten, setAntworten] = useState<Record<string, string>>(leereAntworten);
  const [leadToken, setLeadToken] = useState<string | null>(null);
  const [feldFehler, setFeldFehler] = useState<FeldFehler>({});
  const [fehler, setFehler] = useState<string | null>(null);
  const [serverFehler, setServerFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [offen, setOffen] = useState(false);

  const oeffne = useCallback(() => setOffen(true), []);
  const schliesse = useCallback(() => setOffen(false), []);

  // Alte Links (Anzeigen, Mails) zeigen noch auf die Sprungmarken der früheren Inline-Karten.
  useEffect(() => {
    if (ALTE_SPRUNGMARKEN.includes(window.location.hash)) setOffen(true);
  }, []);

  // Ein Feld verliert seinen Fehler, sobald darin getippt wird — die übrigen
  // bleiben stehen, bis erneut abgeschickt wird.
  const setKontakt = useCallback((patch: Partial<ContactValue>) => {
    setKontaktState((k) => ({ ...k, ...patch }));
    setFeldFehler((f) => {
      const rest = { ...f };
      for (const key of Object.keys(patch) as (keyof ContactValue)[]) delete rest[key];
      return rest;
    });
    setFehler(null);
  }, []);

  /*
    Automatisch weiter nach einer Auswahl — aber nur per Klick oder Tipp und
    nie auf der letzten Frage. Mit der Tastatur wandern die Pfeiltasten durch
    die Optionen und wählen dabei jede einzeln aus; spränge die Karte schon
    beim ersten Pfeil weiter, käme niemand zur zweiten Option. Die letzte
    Frage lädt mit „Weiter zum Kalender" Calendly, und dieser Klick ist die
    Einwilligung — die darf nicht nebenbei passieren.
  */
  const [autoWeiter, setAutoWeiter] = useState(false);

  const waehle = useCallback(
    (antwort: string, weiterNach = false) => {
      const frage = FRAGEN[frageIndex];
      if (!frage) return;
      setAntworten((a) => ({ ...a, [frage.id]: antwort }));
      setFehler(null);
      if (weiterNach && frageIndex < FRAGEN.length - 1) setAutoWeiter(true);
    },
    [frageIndex],
  );

  const weiter = useCallback(async () => {
    setServerFehler(null);

    if (phase === "kontakt") {
      const pruefung = pruefeKontakt(kontakt);
      setFeldFehler(pruefung);
      if (Object.keys(pruefung).length > 0) {
        // Fokus aufs erste fehlerhafte Feld, damit Screenreader den Fehler vorlesen.
        const erstes = (["name", "email", "phone"] as const).find((k) => pruefung[k]);
        if (erstes) document.querySelector<HTMLInputElement>(`[data-call-feld="${erstes}"]`)?.focus();
        return;
      }
      setFehler(null);
      if (vorschau) {
        setFrageIndex(0);
        setPhase("fragen");
        return;
      }
      setLaeuft(true);
      try {
        const tracking = readCallTracking();
        const res = await fetch("/api/discord-funnel/lead", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: kontakt.name.trim(),
            email: kontakt.email.trim(),
            phone: kontakt.phone.trim(),
            session_id: tracking.session_id,
            utm_source: tracking.utm_source ?? CALL_LEAD_SOURCE,
            utm_medium: tracking.utm_medium,
            utm_campaign: tracking.utm_campaign,
            utm_content: tracking.utm_content,
            utm_term: tracking.utm_term,
            referrer: tracking.referrer,
            source_origin: "call_funnel",
            // Cold Traffic ohne Discord-Bezug: keine Invite-Mail.
            skip_invite: true,
          }),
        });
        const json = (await res.json().catch(() => null)) as { ok?: boolean; token?: string } | null;
        if (!res.ok || !json?.ok || !json.token) {
          setServerFehler(t.fehlerServer);
          return;
        }
        // Die API ist idempotent (E-Mail + Session): Zurück zum Kontakt und
        // erneut „Weiter" liefert denselben Token, keinen zweiten Lead.
        setLeadToken(json.token);
        setFrageIndex(0);
        setPhase("fragen");
      } catch {
        setServerFehler(t.fehlerVerbindung);
      } finally {
        setLaeuft(false);
      }
      return;
    }

    if (phase !== "fragen") return;

    const frage = FRAGEN[frageIndex];
    if (!frage || !frage.options.includes(antworten[frage.id] ?? "")) {
      setFehler(t.fehlerAuswahl);
      return;
    }
    setFehler(null);

    if (frageIndex < FRAGEN.length - 1) {
      setFrageIndex((i) => i + 1);
      return;
    }

    if (vorschau) {
      setPhase("kalender");
      return;
    }

    setLaeuft(true);
    try {
      const res = await fetch("/api/discord-funnel/questions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: leadToken, answers: antworten }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (!res.ok || !json?.ok) {
        setServerFehler(t.fehlerServer);
        return;
      }
      setPhase("kalender");
    } catch {
      setServerFehler(t.fehlerVerbindung);
    } finally {
      setLaeuft(false);
    }
  }, [phase, kontakt, vorschau, frageIndex, antworten, leadToken, t]);

  // Kurz stehen lassen, damit die gewählte Option sichtbar aufleuchtet, bevor die nächste Frage kommt.
  useEffect(() => {
    if (!autoWeiter) return;
    const timer = setTimeout(() => {
      setAutoWeiter(false);
      void weiter();
    }, 280);
    return () => clearTimeout(timer);
  }, [autoWeiter, weiter]);

  const zurueck = useCallback(() => {
    setAutoWeiter(false);
    setFehler(null);
    setServerFehler(null);
    if (phase !== "fragen") return;
    if (frageIndex > 0) setFrageIndex((i) => i - 1);
    else setPhase("kontakt");
  }, [phase, frageIndex]);

  // Buchung im eingebetteten Calendly → Bestätigung (wie auf `/termin/danke`).
  useEffect(() => {
    if (phase !== "kalender") return;
    const meldung = (e: MessageEvent) => {
      // Nur Calendly selbst darf die Buchung melden, nicht irgendein anderer Frame.
      if (!/^https:\/\/([a-z0-9-]+\.)?calendly\.com$/.test(e.origin)) return;
      if (typeof e.data !== "object" || e.data === null) return;
      if ((e.data as { event?: unknown }).event === "calendly.event_scheduled") setPhase("gebucht");
    };
    window.addEventListener("message", meldung);
    return () => window.removeEventListener("message", meldung);
  }, [phase]);

  const calendlyUrl = useMemo(() => baueCalendlyUrl(leadToken, kontakt), [leadToken, kontakt]);

  const api = useMemo<BuchungApi>(
    () => ({
      phase,
      kontakt,
      frageIndex,
      antworten,
      leadToken,
      vorschau,
      feldFehler,
      fehler,
      serverFehler,
      laeuft,
      calendlyUrl,
      offen,
      oeffne,
      schliesse,
      setKontakt,
      waehle,
      weiter,
      zurueck,
    }),
    [
      phase,
      kontakt,
      frageIndex,
      antworten,
      leadToken,
      vorschau,
      feldFehler,
      fehler,
      serverFehler,
      laeuft,
      calendlyUrl,
      offen,
      oeffne,
      schliesse,
      setKontakt,
      waehle,
      weiter,
      zurueck,
    ],
  );

  return (
    <BuchungContext.Provider value={api}>
      {children}
      <CallBuchungModal />
    </BuchungContext.Provider>
  );
}

/* ─────────────────────────── Knopf ─────────────────────────── */

/**
 * Hauptaktion der Seite — öffnet das Buchungs-Modal. Nach der Buchung sagt der
 * Knopf das auch und öffnet die Bestätigung, statt erneut „sichern" anzubieten.
 */
export function CallBuchungKnopf(props: ButtonProps) {
  const b = useCallBuchung();
  const gebucht = b.phase === "gebucht";
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
      whiteSpace="normal"
      aria-haspopup="dialog"
      rightIcon={gebucht ? <Check size={18} strokeWidth={2} /> : <ArrowRight size={18} strokeWidth={2} />}
      onClick={b.oeffne}
      {...props}
    >
      {gebucht ? buchung.karte.gebuchtKnopf : ctaLabel}
    </Button>
  );
}

/* ─────────────────────────── Modal ─────────────────────────── */

function CallBuchungModal() {
  const b = useCallBuchung();
  const t = buchung.karte;
  const koerper = useRef<HTMLDivElement>(null);

  // Jeder Schritt beginnt oben — mobil steht der Knopf unter einer langen Optionsliste.
  useEffect(() => {
    koerper.current?.scrollTo({ top: 0 });
  }, [b.phase, b.frageIndex]);

  const label =
    b.phase === "kontakt"
      ? t.labelKontakt
      : b.phase === "fragen"
        ? t.labelFragen
        : b.phase === "kalender"
          ? t.labelKalender
          : t.labelGebucht;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void b.weiter();
  };

  return (
    <Modal
      isOpen={b.offen}
      onClose={b.schliesse}
      size="xl"
      scrollBehavior="inside"
      isCentered
      closeOnOverlayClick={b.phase !== "kalender"}
    >
      <ModalOverlay {...funnelOverlayProps} />
      {/* Kein ModalHeader: Der setzt `aria-labelledby` auf die kleine Kopfzeile — das Modal heißt aber `modalTitel`. */}
      <ModalContent
        {...funnelModalContentProps}
        aria-label={t.modalTitel}
        maxW={b.phase === "kalender" ? "760px" : "620px"}
        maxH={{ base: "calc(100% - 24px)", md: "calc(100% - 80px)" }}
        my={{ base: 3, md: 10 }}
      >
        <Box px={{ base: 5, md: 8 }} pt={{ base: 5, md: 6 }} pb={2} flexShrink={0}>
          <FunnelModalTopBar label={label} onClose={b.schliesse} />
        </Box>
        <ModalBody ref={koerper} p={0}>
          {b.phase === "gebucht" ? (
            <Gebucht />
          ) : b.phase === "kalender" ? (
            <Kalender url={b.calendlyUrl} vorschau={b.vorschau} />
          ) : (
            <Box as="form" onSubmit={onSubmit} noValidate px={{ base: 5, md: 8 }} pt={3} pb={{ base: 6, md: 8 }}>
              <Formular />
            </Box>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

/** Kontakt- bzw. Frageschritt mit Kopf (Schrittzähler, Balken) und Fuß (Weiter, Zurück). */
function Formular() {
  const b = useCallBuchung();
  const t = buchung.karte;
  const imKontakt = b.phase === "kontakt";
  const frage = FRAGEN[b.frageIndex];
  const schritt = imKontakt ? 1 : b.frageIndex + 2;
  const letzte = !imKontakt && b.frageIndex === FRAGEN.length - 1;
  // Wurde die Option angeklickt/angetippt? Ein Klick auf das Label kommt vor dem
  // `change` des Radios an; Pfeiltasten und Leertaste lösen keinen Label-Klick
  // mit `detail > 0` aus und bleiben deshalb ohne Auto-Weiter.
  const perZeiger = useRef(false);

  return (
    <Stack spacing={6}>
      <Stack spacing={4}>
        <FunnelStepIndicator current={schritt} total={SCHRITTE_GESAMT} unit="Schritt" />
        <FunnelProgress value={(schritt / SCHRITTE_GESAMT) * 100} label="Fortschritt der Einordnung" />
      </Stack>

      <Box
        key={imKontakt ? "kontakt" : `frage-${b.frageIndex}`}
        sx={{ animation: "appStepEnter 0.3s cubic-bezier(0.16,1,0.3,1)", ...noMotion }}
      >
        {imKontakt ? (
          <KontaktSchritt />
        ) : frage ? (
          <Box
            onClickCapture={(e) => {
              if (e.detail > 0 && (e.target as HTMLElement).closest("label")) perZeiger.current = true;
            }}
            // Klick auf die schon gewählte Option löst kein `change` aus — sonst nähme der nächste Pfeil die Markierung mit.
            onKeyDownCapture={() => {
              perZeiger.current = false;
            }}
          >
            <RadioStep
              question={{ ...frage, question: t.fragen[frage.id] ?? frage.question }}
              value={b.antworten[frage.id] ?? ""}
              onChange={(antwort) => {
                b.waehle(antwort, perZeiger.current);
                perZeiger.current = false;
              }}
              error={b.fehler}
            />
          </Box>
        ) : null}
        {b.serverFehler ? <FunnelAlert mt={4}>{b.serverFehler}</FunnelAlert> : null}
      </Box>

      <Stack spacing={3}>
        {/* Nie gesperrt: Ein grauer Knopf sagt nicht, was fehlt — der Klick zeigt es am Feld. */}
        <Button
          type="submit"
          variant="gold"
          w="full"
          minH="52px"
          fontSize="16px"
          isLoading={b.laeuft}
          loadingText={t.speichert}
          leftIcon={letzte ? <CalendarDays size={18} strokeWidth={2} /> : undefined}
        >
          {letzte ? t.abschicken : t.weiter}
        </Button>
        {!imKontakt ? (
          <Button {...funnelBackButtonProps} type="button" onClick={b.zurueck}>
            {t.zurueck}
          </Button>
        ) : null}
        <FunnelFinePrint textAlign="center">
          {letzte ? `${t.kalenderEinwilligung} Mehr dazu in der ` : "Mit dem Absenden stimmst du unserer "}
          <Box
            as="a"
            href={letzte ? "/datenschutz#bewerbungen" : "/datenschutz"}
            target="_blank"
            color="var(--cc-text-2)"
            textDecoration="underline"
            textUnderlineOffset="2px"
          >
            Datenschutzerklärung
          </Box>
          {letzte ? "." : " zu."}
        </FunnelFinePrint>
      </Stack>
    </Stack>
  );
}

/** Name, E-Mail, Telefon mit sichtbarer Beschriftung und Fehler je Feld. */
function KontaktSchritt() {
  const b = useCallBuchung();
  const f = buchung.karte.felder;
  const felder = [
    { key: "name", type: "text", autoComplete: "name", inputMode: "text", hinweis: null, ...f.name },
    { key: "email", type: "email", autoComplete: "email", inputMode: "email", hinweis: null, ...f.email },
    { key: "phone", type: "tel", autoComplete: "tel", inputMode: "tel", ...f.phone },
  ] as const;

  return (
    <Stack spacing={5}>
      <Stack spacing={2}>
        <FunnelHeadline as="h2" scale="sm">
          Wohin dürfen wir deine Termin-Bestätigung schicken?
        </FunnelHeadline>
        <FunnelLead fontSize="14px">Trag deine Daten ein. Danach beantwortest du noch ein paar kurze Fragen.</FunnelLead>
      </Stack>

      <Stack spacing={4}>
        {felder.map((feld) => {
          const fehler = b.feldFehler[feld.key];
          return (
            <FormControl key={feld.key} isInvalid={Boolean(fehler)} isRequired>
              <FormLabel {...funnelLabelProps} mb={1.5}>
                {feld.label}
              </FormLabel>
              <Input
                {...funnelFieldProps}
                type={feld.type}
                name={feld.key}
                inputMode={feld.inputMode}
                autoComplete={feld.autoComplete}
                placeholder={feld.placeholder}
                value={b.kontakt[feld.key]}
                onChange={(e) => b.setKontakt({ [feld.key]: e.target.value })}
                data-call-feld={feld.key}
                h="52px"
                fontSize="16px"
              />
              {fehler ? (
                <FormErrorMessage {...funnelErrorProps}>{fehler}</FormErrorMessage>
              ) : feld.hinweis ? (
                <FormHelperText {...funnelHelperProps}>{feld.hinweis}</FormHelperText>
              ) : null}
            </FormControl>
          );
        })}
      </Stack>
    </Stack>
  );
}

/**
 * Calendly im Modal. Lädt sofort: Die Einwilligung war der Klick auf
 * „Weiter zum Kalender", der Hinweis dazu stand direkt darüber.
 */
function Kalender({ url, vorschau }: { url: string; vorschau: boolean }) {
  const t = buchung.karte;
  return (
    <Box>
      <Stack spacing={2} px={{ base: 5, md: 8 }} pt={3} pb={5} textAlign="center" align="center">
        <FunnelHeadline as="h2" scale="md">
          {t.kalenderTitel}
        </FunnelHeadline>
        <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text-2)" maxW="520px">
          {t.kalenderText}
        </Text>
      </Stack>
      <Box borderTop="1px solid var(--cc-line)">
        {vorschau ? (
          <Flex
            direction="column"
            align="center"
            justify="center"
            textAlign="center"
            gap={3}
            minH="360px"
            px={{ base: 5, md: 10 }}
            py={10}
            bg="var(--cc-surface)"
          >
            <Box color="var(--cc-text-3)" aria-hidden>
              <CalendarDays size={28} strokeWidth={1.5} />
            </Box>
            <Text fontSize="16px" fontWeight={600} color="var(--cc-text)">
              Hier lädt der Calendly-Kalender.
            </Text>
            <Text fontSize="14px" lineHeight={1.6} color="var(--cc-text-2)" maxW="420px">
              In der Vorschau ausgeblendet, damit keine Testtermine entstehen. Auf der echten Seite wählt der Besucher
              hier seinen Termin.
            </Text>
          </Flex>
        ) : url ? (
          <CalendlyZweiKlick url={url} flaeche="var(--cc-surface)" sofort />
        ) : (
          <Text p={8} textAlign="center" fontSize="14px" color="var(--cc-text-3)">
            {t.keinKalender}
          </Text>
        )}
      </Box>
    </Box>
  );
}

/** Bestätigung nach `calendly.event_scheduled`. */
function Gebucht() {
  const b = useCallBuchung();
  const t = buchung.karte;
  return (
    <Stack spacing={5} align="center" textAlign="center" px={{ base: 6, md: 10 }} pt={4} pb={{ base: 8, md: 10 }} role="status">
      <SuccessMark size={64} />
      <FunnelHeadline as="h2" scale="md">
        {t.gebuchtTitel}
      </FunnelHeadline>
      <Text fontSize={{ base: "15px", md: "16px" }} lineHeight={1.7} color="var(--cc-text-soft)" maxW="520px">
        {t.gebuchtText}
      </Text>
      <Button variant="line" onClick={b.schliesse}>
        {t.schliessen}
      </Button>
    </Stack>
  );
}
