/**
 * Verhindert den Next.js-Fehler:
 * "You cannot use different slug names for the same dynamic path ('courseSlug' !== 'segment')"
 *
 * Entsteht, wenn unter app/(platform)/ausbildung/ neben [segment] noch leere Ordner
 * [courseSlug] oder [moduleId] liegen (z. B. nach manuellem Aufräumen).
 *
 * Ausführen: npm run check:routes
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const base = path.join(__dirname, "..", "app", "(platform)", "ausbildung");

if (!fs.existsSync(base)) {
  console.log("check-ausbildung-routes: Ordner ausbildung nicht gefunden, übersprungen.");
  process.exit(0);
}

const forbidden = new Set(["[courseSlug]", "[moduleId]"]);
const entries = fs.readdirSync(base, { withFileTypes: true });
const bad = entries.filter((e) => e.isDirectory() && forbidden.has(e.name));

if (bad.length > 0) {
  const abs = bad.map((b) => path.join(base, b.name));
  console.error(
    "\n❌ Ausbildung: Verbotene dynamische Ordner (Konflikt mit [segment]):\n",
    abs.map((p) => `   ${p}`).join("\n"),
    "\n\nLöschen (PowerShell):\n",
    abs.map((p) => `   Remove-Item -LiteralPath '${p.replace(/'/g, "''")}' -Recurse -Force`).join("\n"),
    "\n",
  );
  process.exit(1);
}

console.log("check-ausbildung-routes: OK (keine [courseSlug]/[moduleId] auf oberster ausbildung-Ebene).");
