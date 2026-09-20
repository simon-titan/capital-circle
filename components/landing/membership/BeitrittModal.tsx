"use client";

import {
  Box,
  Button,
  HStack,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  Stack,
  Text,
  type ButtonProps,
} from "@chakra-ui/react";
import { ZahlungsIcons } from "./ZahlungsIcons";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  FunnelModalTopBar,
  funnelModalContentProps,
  funnelOverlayProps,
} from "@/components/marketing/funnel-ui";
import { useFunnelTracker } from "@/components/landing/FunnelTracker";
import { ctaLabel, preiskarten, type Preiskarte } from "@/config/landing-membership";
import type { Bauteil } from "@/lib/analytics/kaufweg";
import type { MembershipPlan } from "@/lib/stripe/plan-map";
import { goldCtaSchnitt } from "./membership-ui";

/**
 * Das Beitritts-Modal der Verkaufsseite: Laufzeit wählen, dann in die Kasse.
 *
 * ── Warum ein Modal und kein Sprung auf `#angebot` ─────────────────────────
 * „Capital Circle beitreten" steht an sieben Stellen. Sechs davon — Kopfleiste,
 * Hero, mobiler Balken, Prozess, Für wen, Abschluss — wissen nicht, welche der
 * drei Laufzeiten jemand will, und schickten ihn deshalb bis 09/2026 quer über
 * die Seite zum Angebots-Abschnitt. Dort musste er sich neu orientieren, und
 * der Klick war verpufft. Das Modal stellt dieselbe Frage dort, wo geklickt
 * wurde. Der siebte CTA steht **in** `AngebotSection` unmittelbar unter den
 * Preiskarten; dort ist die Laufzeit bereits gewählt, und ein Modal wäre ein
 * Rückschritt — der bleibt ein Anker in die Kasse.
 *
 * ── Woher die Pakete kommen ────────────────────────────────────────────────
 * Aus `preiskarten` in `config/landing-membership.ts` — derselben Quelle wie
 * die Preiskarten im Angebots-Abschnitt. Wird dort ein Preis geändert, zieht
 * das Modal mit, und die beiden können nicht auseinanderlaufen.
 *
 * ── Der Kaufweg ────────────────────────────────────────────────────────────
 * `/go/<plan>` (siehe `app/go/[plan]/route.ts`) ist die einzige Quelle der
 * Wahrheit für Checkout-Links. `?src=modal` trennt diesen Weg in der Auswertung
 * vom Knopf unter den Preiskarten (`?src=angebot`).
 */

/* ─── Kontext ────────────────────────────────────────────────────────────── */

/**
 * `oeffnen(herkunft)` trägt seit der Kaufweg-Messung (20.09.2026) mit, welcher
 * der sieben Knöpfe den Dialog geöffnet hat. Ohne die Angabe wären alle
 * Öffnungen eine einzige Zahl — und genau die Frage, die zählt („welcher Knopf
 * verkauft?"), bliebe unbeantwortet. Ein Standardwert steht bewusst nicht da:
 * Ein vergessener Aufruf soll beim Tippen auffallen, nicht in der Auswertung.
 */
const BeitrittModalContext = createContext<{ oeffnen: (herkunft: Bauteil) => void } | null>(null);

/** Öffnet das Beitritts-Modal. Nur innerhalb von `BeitrittModalProvider`. */
export function useBeitrittModal() {
  const ctx = useContext(BeitrittModalContext);
  if (!ctx) {
    throw new Error(
      "useBeitrittModal braucht einen <BeitrittModalProvider> im Baum (components/landing/membership/MembershipLanding.tsx).",
    );
  }
  return ctx;
}

/**
 * Voreingestellt ist **Monatlich**, obwohl „Vierteljährlich" die als beliebt
 * markierte Karte ist (`preiskarten[].beliebt`) und der Angebots-Abschnitt
 * genau diese vorwählt.
 *
 * Das ist ein bewusster Widerspruch auf ausdrücklichen Wunsch des Nutzers: Wer
 * den Dialog aus der Kopfleiste oder aus dem Hero öffnet, hat die Preise noch
 * nicht gelesen. Ihm eine Dreimonatsbindung vorzuhaken, wäre eine Entscheidung,
 * die er nicht getroffen hat. Unter den Preiskarten ist die Lage eine andere —
 * dort steht die Empfehlung sichtbar daneben, deshalb bleibt es dort bei
 * „Vierteljährlich".
 *
 * Wer das hier umstellt: auch `AngebotSection` prüfen, sonst zeigen zwei
 * Stellen derselben Seite zwei verschiedene Voreinstellungen ohne Grund.
 */
const VORAUSWAHL: MembershipPlan = "monthly";

/* ─── Eine Laufzeit zur Auswahl ──────────────────────────────────────────── */

/**
 * `role="radio"` auf einem echten `<button>` statt eines versteckten
 * `<input type="radio">`: Das Sichtbare und das Fokussierbare sind dasselbe
 * Element, der Fokusring sitzt damit da, wo auch die Auswahl sichtbar ist.
 *
 * Den Tabindex vergibt die Gruppe (siehe `BeitrittModalProvider`), nicht die
 * Option — genau darin besteht das Muster.
 */
function LaufzeitOption({
  karte,
  aktiv,
  onWaehlen,
  onTaste,
  knopfRef,
}: {
  karte: Preiskarte;
  aktiv: boolean;
  onWaehlen: () => void;
  onTaste: (e: KeyboardEvent<HTMLButtonElement>) => void;
  knopfRef: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <Box
      as="button"
      type="button"
      ref={knopfRef}
      role="radio"
      aria-checked={aktiv}
      /* Der eine Tab-Stopp der Gruppe liegt auf der gewählten Option. */
      tabIndex={aktiv ? 0 : -1}
      onClick={onWaehlen}
      onKeyDown={onTaste}
      w="100%"
      textAlign="left"
      p={{ base: "14px", md: 4 }}
      borderRadius="10px"
      border="1px solid"
      borderColor={aktiv ? "var(--cc-gold-line)" : "var(--cc-line-strong)"}
      bg={aktiv ? "var(--cc-gold-wash)" : "rgba(255, 255, 255, 0.03)"}
      boxShadow={aktiv ? "0 0 0 1px rgba(232, 192, 148, 0.3), 0 0 18px rgba(212, 176, 128, 0.14)" : "none"}
      transition="border-color 180ms var(--cc-ease), background-color 180ms var(--cc-ease), box-shadow 180ms var(--cc-ease)"
      _hover={{
        borderColor: aktiv ? "var(--cc-gold-line)" : "rgba(232, 192, 148, 0.35)",
        bg: aktiv ? "var(--cc-gold-wash)" : "rgba(212, 176, 128, 0.04)",
      }}
      _focusVisible={{ outline: "2px solid var(--cc-gold-line)", outlineOffset: "2px" }}
    >
      {/*
        Eine Zeile ueber die ganze Karte: links Auswahlpunkt und Textspalte,
        rechts der Preis. `align="center"` bezieht sich auf die **Kartenhoehe**,
        nicht auf die erste Textzeile — deshalb stehen Punkt und Preis auch
        dann mittig, wenn die Textspalte wie beim Jahresplan zwei Zeilen hat.
        Marke und Sparhinweis bleiben in der Textspalte, damit sie die Zeile
        nicht auseinanderschieben.
      */}
      <HStack spacing={{ base: 3, md: 4 }} align="center" justify="space-between">
        <HStack spacing={{ base: 3, md: 4 }} align="center" minW={0}>
          <Box
            aria-hidden
            w="18px"
            h="18px"
            flexShrink={0}
            borderRadius="full"
            border="1.5px solid"
            borderColor={aktiv ? "var(--cc-gold-light)" : "rgba(255, 255, 255, 0.3)"}
            display="flex"
            alignItems="center"
            justifyContent="center"
            transition="border-color 180ms var(--cc-ease)"
          >
            {aktiv ? (
              <Box
                w="8px"
                h="8px"
                borderRadius="full"
                bg="var(--cc-gold-light)"
                boxShadow="0 0 8px rgba(232, 192, 148, 0.6)"
              />
            ) : null}
          </Box>

          <Stack spacing="2px" minW={0}>
            {karte.beliebt ? (
              <HStack spacing={1.5}>
                <Box
                  aria-hidden
                  w="5px"
                  h="5px"
                  borderRadius="full"
                  bg="var(--cc-gold-light)"
                  boxShadow="0 0 8px rgba(232, 192, 148, 0.8)"
                />
                <Text
                  as="span"
                  fontSize="10px"
                  fontWeight={600}
                  letterSpacing="0.16em"
                  textTransform="uppercase"
                  color="var(--cc-gold-light)"
                >
                  Beliebteste Wahl
                </Text>
              </HStack>
            ) : null}

            <Text fontSize={{ base: "15px", md: "16px" }} fontWeight={500} color="var(--cc-text)" lineHeight={1.3}>
              {karte.laufzeit}
            </Text>

            {/*
              Der Monatsplan bekommt keinen Hinweis: „monatlich kuendbar" steht
              einmal unter den Zahlungs-Icons und muss nicht auf der Karte
              wiederholt werden.
            */}
            {karte.plan === "monthly" ? null : (
              <Text className="cc-num" fontSize="12px" color="var(--cc-text-3)" lineHeight={1.4}>
                {karte.hinweis}
              </Text>
            )}
          </Stack>
        </HStack>

        <HStack spacing={2} align="baseline" flexShrink={0}>
          <Text
            className="cc-num"
            fontSize={{ base: "20px", md: "22px" }}
            fontWeight={600}
            letterSpacing="-0.02em"
            lineHeight={1.1}
            color="var(--cc-text)"
            whiteSpace="nowrap"
          >
            {karte.preis}
          </Text>
          <Text fontSize="12px" color="var(--cc-text-3)" whiteSpace="nowrap">
            {karte.periode}
          </Text>
        </HStack>
      </HStack>
    </Box>
  );
}

/* ─── Provider ───────────────────────────────────────────────────────────── */

/**
 * Kontext **und** Dialog in einem. Ungeöffnet rendert der Provider außer seinen
 * Kindern nichts.
 *
 * Er ist die Client-Grenze der Verkaufsseite: `MembershipLanding` ist eine
 * Server-Komponente und reicht ihre Abschnitte hier als `children` durch — die
 * bleiben damit serverseitig gerendert, nur der Dialog selbst läuft im Client.
 */
export function BeitrittModalProvider({ children }: { children: ReactNode }) {
  const [offen, setOffen] = useState(false);
  const [gewaehlt, setGewaehlt] = useState<MembershipPlan>(VORAUSWAHL);
  const messung = useFunnelTracker();

  /**
   * `/go/<plan>` legt serverseitig eine Stripe-Session an, bevor es
   * weiterleitet — dazwischen liegen je nach Verbindung 0,3 bis 1,5 Sekunden,
   * in denen ohne diesen Zustand sichtbar nichts passiert. Wer dann ein zweites
   * Mal tippt, erzeugt eine zweite Kasse. Gleiche Behandlung wie im
   * Angebots-Abschnitt (`AngebotSection`).
   */
  const [oeffnetKasse, setOeffnetKasse] = useState(false);

  /** Alle drei Optionsknöpfe — für die Fokusführung mit den Pfeiltasten. */
  const optionen = useRef<Array<HTMLButtonElement | null>>([]);

  /**
   * Erster Fokus im Dialog: die **gewählte** Option, nicht das Schließkreuz und
   * nicht der Kaufknopf. Der Dialog heißt „Laufzeit wählen"; die Wahl ist die
   * erste Handlung, und von dort führt ein einziger Tab auf den Kaufknopf.
   * Ohne diese Angabe setzt Chakra den Fokus auf das erste fokussierbare
   * Element, also das Kreuz — der Dialog begänne mit dem Ausgang.
   */
  const startFokus = useRef<HTMLButtonElement>(null);

  /**
   * Zurücksetzen, wenn der Besucher aus der Kasse zurückkommt. Der Browser holt
   * die Seite dann aus dem Vor-/Zurück-Cache statt sie neu zu bauen — ohne das
   * bliebe der Knopf für immer auf „Kasse wird geöffnet" stehen.
   */
  useEffect(() => {
    const zurueck = (e: PageTransitionEvent) => {
      if (e.persisted) setOeffnetKasse(false);
    };
    window.addEventListener("pageshow", zurueck);
    return () => window.removeEventListener("pageshow", zurueck);
  }, []);

  const wert = useMemo(
    () => ({
      oeffnen: (herkunft: Bauteil) => {
        setOeffnetKasse(false);
        setOffen(true);
        messung.modalAuf(herkunft);
      },
    }),
    [messung],
  );

  /**
   * Tastensteuerung der Radiogruppe nach WAI-ARIA APG: Die Gruppe ist **ein**
   * Tab-Stopp, die Pfeiltasten wechseln die Auswahl und nehmen den Fokus mit,
   * am Ende läuft es um. Beide Achsen, weil die Optionen je nach Breite
   * untereinander oder nebeneinander gelesen werden.
   *
   * Leertaste und Enter stehen bewusst nicht hier: Ein `<button>` löst darauf
   * von selbst `click` aus, und der wählt bereits.
   */
  /**
   * Eine Wahl, egal ob mit Maus oder Pfeiltaste. Beide Wege melden sie der
   * Messung — sonst zählte die Tastatur-Bedienung als „nie eine Laufzeit
   * gewählt", und die Zahl wäre genau um die Leute zu klein, die sorgfältig
   * ausgewählt haben.
   */
  const waehle = useCallback(
    (plan: MembershipPlan) => {
      setGewaehlt(plan);
      messung.laufzeit(plan, "modal");
    },
    [messung],
  );

  const beiTaste = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
      const letzter = preiskarten.length - 1;
      let ziel: number;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") ziel = index === letzter ? 0 : index + 1;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") ziel = index === 0 ? letzter : index - 1;
      else if (e.key === "Home") ziel = 0;
      else if (e.key === "End") ziel = letzter;
      else return;

      /* Sonst scrollt der Dialog unter der Auswahl weg. */
      e.preventDefault();
      waehle(preiskarten[ziel].plan);
      optionen.current[ziel]?.focus();
    },
    [waehle],
  );


  return (
    <BeitrittModalContext.Provider value={wert}>
      {children}

      {/*
        `returnFocusOnClose` bleibt auf Chakras Standard: Der Fokus geht beim
        Schließen an den auslösenden Knopf zurück, und alle sechs Auslöser
        bleiben dafür im DOM — auch der feste Balken auf schmalen Bildschirmen,
        der sich nur wegschiebt, statt sich auszuhängen.
      */}
      <Modal
        isOpen={offen}
        onClose={() => setOffen(false)}
        isCentered
        scrollBehavior="inside"
        initialFocusRef={startFokus}
      >
        <ModalOverlay {...funnelOverlayProps} />

        {/*
          Der Dialog ist in drei Zonen geteilt: Kopf und Fuß stehen fest, nur
          die Laufzeiten dazwischen scrollen. Sonst rutschen auf niedrigen
          Fenstern genau die beiden Dinge aus dem Bild, die zählen — der
          Kaufknopf und die Vertrauenszeile.

          `dvh` statt `vh`, weil mobile Browser die Adressleiste ein- und
          ausblenden und `vh` dabei zu groß bleibt.

          `aria-label` statt `aria-labelledby`: Chakra setzt `aria-labelledby`
          in `getDialogProps` **nach** den übergebenen Props, und zwar nur dann,
          wenn ein `<ModalHeader>` gerendert ist — ein eigener Wert würde
          stillschweigend überschrieben. Der Text ist wörtlich die sichtbare
          Überschrift, damit Gehörtes und Gelesenes übereinstimmen.
        */}
        <ModalContent
          {...funnelModalContentProps}
          aria-label="Laufzeit wählen"
          maxW="520px"
          my={{ base: 4, md: 8 }}
          maxH={{ base: "calc(100dvh - 32px)", md: "calc(100dvh - 96px)" }}
        >
          <Stack spacing={{ base: 2.5, md: 3 }} px={{ base: 5, md: 7 }} pt={{ base: 4, md: 6 }} flexShrink={0}>
            <FunnelModalTopBar label="Mitgliedschaft" onClose={() => setOffen(false)} />
            <Text
              as="h2"
              fontSize={{ base: "22px", md: "26px" }}
              fontWeight={600}
              letterSpacing="-0.02em"
              lineHeight={1.2}
              color="var(--cc-text)"
            >
              Laufzeit wählen
            </Text>
          </Stack>

          <ModalBody
            px={{ base: 5, md: 7 }}
            py={{ base: 4, md: 5 }}
            flex="1"
            minH={0}
            overflowY="auto"
            overflowX="hidden"
          >
            <Stack role="radiogroup" aria-label="Laufzeit" spacing={3}>
              {preiskarten.map((karte, i) => {
                const aktiv = karte.plan === gewaehlt;
                return (
                  <LaufzeitOption
                    key={karte.plan}
                    karte={karte}
                    aktiv={aktiv}
                    onWaehlen={() => waehle(karte.plan)}
                    onTaste={(e) => beiTaste(e, i)}
                    knopfRef={(el) => {
                      optionen.current[i] = el;
                      if (aktiv) startFokus.current = el;
                    }}
                  />
                );
              })}
            </Stack>
          </ModalBody>

          <Stack
            spacing={{ base: 3, md: 4 }}
            px={{ base: 5, md: 7 }}
            pt={{ base: 3, md: 4 }}
            pb={{ base: 5, md: 6 }}
            flexShrink={0}
            borderTop="1px solid var(--cc-line)"
            /* Eigene Fläche, damit die scrollende Liste sichtbar dahinter
               verschwindet statt an einer Kante abzuschneiden. */
            bg="rgba(8, 10, 12, 0.35)"
          >
            {/*
              Bares `<a>`, niemals `next/link`: `/go/<plan>` ist ein Route
              Handler, der mit einem Redirect zu Stripe antwortet, und er legt
              bei JEDEM Aufruf eine echte Kasse an. Der Router würde das Ziel
              vorsorglich abrufen, sobald es im Bild ist — eine Kasse ohne
              Klick, bei jedem Besucher, der den Dialog nur öffnet. Siehe
              `lib/checkout/vorabruf.ts`.
            */}
            {/*
              `?sid=` hängt die Sitzungskennung der Messung an. Sie entsteht
              erst im Browser, deshalb baut `kaufLink` die Adresse hier im
              Client — vor der Hydration steht dort nur `?src=modal`, und der
              Kauf funktioniert auch dann, er lässt sich nur nicht dem Besuch
              zuordnen. Siehe `app/go/[plan]/route.ts`.
            */}
            <Button
              as="a"
              href={messung.kaufLink(gewaehlt, "modal")}
              {...goldCtaSchnitt}
              w="full"
              aria-busy={oeffnetKasse}
              aria-disabled={oeffnetKasse}
              opacity={oeffnetKasse ? 0.8 : 1}
              cursor={oeffnetKasse ? "progress" : undefined}
              onClick={(e) => {
                // Der Anker navigiert selbst; hier wird nur der zweite Klick
                // abgefangen und der Zustand sichtbar gemacht.
                if (oeffnetKasse) {
                  e.preventDefault();
                  return;
                }
                setOeffnetKasse(true);
                // Per `sendBeacon`, weil der Browser die Seite im selben
                // Atemzug verlässt.
                messung.kasse("modal", gewaehlt);
              }}
            >
              {oeffnetKasse ? "Kasse wird geöffnet …" : ctaLabel}
            </Button>

            <ZahlungsIcons />

            {/*
              Fester Text auf ausdrueckliche Entscheidung des Nutzers
              (17.09.2026). Streng genommen gilt „monatlich kuendbar" nur beim
              Monatsplan — bei Quartal und Jahr laeuft die gewaehlte Laufzeit
              erst ab, so steht es auch in der FAQ. Wer das aendern will,
              leitet den Satz aus `preiskarten[gewaehlt].bindung` ab; das Feld
              liegt dafuer bereit.
            */}
            <Text fontSize="13px" color="var(--cc-text-3)" textAlign="center" lineHeight={1.4}>
              Monatlich kündbar
            </Text>
          </Stack>
        </ModalContent>
      </Modal>
    </BeitrittModalContext.Provider>
  );
}

/* ─── Der CTA ────────────────────────────────────────────────────────────── */

/**
 * Die Hauptaktion als Öffner des Dialogs — im Schnitt von `GoldCta`, aber ein
 * `<button>` statt eines Ankers.
 *
 * Steht an den sechs Stellen, die früher auf `#angebot` sprangen: Kopfleiste
 * (samt Mobilmenü), Hero, fester Balken, Prozess, Für wen, Abschluss. Der
 * Knopf unter den Preiskarten bleibt `GoldCta`.
 *
 * `onClick` wird eigens herausgezogen und vor dem Öffnen aufgerufen: Läge es
 * in `rest`, würde ein mitgegebener Handler den Öffner stillschweigend
 * ersetzen, und der Knopf täte gar nichts mehr.
 */
export function BeitrittCta({
  children = ctaLabel,
  onClick,
  herkunft,
  ...rest
}: ButtonProps & {
  /**
   * Wo dieser Knopf steht. Pflichtangabe, damit die Auswertung sagen kann,
   * welcher der sieben Knöpfe verkauft — eine Voreinstellung würde jeden
   * vergessenen Aufruf still in denselben Topf werfen.
   */
  herkunft: Bauteil;
}) {
  const { oeffnen } = useBeitrittModal();
  const messung = useFunnelTracker();

  return (
    <Button
      type="button"
      {...goldCtaSchnitt}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        messung.klick(herkunft);
        oeffnen(herkunft);
      }}
    >
      {children}
    </Button>
  );
}
