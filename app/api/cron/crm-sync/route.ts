import { NextResponse } from "next/server";
import { NO_SHOW_ANRUF_MINUTEN } from "@/config/crm";
import { benachrichtigeCloser, crmBenachrichtigungenAktiv } from "@/lib/crm/benachrichtigung";
import { synchronisiereCrm } from "@/lib/crm/sync";
import { ladeTeam } from "@/lib/crm/zugang";
import { cronBefugt } from "@/lib/cron/auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Cron (alle 5 Minuten): CRM mit den Lead-Quellen abgleichen (`synchronisiereCrm`)
 * und — wenn `CRM_BENACHRICHTIGUNGEN=1` — den zuständigen Closer erinnern, wenn
 * ein Termin seit 15 Minuten läuft und noch auf „gebucht" steht (Playbook:
 * Anruf nach 15 Minuten, dann Status setzen). Je Termin einmal.
 */
export async function GET(request: Request) {
  if (!cronBefugt(request)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const service = createServiceClient();
  const ergebnis = await synchronisiereCrm(service);

  let erinnert = 0;
  if (crmBenachrichtigungenAktiv()) {
    const jetzt = Date.now();
    const { data: laufend } = await service
      .from("termine")
      .select("id, email, name, start_am")
      .eq("status", "gebucht")
      .lte("start_am", new Date(jetzt - NO_SHOW_ANRUF_MINUTEN * 60_000).toISOString())
      .gte("start_am", new Date(jetzt - 2 * 3_600_000).toISOString());
    const team = await ladeTeam(service);
    for (const t of (laufend ?? []) as { id: string; email: string; name: string | null; start_am: string }[]) {
      const { data: k } = await service.from("crm_kontakte").select("id, closer_id").eq("email", t.email).maybeSingle();
      const kontakt = k as { id: string; closer_id: string | null } | null;
      const closer = team.find((m) => m.user_id === kontakt?.closer_id);
      if (!kontakt || !closer) continue;
      // Einmal je Termin — der Vermerk im Zeitstrahl ist zugleich die Sperre.
      const { error } = await service
        .from("crm_aktivitaeten")
        .insert({ kontakt_id: kontakt.id, art: "system", text: "Erinnerung: Status setzen (15 Minuten nach Beginn)", ref: `erinnerung:${t.id}` });
      if (error) continue;
      await benachrichtigeCloser(closer, { art: "no_show", kontaktEmail: t.email, kontaktName: t.name, start: t.start_am, kontaktId: kontakt.id });
      erinnert++;
    }
  }
  return NextResponse.json({ ok: true, ...ergebnis, erinnert });
}
