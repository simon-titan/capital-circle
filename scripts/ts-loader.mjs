/**
 * Minimaler ESM-Resolve-Hook, damit Node-Scripts die TypeScript-Quellen des
 * Projekts direkt importieren können.
 *
 * Node ab 22.6 entfernt Typannotationen selbst (--experimental-strip-types).
 * Was fehlt, ist die Auflösung zweier Konventionen, die Bundler mitbringen,
 * Node aber nicht:
 *   - der Pfad-Alias `@/…` aus tsconfig.json
 *   - extensionslose Importe (`./csv` → `./csv.ts`)
 *
 * Das Laden und Transpilieren übernimmt danach Node.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Erste existierende Kandidatendatei zurückgeben. */
function firstExisting(base) {
  const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")];
  return candidates.find((c) => c.endsWith(".ts") || c.endsWith(".tsx") ? existsSync(c) : false);
}

export async function resolve(specifier, context, nextResolve) {
  let absolute = null;

  if (specifier.startsWith("@/")) {
    absolute = path.join(ROOT, specifier.slice(2));
  } else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    absolute = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }

  if (absolute) {
    const resolved = firstExisting(absolute);
    if (resolved) {
      // Kein `format` setzen: Node erkennt .ts selbst und entfernt die Typen.
      return { url: pathToFileURL(resolved).href, shortCircuit: true };
    }
  }

  return nextResolve(specifier, context);
}
