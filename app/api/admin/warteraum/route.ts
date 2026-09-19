import { NextResponse } from "next/server";
import { warteraumNachricht, WARTERAUM_KNOPF } from "@/config/warteraum";
import { cronBefugt } from "@/lib/cron/auth";
import {
  deleteChannelMessage,
  discordBotConfigured,
  editChannelMessage,
  getBotUserId,
  listChannelMessages,
  pinMessage,
  postChannelMessage,
} from "@/lib/discord/api";
import { getAppUrl } from "@/lib/site-url";
import { requireAdminRole } from "@/lib/supabase/admin-auth";
import { KNOPF_ZAHLUNG_MELDEN } from "@/lib/zahlung/fall";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Die angepinnte Erklärung im Warteraum setzen oder angleichen.
 *
 * Übernommen aus MoonTrading. Bedienung: `npm run discord:warteraum`
 * (Probelauf) und `-- --write` (scharf).
 *
 * ── Er postet höchstens eine Nachricht ──────────────────────────────────────
 *
 * Vorher werden die letzten Nachrichten des Kanals gelesen. Steht dort eine
 * eigene mit dem Knopf `zahlung_melden`, wird sie **bearbeitet** (und nur
 * angepinnt, wenn sie es nicht mehr ist); sonst wird eine neue gepostet und
 * angepinnt. Erkannt wird sie am Knopf, nicht am Text: Der Text ändert sich,
 * die Kennung nicht. Eine von einem Menschen gepinnte Nachricht wird nicht
 * angefasst, nur gemeldet.
 *
 * ── Zugang ──────────────────────────────────────────────────────────────────
 *
 * `Authorization: Bearer $CRON_SECRET` (fail-closed) oder eine Admin-Sitzung.
 * Er schreibt sichtbar auf den Server.
 */

function kanalId(): string | null {
  return process.env.DISCORD_WAITING_ROOM_CHANNEL_ID?.trim() || null;
}

function inhalt() {
  return {
    content: warteraumNachricht(getAppUrl()),
    knoepfe: [{ customId: KNOPF_ZAHLUNG_MELDEN, label: WARTERAUM_KNOPF }],
    ohneVorschau: true,
  };
}

async function befugt(request: Request): Promise<NextResponse | null> {
  if (cronBefugt(request)) return null;
  const { error } = await requireAdminRole("admin");
  return error;
}

async function standImKanal(kanal: string) {
  const [botId, nachrichten] = await Promise.all([getBotUserId(), listChannelMessages(kanal)]);
  const eigene = nachrichten.find((m) => m.authorId === botId && m.knopfIds.includes(KNOPF_ZAHLUNG_MELDEN)) ?? null;
  // Discord legt bei jedem Anheften eine Systemnachricht ab (Typ 6). In einem
  // Kanal, der genau eine Erklärung enthalten soll, ist das Beifang.
  const beifang = nachrichten.filter((m) => m.typ === 6 && m.authorId === botId).map((m) => m.id);
  const fremdePins = nachrichten.filter((m) => m.pinned && m.authorId !== botId).map((m) => m.id);
  return { eigene, beifang, fremdePins };
}

function voraussetzung(): NextResponse | null {
  if (!kanalId()) {
    return NextResponse.json({ ok: false, error: "DISCORD_WAITING_ROOM_CHANNEL_ID ist nicht gesetzt." }, { status: 400 });
  }
  if (!discordBotConfigured()) {
    return NextResponse.json({ ok: false, error: "Discord-Bot ist nicht eingerichtet." }, { status: 400 });
  }
  return null;
}

/** Probelauf: zeigt den Text und was der scharfe Lauf tun würde. */
export async function GET(request: Request) {
  const nein = await befugt(request);
  if (nein) return nein;
  const fehlt = voraussetzung();
  if (fehlt) return fehlt;
  const kanal = kanalId()!;

  try {
    const { eigene, beifang, fremdePins } = await standImKanal(kanal);
    return NextResponse.json({
      ok: true,
      probe: true,
      kanal,
      eigeneNachricht: eigene?.id ?? null,
      angeheftet: eigene?.pinned ?? false,
      aufraeumen: beifang.length,
      fremdePins,
      wuerde: eigene
        ? eigene.pinned
          ? "bestehende Nachricht angleichen"
          : "bestehende Nachricht angleichen und wieder anheften"
        : "neue Nachricht posten und anheften",
      knopf: { customId: KNOPF_ZAHLUNG_MELDEN, label: WARTERAUM_KNOPF },
      text: inhalt().content,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}

/** Scharf: postet oder gleicht an und pinnt. */
export async function POST(request: Request) {
  const nein = await befugt(request);
  if (nein) return nein;
  const fehlt = voraussetzung();
  if (fehlt) return fehlt;
  const kanal = kanalId()!;

  try {
    const { eigene, beifang } = await standImKanal(kanal);

    // Der Beifang zuerst weg. Ein Fehler dabei hält den Lauf nicht an.
    let aufgeraeumt = 0;
    for (const id of beifang) {
      try {
        await deleteChannelMessage(kanal, id);
        aufgeraeumt++;
      } catch (err) {
        console.warn(`[warteraum] Systemnachricht ${id} nicht löschbar:`, err);
      }
    }

    if (eigene) {
      await editChannelMessage(kanal, eigene.id, inhalt());
      if (!eigene.pinned) await pinMessage(kanal, eigene.id);
      return NextResponse.json({
        ok: true,
        aktion: eigene.pinned ? "angeglichen" : "angeglichen und angeheftet",
        messageId: eigene.id,
        aufgeraeumt,
        kanal,
      });
    }

    const gepostet = await postChannelMessage(kanal, inhalt());
    if (!gepostet) {
      return NextResponse.json(
        {
          ok: false,
          error: "Discord hat die Nachricht abgelehnt. Meist fehlt dem Bot in diesem Kanal das Recht „Nachrichten senden“.",
        },
        { status: 502 },
      );
    }

    await pinMessage(kanal, gepostet.messageId);
    return NextResponse.json({ ok: true, aktion: "gepostet", messageId: gepostet.messageId, aufgeraeumt, kanal });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
