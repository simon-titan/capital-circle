/**
 * Erkennt Abrufe von `/go/<plan>`, die kein Mensch ausgelöst hat.
 *
 * ── Warum es diese Datei gibt ───────────────────────────────────────────────
 *
 * `/go/<plan>` legt bei jedem GET eine echte Stripe-Checkout-Session an. Das
 * ist richtig, solange ein GET bedeutet, dass jemand geklickt hat. Genau das
 * ist nicht selbstverständlich: `next/link` holt interne Ziele vorsorglich ab,
 * sobald sie ins Bild kommen. Im Schwesterprojekt hat das über Monate 589 von
 * 729 Checkout-Sitzungen in Dreier- und Viererbündeln erzeugt, 715 davon liefen
 * unbenutzt ab, und die Abschlussquote stand bei 1,6 statt realistischer 20 bis
 * 40 Prozent.
 *
 * Der erste Riegel ist deshalb, dass die CTAs auf `/go/` als bares `<a href>`
 * gerendert werden und nie über `next/link` laufen. Das deckt unseren Router
 * ab. Es deckt nicht ab, was von außen kommt: Chromes Speculation Rules,
 * Linkvorschauen in Messengern, Virenscanner in Mailprogrammen. Die rufen eine
 * Adresse ab, ohne dass jemand sie öffnen wollte — und deklarieren sich dabei
 * in einer Kopfzeile. Deshalb prüft die Route zusätzlich selbst.
 *
 * Geprüft wird ausschließlich, was der Abrufende **selbst deklariert**. Wer
 * sich nicht deklariert, wird nicht erkannt, und das ist Absicht: Die
 * Alternative wäre Raten, und ein falsch geratener Vorabruf ist ein verlorener
 * Kauf.
 */

/**
 * Der Grund im Klartext, oder `null` für einen echten Aufruf.
 *
 * Ein bloßes „true" beantwortet im Protokoll später nicht, ob der Vorabruf vom
 * eigenen Router kam (dann steckt ein `next/link` an einer Stelle, wo keiner
 * hingehört) oder vom Browser des Besuchers (dann ist er normal und muss nur
 * abgefangen werden).
 *
 * `Sec-Purpose` ist der aktuelle Standard, `Purpose` und `X-Moz` die älteren
 * Formen aus Firefox und älteren Chrome-Fassungen, `Next-Router-Prefetch`
 * setzt der Next.js-Router selbst.
 */
export function vorabrufGrund(headers: Headers): string | null {
  const secPurpose = headers.get("sec-purpose")?.toLowerCase() ?? "";
  if (secPurpose.includes("prerender")) return "sec-purpose:prerender";
  if (secPurpose.includes("prefetch")) return "sec-purpose:prefetch";
  if (headers.get("next-router-prefetch") === "1") return "next-router";
  if (headers.get("purpose")?.toLowerCase() === "prefetch") return "purpose";
  if (headers.get("x-purpose")?.toLowerCase() === "preview") return "x-purpose";
  if (headers.get("x-moz")?.toLowerCase() === "prefetch") return "x-moz";
  return null;
}

/**
 * Offen deklarierte Bots und Linkprüfer.
 *
 * `app/robots.ts` sperrt `/go/` bereits, aber daran hält sich nur, wer will —
 * und wer es ignoriert, erzeugt dieselbe leere Kasse wie ein Vorabruf. Die
 * Liste bleibt bewusst grob: Sie trifft Zeichenketten, die kein Browser einer
 * echten Person sendet.
 */
const BOT_MUSTER = [
  "bot",
  "crawler",
  "spider",
  "slurp",
  "curl",
  "wget",
  "python-requests",
  "headlesschrome",
  "facebookexternalhit",
  "whatsapp",
  "telegrambot",
  "discordbot",
  "slackbot",
  "twitterbot",
  "linkedinbot",
  "embedly",
  "preview",
  "monitor",
  "uptime",
  "pingdom",
  "lighthouse",
];

export function istBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  if (!ua) return true; // Kein Browser schickt gar keinen User-Agent.
  return BOT_MUSTER.some((muster) => ua.includes(muster));
}
