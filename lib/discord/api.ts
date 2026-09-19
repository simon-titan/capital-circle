/**
 * Dünne Hülle um die Discord-REST-API (Bot-Authentifizierung).
 *
 * Übernommen aus dem Schwesterprojekt MoonTrading, angepasst an Capital
 * Circle. Kein Dauerprozess, kein discord.js: Jeder Aufruf ist ein `fetch`
 * gegen die REST-API v10, und zwar aus ganz gewöhnlichen Vercel-Funktionen
 * (Stripe-Webhook, Nachtlauf, Adminbereich).
 *
 * ── Warum diese Datei `lib/discord/roles.ts` ablöst ────────────────────────
 *
 * Dort lagen vier `fetch`-Aufrufe ohne jede Wartelogik. Discord drosselt pro
 * Route (429) und liefert in `retry_after` die Zeit, die man warten soll. Ohne
 * diese Wartezeit bricht ein Abgleich über den Bestand mitten drin ab und
 * hinterlässt einen halb gesetzten Zustand, und ein Webhook, der genau in eine
 * Drosselung läuft, verliert seine Rollenänderung still. Hier gibt es die
 * Wartelogik genau einmal, und alles andere geht durch sie hindurch.
 *
 * ── Was die Aufrufer wissen müssen ─────────────────────────────────────────
 *
 * Die Funktionen, die ein Mensch anstösst (Einrichtungsläufe, Adminseiten),
 * **werfen** bei einem Fehler: Ein stilles `null` hiesse dort „nichts da" und
 * führte zu doppelten Nachrichten. Die Funktionen, die in Webhooks und im
 * Nachtlauf hängen (`sendeDirektnachricht`, `postChannelMessage`), **werfen
 * nie**: Eine Nachricht darf den Vorgang nicht aufhalten, an dem sie hängt.
 */

const BASE = "https://discord.com/api/v10";

/** Discord liefert nie mehr als 1000 Mitglieder je Abruf. */
const MEMBER_PAGE = 1000;

/** Sicherheitsnetz gegen eine Endlosschleife, falls `after` nicht vorankommt. */
const MAX_MEMBER_PAGES = 50;

/** Discords Obergrenze für den Text einer Nachricht. */
const NACHRICHT_MAX = 2000;

export interface GuildMember {
  id: string;
  /** Der eindeutige Discord-Benutzername. */
  username: string;
  /** Frei wählbarer Anzeigename — NICHT eindeutig. */
  globalName: string | null;
  /** Servername (Nickname), ebenfalls nicht eindeutig. */
  nick: string | null;
  roles: string[];
  /** Wann die Person dem Server beigetreten ist, ISO-Zeitpunkt. */
  joinedAt: string | null;
}

export class DiscordNotConfiguredError extends Error {
  constructor() {
    super("DISCORD_GUILD_ID und DISCORD_BOT_TOKEN müssen gesetzt sein.");
    this.name = "DiscordNotConfiguredError";
  }
}

function config(): { guildId: string; botToken: string } {
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  const botToken = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!guildId || !botToken) throw new DiscordNotConfiguredError();
  return { guildId, botToken };
}

export function discordBotConfigured(): boolean {
  return Boolean(process.env.DISCORD_GUILD_ID?.trim() && process.env.DISCORD_BOT_TOKEN?.trim());
}

const schlafe = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Ein Aufruf mit Wartelogik. Bei 429 nennt Discord in `retry_after` die Zeit
 * in Sekunden — die wird abgewartet, statt zu raten, bis zu fünfmal. 5xx wird
 * dreimal wiederholt, mit wachsendem Abstand, weil das üblicherweise vorübergeht.
 *
 * Ein echter Netzwerkfehler (DNS, Abbruch) wirft, wie `fetch` selbst. Wer
 * „wirft nie" verspricht, fängt ihn beim Aufrufer.
 */
async function anfrage(pfad: string, init: RequestInit = {}, versuch = 0): Promise<Response> {
  const { botToken } = config();
  const res = await fetch(`${BASE}${pfad}`, {
    ...init,
    headers: {
      Authorization: `Bot ${botToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 429 && versuch < 5) {
    const body = (await res.clone().json().catch(() => ({}))) as { retry_after?: number };
    await schlafe(Math.ceil((body.retry_after ?? 1) * 1000) + 100);
    return anfrage(pfad, init, versuch + 1);
  }
  if (res.status >= 500 && versuch < 3) {
    await schlafe(500 * (versuch + 1));
    return anfrage(pfad, init, versuch + 1);
  }
  return res;
}

type RohMitglied = {
  user?: { id?: string; username?: string; global_name?: string | null; bot?: boolean };
  nick?: string | null;
  roles?: string[];
  joined_at?: string | null;
};

function mitgliedAus(m: RohMitglied): GuildMember | null {
  if (!m.user?.id) return null;
  return {
    id: m.user.id,
    username: m.user.username ?? "",
    globalName: m.user.global_name ?? null,
    nick: m.nick ?? null,
    roles: m.roles ?? [],
    joinedAt: m.joined_at ?? null,
  };
}

/**
 * Alle Servermitglieder, seitenweise über den `after`-Cursor.
 *
 * **Braucht die privilegierte „Server Members Intent"** im Developer Portal.
 * Ohne sie antwortet Discord mit 403 und der Meldung `Missing Access` — was
 * wie ein fehlendes Recht aussieht, aber keins ist. Deshalb eine eigene
 * Fehlermeldung.
 *
 * **Wirft** bei jedem Fehler. Die alte Fassung brach bei einem Fehler still ab
 * und lieferte, was bis dahin da war — eine halbe Liste, die aussieht wie eine
 * ganze. Für einen Rauswurf, der „nicht auf dem Server" als Grund liest, wäre
 * das die gefährlichste aller Antworten.
 */
export async function listGuildMembers(): Promise<GuildMember[]> {
  const { guildId } = config();
  const alle: GuildMember[] = [];
  let after: string | undefined;

  for (let seite = 0; seite < MAX_MEMBER_PAGES; seite++) {
    const q = new URLSearchParams({ limit: String(MEMBER_PAGE) });
    if (after) q.set("after", after);

    const res = await anfrage(`/guilds/${guildId}/members?${q}`);
    if (res.status === 403) {
      throw new Error(
        "Discord verweigert die Mitgliederliste (403). Fast immer fehlt die privilegierte " +
          "Server-Members-Intent im Developer Portal → Bot → Privileged Gateway Intents.",
      );
    }
    if (!res.ok) {
      throw new Error(`Mitgliederliste fehlgeschlagen (${res.status}): ${await res.text()}`);
    }

    const rohdaten = (await res.json()) as RohMitglied[];

    for (const m of rohdaten) {
      if (m.user?.bot) continue;
      const mitglied = mitgliedAus(m);
      if (mitglied) alle.push(mitglied);
    }

    if (rohdaten.length < MEMBER_PAGE) return alle;
    after = rohdaten[rohdaten.length - 1]?.user?.id;
    if (!after) return alle;
  }

  return alle;
}

/** Alle Rollen des Servers, um IDs zu Namen aufzulösen. Wirft bei einem Fehler. */
export async function listGuildRoles(): Promise<Array<{ id: string; name: string; position: number }>> {
  const { guildId } = config();
  const res = await anfrage(`/guilds/${guildId}/roles`);
  if (!res.ok) throw new Error(`Rollenliste fehlgeschlagen (${res.status}): ${await res.text()}`);
  const rohdaten = (await res.json()) as Array<{ id?: string; name?: string; position?: number }>;
  return rohdaten
    .filter((r) => r.id)
    .map((r) => ({ id: r.id!, name: r.name ?? "", position: r.position ?? 0 }));
}

/**
 * Ein einzelnes Mitglied. `null`, wenn es nicht (mehr) im Server ist — das ist
 * ein normaler Zustand, kein Fehler: Wer selbst austritt, verschwindet hier.
 * Jeder andere Fehler **wirft**, damit „nicht lesbar" nie wie „nicht da" aussieht.
 */
export async function getGuildMember(discordUserId: string): Promise<GuildMember | null> {
  const { guildId } = config();
  const res = await anfrage(`/guilds/${guildId}/members/${discordUserId}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Mitglied ${discordUserId} lesen fehlgeschlagen (${res.status}): ${await res.text()}`);
  }
  return mitgliedAus((await res.json()) as RohMitglied);
}

/** Was ein Rauswurf tatsächlich getan hat. Der Aufrufer muss das unterscheiden. */
export type RauswurfErgebnis =
  | { art: "entfernt" }
  | { art: "war_nicht_da" }
  | { art: "keine_berechtigung" }
  | { art: "fehler"; status: number; text: string };

/**
 * Jemanden vom Server entfernen.
 *
 * ── Genau ein Aufrufer, und der soll es bleiben ────────────────────────────
 *
 * Bis zum 19.09.2026 warf `app/api/discord/disconnect` jeden vom Server, der
 * auf „Trennen" drückte, ohne zu prüfen, ob ein Abo läuft. Im Schwesterprojekt
 * hat genau diese Stelle einen zahlenden Kunden erwischt, der nur seine
 * Verknüpfung erneuern wollte. Seitdem entzieht Trennen nur noch Rollen.
 *
 * Der Rauswurf lebt ausschliesslich im Nachtlauf nach der Karenz
 * (`lib/discord/aufraeumen.ts`), und dort stehen die Schranken, die ihn
 * sicher machen: Obergrenze je Nacht, Schutzrollen, Abschiedsnachricht vorher,
 * Abbruch bei 403. **Wer diese Funktion an einer zweiten Stelle aufruft,
 * umgeht alle davon.**
 *
 * ── Warum 403 ein eigener Fall ist ─────────────────────────────────────────
 *
 * Ohne die Berechtigung `Kick Members` antwortet Discord mit 403, ebenso wenn
 * die Zielperson eine höhere Rolle trägt als der Bot. Beides ist eine
 * Einstellung und kein Ausfall, und es muss als solche auf dem Bildschirm
 * stehen.
 */
export async function kickGuildMember(discordUserId: string, grund?: string): Promise<RauswurfErgebnis> {
  const { guildId } = config();
  const res = await anfrage(`/guilds/${guildId}/members/${discordUserId}`, {
    method: "DELETE",
    // Landet im Discord-Prüfprotokoll. Ohne ihn steht dort nur, dass jemand
    // entfernt wurde, und niemand weiss mehr, warum.
    headers: grund ? { "X-Audit-Log-Reason": encodeURIComponent(grund).slice(0, 512) } : undefined,
  });

  if (res.ok || res.status === 204) return { art: "entfernt" };
  if (res.status === 404) return { art: "war_nicht_da" };
  if (res.status === 403) return { art: "keine_berechtigung" };
  return { art: "fehler", status: res.status, text: await res.text() };
}

/** Was beim Beitritt tatsächlich passiert ist — der Aufrufer muss das unterscheiden können. */
export type BeitrittErgebnis =
  | { art: "hinzugefuegt" }
  | { art: "schon_mitglied" }
  | { art: "fehler"; status: number; text: string };

/**
 * Nimmt jemanden per OAuth-Zugriffstoken in den Server auf (Scope `guilds.join`).
 *
 * 201 heisst aufgenommen, 204 laut Doku „war schon drin". Auf 204 ist kein
 * Verlass — mit aktiver Mitgliedschaftsprüfung antwortet Discord auch bei einem
 * echten Neuzugang mit 204. Der Aufrufer setzt die Rollen deshalb danach
 * einzeln: Bei 204 ignoriert Discord das `roles`-Feld im Rumpf ohnehin.
 *
 * Stehen Rollen im Rumpf, die der Bot nicht vergeben darf (falsche ID, oder die
 * Rolle steht über der Bot-Rolle), scheitert der **gesamte** Beitritt mit 403.
 * Deshalb kommt der Antworttext mit zurück.
 */
export async function addGuildMember(
  discordUserId: string,
  accessToken: string,
  roleIds: string[],
): Promise<BeitrittErgebnis> {
  const { guildId } = config();
  const res = await anfrage(`/guilds/${guildId}/members/${discordUserId}`, {
    method: "PUT",
    body: JSON.stringify({ access_token: accessToken, roles: roleIds }),
  });

  if (res.status === 201) return { art: "hinzugefuegt" };
  if (res.status === 204) return { art: "schon_mitglied" };
  return { art: "fehler", status: res.status, text: await res.text() };
}

/** Eine Rolle setzen. Wirft bei einem Fehler. */
export async function addRole(discordUserId: string, roleId: string): Promise<void> {
  const { guildId } = config();
  const res = await anfrage(`/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`, {
    method: "PUT",
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Rolle ${roleId} setzen fehlgeschlagen (${res.status}): ${await res.text()}`);
  }
}

/** Eine Rolle entziehen. 404 heisst: Mitglied oder Rolle gibt es nicht mehr — Ziel erreicht. */
export async function removeRole(discordUserId: string, roleId: string): Promise<void> {
  const { guildId } = config();
  const res = await anfrage(`/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204 && res.status !== 404) {
    throw new Error(`Rolle ${roleId} entziehen fehlgeschlagen (${res.status}): ${await res.text()}`);
  }
}

/** Ein Knopf unter einer Nachricht. Discord nimmt höchstens fünf je Zeile. */
export interface Knopf {
  customId: string;
  label: string;
}

/**
 * Die Knopfzeile, wie Discord sie erwartet.
 *
 * Steht an einer Stelle, weil sie an zweien gebraucht wird: unter einer
 * Direktnachricht (Zahlungsfall) und unter der angepinnten Nachricht im
 * Warteraum. Ein falsch gebauter Baustein scheitert **beim Nutzer**, nicht bei
 * uns: Discord weist die Nachricht ab, und niemand erfährt davon.
 */
function knopfZeile(knoepfe?: Knopf[]) {
  if (!knoepfe?.length) return {};
  return {
    components: [
      {
        type: 1,
        components: knoepfe.slice(0, 5).map((k) => ({
          type: 2,
          // 2 = sekundär. Ein Rückweg ist keine Kaufaufforderung.
          style: 2,
          custom_id: k.customId.slice(0, 100),
          label: k.label.slice(0, 80),
        })),
      },
    ],
  };
}

/** SUPPRESS_EMBEDS. Discords Bitmaske für Nachrichten-Flags. */
const OHNE_VORSCHAU = 4;

/**
 * Niemanden erwähnen, auch nicht aus Versehen. Ein `@everyone` in einem
 * Kundennamen oder einer Admin-Antwort pingt sonst den ganzen Server an.
 */
const KEINE_ERWAEHNUNGEN = { allowed_mentions: { parse: [] as string[] } };

/**
 * Direktnachricht an einen Nutzer.
 *
 * ── Warum das ohne neue Berechtigung geht ───────────────────────────────────
 *
 * Eine Direktnachricht braucht **keine** Server-Berechtigung, nur das
 * Bot-Token und einen gemeinsamen Server mit dem Empfänger. Zwei Aufrufe sind
 * nötig: erst einen DM-Kanal öffnen (idempotent), dann hineinschreiben.
 *
 * ── Warum ein `false` und keine Ausnahme ────────────────────────────────────
 *
 * Ob jemand Direktnachrichten von Servermitgliedern zulässt, ist seine eigene
 * Einstellung und serverseitig nicht abfragbar. Discord antwortet dann mit 403.
 * Das ist eine Absage, kein Fehler, und sie darf den Vorgang nicht aufhalten,
 * an dem sie hängt: **Die Mail ist der verlässliche Weg, die Direktnachricht
 * die Zugabe.**
 *
 * **Wirft nie**, auch nicht bei fehlender Einrichtung oder einem
 * Netzwerkfehler. Gibt `true` zurück, wenn die Nachricht zugestellt wurde.
 *
 * Vorschaukarten sind abgeschaltet: Eine Nachricht mit Zahllink und
 * Kontoadresse bekäme sonst zwei bildschirmhohe Karten, unter denen der Text
 * verschwindet.
 */
export async function sendeDirektnachricht(
  discordUserId: string,
  inhalt: string,
  /**
   * Knöpfe unter der Nachricht. Ein Knopf ist der einzige Rückweg, den es
   * gibt: Frei getippte Antworten kann der Bot nicht lesen (dafür bräuchte es
   * das privilegierte Message-Content-Intent und einen Dauerprozess), eine
   * gedrückte Schaltfläche stellt Discord uns dagegen als Interaktion zu.
   */
  knoepfe?: Knopf[],
): Promise<boolean> {
  if (!discordBotConfigured()) return false;

  try {
    const kanal = await anfrage("/users/@me/channels", {
      method: "POST",
      body: JSON.stringify({ recipient_id: discordUserId }),
    });

    if (!kanal.ok) {
      console.warn(`[discord] DM-Kanal für ${discordUserId} nicht zu öffnen (${kanal.status})`);
      return false;
    }

    const { id } = (await kanal.json()) as { id: string };
    const res = await anfrage(`/channels/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({
        content: inhalt.slice(0, NACHRICHT_MAX),
        flags: OHNE_VORSCHAU,
        ...KEINE_ERWAEHNUNGEN,
        ...knopfZeile(knoepfe),
      }),
    });

    if (!res.ok) {
      console.warn(`[discord] DM an ${discordUserId} nicht zustellbar (${res.status})`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[discord] DM an ${discordUserId} nicht zustellbar (Netzwerkfehler):`, err);
    return false;
  }
}

export interface PostNachricht {
  content: string;
  /** Knöpfe unter der Nachricht, für die angepinnte Erklärung im Warteraum. */
  knoepfe?: Knopf[];
  /**
   * Keine Link-Vorschaukarten unter der Nachricht (`flags: 4`, SUPPRESS_EMBEDS).
   *
   * Umgesetzt über das Flag und nicht über spitze Klammern um die Adresse: Die
   * Klammern sind Textauszeichnung, die beim nächsten Umformulieren jemand
   * vergisst, das Flag gilt für die ganze Nachricht.
   */
  ohneVorschau?: boolean;
}

export type PostErgebnis = { messageId: string } | null;

/** Postet eine Nachricht in einen Kanal. **Wirft nie**, `null` bei einem Fehler. */
export async function postChannelMessage(channelId: string, nachricht: PostNachricht): Promise<PostErgebnis> {
  if (!discordBotConfigured()) return null;

  let res: Response;
  try {
    res = await anfrage(`/channels/${channelId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        content: nachricht.content.slice(0, NACHRICHT_MAX),
        ...KEINE_ERWAEHNUNGEN,
        ...knopfZeile(nachricht.knoepfe),
        ...(nachricht.ohneVorschau ? { flags: OHNE_VORSCHAU } : {}),
      }),
    });
  } catch (err) {
    console.warn(`[discord] Nachricht an Kanal ${channelId} nicht zustellbar (Netzwerkfehler): ${(err as Error).message}`);
    return null;
  }

  if (!res.ok) {
    console.warn(`[discord] Nachricht an Kanal ${channelId} nicht zustellbar (${res.status}): ${await res.text()}`);
    return null;
  }

  const { id } = (await res.json()) as { id: string };
  return { messageId: id };
}

/**
 * Eine eigene Nachricht bearbeiten. **Wirft** — läuft nur im
 * Einrichtungslauf, dessen Ausgabe ein Mensch liest.
 */
export async function editChannelMessage(
  channelId: string,
  messageId: string,
  nachricht: PostNachricht,
): Promise<void> {
  const res = await anfrage(`/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({
      content: nachricht.content.slice(0, NACHRICHT_MAX),
      ...KEINE_ERWAEHNUNGEN,
      /*
        `components` wird ausdrücklich immer mitgeschickt, auch leer. Ein PATCH
        ohne das Feld lässt die alten Knöpfe stehen, und sie zeigten auf eine
        Kennung, die der Endpunkt vielleicht nicht mehr kennt.
      */
      components: knopfZeile(nachricht.knoepfe).components ?? [],
      /*
        Beim Bearbeiten muss das Flag mitgeschickt werden. Eine Nachricht, die
        einmal ohne es gepostet wurde, trägt ihre Vorschaukarten sonst weiter.
      */
      flags: nachricht.ohneVorschau ? OHNE_VORSCHAU : 0,
    }),
  });
  if (!res.ok) {
    throw new Error(`Nachricht ${messageId} nicht änderbar (${res.status}): ${await res.text()}`);
  }
}

/** Eine Nachricht anpinnen. Ein zweites Mal anpinnen ist unschädlich. Wirft. */
export async function pinMessage(channelId: string, messageId: string): Promise<void> {
  const res = await anfrage(`/channels/${channelId}/messages/pins/${messageId}`, { method: "PUT" });
  // 409 heisst: hängt schon. Das Ziel ist erreicht.
  if (!res.ok && res.status !== 204 && res.status !== 409) {
    throw new Error(`Nachricht ${messageId} nicht anpinnbar (${res.status}): ${await res.text()}`);
  }
}

/** Die eigene Bot-Kennung, um eigene Nachrichten von fremden zu unterscheiden. Wirft. */
export async function getBotUserId(): Promise<string> {
  const res = await anfrage("/users/@me");
  if (!res.ok) throw new Error(`Bot-Konto nicht lesbar (${res.status}): ${await res.text()}`);
  return ((await res.json()) as { id: string }).id;
}

/** Eine Nachricht aus einem Kanal, so weit wir sie hier brauchen. */
export interface KanalNachricht {
  id: string;
  authorId: string;
  /** Discords Nachrichtentyp. 0 ist eine gewöhnliche, 6 die Anpinn-Meldung. */
  typ: number;
  pinned: boolean;
  /** Die `custom_id`s der Knöpfe darunter, zum Wiedererkennen eigener Nachrichten. */
  knopfIds: string[];
}

/**
 * Die letzten Nachrichten eines Kanals.
 *
 * Der Einrichtungslauf des Warteraums sucht seine eigene Nachricht hier und
 * nicht nur unter den angepinnten: Löst jemand die Anheftung, ohne zu löschen,
 * fände er sonst nichts und postete eine zweite Erklärung. **Wirft.**
 */
export async function listChannelMessages(channelId: string, limit = 50): Promise<KanalNachricht[]> {
  const res = await anfrage(`/channels/${channelId}/messages?limit=${Math.min(limit, 100)}`);
  if (!res.ok) {
    throw new Error(`Nachrichten in ${channelId} nicht lesbar (${res.status}): ${await res.text()}`);
  }
  const daten = (await res.json()) as Array<{
    id: string;
    type?: number;
    pinned?: boolean;
    author?: { id: string };
    components?: Array<{ components?: Array<{ custom_id?: string }> }>;
  }>;
  return daten.map((m) => ({
    id: m.id,
    authorId: m.author?.id ?? "",
    typ: m.type ?? 0,
    pinned: Boolean(m.pinned),
    knopfIds: (m.components ?? []).flatMap((z) => (z.components ?? []).map((b) => b.custom_id ?? "")).filter(Boolean),
  }));
}

/** Eine Nachricht löschen. 404 heisst: schon weg, Ziel erreicht. Wirft. */
export async function deleteChannelMessage(channelId: string, messageId: string): Promise<void> {
  const res = await anfrage(`/channels/${channelId}/messages/${messageId}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204 && res.status !== 404) {
    throw new Error(`Nachricht ${messageId} nicht löschbar (${res.status}): ${await res.text()}`);
  }
}
