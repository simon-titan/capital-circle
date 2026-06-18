<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Design System (Capital Circle)

**Vor jeder UI-/Style-Arbeit zuerst [`docs/design/README.md`](docs/design/README.md) lesen.** Das ist die navigierbare Design-Referenz: die zwei Stil-Modi (Plattform = Gold-only, Marketing/Funnel = Metall-Tier), Tokens (inkl. Abweichungen Spec↔Code), Komponenten, Hero-/Glass-Look und die Funnel-Page-Muster (`/insight`, `/bewerbung`).

**Maschinenlesbare Token-Quelle (SSOT):** `DESIGN.json` — Farben, Abstände, Komponenten-Tokens, Chakra-Mapping, CSS-Variablen. Werte hier nachschlagen; `docs/design/tokens.md` nennt, wo der Code davon abweicht (im Zweifel gilt der Code: `app/globals.css`, `theme/index.ts`).

**Typografie (verbindlich):**

| Rolle | Schrift | Einbindung |
|--------|---------|------------|
| Überschriften | **Radley** (serif, regular + italic) | Google Fonts `Radley:ital@0;1`, Klassen `.radley-regular` / `.radley-regular-italic`, `h1`–`h6`, Chakra `fonts.heading` |
| Fließtext & UI | **Inter** (variable, optical sizing) | Google Fonts Inter mit `ital,opsz,wght@…`, `body`, Klasse `.inter` (+ `.inter-medium` / `.inter-semibold` / `.inter-bold`), Chakra `fonts.body` |
| Zahlen / Code | **JetBrains Mono** | `.jetbrains-mono`, `fonts.mono` |

**Legacy:** Die Klasse `.dm-sans` ist ein Alias für Inter-Body (bestehende Komponenten); neue Markup soll `.inter` nutzen.

**Praxis:** Keine zusätzlichen Webfonts ohne Anpassung von `DESIGN.json` und `app/layout.tsx` (Font-`<link>`).

## UI Feedback Memo

Das aktuelle Dashboard-/Welcome-Redesign wurde vom Nutzer sehr positiv bewertet.
Bei weiteren Iterationen den visuellen Fokus auf die Hero-Qualität, klare Informationshierarchie und den Gold-Look beibehalten.
Änderungen weiterhin strikt an `DESIGN.json`, den bestehenden Gold-Tokens und der bestehenden Typografie ausrichten.
