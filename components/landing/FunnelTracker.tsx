"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  MAX_EREIGNISSE_PRO_BUENDEL,
  MAX_SICHTBARE_MS,
  SCROLL_SCHWELLEN,
  SITZUNGS_SCHLUESSEL,
  abschnittsRang,
  wirdGemessen,
  type Bauteil,
  type EreignisArt,
} from "@/lib/analytics/kaufweg";

/**
 * Die Messung des Kaufwegs im Browser.
 *
 * ── Was gemessen wird ──────────────────────────────────────────────────────
 *
 * Seitenaufruf, **sichtbare** Verweildauer (ein Tab im Hintergrund zaehlt
 * nicht — sonst misst man offene Tabs statt gelesener Seiten), Scrolltiefe in
 * vier Schwellen, der weiteste erreichte Abschnitt, jeder Klick auf einen
 * Kauf- oder Beitrittsknopf samt Herkunft, das Oeffnen des Beitritts-Dialogs,
 * die Wahl einer Laufzeit und der Absprung (eine Sitzung ohne Klick).
 *
 * ── Was ausdruecklich nicht passiert ───────────────────────────────────────
 *
 * Kein Cookie, kein `localStorage`, kein Fingerabdruck, keine IP. Die Kennung
 * ist eine Zufallszahl im `sessionStorage` und endet mit dem Tab. Vom Verweis
 * geht nur der Host hinaus, nie die volle Adresse. Deshalb braucht diese
 * Messung nach § 25 TDDDG keine Einwilligung und deshalb gibt es hier kein
 * Banner. Wer ein Feld ergaenzt, prueft das neu.
 *
 * ── Warum gebuendelt ───────────────────────────────────────────────────────
 *
 * Ein Aufruf je Ereignis waere ein zweistelliger Anfragestrom je Besucher, und
 * die letzten Ereignisse — die interessantesten, weil sie am Absprung liegen —
 * gingen verloren: Ein `fetch` im `pagehide` wird abgebrochen. Gesammelt wird
 * deshalb im Speicher und verschickt wird gebuendelt, zuletzt per
 * `navigator.sendBeacon`, das der Browser auch nach dem Schliessen zu Ende
 * bringt.
 *
 * Alles laeuft in `try/catch` und blockiert nie: Eine Statistik ist keinen
 * kaputten Kaufweg wert.
 */

const ENDPUNKT = "/api/tracking/funnel";

/**
 * Regelmaessiges Bündeln, solange die Seite **sichtbar** ist.
 *
 * Halbe Minute, nicht schneller: Der verlaessliche Moment ist ohnehin das
 * Weglegen des Tabs (`visibilitychange` → `sendBeacon`). Dieser Takt ist nur
 * das Netz fuer den Fall, dass der Browser danach nichts mehr ausfuehrt —
 * und ein Netz muss nicht alle fuenf Sekunden geworfen werden.
 */
const FLUSH_INTERVALL_MS = 30_000;
/** Nach einem wichtigen Ereignis (Klick, Dialog) kurz warten und dann senden. */
const FLUSH_VERZOEGERUNG_MS = 800;
/** Takt, in dem die sichtbare Zeit fortgeschrieben wird. */
const TAKT_MS = 1_000;

interface GepuffertesEreignis {
  art: EreignisArt;
  bauteil?: string;
  wert?: number;
  text?: string;
}

export interface FunnelTracker {
  /** Die Sitzungskennung, oder `null` solange die Messung nicht laeuft. */
  sid: string | null;
  /** Klick auf einen Kauf-/Beitrittsknopf. */
  klick: (bauteil: Bauteil, plan?: string) => void;
  /** Der Beitritts-Dialog wurde geoeffnet. */
  modalAuf: (bauteil: Bauteil) => void;
  /** Eine Laufzeit wurde gewaehlt. */
  laufzeit: (plan: string, bauteil: Bauteil) => void;
  /** Der Klick, der tatsaechlich in die Kasse fuehrt — wird sofort verschickt. */
  kasse: (bauteil: Bauteil, plan: string) => void;
  /**
   * Haengt die Sitzungskennung an einen `/go/<plan>`-Link. Ohne sie endet die
   * Auswertung beim Klick und die Kette Besuch → Kauf reisst.
   */
  kaufLink: (plan: string, src: string) => string;
}

/**
 * Stiller Ersatz ausserhalb des Providers.
 *
 * Die Kauf-Knoepfe stehen auch auf Seiten ohne Messung (und in Tests). Ein
 * geworfener Fehler waere dort ein kaputter Kaufknopf — der teuerste denkbare
 * Preis fuer eine fehlende Statistik.
 */
const STILL: FunnelTracker = {
  sid: null,
  klick: () => {},
  modalAuf: () => {},
  laufzeit: () => {},
  kasse: () => {},
  kaufLink: (plan, src) => `/go/${plan}?src=${encodeURIComponent(src)}`,
};

const FunnelTrackerContext = createContext<FunnelTracker | null>(null);

export function useFunnelTracker(): FunnelTracker {
  return useContext(FunnelTrackerContext) ?? STILL;
}

/* ── Hilfen ──────────────────────────────────────────────────────────────── */

function sitzungsKennung(): string | null {
  try {
    const vorhanden = sessionStorage.getItem(SITZUNGS_SCHLUESSEL);
    if (vorhanden) return vorhanden;
    const neu = crypto.randomUUID();
    sessionStorage.setItem(SITZUNGS_SCHLUESSEL, neu);
    return neu;
  } catch {
    // Privater Modus oder blockierte Site-Daten: dann wird eben nicht gemessen.
    return null;
  }
}

/* ── Die Kennung als externer Speicher ───────────────────────────────────────
 *
 * Nicht als `useState` + `setState` im Effekt, sondern über
 * `useSyncExternalStore` — dasselbe Muster wie in `AdminSidebar`. Zwei Gründe:
 *
 * 1. Der Server kennt den `sessionStorage` nicht. Ein Zustand, der beim ersten
 *    Rendern im Browser schon gesetzt wäre, hinge an den `href`-Attributen der
 *    Kauf-Knöpfe — und das Markup wiche vom serverseitig gelieferten ab. Der
 *    Server-Schnappschuss ist deshalb ausdrücklich `null`: erst hydrieren,
 *    dann die Kennung anhängen.
 * 2. `setState` mitten in einem Effekt löst eine zweite Renderrunde aus, bevor
 *    die erste gezeichnet ist. Hier gibt es dafür keinen Grund — die Kennung
 *    ist ein Wert *außerhalb* von React, und genau dafür ist dieser Haken da.
 */
const KENNUNGS_EREIGNIS = "cc-funnel-sid";

function abonniereKennung(melde: () => void): () => void {
  window.addEventListener(KENNUNGS_EREIGNIS, melde);
  return () => window.removeEventListener(KENNUNGS_EREIGNIS, melde);
}

/** Muss denselben Wert liefern, solange sich nichts ändert — sonst Render-Schleife. */
function leseKennung(): string | null {
  try {
    return sessionStorage.getItem(SITZUNGS_SCHLUESSEL);
  } catch {
    return null;
  }
}

function leseKennungServer(): null {
  return null;
}

/** Grobe Klasse aus der Fensterbreite — kein Geraetemodell, keine Aufloesung. */
function geraeteKlasse(): "mobil" | "tablet" | "desktop" {
  const breite = window.innerWidth;
  if (breite < 768) return "mobil";
  if (breite < 1200) return "tablet";
  return "desktop";
}

/** Scrolltiefe in Prozent der Seitenhoehe, inklusive des sichtbaren Fensters. */
function scrollTiefe(): number {
  const doc = document.documentElement;
  const hoehe = Math.max(doc.scrollHeight, document.body?.scrollHeight ?? 0);
  if (hoehe <= 0) return 0;
  const unten = window.scrollY + window.innerHeight;
  // Eine Seite, die kuerzer als das Fenster ist, gilt als vollstaendig gesehen.
  if (hoehe <= window.innerHeight + 4) return 100;
  return Math.max(0, Math.min(100, Math.round((unten / hoehe) * 100)));
}

/**
 * Ein Abruf, der kein Mensch ist.
 *
 * `navigator.webdriver` ist gesetzt, wenn die Seite ferngesteuert wird
 * (Playwright, Selenium, Lighthouse im CI). Vorabrufe des Browsers rendern die
 * Seite bereits, bevor jemand sie oeffnet — `document.prerendering` markiert
 * genau diesen Zustand, und ein Vorabruf ist kein Besuch.
 */
function nichtMessen(): boolean {
  try {
    if (navigator.webdriver) return true;
    const doc = document as Document & { prerendering?: boolean };
    if (doc.prerendering) return true;
    if (document.visibilityState === ("prerender" as DocumentVisibilityState)) return true;
    return false;
  } catch {
    return true;
  }
}

/* ── Der Provider ────────────────────────────────────────────────────────── */

export function FunnelTrackerProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const sid = useSyncExternalStore(abonniereKennung, leseKennung, leseKennungServer);

  /* Alles Folgende lebt in Refs: Es aendert sich bei jedem Scroll-Tick und
     duerfte die Seite nicht bei jedem Pixel neu rendern. */
  const aktiv = useRef(false);
  const puffer = useRef<GepuffertesEreignis[]>([]);
  const sichtbareMs = useRef(0);
  const sichtbarSeit = useRef<number | null>(null);
  const maxScroll = useRef(0);
  const gemeldeteSchwellen = useRef<Set<number>>(new Set());
  const maxAbschnitt = useRef<string | null>(null);
  const maxAbschnittRang = useRef(-1);
  const klicks = useRef(0);
  const modalGeoeffnet = useRef(0);
  const laufzeitGewaehlt = useRef<string | null>(null);
  const kasseGestartet = useRef(false);
  const herkunft = useRef<{ ref: string | null; src: string | null; utm: Record<string, string | null> }>({
    ref: null,
    src: null,
    utm: {},
  });
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Der aktuelle Stand als Rumpf — eine Stelle, damit Takt und Beacon dasselbe schicken. */
  const baueRumpf = useCallback(
    (kennung: string) => {
      const laufend =
        sichtbarSeit.current != null ? Math.max(0, Date.now() - sichtbarSeit.current) : 0;
      const ereignisse = puffer.current.splice(0, MAX_EREIGNISSE_PRO_BUENDEL);
      return {
        sid: kennung,
        pfad: pathname,
        ref: herkunft.current.ref,
        src: herkunft.current.src,
        geraet: geraeteKlasse(),
        utm: herkunft.current.utm,
        stand: {
          sichtbare_ms: Math.min(MAX_SICHTBARE_MS, sichtbareMs.current + laufend),
          max_scroll: maxScroll.current,
          max_abschnitt: maxAbschnitt.current,
          klicks: klicks.current,
          modal_geoeffnet: modalGeoeffnet.current,
          laufzeit: laufzeitGewaehlt.current,
          kasse: kasseGestartet.current,
        },
        ereignisse,
      };
    },
    [pathname],
  );

  /**
   * Senden. `beacon` fuer den Weg nach draussen (Tab wird geschlossen, Kasse
   * wird geoeffnet), sonst ein gewoehnliches `fetch` mit `keepalive`.
   *
   * Der Puffer wird **vor** dem Senden geleert (`splice` in `baueRumpf`). Ein
   * fehlgeschlagener Versand verliert damit sein Buendel — richtig so: Ein
   * Wiederholungsspeicher wuerde bei einem laenger nicht erreichbaren Server
   * unbegrenzt wachsen, und die Zahlen sind ohnehin Naeherungen.
   */
  const sende = useCallback(
    (beacon: boolean) => {
      if (!aktiv.current) return;
      const kennung = sitzungsKennung();
      if (!kennung) return;
      try {
        const rumpf = JSON.stringify(baueRumpf(kennung));
        if (beacon && typeof navigator.sendBeacon === "function") {
          navigator.sendBeacon(ENDPUNKT, new Blob([rumpf], { type: "application/json" }));
          return;
        }
        void fetch(ENDPUNKT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: rumpf,
          keepalive: true,
        }).catch(() => {
          // Messung darf nie in der Konsole des Kaufwilligen auftauchen.
        });
      } catch {
        // Auch das Bauen des Rumpfs darf die Seite nicht anhalten.
      }
    },
    [baueRumpf],
  );

  /** Kurz sammeln und dann senden — mehrere Klicks in Folge ergeben ein Buendel. */
  const baldSenden = useCallback(() => {
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(() => sende(false), FLUSH_VERZOEGERUNG_MS);
  }, [sende]);

  const merke = useCallback((ereignis: GepuffertesEreignis) => {
    if (!aktiv.current) return;
    if (puffer.current.length >= MAX_EREIGNISSE_PRO_BUENDEL * 2) return;
    puffer.current.push(ereignis);
  }, []);

  /* ── Aufsetzen ────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!wirdGemessen(pathname) || nichtMessen()) return;

    const kennung = sitzungsKennung();
    if (!kennung) return;

    aktiv.current = true;
    /* Die Kennung steht jetzt im `sessionStorage`; das Ereignis sagt den
       Lesern Bescheid, damit die Kauf-Knöpfe ihr `?sid=` bekommen. */
    window.dispatchEvent(new Event(KENNUNGS_EREIGNIS));

    /* Herkunft einmal beim Aufsetzen: Nur der Host des Verweises und nur, wenn
       er von aussen kommt — der eigene Host waere ein Klick innerhalb der
       Seite und keine Herkunft. */
    try {
      const ref = document.referrer;
      if (ref) {
        const url = new URL(ref);
        if (url.host !== window.location.host) {
          herkunft.current.ref = url.hostname.replace(/^www\./, "").slice(0, 120);
        }
      }
      const params = new URLSearchParams(window.location.search);
      herkunft.current.src = params.get("src")?.slice(0, 60) ?? null;
      herkunft.current.utm = {
        quelle: params.get("utm_source")?.slice(0, 60) ?? null,
        medium: params.get("utm_medium")?.slice(0, 60) ?? null,
        kampagne: params.get("utm_campaign")?.slice(0, 60) ?? null,
      };
    } catch {
      // Kaputter Verweis ist kein Grund, gar nicht zu messen.
    }

    merke({ art: "seite" });

    /* Die sichtbare Zeit laeuft, solange der Tab vorn ist. */
    if (document.visibilityState === "visible") sichtbarSeit.current = Date.now();

    const beiSichtbarkeit = () => {
      if (document.visibilityState === "visible") {
        sichtbarSeit.current = Date.now();
      } else {
        if (sichtbarSeit.current != null) {
          sichtbareMs.current = Math.min(
            MAX_SICHTBARE_MS,
            sichtbareMs.current + (Date.now() - sichtbarSeit.current),
          );
          sichtbarSeit.current = null;
        }
        /* Weggeklickt ist der verlaesslichste Moment zum Senden — auf vielen
           Mobilbrowsern der einzige, der vor dem Schliessen noch kommt. */
        merke({ art: "ende", wert: sichtbareMs.current });
        sende(true);
      }
    };

    const beiPageHide = () => {
      if (sichtbarSeit.current != null) {
        sichtbareMs.current = Math.min(
          MAX_SICHTBARE_MS,
          sichtbareMs.current + (Date.now() - sichtbarSeit.current),
        );
        sichtbarSeit.current = null;
      }
      merke({ art: "ende", wert: sichtbareMs.current });
      sende(true);
    };

    /* Scroll: die vier Schwellen je einmal. Passiv, damit das Scrollen selbst
       nicht auf uns warten muss. */
    const beiScroll = () => {
      const tiefe = scrollTiefe();
      if (tiefe > maxScroll.current) maxScroll.current = tiefe;
      for (const schwelle of SCROLL_SCHWELLEN) {
        if (tiefe >= schwelle && !gemeldeteSchwellen.current.has(schwelle)) {
          gemeldeteSchwellen.current.add(schwelle);
          merke({ art: "scroll", wert: schwelle });
        }
      }
    };

    window.addEventListener("scroll", beiScroll, { passive: true });
    window.addEventListener("resize", beiScroll, { passive: true });
    document.addEventListener("visibilitychange", beiSichtbarkeit);
    window.addEventListener("pagehide", beiPageHide);

    /* Abschnitte: welcher stand zuletzt wirklich im Bild.
     *
     * `rootMargin` schrumpft das Beobachtungsfenster auf einen schmalen
     * Streifen in der Bildschirmmitte — ein Abschnitt zaehlt, sobald er diese
     * Mittellinie kreuzt. Ein Schwellwert wie `0.35` waere hier falsch: Die
     * Abschnitte dieser Seite sind teils drei Bildschirme hoch, und 35 % von
     * ihnen passen nie gleichzeitig ins Fenster — der Beobachter haette dann
     * nie ausgeloest. */
    let beobachter: IntersectionObserver | null = null;
    try {
      beobachter = new IntersectionObserver(
        (eintraege) => {
          for (const eintrag of eintraege) {
            if (!eintrag.isIntersecting) continue;
            const name = (eintrag.target as HTMLElement).dataset.abschnitt;
            if (!name) continue;
            const rang = abschnittsRang(name);
            if (rang > maxAbschnittRang.current) {
              maxAbschnittRang.current = rang;
              maxAbschnitt.current = name;
              merke({ art: "abschnitt", bauteil: name, wert: rang });
            }
          }
        },
        { threshold: 0, rootMargin: "-45% 0px -45% 0px" },
      );
      for (const el of document.querySelectorAll<HTMLElement>("[data-abschnitt]")) {
        beobachter.observe(el);
      }
    } catch {
      // Ohne IntersectionObserver fehlt nur die Abschnittstiefe.
    }

    /* Erster Stand sofort: Wer nach zwei Sekunden wieder weg ist, soll trotzdem
       als Besuch gezaehlt werden — der Takt unten kaeme dafuer zu spaet. */
    beiScroll();
    const ersterStand = setTimeout(() => sende(false), 1_500);

    const takt = setInterval(() => {
      /* Die sichtbare Zeit fortschreiben, ohne den laufenden Abschnitt zu
         schliessen — sonst waere jede Messung um bis zu einem Takt zu kurz. */
      if (sichtbarSeit.current != null) {
        const jetzt = Date.now();
        sichtbareMs.current = Math.min(MAX_SICHTBARE_MS, sichtbareMs.current + (jetzt - sichtbarSeit.current));
        sichtbarSeit.current = jetzt;
      }
    }, TAKT_MS);

    /* Nur senden, wenn es etwas Neues gibt: gepufferte Ereignisse oder eine
       laufende Sichtbarkeit (dann ist die Verweildauer gewachsen). Ein Tab, der
       seit einer Stunde im Hintergrund liegt, erzeugt so keinen einzigen
       Aufruf mehr — sonst haetten offene Tabs denselben Preis wie gelesene
       Seiten, und ihre Zahl waere hoeher. */
    const buendel = setInterval(() => {
      if (puffer.current.length === 0 && sichtbarSeit.current == null) return;
      sende(false);
    }, FLUSH_INTERVALL_MS);

    return () => {
      aktiv.current = false;
      window.removeEventListener("scroll", beiScroll);
      window.removeEventListener("resize", beiScroll);
      document.removeEventListener("visibilitychange", beiSichtbarkeit);
      window.removeEventListener("pagehide", beiPageHide);
      beobachter?.disconnect();
      clearTimeout(ersterStand);
      clearInterval(takt);
      clearInterval(buendel);
      if (flushTimer.current) clearTimeout(flushTimer.current);
    };
    // `sende`/`merke` sind über useCallback stabil; `pathname` wechselt nur bei
    // einem echten Seitenwechsel — dann ist ein Neuaufsetzen genau richtig.
  }, [pathname, merke, sende]);

  const wert = useMemo<FunnelTracker>(
    () => ({
      sid,
      klick: (bauteil, plan) => {
        klicks.current += 1;
        merke({ art: "klick", bauteil, text: plan });
        baldSenden();
      },
      modalAuf: (bauteil) => {
        modalGeoeffnet.current += 1;
        merke({ art: "modal_auf", bauteil });
        baldSenden();
      },
      laufzeit: (plan, bauteil) => {
        laufzeitGewaehlt.current = plan;
        merke({ art: "laufzeit", bauteil, text: plan });
        baldSenden();
      },
      kasse: (bauteil, plan) => {
        klicks.current += 1;
        kasseGestartet.current = true;
        merke({ art: "kasse", bauteil, text: plan });
        /* Sofort und per Beacon: Der Browser verlaesst die Seite im selben
           Atemzug, ein verzoegertes `fetch` waere unterwegs abgebrochen. */
        sende(true);
      },
      kaufLink: (plan, src) => {
        const basis = `/go/${plan}?src=${encodeURIComponent(src)}`;
        return sid ? `${basis}&sid=${encodeURIComponent(sid)}` : basis;
      },
    }),
    [sid, merke, baldSenden, sende],
  );

  return <FunnelTrackerContext.Provider value={wert}>{children}</FunnelTrackerContext.Provider>;
}
