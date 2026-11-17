/**
 * Minimaler ZIP-Schreiber (Verfahren „stored", ohne Kompression) für die
 * Exporte — rein, ohne Abhängigkeit (Tests: `zip.test.ts`).
 *
 * Warum keine Bibliothek: Die Exporte bestehen aus wenigen CSV-Dateien im
 * Kilobyte-Bereich; Kompression bringt nichts, und das ZIP-Format ohne
 * Kompression ist ein fester, kleiner Rahmen (lokaler Kopf, Zentralverzeichnis,
 * Endsatz, CRC-32). So bleiben `package.json`/`package-lock.json` unberührt,
 * während parallel an der App gearbeitet wird. Dateinamen mit UTF-8-Flag
 * (Bit 11), Zeitstempel in UTC.
 */

const CRC_TABELLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(daten: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < daten.length; i++) c = CRC_TABELLE[(c ^ daten[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export type ZipDatei = { name: string; daten: Uint8Array };

function dosZeit(d: Date): { zeit: number; datum: number } {
  return {
    zeit: (d.getUTCHours() << 11) | (d.getUTCMinutes() << 5) | Math.floor(d.getUTCSeconds() / 2),
    datum: ((Math.max(1980, d.getUTCFullYear()) - 1980) << 9) | ((d.getUTCMonth() + 1) << 5) | d.getUTCDate(),
  };
}

export function zipStored(dateien: ZipDatei[], zeitpunkt = new Date()): Uint8Array {
  const enc = new TextEncoder();
  const { zeit, datum } = dosZeit(zeitpunkt);
  const lokal: Uint8Array[] = [];
  const zentral: Uint8Array[] = [];
  let versatz = 0;

  for (const f of dateien) {
    const name = enc.encode(f.name);
    const crc = crc32(f.daten);
    const groesse = f.daten.length;

    const kopf = new DataView(new ArrayBuffer(30));
    kopf.setUint32(0, 0x04034b50, true);
    kopf.setUint16(4, 20, true); // benötigte Version 2.0
    kopf.setUint16(6, 0x0800, true); // UTF-8-Namen
    kopf.setUint16(8, 0, true); // stored
    kopf.setUint16(10, zeit, true);
    kopf.setUint16(12, datum, true);
    kopf.setUint32(14, crc, true);
    kopf.setUint32(18, groesse, true);
    kopf.setUint32(22, groesse, true);
    kopf.setUint16(26, name.length, true);
    kopf.setUint16(28, 0, true);
    lokal.push(new Uint8Array(kopf.buffer), name, f.daten);

    const z = new DataView(new ArrayBuffer(46));
    z.setUint32(0, 0x02014b50, true);
    z.setUint16(4, 20, true);
    z.setUint16(6, 20, true);
    z.setUint16(8, 0x0800, true);
    z.setUint16(10, 0, true);
    z.setUint16(12, zeit, true);
    z.setUint16(14, datum, true);
    z.setUint32(16, crc, true);
    z.setUint32(20, groesse, true);
    z.setUint32(24, groesse, true);
    z.setUint16(28, name.length, true);
    z.setUint16(30, 0, true);
    z.setUint16(32, 0, true);
    z.setUint16(34, 0, true);
    z.setUint16(36, 0, true);
    z.setUint32(38, 0, true);
    z.setUint32(42, versatz, true);
    zentral.push(new Uint8Array(z.buffer), name);

    versatz += 30 + name.length + groesse;
  }

  const zentralGroesse = zentral.reduce((s, b) => s + b.length, 0);
  const ende = new DataView(new ArrayBuffer(22));
  ende.setUint32(0, 0x06054b50, true);
  ende.setUint16(4, 0, true);
  ende.setUint16(6, 0, true);
  ende.setUint16(8, dateien.length, true);
  ende.setUint16(10, dateien.length, true);
  ende.setUint32(12, zentralGroesse, true);
  ende.setUint32(16, versatz, true);
  ende.setUint16(20, 0, true);

  const teile = [...lokal, ...zentral, new Uint8Array(ende.buffer)];
  const gesamt = new Uint8Array(teile.reduce((s, b) => s + b.length, 0));
  let p = 0;
  for (const t of teile) {
    gesamt.set(t, p);
    p += t.length;
  }
  return gesamt;
}

/** Liest ein von `zipStored` geschriebenes Archiv (für Tests und die Gegenprobe vor dem Ausliefern). */
export function leseZipStored(zip: Uint8Array): ZipDatei[] {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let e = zip.length - 22;
  while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error("ZIP: Endsatz fehlt");
  const anzahl = v.getUint16(e + 10, true);
  let p = v.getUint32(e + 16, true);
  const dec = new TextDecoder();
  const out: ZipDatei[] = [];
  for (let i = 0; i < anzahl; i++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error("ZIP: Zentralverzeichnis kaputt");
    const crc = v.getUint32(p + 16, true);
    const groesse = v.getUint32(p + 24, true);
    const nameLaenge = v.getUint16(p + 28, true);
    const extra = v.getUint16(p + 30, true);
    const kommentar = v.getUint16(p + 32, true);
    const lokal = v.getUint32(p + 42, true);
    const name = dec.decode(zip.subarray(p + 46, p + 46 + nameLaenge));
    const lokalName = v.getUint16(lokal + 26, true);
    const lokalExtra = v.getUint16(lokal + 28, true);
    const start = lokal + 30 + lokalName + lokalExtra;
    const daten = zip.slice(start, start + groesse);
    if (crc32(daten) !== crc) throw new Error(`ZIP: CRC von ${name} stimmt nicht`);
    out.push({ name, daten });
    p += 46 + nameLaenge + extra + kommentar;
  }
  return out;
}
