import type { CSSProperties } from "react";

/*
 * Guilloche wie auf Banknoten und Wertpapieren — keine Bilddatei, sondern
 * Kurven, die hier aus ihrer Formel entstehen. Jede Linie trägt `pathLength=1`,
 * damit die Zeichen-Animation (`stroke-dashoffset` 1 → 0, Klassen in
 * `ZertifikatGrund.tsx`) unabhängig von der echten Länge funktioniert.
 *
 * Reine Funktionen, deterministisch: Server und Browser rechnen dieselben
 * Pfade, es gibt also keinen Hydration-Unterschied.
 */

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Eine Rosettenlinie: Kreis mit Radius `basis`, dessen Rand mit `blaetter`
 * Wellen um `amplitude` schwingt; eine zweite, langsamere Welle (`moire`)
 * lässt die übereinanderliegenden Linien das typische Moiré bilden.
 */
function rosettenPfad(basis: number, amplitude: number, blaetter: number, phase: number, moire: number, punkte = 720): string {
  let d = "";
  for (let i = 0; i <= punkte; i++) {
    const t = (i / punkte) * Math.PI * 2;
    const r = basis + amplitude * Math.sin(blaetter * t + phase) + amplitude * 0.35 * Math.sin(moire * t - phase * 1.7);
    const x = r * Math.cos(t);
    const y = r * Math.sin(t);
    d += `${i === 0 ? "M" : "L"}${r2(x)} ${r2(y)}`;
  }
  return `${d}Z`;
}

type RosettenLinie = { d: string; gold: boolean; verzoegerung: number };

/** Die Linien einer Rosette, von innen nach außen. Drei Ringe, jeder aus versetzten Linien. */
export function rosettenLinien(): RosettenLinie[] {
  const ringe = [
    { basis: 92, amplitude: 14, blaetter: 12, moire: 5, linien: 10, gold: true },
    { basis: 170, amplitude: 22, blaetter: 18, moire: 7, linien: 14, gold: false },
    { basis: 262, amplitude: 18, blaetter: 30, moire: 11, linien: 12, gold: false },
    { basis: 326, amplitude: 7, blaetter: 60, moire: 3, linien: 4, gold: true },
  ];
  const linien: RosettenLinie[] = [];
  let n = 0;
  for (const ring of ringe) {
    for (let j = 0; j < ring.linien; j++) {
      const phase = (j / ring.linien) * Math.PI * 2;
      linien.push({
        d: rosettenPfad(ring.basis + j * 0.9, ring.amplitude, ring.blaetter, phase, ring.moire),
        gold: ring.gold,
        verzoegerung: n * 45,
      });
      n++;
    }
  }
  return linien;
}

const ROSETTE = rosettenLinien();

/**
 * Die große Rosette hinter der Headline bzw. im Abschluss. `zeichnen` lässt
 * die Linien sich beim Laden einmal ziehen, danach dreht sich alles langsam.
 */
export function Rosette({
  groesse,
  zeichnen = true,
  ton = "smaragd",
  style,
}: {
  groesse: string;
  zeichnen?: boolean;
  ton?: "smaragd" | "gold";
  style?: CSSProperties;
}) {
  return (
    <svg
      aria-hidden
      viewBox="-340 -340 680 680"
      className="cz-rosette"
      style={{ width: groesse, height: groesse, ...style }}
      fill="none"
    >
      <g className="cz-dreht">
        {ROSETTE.map((linie, i) => (
          <path
            key={i}
            d={linie.d}
            pathLength={1}
            className={zeichnen ? "cz-zieht" : undefined}
            style={zeichnen ? { animationDelay: `${linie.verzoegerung}ms` } : undefined}
            stroke={
              ton === "gold"
                ? "rgba(232, 192, 148, 0.55)"
                : linie.gold
                  ? "rgba(232, 192, 148, 0.5)"
                  : "rgba(95, 199, 154, 0.42)"
            }
            strokeWidth={linie.gold ? 0.7 : 0.55}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    </svg>
  );
}

/** Wellenband (Banknotenrand) als Trenner zwischen Abschnitten. */
export function Wellenband({ linien = 7, hoehe = 28 }: { linien?: number; hoehe?: number }) {
  const breite = 1200;
  const pfade: string[] = [];
  for (let j = 0; j < linien; j++) {
    const phase = (j / linien) * Math.PI;
    let d = "";
    for (let x = 0; x <= breite; x += 6) {
      const y = hoehe / 2 + (hoehe / 2 - 2) * Math.sin((x / breite) * Math.PI * 2 * 9 + phase) * Math.sin((x / breite) * Math.PI);
      d += `${x === 0 ? "M" : "L"}${x} ${r2(y)}`;
    }
    pfade.push(d);
  }
  return (
    <svg aria-hidden viewBox={`0 0 ${breite} ${hoehe}`} preserveAspectRatio="none" className="cz-welle" style={{ width: "100%", height: `${hoehe}px`, display: "block" }} fill="none">
      {pfade.map((d, i) => (
        <path
          key={i}
          d={d}
          pathLength={1}
          stroke={i % 3 === 0 ? "rgba(232, 192, 148, 0.5)" : "rgba(95, 199, 154, 0.32)"}
          strokeWidth={0.8}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

/**
 * Das Siegel im Abschluss: Umschrift auf einem Kreis, innen eine kleine Rosette
 * und das Monogramm. Die Umschrift dreht sich sehr langsam.
 */
export function Siegel({ groesse = 168 }: { groesse?: number }) {
  const innen = rosettenLinien().slice(0, 10);
  return (
    <svg aria-hidden viewBox="-100 -100 200 200" style={{ width: groesse, height: groesse }} fill="none">
      <defs>
        <path id="cz-siegel-kreis" d="M -78 0 A 78 78 0 1 1 78 0 A 78 78 0 1 1 -78 0" />
      </defs>
      <circle r="96" stroke="rgba(232, 192, 148, 0.7)" strokeWidth="0.8" />
      <circle r="91" stroke="rgba(232, 192, 148, 0.35)" strokeWidth="0.6" />
      <circle r="64" stroke="rgba(232, 192, 148, 0.7)" strokeWidth="0.8" />
      <g className="cz-dreht-langsam">
        <text fill="rgba(232, 192, 148, 0.9)" fontSize="10.5" letterSpacing="3.2" style={{ fontFamily: "var(--font-inter)", fontWeight: 500 }}>
          <textPath href="#cz-siegel-kreis">CAPITAL CIRCLE · INSTITUT · KOSTENLOSES TRAINING ·</textPath>
        </text>
      </g>
      <g transform="scale(0.62)">
        {innen.map((l, i) => (
          <path key={i} d={l.d} stroke="rgba(95, 199, 154, 0.55)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fill="#f2f3f5"
        fontSize="34"
        style={{ fontFamily: "var(--font-zertifikat)", fontStyle: "italic" }}
      >
        CC
      </text>
    </svg>
  );
}
