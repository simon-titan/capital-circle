/**
 * Discord-Rollen-Bestandsabgleich (CLI). Ruft dieselbe Logik wie
 * `app/api/admin/discord/sync/route.ts` auf, aber direkt gegen die DB/Discord —
 * praktisch für Cron/manuelle Kontrolle ohne eingeloggte Admin-Session.
 *
 * Aufruf:
 *   node scripts/discord-role-sync.mjs            (Dry-Run, Standard)
 *   node scripts/discord-role-sync.mjs --apply     (Abweichungen wirklich beheben)
 */

import { existsSync } from "node:fs";
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

for (const file of [".env.local", ".env"]) {
  const full = path.resolve(process.cwd(), file);
  if (existsSync(full)) {
    dotenv.config({ path: full, override: false });
  }
}

// Erlaubt den direkten Import der .ts-Quellen (Alias @/ + Extension-Auflösung).
register("./ts-loader.mjs", import.meta.url);

const apply = process.argv.includes("--apply");

const { reconcileDiscordRoles } = await import("../lib/discord/reconcile.ts");

console.log(`\nDiscord-Rollen-Bestandsabgleich (${apply ? "APPLY" : "Dry-Run"})\n`);

try {
  const result = await reconcileDiscordRoles({ apply, triggeredBy: "script" });

  console.log(`Geprüft: ${result.checkedCount}`);
  console.log(`Behoben: ${result.fixedCount}`);

  const mismatches = result.details.filter((d) => d.desired !== d.actual);
  if (mismatches.length === 0) {
    console.log("\n✅ Keine Abweichungen gefunden.\n");
  } else {
    console.log(`\n${mismatches.length} Abweichung(en):\n`);
    for (const m of mismatches) {
      const status = m.fixed ? "behoben" : apply ? "FEHLER" : "würde beheben";
      console.log(
        `  - user=${m.userId} discord=${m.discordUserId} soll=${m.desired} ist=${m.actual} → ${status}${m.note ? ` (${m.note})` : ""}`,
      );
    }
    console.log();
  }

  if (!apply && mismatches.length > 0) {
    console.log("Dry-Run — keine Änderungen vorgenommen. Mit --apply ausführen, um zu beheben.\n");
  }

  process.exit(0);
} catch (err) {
  console.error("❌ Bestandsabgleich fehlgeschlagen:", err instanceof Error ? err.message : err);
  process.exit(1);
}
