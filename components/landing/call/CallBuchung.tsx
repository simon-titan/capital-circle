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
  Stack,
  Text,
} from "@chakra-ui/react";
import { ArrowDown, ArrowUp, CalendarDays } from "lucide-react";
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
import { buchung } from "@/config/call-funnel";
import { DISCORD_FUNNEL_QUESTIONS } from "@/config/discord-funnel-questions";
import { CalendlyZweiKlick } from "@/components/marketing/CalendlyZweiKlick";
import { EMAIL_RE, RadioStep, type ContactValue } from "@/components/marketing/DiscordQuestionsModal";
import {
  CardLabel,
  FunnelAlert,
  FunnelFinePrint,
  FunnelHeadline,
  FunnelLead,
  FunnelProgress,
  FunnelStepIndicator,
  SuccessMark,
  funnelBackButtonProps,
  funnelErrorProps,
  funnelFieldProps,
  funnelHelperProps,
  funnelLabelProps,
  noMotion,
} from "@/components/marketing/funnel-ui";
import { CALL_LEAD_SOURCE, readCallTracking, scrolleZu } from "./call-ui";

/**
 * Fragebogen und Terminbuchung inline auf `/call`.
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
 * ── Zwei Instanzen, ein Zustand ─────────────────────────────────────────────
 *
 * Der Baustein steht zweimal auf der Seite (nach dem Video und am Ende). Beide
 * lesen denselben Zustand aus `CallBuchungProvider`: Wer oben anfängt und
 * unten weitermacht, findet dort denselben Schritt mit denselben Antworten,
 * und der Lead wird nur einmal angelegt. Jede Instanz liegt in einem eigenen
 * `<form>` — Radios mit gleichem `name` gruppiert der Browser sonst über die
 * ganze Seite, und ein Klick unten würde oben die Auswahl löschen.
 *
 * Der Kalender lädt nur in **einer** Instanz — der, in der zuletzt getippt
 * oder geklickt wurde (`aktiv`). Zwei eingebettete Calendly-Widgets wären zwei
 * Verbindungen in die USA und zwei Stellen, an denen gebucht werden kann. Die
 * andere zeigt einen kurzen Hinweis mit Sprunglink.
 *
 * ── Vorschau ────────────────────────────────────────────────────────────────
 *
 * Mit `vorschau` (Route `/vorschau/mentoring/call`) läuft der Ablauf komplett
 * durch, schickt aber nichts ab: kein Lead, keine Antworten, kein Calendly.
 * So kann Emre die Seite durchklicken, ohne die Funnel-Auswertung zu verfälschen.
 */

type Phase = "kontakt" | "fragen" | "kalender" | "gebucht";
type FeldFehler = Partial<Record<keyof ContactValue, string>>;

/** Sprungmarken der beiden Instanzen; die erste ist zugleich das Ziel der Hauptaktion. */
export const BUCHUNG_IDS = { oben: "termin", unten: "termin-abschluss" } as const;
export type BuchungId = (typeof BUCHUNG_IDS)[keyof typeof BUCHUNG_IDS];

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
  aktiv: BuchungId | null;
  calendlyUrl: string;
  setKontakt: (patch: Partial<ContactValue>) => void;
  /** `weiterNach`: per Klick/Tipp gewählt — dann geht es von selbst zur nächsten Frage. */
  waehle: (antwort: string, weiterNach?: boolean) => void;
  weiter: () => Promise<void>;
  zurueck: () => void;
  aktiviere: (id: BuchungId) => void;
  /** Scrollt zur Instanz, in der der Nutzer gerade ist (sonst zur oberen). */
  springen: () => void;
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
  const [aktiv, setAktiv] = useState<BuchungId | null>(null);

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

  // Während der Kalender offen ist, bleibt er, wo er ist: Ein Wechsel der
  // aktiven Instanz würde das Widget hier ab- und dort neu aufbauen.
  const aktiviere = useCallback(
    (id: BuchungId) => {
      if (phase === "kontakt" || phase === "fragen") setAktiv(id);
    },
    [phase],
  );

  const springen = useCallback(() => {
    scrolleZu(document.getElementById(aktiv ?? BUCHUNG_IDS.oben));
  }, [aktiv]);

  const weiter = useCallback(async () => {
    setServerFehler(null);

    if (phase === "kontakt") {
      const pruefung = pruefeKontakt(kontakt);
      setFeldFehler(pruefung);
      if (Object.keys(pruefung).length > 0) {
        // Fokus aufs erste fehlerhafte Feld der aktiven Instanz, damit Screenreader den Fehler vorlesen.
        const erstes = (["name", "email", "phone"] as const).find((k) => pruefung[k]);
        if (erstes) document.querySelector<HTMLInputElement>(`[data-call-feld="${erstes}"][data-aktiv="true"]`)?.focus();
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
      setAktiv((a) => a ?? BUCHUNG_IDS.oben);
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
      // Kalender in der Instanz öffnen, in der gerade geklickt wurde.
      setAktiv((a) => a ?? BUCHUNG_IDS.oben);
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
      aktiv,
      calendlyUrl,
      setKontakt,
      waehle,
      weiter,
      zurueck,
      aktiviere,
      springen,
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
      aktiv,
      calendlyUrl,
      setKontakt,
      waehle,
      weiter,
      zurueck,
      aktiviere,
      springen,
    ],
  );

  return <BuchungContext.Provider value={api}>{children}</BuchungContext.Provider>;
}

/* ─────────────────────────── Instanz ─────────────────────────── */

/**
 * Eine Instanz des Buchungsbausteins. `id` ist zugleich die Sprungmarke.
 * Die Karte ist eine Hero-Karte (DESIGN.md: „Hero-for-Next-Step" — die
 * Bewerbungsaufforderung ist genau so ein nächster Schritt).
 */
export function CallBuchung({ id, hero = true }: { id: BuchungId; hero?: boolean }) {
  const b = useCallBuchung();
  const ref = useRef<HTMLDivElement>(null);
  const hier = b.aktiv === id;
  const kalenderHier = b.phase === "kalender" && (hier || b.aktiv === null);

  // Beim Schrittwechsel die Karte wieder ins Bild holen, falls ihr Kopf nach
  // oben aus dem Bild gerutscht ist (mobil: lange Optionsliste, Knopf ganz
  // unten). Beim Öffnen des Kalenders immer, der ist deutlich höher.
  // Nur bei einem echten Schrittwechsel: Wird die Instanz bloß aktiv (erster
  // Tipp hinein), darf nichts springen — sonst rutscht der Knopf unter dem
  // Finger weg, bevor der Klick ankommt.
  const vorher = useRef({ phase: b.phase, frageIndex: b.frageIndex });
  useEffect(() => {
    const alt = vorher.current;
    vorher.current = { phase: b.phase, frageIndex: b.frageIndex };
    if (alt.phase === b.phase && alt.frageIndex === b.frageIndex) return;
    if (!hier || !ref.current) return;
    if (b.phase === "kalender" || ref.current.getBoundingClientRect().top < 0) scrolleZu(ref.current);
  }, [b.phase, b.frageIndex, hier]);

  const markiere = () => b.aktiviere(id);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    b.aktiviere(id);
    void b.weiter();
  };

  return (
    <Box
      ref={ref}
      id={id}
      className={hero ? "cc-card cc-card--hero cc-card--still" : "cc-card cc-card--still"}
      w="full"
      maxW="760px"
      mx="auto"
      scrollMarginTop="24px"
      onFocusCapture={markiere}
      onPointerDownCapture={markiere}
    >
      {b.phase === "gebucht" ? (
        <Gebucht />
      ) : b.phase === "kalender" ? (
        kalenderHier ? (
          <Kalender url={b.calendlyUrl} vorschau={b.vorschau} />
        ) : (
          <KalenderAnderswo zielId={b.aktiv ?? BUCHUNG_IDS.oben} eigeneId={id} />
        )
      ) : (
        <Box as="form" onSubmit={onSubmit} noValidate p={{ base: 5, md: 8 }}>
          <Formular hier={hier || b.aktiv === null} />
        </Box>
      )}
    </Box>
  );
}

/** Kontakt- bzw. Frageschritt mit Kopf (Label, Schrittzähler, Balken) und Fuß (Weiter, Zurück). */
function Formular({ hier }: { hier: boolean }) {
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
        {/* Kein Überschriften-Element: Die Frage darunter ist die Überschrift (h2). */}
        <CardLabel hero>{imKontakt ? t.labelKontakt : t.labelFragen}</CardLabel>
        <FunnelStepIndicator current={schritt} total={SCHRITTE_GESAMT} unit="Schritt" />
        <FunnelProgress value={(schritt / SCHRITTE_GESAMT) * 100} label="Fortschritt der Einordnung" />
      </Stack>

      <Box
        key={imKontakt ? "kontakt" : `frage-${b.frageIndex}`}
        sx={{ animation: "appStepEnter 0.3s cubic-bezier(0.16,1,0.3,1)", ...noMotion }}
      >
        {imKontakt ? (
          <KontaktSchritt hier={hier} />
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

/**
 * Name, E-Mail, Telefon mit sichtbarer Beschriftung und Fehler je Feld.
 * `hier` markiert die Instanz, in der zuletzt gearbeitet wurde — dorthin geht
 * der Fokus, wenn ein Feld fehlt (die Felder stehen zweimal auf der Seite).
 */
function KontaktSchritt({ hier }: { hier: boolean }) {
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
                data-aktiv={hier ? "true" : "false"}
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
 * Calendly in der aktiven Instanz. Lädt sofort: Die Einwilligung war der Klick
 * auf „Weiter zum Kalender", der Hinweis dazu stand direkt darüber.
 */
function Kalender({ url, vorschau }: { url: string; vorschau: boolean }) {
  const t = buchung.karte;
  return (
    <Box>
      <Stack spacing={2} px={{ base: 5, md: 8 }} pt={{ base: 6, md: 8 }} pb={5} textAlign="center" align="center">
        <FunnelHeadline as="h3" scale="md">
          {t.kalenderTitel}
        </FunnelHeadline>
        <Text fontSize="15px" lineHeight={1.6} color="var(--cc-text-2)" maxW="520px">
          {t.kalenderText}
        </Text>
      </Stack>
      {/* Innerer Clip, damit die Gold-Kante (::before) der Karte sichtbar bleibt. */}
      <Box position="relative" borderBottomRadius="11px" overflow="hidden" borderTop="1px solid var(--cc-line)">
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

/** Zweite Instanz, während der Kalender in der anderen offen ist. */
function KalenderAnderswo({ zielId, eigeneId }: { zielId: BuchungId; eigeneId: BuchungId }) {
  const t = buchung.karte;
  // Die obere Instanz steht vor der unteren im Dokument — daran hängt die Pfeilrichtung.
  const nachOben = zielId === BUCHUNG_IDS.oben && eigeneId === BUCHUNG_IDS.unten;
  return (
    <Flex direction="column" align="center" textAlign="center" gap={4} p={{ base: 6, md: 8 }} role="status">
      <Text fontSize={{ base: "17px", md: "19px" }} fontWeight={600} color="var(--cc-text)">
        {t.anderswoTitel}
      </Text>
      <Button
        as="a"
        href={`#${zielId}`}
        variant="line"
        rightIcon={nachOben ? <ArrowUp size={16} strokeWidth={1.75} /> : <ArrowDown size={16} strokeWidth={1.75} />}
        onClick={(e: React.MouseEvent) => {
          e.preventDefault();
          scrolleZu(document.getElementById(zielId));
        }}
      >
        {t.anderswoLink}
      </Button>
    </Flex>
  );
}

/** Bestätigung nach `calendly.event_scheduled` — in beiden Instanzen. */
function Gebucht() {
  const t = buchung.karte;
  return (
    <Stack spacing={5} align="center" textAlign="center" p={{ base: 7, md: 10 }} role="status">
      <SuccessMark size={64} />
      <FunnelHeadline as="h3" scale="md">
        {t.gebuchtTitel}
      </FunnelHeadline>
      <Text fontSize={{ base: "15px", md: "16px" }} lineHeight={1.7} color="var(--cc-text-soft)" maxW="520px">
        {t.gebuchtText}
      </Text>
    </Stack>
  );
}
