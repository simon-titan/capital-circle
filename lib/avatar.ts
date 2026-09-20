/**
 * Bildadresse für ein Profilbild.
 *
 * In `profiles.avatar_url` steht zweierlei: ein Speicherschlüssel aus unserem
 * Upload (`avatars/<userId>/<datei>`) oder eine fertige Adresse, etwa das
 * Discord-Bild aus dem OAuth-Rundgang. Ein Schlüssel muss über
 * `/api/avatar-url` signiert werden, eine Adresse geht direkt ins `src`.
 *
 * `null` heißt: kein Bild. Die Oberfläche zeigt dann ihre Initialen-Variante,
 * statt ein kaputtes Bild zu laden.
 */
export function avatarSrc(wert: string | null | undefined): string | undefined {
  const roh = wert?.trim();
  if (!roh) return undefined;
  if (/^https?:\/\//i.test(roh) || roh.startsWith("data:")) return roh;
  if (roh.startsWith("avatars/")) return `/api/avatar-url?key=${encodeURIComponent(roh)}`;
  return undefined;
}
