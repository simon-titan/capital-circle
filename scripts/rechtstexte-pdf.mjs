/**
 * AGB als PDF unter fester Adresse (`public/rechtstexte/agb-<rechtstexteVersion>.pdf`).
 *
 *     npm run rechtstexte:pdf
 *
 * Wozu: Der Mentoringvertrag (SignWell) verweist auf genau eine Fassung der AGB.
 * `/agb` zeigt immer die aktuelle — die unterschriebene muss aber später noch
 * abrufbar sein. Deshalb nach **jeder** Erhöhung von `rechtstexteVersion` dieses
 * Skript laufen lassen und die neue PDF committen; alte PDFs bleiben liegen.
 *
 * Ablauf: rendert `app/agb/page.tsx` ohne Next (Link → <a>, RechtstextSeite →
 * schlichte Hülle) per tsx zu statischem HTML und druckt es mit Chrome headless.
 * Startet keinen Dev-Server.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(import.meta.dirname, "..");
const SITE = "https://www.capitalcircletrading.com";
const CHROME = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((p) => existsSync(p));
if (!CHROME) throw new Error("Chrome/Edge nicht gefunden");

const stamp = `${process.pid}-${Date.now()}`;
const druckSeite = join(ROOT, "scripts", `_agb_druck_${stamp}.tsx`);
const renderer = join(ROOT, "scripts", `_agb_render_${stamp}.tsx`);
const ausgabeJson = join(tmpdir(), `agb_${stamp}.json`);
const htmlDatei = join(tmpdir(), `agb_${stamp}.html`);

try {
  let src = readFileSync(join(ROOT, "app", "agb", "page.tsx"), "utf8");
  src = src
    .replace(/\r\n/g, "\n")
    .replace('import Link from "next/link";\n', "")
    .replace(
      'import { RechtstextSeite } from "@/components/legal/RechtstextSeite";\n',
      'function RechtstextSeite({ titel, einleitung, children }: { titel: string; einleitung?: string; children: React.ReactNode }) {\n  return (<main><h1>{titel}</h1>{einleitung ? <p className="lead">{einleitung}</p> : null}{children}</main>);\n}\n',
    )
    .replace('import type { Metadata } from "next";', 'import type { Metadata } from "next";\nimport type React from "react";')
    .replace(/<Link\b/g, "<a")
    .replace(/<\/Link>/g, "</a>");
  if (src.includes("<Link") || !src.includes("function RechtstextSeite")) throw new Error("AGB-Seite hat sich geändert, Umbau anpassen");
  writeFileSync(druckSeite, src);
  writeFileSync(
    renderer,
    `import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import AgbPage from "./${`_agb_druck_${stamp}`}";
import { rechtstexteVersion, rechtstexteStand } from "@/config/legal";
writeFileSync(${JSON.stringify(ausgabeJson)}, JSON.stringify({ html: renderToStaticMarkup(AgbPage()), version: rechtstexteVersion, stand: rechtstexteStand }));
`,
  );
  execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["--yes", "tsx", renderer], { cwd: ROOT, stdio: "inherit", shell: process.platform === "win32" });

  const { html, version, stand } = JSON.parse(readFileSync(ausgabeJson, "utf8"));
  const inhalt = html
    .replace(/href="\/(?!\/)/g, `href="${SITE}/`)
    .replace(/<ul class="rt-inhalt">[\s\S]*?<\/ul>/, "");
  const fuss = `Capital Circle · Allgemeine Geschäftsbedingungen · Fassung ${version} (Stand ${stand})`;
  writeFileSync(
    htmlDatei,
    `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>AGB Capital Circle ${version}</title><style>
@page { size: A4; margin: 20mm 20mm 22mm;
  @bottom-left { content: ${JSON.stringify(fuss)}; font: 7.5pt Inter, sans-serif; color: #8a8a8a; }
  @bottom-right { content: "Seite " counter(page) " von " counter(pages); font: 7.5pt Inter, sans-serif; color: #8a8a8a; } }
body { font-family: Inter, sans-serif; font-size: 9.4pt; line-height: 1.55; color: #3d3d3d; -webkit-print-color-adjust: exact; hyphens: auto; }
h1 { font-size: 24pt; font-weight: 600; letter-spacing: -0.03em; color: #141414; margin: 0 0 2mm; }
.lead { color: #737373; font-size: 10.5pt; margin: 0 0 3mm; }
.fassung { font-size: 8pt; color: #7d5f33; border: 1px solid #e6d6b8; background: #faf5ec; display: inline-block; padding: 1mm 2.5mm; margin-bottom: 4mm; }
h2 { font-size: 11.5pt; font-weight: 600; color: #141414; margin: 6mm 0 1.6mm; padding-top: 2.5mm; border-top: 1px solid #e4e4e4; break-after: avoid; }
h3 { font-size: 10pt; font-weight: 600; color: #141414; margin: 4mm 0 1mm; break-after: avoid; }
p { margin: 0 0 1.8mm; } ul, ol { margin: 0 0 2mm; padding-left: 5mm; } li { margin-bottom: 0.8mm; }
a { color: #7d5f33; text-decoration: none; } strong { color: #141414; font-weight: 600; }
table { border-collapse: collapse; width: 100%; margin: 2mm 0 3mm; font-size: 8.8pt; } th, td { border-bottom: 1px solid #e4e4e4; padding: 1.4mm 2mm 1.4mm 0; text-align: left; vertical-align: top; }
</style></head><body><div class="fassung">Fassung ${version}, Stand ${stand} · abrufbar unter ${SITE}/rechtstexte/agb-${version}.pdf</div>${inhalt}</body></html>`,
  );

  const zielOrdner = join(ROOT, "public", "rechtstexte");
  mkdirSync(zielOrdner, { recursive: true });
  const ziel = join(zielOrdner, `agb-${version}.pdf`);
  execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", `--print-to-pdf=${ziel}`, pathToFileURL(htmlDatei).href], {
    stdio: "ignore",
  });
  console.log(`PDF: ${ziel}`);
} finally {
  for (const f of [druckSeite, renderer, ausgabeJson, htmlDatei]) rmSync(f, { force: true });
}
