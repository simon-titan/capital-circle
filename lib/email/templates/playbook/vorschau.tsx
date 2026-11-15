import * as React from "react";
import MentoringBestaetigungEmail from "../mentoring-bestaetigung";
import { FREE_MAIL_IDS, freeMail, type FreeMailId } from "./free-kurs";
import { KAMPAGNEN_MAIL_IDS, kampagnenMail, type KampagnenMailId } from "./kampagnen";
import { KUNDE_MAIL_IDS, kundeMail, type KundeMailId } from "./kunde";
import { TERMIN_MAIL_IDS, terminMail, type TerminMailId } from "./termin";
import { TRUSTPILOT_URL } from "@/config/kampagnen";
import { PRODUKTE } from "@/config/mentoring";
import { plusKalendertageBerlin } from "@/lib/mailsystem/zeit";
import type { VorlageId } from "@/lib/mailsystem/vorlagen";
import { getAppUrl } from "@/lib/site-url";

/**
 * Alle 36 Vorlagen des E-Mail-Playbooks mit Beispieldaten — für die Abnahme
 * unter `/admin/training/mails`. Gerendert mit genau den Bausteinen, die auch
 * beim Versand laufen; nur die Daten (Max, Kevin, Termine) sind erfunden.
 */

export const ALLE_PLAYBOOK_IDS: VorlageId[] = [...FREE_MAIL_IDS, ...TERMIN_MAIL_IDS, "W01", ...KUNDE_MAIL_IDS.slice(0, 2), ...KUNDE_MAIL_IDS.slice(2, 4), "Q01", "Q02", ...KAMPAGNEN_MAIL_IDS];

export function beispielMail(id: VorlageId): { betreff: string; vorschau: string; jsx: React.ReactElement } {
  const app = getAppUrl();
  const jetzt = new Date();
  if ((FREE_MAIL_IDS as string[]).includes(id)) {
    const ende = plusKalendertageBerlin(jetzt, id === "E03" || id === "E04" || id === "E05" ? 7 : 30);
    return freeMail(id as FreeMailId, {
      vorname: "Max",
      endeAm: ende,
      lektionUrl: (n) => `${app}/kostenloses-training?video=${n}`,
      weiterUrl: `${app}/kostenloses-training`,
      gespraechUrl: `${app}/kostenloses-training?gespraech=1`,
      whatsappUrl: "https://wa.me/490000000000",
      unsubscribeUrl: "#abmelden",
    });
  }
  if ((KAMPAGNEN_MAIL_IDS as string[]).includes(id)) {
    return kampagnenMail(id as KampagnenMailId, {
      vorname: "Max",
      zielUrl: id === "RT01" ? `${app}/training/aktivieren?t=beispiel` : TRUSTPILOT_URL,
      unsubscribeUrl: "#abmelden",
    });
  }
  if ((TERMIN_MAIL_IDS as string[]).includes(id)) {
    const start = new Date(jetzt.getTime() + 3 * 86_400_000);
    start.setUTCHours(15, 0, 0, 0);
    return terminMail(id as TerminMailId, {
      vorname: "Max",
      kalenderUrl: `${app}/termin/kalender/t-beispiel`,
      video5Url: `${app}/termin/vorbereitung/t-beispiel`,
      alterStart: new Date(start.getTime() - 86_400_000),
      termin: {
        start,
        ende: new Date(start.getTime() + 45 * 60_000),
        zeitzone: "Europe/Berlin",
        beraterName: "Kevin",
        joinUrl: "https://zoom.us/j/beispiel",
        verwaltenUrl: "https://calendly.com/reschedulings/beispiel",
        kalenderEintragUrl: `${app}/api/termin/ics/beispiel`,
      },
      unsubscribeUrl: "#abmelden",
    });
  }
  if ((KUNDE_MAIL_IDS as string[]).includes(id)) {
    return kundeMail(id as KundeMailId, {
      vorname: "Max",
      gespraechUrl: `${app}/programme?gespraech=1`,
      liveAboUrl: `${app}/live-abo`,
      accountUrl: `${app}/einstellungen/abonnement`,
      endeAm: new Date(jetzt.getTime() + 3 * 86_400_000),
      unsubscribeUrl: "#abmelden",
    });
  }
  // W01 / Q01: die Kaufbestätigung (Playbook-Text oben, Vertragsteil darunter).
  const live = id === "Q01";
  const produkt = live ? "live" : "main";
  return {
    betreff: live ? "Du bist bei den Live-Tradings dabei." : "Du bist dabei. Willkommen bei Capital Circle.",
    vorschau: live ? "Deine Buchung ist bestätigt. Hier findest du deine Termine." : "Dein Zugang ist freigeschaltet. Schön, dass du dabei bist.",
    jsx: (
      <MentoringBestaetigungEmail
        firstName="Max"
        produkt={produkt}
        raten={live ? 1 : 4}
        rateCents={live ? null : 75_000}
        gesamtCents={PRODUKTE[produkt].preisCents}
        liveBis={new Date(jetzt.getTime() + 365 * 86_400_000).toISOString()}
        liveStart={jetzt.toISOString()}
        naechsteZahlung={new Date(jetzt.getTime() + 30 * 86_400_000).toISOString()}
      />
    ),
  };
}
