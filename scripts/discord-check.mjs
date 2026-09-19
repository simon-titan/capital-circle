/**
 * Kann der Bot Mitgliedschaften, Warteraum und Rauswurf verwalten?
 * Eine Prüfung, die **nichts ändert** (ausser mit `--rollentest`).
 *
 * Übernommen aus MoonTrading. Rollenvergabe läuft im Stripe-Webhook und im
 * Nachtlauf und scheitert dort **absichtlich lautlos** (die Datenbank ist die
 * Wahrheit, Discord wird nachgezogen). Ein Bot ohne die nötigen Rechte sieht
 * deshalb genauso aus wie ein Bot, bei dem gerade niemand kündigt. Dieses
 * Skript sagt es vorher.
 *
 * Was stimmen muss:
 *
 *   1. **Server Members Intent** (Developer Portal → Bot → Privileged Gateway
 *      Intents). Ohne sie antwortet Discord auf die Mitgliederliste mit 403
 *      „Missing Access". Daran hängen Bestandsabgleich, Warteraum-Netz und
 *      Rauswurf.
 *   2. **Manage Roles.** Ohne sie bleibt jede Kündigung folgenlos.
 *   3. **Kick Members**, nur für den Rauswurf nach der Karenz. Fehlt sie, bricht
 *      der Nachtlauf beim ersten Fälligen mit 403 ab — kein Schaden, aber auch
 *      kein Aufräumen.
 *   4. **Die Rollenposition.** Discord erlaubt einem Bot nur Rollen, die
 *      **unter** seiner höchsten Rolle stehen. Die Berechtigung stimmt, die
 *      Reihenfolge nicht — und die Antwort ist in beiden Fällen 403.
 *   5. **Der Warteraum-Kanal**: Mit nur `@everyone` + „Zugang pausiert" darf
 *      genau dieser eine Kanal sichtbar sein, lesbar, aber ohne Schreibrecht.
 *      Das Skript rechnet es aus den Kanalrechten durch, statt zu raten.
 *   6. **DISCORD_PUBLIC_KEY** für den Knopf-Rückweg.
 *   7. **Die Schutzrollen** aus `config/discord.ts`: Fehlt eine davon auf dem
 *      Server, hält der Rauswurf-Lauf vollständig an.
 *
 * Aufruf:
 *   npm run discord:check
 *   npm run discord:check -- --rollentest <discord-id>
 *
 * Der Rollentest ist der einzige Teil, der etwas ändert, und er nimmt es sofort
 * wieder zurück: Er setzt die Mitgliederrolle und entzieht sie. **Nimm dafür
 * dein eigenes Konto, nicht das eines Kunden.**
 */

import dotenv from "dotenv";
import path from "node:path";
import { existsSync } from "node:fs";
import { register } from "node:module";

for (const file of [".env.local", ".env"]) {
  const full = path.resolve(process.cwd(), file);
  if (existsSync(full)) dotenv.config({ path: full, override: false });
}

// Erlaubt den Import von `config/discord.ts` (Schutzrollen, eine Quelle).
register("./ts-loader.mjs", import.meta.url);

const BASE = "https://discord.com/api/v10";

const GUILD = process.env.DISCORD_GUILD_ID?.trim();
const TOKEN = process.env.DISCORD_BOT_TOKEN?.trim();

if (!GUILD || !TOKEN) {
  console.error("DISCORD_GUILD_ID und DISCORD_BOT_TOKEN fehlen in .env.local.");
  process.exit(1);
}

function arg(name, fallback = undefined) {
  const mitWert = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (mitWert) return mitWert.split("=").slice(1).join("=");
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1) {
    const next = process.argv[idx + 1];
    return next && !next.startsWith("--") ? next : true;
  }
  return fallback;
}

const rollentest = arg("rollentest", null);

async function hole(pfad, init = {}) {
  return fetch(`${BASE}${pfad}`, {
    ...init,
    headers: {
      Authorization: `Bot ${TOKEN}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
}

/* Discords Berechtigungen sind ein Bitfeld als Zeichenkette. BigInt, weil die
   Werte über 2^53 hinausgehen und `Number` sie still verfälschen würde. */
const RECHT = {
  KICK_MEMBERS: 1n << 1n,
  ADMINISTRATOR: 1n << 3n,
  MANAGE_GUILD: 1n << 5n,
  VIEW_CHANNEL: 1n << 10n,
  SEND_MESSAGES: 1n << 11n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  MANAGE_ROLES: 1n << 28n,
  CREATE_PUBLIC_THREADS: 1n << 35n,
  CREATE_PRIVATE_THREADS: 1n << 36n,
  SEND_MESSAGES_IN_THREADS: 1n << 38n,
};

const ok = (b) => (b ? "  ja " : " NEIN");
const zeile = (label, gut, satz) => console.log(`${ok(gut)}  ${String(label).padEnd(30)} ${satz ?? ""}`);

let fehlerhaft = false;
const merke = (gut) => {
  if (!gut) fehlerhaft = true;
  return gut;
};

console.log("\n── Discord-Bot, Prüfung ───────────────────────────────────────\n");

/* 1. Wer ist der Bot. Zugleich die Probe, ob das Token gültig ist. */
const meRes = await hole("/users/@me");
if (!meRes.ok) {
  console.error(`Token ungültig oder Discord nicht erreichbar (${meRes.status}): ${await meRes.text()}`);
  process.exit(1);
}
const me = await meRes.json();
console.log(`Bot:    ${me.username} (${me.id})`);

const guildRes = await hole(`/guilds/${GUILD}`);
if (!guildRes.ok) {
  console.error(`Server nicht lesbar (${guildRes.status}). Ist der Bot auf diesem Server?`);
  process.exit(1);
}
const guild = await guildRes.json();
console.log(`Server: ${guild.name} (${GUILD})\n`);

/* 2. Rollen samt Position und Rechten. Höhere `position` = mächtiger. */
const rollenRes = await hole(`/guilds/${GUILD}/roles`);
if (!rollenRes.ok) {
  console.error(`Rollenliste nicht lesbar (${rollenRes.status}): ${await rollenRes.text()}`);
  process.exit(1);
}
const rollen = await rollenRes.json();
const rollePerId = new Map(rollen.map((r) => [r.id, r]));

/* 3. Der Bot als Mitglied, um an seine eigenen Rollen zu kommen. */
const botRes = await hole(`/guilds/${GUILD}/members/${me.id}`);
if (!botRes.ok) {
  console.error(`Der Bot steht nicht als Mitglied auf dem Server (${botRes.status}).`);
  process.exit(1);
}
const botMitglied = await botRes.json();
const botRollen = (botMitglied.roles ?? []).map((id) => rollePerId.get(id)).filter(Boolean);

let rechte = 0n;
for (const r of [...botRollen, rollePerId.get(GUILD) /* @everyone trägt die Server-ID */].filter(Boolean)) {
  rechte |= BigInt(r.permissions ?? "0");
}
const hat = (bit) => (rechte & RECHT.ADMINISTRATOR) !== 0n || (rechte & bit) !== 0n;

const botPosition = botRollen.reduce((max, r) => Math.max(max, r.position ?? 0), 0);
const hoechste = [...botRollen].sort((a, b) => (b.position ?? 0) - (a.position ?? 0))[0];
console.log(`Höchste Bot-Rolle: ${hoechste?.name ?? "keine"} (Position ${botPosition})\n`);

console.log("Rechte");
zeile("Administrator", (rechte & RECHT.ADMINISTRATOR) !== 0n, "übertrifft alles darunter");
merke(hat(RECHT.MANAGE_ROLES));
zeile("Manage Roles", hat(RECHT.MANAGE_ROLES), "Mitglieder- und Warteraumrolle setzen und entziehen");
merke(hat(RECHT.KICK_MEMBERS));
zeile("Kick Members", hat(RECHT.KICK_MEMBERS), "Rauswurf nach der Karenz (ohne: Nachtlauf bricht mit 403 ab)");
zeile("Manage Guild", hat(RECHT.MANAGE_GUILD), "nicht nötig, nur zur Auskunft");

/* 4. Die Rollen aus der Umgebung, jede gegen die Position des Bots. */
function pruefeRolle(label, envName, pflicht) {
  const id = (process.env[envName] ?? "").trim();
  if (!id) {
    if (pflicht) merke(false);
    zeile(label, !pflicht, pflicht ? `${envName} nicht gesetzt` : `${envName} nicht gesetzt (optional)`);
    return null;
  }
  const r = rollePerId.get(id);
  if (!r) {
    merke(false);
    zeile(label, false, `Rolle ${id} gibt es auf dem Server nicht`);
    return null;
  }
  const drunter = (r.position ?? 0) < botPosition;
  merke(drunter);
  zeile(`${label}: ${r.name}`, drunter, drunter ? `Position ${r.position}, unter dem Bot` : `Position ${r.position}, NICHT unter dem Bot`);
  return r;
}

console.log("\nRollen");
pruefeRolle("Mitgliederrolle", "DISCORD_ROLE_ID", true);
const warteraumRolle = pruefeRolle("Warteraum", "DISCORD_WAITING_ROOM_ROLE_ID", false);
pruefeRolle("Funnel-Rolle", "DISCORD_FUNNEL_ROLE_ID", false);

if (warteraumRolle) {
  const wr = BigInt(warteraumRolle.permissions ?? "0");
  if (wr !== 0n) {
    console.log("  Hinweis: Die Warteraumrolle trägt eigene Server-Rechte. Vorgesehen sind keine,");
    console.log("           alles regeln die Kanalrechte.");
  }
  if (warteraumRolle.hoist) {
    console.log("  Hinweis: Die Warteraumrolle ist auf „Mitglieder getrennt anzeigen“ gestellt.");
    console.log("           Dann sieht jedes Mitglied, wer gerade nicht bezahlt hat.");
  }
}

/* 5. Schutzrollen aus `config/discord.ts`. */
console.log("\nSchutzrollen (config/discord.ts)");
try {
  const { SCHUTZROLLEN } = await import("../config/discord.ts");
  const norm = (s) => String(s ?? "").trim().toLowerCase();
  for (const name of SCHUTZROLLEN) {
    const gefunden = rollen.find((r) => norm(r.name) === norm(name));
    merke(Boolean(gefunden));
    zeile(name, Boolean(gefunden), gefunden ? "auf dem Server vorhanden" : "FEHLT — der Rauswurf-Lauf hält an, bis das stimmt");
  }
  console.log(`  Alle Rollen auf dem Server: ${rollen.filter((r) => r.id !== GUILD).map((r) => r.name).join(", ")}`);
} catch (err) {
  console.log(`  config/discord.ts nicht lesbar (${err.message}). Mit „npm run discord:check“ starten.`);
}

/* 6. Die Mitgliederliste — der einzige Weg, die privilegierte Intent zu prüfen. */
console.log("\nMitgliederliste");
const memRes = await hole(`/guilds/${GUILD}/members?limit=1`);
if (memRes.status === 403) {
  merke(false);
  zeile("Server Members Intent", false, "403, fehlt im Developer Portal unter Bot → Privileged Gateway Intents");
} else if (!memRes.ok) {
  merke(false);
  zeile("Server Members Intent", false, `${memRes.status}: ${(await memRes.text()).slice(0, 120)}`);
} else {
  zeile("Server Members Intent", true, "Mitgliederliste ist lesbar");
}

/* 7. Was ein Mitglied im Warteraum tatsächlich sieht. Durchgerechnet aus
      Basisrechten und Kanal-Überschreibungen, für ein gedachtes Mitglied mit
      nur `@everyone` und der Warteraumrolle. */
const kanalId = (process.env.DISCORD_WAITING_ROOM_CHANNEL_ID ?? "").trim();
console.log("\nWarteraum-Kanal");
if (!warteraumRolle) {
  zeile("Kanalrechte", true, "übersprungen, keine Warteraumrolle gesetzt");
} else {
  const kanaeleRes = await hole(`/guilds/${GUILD}/channels`);
  if (!kanaeleRes.ok) {
    merke(false);
    zeile("Kanalliste", false, `${kanaeleRes.status}`);
  } else {
    const kanaele = await kanaeleRes.json();
    const everyone = rollePerId.get(GUILD);
    const basis = BigInt(everyone?.permissions ?? "0") | BigInt(warteraumRolle.permissions ?? "0");

    function rechteIm(kanal) {
      if ((basis & RECHT.ADMINISTRATOR) !== 0n) return ~0n;
      let p = basis;
      const ow = kanal.permission_overwrites ?? [];
      const e = ow.find((o) => o.id === GUILD);
      if (e) p = (p & ~BigInt(e.deny)) | BigInt(e.allow);
      const w = ow.find((o) => o.id === warteraumRolle.id);
      if (w) p = (p & ~BigInt(w.deny)) | BigInt(w.allow);
      return p;
    }

    // Typ 4 ist eine Kategorie; Text (0), Ankündigung (5), Forum (15), Sprache (2).
    const sichtbar = kanaele.filter((k) => k.type !== 4 && (rechteIm(k) & RECHT.VIEW_CHANNEL) !== 0n);
    console.log(`  Sichtbar mit nur „${warteraumRolle.name}“: ${sichtbar.length} Kanal/Kanäle`);
    for (const k of sichtbar) {
      const p = rechteIm(k);
      const schreibt = (p & RECHT.SEND_MESSAGES) !== 0n;
      const thread =
        (p & (RECHT.CREATE_PUBLIC_THREADS | RECHT.CREATE_PRIVATE_THREADS | RECHT.SEND_MESSAGES_IN_THREADS)) !== 0n;
      const verlauf = (p & RECHT.READ_MESSAGE_HISTORY) !== 0n;
      console.log(
        `   - #${k.name} (${k.id})${verlauf ? "" : "  OHNE Nachrichtenverlauf"}${schreibt ? "  DARF SCHREIBEN" : ""}${thread ? "  DARF THREADS" : ""}`,
      );
    }

    if (!kanalId) {
      zeile("DISCORD_WAITING_ROOM_CHANNEL_ID", false, "nicht gesetzt — ohne Kanal-ID kann die Erklärung nicht gepostet werden");
      merke(false);
    } else {
      const kanal = kanaele.find((k) => k.id === kanalId);
      if (!kanal) {
        merke(false);
        zeile("Warteraum-Kanal", false, `Kanal ${kanalId} gibt es auf dem Server nicht`);
      } else {
        const p = rechteIm(kanal);
        const sieht = (p & RECHT.VIEW_CHANNEL) !== 0n;
        const liest = (p & RECHT.READ_MESSAGE_HISTORY) !== 0n;
        const schreibt =
          (p & (RECHT.SEND_MESSAGES | RECHT.CREATE_PUBLIC_THREADS | RECHT.CREATE_PRIVATE_THREADS | RECHT.SEND_MESSAGES_IN_THREADS)) !== 0n;
        merke(sieht && liest && !schreibt);
        zeile(`#${kanal.name}`, sieht && liest && !schreibt, sieht ? (liest ? (schreibt ? "sichtbar, aber schreibbar" : "sichtbar, lesbar, ohne Schreibrecht") : "sichtbar, aber OHNE Nachrichtenverlauf") : "NICHT sichtbar");
        const andere = sichtbar.filter((k) => k.id !== kanalId);
        if (andere.length > 0) {
          console.log(`  Hinweis: Neben dem Warteraum sind ${andere.length} weitere Kanäle sichtbar (siehe oben).`);
          console.log("           Für jede Kategorie mit solchen Kanälen „Zugang pausiert“ → Kanal ansehen: verweigert.");
        }
      }
    }
  }
}

/* 8. Was nicht am Server hängt, sondern an der Umgebung. */
console.log("\nInteraktionen (Knopf-Rückweg)");
const pk = (process.env.DISCORD_PUBLIC_KEY ?? "").trim();
const pkGut = /^[0-9a-f]{64}$/i.test(pk);
merke(pkGut);
zeile(
  "DISCORD_PUBLIC_KEY",
  pkGut,
  pk ? (pkGut ? "gesetzt, 64 Hex-Zeichen" : "gesetzt, aber kein 64-stelliger Hex-Wert — ist das die Application-ID?") : "fehlt lokal, ohne ihn antwortet der Endpunkt mit 401",
);

/* 9. Der Beweis statt der Vermutung. Optional, weil er etwas ändert. */
if (typeof rollentest === "string") {
  console.log("\nRollentest");
  const testRolle = (process.env.DISCORD_ROLE_ID ?? "").trim();
  if (!testRolle) {
    console.log("  Übersprungen: DISCORD_ROLE_ID ist leer.");
  } else {
    const vorher = await hole(`/guilds/${GUILD}/members/${rollentest}`);
    if (!vorher.ok) {
      console.log(`  ${rollentest} ist nicht auf dem Server (${vorher.status}).`);
    } else {
      const hatteSchon = ((await vorher.json()).roles ?? []).includes(testRolle);
      if (hatteSchon) {
        console.log("  Übersprungen: Dieses Konto trägt die Mitgliederrolle bereits, sie würde ihm sonst genommen.");
      } else {
        const setzen = await hole(`/guilds/${GUILD}/members/${rollentest}/roles/${testRolle}`, { method: "PUT" });
        merke(setzen.ok || setzen.status === 204);
        zeile("Rolle setzen", setzen.ok || setzen.status === 204, `${setzen.status}`);

        const nehmen = await hole(`/guilds/${GUILD}/members/${rollentest}/roles/${testRolle}`, { method: "DELETE" });
        merke(nehmen.ok || nehmen.status === 204);
        zeile("Rolle entziehen", nehmen.ok || nehmen.status === 204, `${nehmen.status}`);
      }
    }
  }
}

console.log(
  fehlerhaft
    ? "\nErgebnis: NICHT vollständig. Die Zeilen mit NEIN oben sind der Grund.\n"
    : "\nErgebnis: Der Bot kann Mitgliedschaften, Warteraum und Rauswurf verwalten.\n",
);

process.exit(fehlerhaft ? 1 : 0);
