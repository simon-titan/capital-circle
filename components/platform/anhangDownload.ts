/**
 * Download eines Anhangs (Lektions-PDF, Arsenal-Datei) über `/api/attachment-url`.
 *
 * Liefert `null` bei Erfolg, sonst einen Satz für den Toast. Die signierte URL wird erst geöffnet,
 * wenn die Route sie ausgestellt hat — die prüft vorher, ob die Datei in R2 liegt. So landet
 * niemand mehr auf der rohen `NoSuchKey`-XML-Seite von Cloudflare.
 */
export async function ladeAnhang(id: string, filename: string): Promise<string | null> {
  let json: { ok?: boolean; url?: string; error?: string } = {};
  try {
    const res = await fetch(`/api/attachment-url?id=${encodeURIComponent(id)}`);
    json = (await res.json()) as typeof json;
  } catch {
    return "Download fehlgeschlagen. Bitte prüfe deine Verbindung und versuch es noch einmal.";
  }

  if (!json.ok || !json.url) {
    console.error(json.error ?? "attachment-url failed");
    switch (json.error) {
      case "datei_fehlt":
        return "Diese Datei ist gerade nicht verfügbar. Wir sind dran und stellen sie wieder bereit.";
      case "forbidden":
        return "Diese Datei ist in deiner Mitgliedschaft nicht enthalten.";
      case "unauthorized":
        return "Bitte melde dich erneut an.";
      default:
        return "Download fehlgeschlagen. Bitte versuch es noch einmal.";
    }
  }

  const a = document.createElement("a");
  a.href = json.url;
  a.download = filename;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
  return null;
}
