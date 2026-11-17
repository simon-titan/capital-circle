import * as React from "react";
import { BaseEmail } from "../layout/BaseEmail";
import {
  EmailButton,
  EmailDivider,
  EmailLink,
  EmailRows,
  EmailSmall,
  EmailSubheading,
  EmailText,
} from "../layout/components";
import { sendEmail, type SendResult } from "../send";
import { getAppUrl } from "../resend";
import { playbookAbsender, vermerkeGesendet } from "@/lib/mailsystem/versand";
import { createServiceClient } from "@/lib/supabase/service";
import { ratenText, PRODUKTE, euro, type KassenProdukt } from "@/config/mentoring";
import {
  anbieter,
  anbieterAnschriftEinzeilig,
  rechtsPfade,
  rechtstexteStand,
  rechtsUrl,
} from "@/config/legal";

/**
 * Kaufbestätigung für die Mentoring-Programme und das Live-Abo
 * (`config/mentoring.ts`), verschickt aus `lib/stripe/webhooks/mentoring.ts`.
 *
 * Seit 07.11.2026 (E-Mail-Playbook 1.0) beginnt sie mit Emres freigegebenem
 * Text: **W01** „Einzige Kunden-Willkommensmail" für Programme, **Q01** „Live-Abo
 * bestätigt" für das Live-Abo — wörtlich, Absender „Emre | Capital Circle".
 * Darunter bleibt der Vertragsteil (Leistungen, Zahlweise, § 312f BGB): Er ist
 * die Vertragskopie, die das Playbook ausdrücklich außerhalb seiner Vorlagen
 * lässt. So ist es eine Mail, nicht zwei.
 *
 * Mehr als eine Willkommensmail: Sie ist die Bestätigung auf dauerhaftem
 * Datenträger nach § 312f BGB und trägt deshalb den Vertragsinhalt — die
 * Leistungen mit ihren Laufzeiten und bei Raten den Ratenplan. Gruppencall,
 * WhatsApp-Support und Privatstunden stehen sonst nirgends schriftlich beim
 * Kunden, und genau danach fragt er nach drei Monaten.
 */

interface Props {
  firstName: string;
  email: string;
  userId: string;
  kaufId: string;
  produkt: KassenProdukt;
  /** 1 = Einmalzahlung. */
  raten: number;
  rateCents: number | null;
  gesamtCents: number;
  /** Upgrade Ausbildung → Main/Premium: angerechneter Betrag. */
  anrechnungCents?: number;
  /** Ende des Live-Zugangs (ISO), bei Programmen gesetzt. */
  liveBis: string | null;
  /** Nur für Konten ohne Passwort (gerade über die Kasse entstanden). */
  setPasswordUrl?: string;
  /** Live-Abo (Q01): Beginn und nächster Zahlungstermin (ISO). */
  liveStart?: string | null;
  naechsteZahlung?: string | null;
}

function datum(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });
}

export default function MentoringBestaetigungEmail(props: Omit<Props, "email" | "userId" | "kaufId">) {
  const appUrl = getAppUrl();
  const produkt = PRODUKTE[props.produkt];
  const istLive = props.produkt === "live";

  const zahlung: [string, string] =
    istLive
      ? ["Preis", `${euro(produkt.preisCents)} pro Monat, monatlich kündbar`]
      : props.raten > 1 && props.rateCents
        ? ["Zahlung", `${ratenText(props.gesamtCents, props.raten)}, zusammen ${euro(props.gesamtCents)}, ohne Aufschlag`]
        : ["Zahlung", `${euro(props.gesamtCents)} einmalig`];

  const zeilen: [string, string][] = [["Programm", produkt.name], zahlung];
  if (props.anrechnungCents) {
    zeilen.push(["Anrechnung", `${euro(props.anrechnungCents)} aus deiner Ausbildung (Listenpreis ${euro(produkt.preisCents)})`]);
  }
  if (props.liveBis) zeilen.push(["Live-Zugang bis", datum(props.liveBis)]);

  const ziel = props.setPasswordUrl ?? (istLive ? `${appUrl}/live-session` : `${appUrl}/ausbildung`);
  const vorschau = istLive ? "Deine Buchung ist bestätigt. Hier findest du deine Termine." : "Dein Zugang ist freigeschaltet. Schön, dass du dabei bist.";

  return (
    <BaseEmail previewText={vorschau}>
      <EmailText>Hi {props.firstName},</EmailText>
      {istLive ? (
        <>
          <EmailText>
            <strong>dein Capital-Circle-Live-Trading-Abo ist bestätigt. Schön, dass du dabei bist.</strong>
          </EmailText>
          <EmailText>
            Ab {props.liveStart ? datum(props.liveStart) : "sofort"} hast du Zugang zu meinen{" "}
            <strong>drei regulären Live-Trading-Sessions pro Woche</strong>.
          </EmailText>
          <EmailText>Hier findest du die Termine und die jeweiligen Zugangslinks:</EmailText>
          <EmailButton href={ziel}>{props.setPasswordUrl ? "Passwort setzen und zu den Live-Terminen" : "Zu meinen Live-Terminen"}</EmailButton>
          <EmailText>
            <strong>Dein Abo:</strong> 99 € pro Monat
            <br />
            <strong>Beginn:</strong> {props.liveStart ? datum(props.liveStart) : "sofort"}
            <br />
            <strong>Nächster Zahlungstermin:</strong> {props.naechsteZahlung ? datum(props.naechsteZahlung) : "—"}
          </EmailText>
          <EmailText>
            {/* Abweichung vom Playbook-Wortlaut (Entscheidung Simon, 07.11.2026): Daily Bias und Trade-Recaps sind im
                Live-Abo enthalten — so stehen sie auch auf der Kasse, in den AGB und im Zugang. */}
            Das Abo umfasst die reguläre Live-Teilnahme mit Daily Bias und Trade-Recaps. Journal, Aufzeichnungen,
            exklusive Mentoringcalls und persönliche Betreuung sind nicht enthalten.
          </EmailText>
          <EmailText>Andere bereits bestehende Zugänge bleiben davon unberührt.</EmailText>
          <EmailText>Die Angaben zu deinem Abo und die Möglichkeit, es zu verwalten, findest du in deinem Account.</EmailText>
          <EmailText>
            <strong>Wir sehen uns in der nächsten Session.</strong>
          </EmailText>
          <EmailText>
            Emre
            <br />
            Capital Circle
          </EmailText>
        </>
      ) : (
        <>
          <EmailText>
            <strong>herzlich willkommen bei Capital Circle. Du bist dabei.</strong>
          </EmailText>
          <EmailText>
            Dein Zugang zu <strong>{produkt.name}</strong> ist jetzt freigeschaltet.
          </EmailText>
          <EmailText>Ich freue mich, dass du diesen Schritt mit uns gehst. Danke für dein Vertrauen.</EmailText>
          <EmailText>
            Schau dich in Ruhe um und starte mit deiner Ausbildung. Die Inhalte und Zugänge deines Programms findest du
            direkt in deinem Account.
          </EmailText>
          <EmailButton href={ziel}>Zu meinem Ausbildungsbereich</EmailButton>
          {props.setPasswordUrl ? (
            <EmailText muted>Beim ersten Mal legst du über den Knopf dein Passwort fest.</EmailText>
          ) : null}
          <EmailText>Falls beim Zugang etwas nicht funktioniert, antworte einfach auf diese E-Mail. Mein Team hilft dir weiter.</EmailText>
          <EmailText>
            <strong>Schön, dich bei Capital Circle zu haben.</strong>
          </EmailText>
          <EmailText>Emre</EmailText>
        </>
      )}

      <EmailDivider />
      <EmailSubheading>Deine Buchung</EmailSubheading>
      <EmailRows rows={zeilen} />

      {props.raten > 1 && !istLive ? (
        <EmailText muted>
          Die erste Rate ist bezahlt. Die weiteren werden jeweils einen Monat später von derselben Zahlungsart
          abgebucht. Nach der letzten Rate endet die Ratenzahlung von selbst, du musst nichts kündigen.
        </EmailText>
      ) : null}

      <EmailSubheading>Was enthalten ist</EmailSubheading>
      <EmailText>
        {produkt.enthalten.map((l, i) => (
          <React.Fragment key={l.text}>
            {i > 0 ? <br /> : null}• {l.text}
            {l.detail ? ` (${l.detail})` : ""}
          </React.Fragment>
        ))}
      </EmailText>

      {!istLive ? (
        <EmailText muted>
          Termine für Gruppencall, WhatsApp-Support und Privatstunden stimmen wir in den nächsten Tagen mit dir ab,
          soweit sie zu deinem Programm gehören. Eine Rechnung erhältst du separat von unserem Zahlungsanbieter.
        </EmailText>
      ) : null}

      {/*
        Bestätigung auf dauerhaftem Datenträger (§ 312f Abs. 2 und 3 BGB), gleicher
        Wortlaut wie in `welcome-paid.tsx` — er spiegelt das Pflicht-Häkchen der
        Kasse (`lib/stripe/kasse-recht.ts`).
      */}
      <EmailSmall>
        <strong>Vertragsbestätigung.</strong> Mit deinem Kauf ist ein Vertrag über das {produkt.name} mit{" "}
        {anbieter.name} ({anbieter.marke}, {anbieterAnschriftEinzeilig()}) zustande gekommen. In der Kasse hast du
        ausdrücklich verlangt, dass wir vor Ablauf der Widerrufsfrist mit der Leistung beginnen, und bestätigt, dass
        dir bekannt ist: Für die digitalen Inhalte erlischt dein Widerrufsrecht damit mit Beginn der Bereitstellung;
        für die Dienstleistungen erlischt es mit ihrer vollständigen Erbringung, und bei einem Widerruf schuldest du
        für die bis dahin erbrachten Dienstleistungen anteiligen Wertersatz. Es gelten unsere{" "}
        <EmailLink href={rechtsUrl(rechtsPfade.agb, appUrl)}>AGB</EmailLink> und die{" "}
        <EmailLink href={rechtsUrl(rechtsPfade.widerruf, appUrl)}>Widerrufsbelehrung</EmailLink> (Stand{" "}
        {rechtstexteStand}).
      </EmailSmall>
    </BaseEmail>
  );
}

export async function sendMentoringBestaetigung(props: Props): Promise<SendResult> {
  const istLive = props.produkt === "live";
  const r = await sendEmail({
    to: props.email,
    // Betreff W01 bzw. Q01 (E-Mail-Playbook 1.0), Absender Emre, Antworten ans Team.
    subject: istLive ? "Du bist bei den Live-Tradings dabei." : "Du bist dabei. Willkommen bei Capital Circle.",
    ...playbookAbsender(),
    jsx: (
      <MentoringBestaetigungEmail
        firstName={props.firstName}
        produkt={props.produkt}
        raten={props.raten}
        rateCents={props.rateCents}
        gesamtCents={props.gesamtCents}
        liveBis={props.liveBis}
        setPasswordUrl={props.setPasswordUrl}
        liveStart={props.liveStart}
        naechsteZahlung={props.naechsteZahlung}
      />
    ),
    log: {
      userId: props.userId,
      recipientEmail: props.email,
      // Je Kauf eine eigene Sequenz: Der Log ist eindeutig über (Adresse,
      // Sequenz, Schritt), und ein zweites Programm derselben Person darf
      // nicht als „schon verschickt" gelten.
      sequence: `mentoring_kauf:${props.kaufId}`,
      step: 0,
    },
  });
  if (!r.skipped) {
    await vermerkeGesendet(createServiceClient(), {
      vorlage: istLive ? "Q01" : "W01",
      bezug: `kauf:${props.kaufId}`,
      email: props.email,
      userId: props.userId,
      resendId: r.resendMessageId,
    });
  }
  return r;
}
