import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import {
  EmailButton,
  EmailError,
  EmailHeading,
  EmailRows,
  EmailSmall,
  EmailText,
} from "../layout/components";
import { sendEmail, type SendResult } from "../send";
import { getAppUrl } from "../resend";
import {
  ART_LABEL,
  BETREIBER_EMAIL,
  formatEingang,
  formatTag,
  PLAN_LABEL,
  planVon,
  STATUS_LABEL,
  zeitpunktText,
  type KuendigungsBeleg,
  type KuendigungsStatus,
} from "@/lib/kuendigung/shared";

/**
 * Benachrichtigung an den Betreiber über jede Kündigung aus `/kuendigen`.
 *
 * Geht bei **jedem** Eingang raus, nicht nur bei „manuell prüfen": Der
 * gesetzliche Weg ist selten genug, dass jede Kündigung einen Blick wert ist,
 * und die Mail ist der Rückfall-Beleg, falls die Datenbankzeile fehlt
 * (`gespeichert: false`, etwa solange Migration 072 nicht eingespielt ist).
 * Der Betreff sagt, ob etwas zu tun ist.
 */

export interface BetreiberInfo {
  status: KuendigungsStatus;
  pruefHinweis: string | null;
  userId: string | null;
  eingeloggt: boolean;
  stripeSubscriptionId: string | null;
  gespeichert: boolean;
  speicherFehler: string | null;
  bestaetigungVersendet: boolean;
}

interface Props {
  beleg: KuendigungsBeleg;
  info: BetreiberInfo;
  adminUrl: string;
}

export default function KuendigungBetreiberEmail({ beleg, info, adminUrl }: Props) {
  const eingang = formatEingang(beleg.eingegangenAm);
  const e = beleg.ergebnis;
  const plan = planVon(e);
  const handlungsbedarf = info.status === "manuell_pruefen" || info.status === "kein_vertrag" || !info.gespeichert;

  const zeilen: [string, string][] = [
    ["Status", STATUS_LABEL[info.status]],
    ["Eingangsnummer", beleg.referenz],
    ["Eingegangen am", eingang.komplett],
    ["Art", ART_LABEL[beleg.art]],
    ...(beleg.grund ? ([["Grund", beleg.grund]] as [string, string][]) : []),
    ["Name", beleg.name],
    ["Konto-E-Mail (angegeben)", beleg.email],
    ["Bestätigung an", beleg.bestaetigungEmail],
    ["Angaben zum Vertrag", beleg.vertragAngabe ?? "—"],
    ["Gewünschter Zeitpunkt", zeitpunktText(beleg.zeitpunktWunsch)],
    ["Zugeordneter Vertrag", plan ? (PLAN_LABEL[plan] ?? plan) : "—"],
    ["Wirksam zum", e.art === "ausgefuehrt" ? formatTag(e.wirksamZum) : "—"],
    ["Konto (user_id)", info.userId ?? "—"],
    ["Eingeloggt abgeschickt", info.eingeloggt ? "ja" : "nein"],
    ["Stripe-Abo", info.stripeSubscriptionId ?? "—"],
    ["In der Datenbank", info.gespeichert ? "ja" : `NEIN: ${info.speicherFehler ?? "unbekannter Fehler"}`],
    ["Bestätigungsmail an Kunden", info.bestaetigungVersendet ? "versendet" : "FEHLGESCHLAGEN"],
  ];

  return (
    <BaseEmail previewText={`${STATUS_LABEL[info.status]}: ${beleg.name} (${beleg.referenz})`}>
      <EmailSmall>Kündigungsbutton · {handlungsbedarf ? "Bitte prüfen" : "Automatisch ausgeführt"}</EmailSmall>
      <EmailHeading>Neue Kündigung über /kuendigen</EmailHeading>
      <EmailText>
        {beleg.name} ({beleg.email}) hat am {eingang.komplett} gekündigt.
      </EmailText>

      {info.pruefHinweis ? <EmailText>{info.pruefHinweis}</EmailText> : null}

      {!info.gespeichert ? (
        <EmailError>
          Die Kündigung konnte nicht in der Datenbank gespeichert werden. Diese Mail ist der einzige Beleg,
          bitte aufbewahren.
        </EmailError>
      ) : null}

      <EmailRows rows={zeilen} />

      <EmailButton href={adminUrl}>Kündigungen im Admin öffnen</EmailButton>
      <EmailSmall>
        Antworten auf diese Mail gehen an {beleg.bestaetigungEmail}. Bei „manuell prüfen“ bitte den
        Beendigungszeitpunkt per E-Mail bestätigen und die Kündigung im Admin als erledigt markieren.
      </EmailSmall>
    </BaseEmail>
  );
}

export async function sendKuendigungBetreiber({
  beleg,
  info,
}: {
  beleg: KuendigungsBeleg;
  info: BetreiberInfo;
}): Promise<SendResult> {
  const praefix =
    info.status === "ausgefuehrt" && info.gespeichert
      ? "Kündigung ausgeführt"
      : info.status === "kein_vertrag"
        ? "Kündigung ohne Vertrag, bitte prüfen"
        : "Kündigung, bitte prüfen";
  return sendEmail({
    to: BETREIBER_EMAIL,
    subject: `${praefix}: ${beleg.name} (${beleg.referenz})`,
    replyTo: beleg.bestaetigungEmail,
    jsx: <KuendigungBetreiberEmail beleg={beleg} info={info} adminUrl={`${getAppUrl()}/admin/kuendigungen`} />,
  });
}
