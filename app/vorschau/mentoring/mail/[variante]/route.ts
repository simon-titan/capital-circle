import { render } from "@react-email/render";
import * as React from "react";
import { PRODUKTE, rateCents } from "@/config/mentoring";
import MentoringBestaetigungEmail from "@/lib/email/templates/mentoring-bestaetigung";
import { findeVariante } from "../../varianten";

/**
 * Kaufbestätigung als HTML (`/vorschau/mentoring/mail/<variante>`), genau so,
 * wie sie nach dem Kauf verschickt wird — mit Beispieldaten statt eines
 * echten Kaufs. Die Mail ist zugleich die Vertragsbestätigung (§ 312f BGB),
 * deshalb gehört sie in die Abnahme.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ variante: string }> }) {
  const { variante } = await params;
  const v = findeVariante(variante);
  if (!v || v.zustand !== "offen") return new Response("Nicht gefunden", { status: 404 });

  const produkt = PRODUKTE[v.produkt];
  const liveBis =
    produkt.liveMonate != null
      ? (() => {
          const d = new Date();
          d.setMonth(d.getMonth() + produkt.liveMonate);
          return d.toISOString();
        })()
      : null;

  const html = await render(
    React.createElement(MentoringBestaetigungEmail, {
      firstName: "Max",
      produkt: v.produkt,
      raten: v.raten,
      rateCents: v.raten > 1 ? rateCents(produkt.preisCents, v.raten) : null,
      gesamtCents: produkt.preisCents,
      liveBis,
      setPasswordUrl: "#vorschau",
    }),
  );

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-robots-tag": "noindex, nofollow",
      "cache-control": "no-store",
    },
  });
}
