const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function moduleHref(module: { id: string; slug: string | null }): string {
  const seg = module.slug?.trim() || module.id;
  return `/ausbildung/${encodeURIComponent(seg)}`;
}

/**
 * Query-Parameter für eine bestimmte Lektion. Ohne ihn öffnet die Modulseite
 * die zuletzt gesehene Lektion — mit ihm genau die verlangte (z. B. die Pfeile
 * in „Als nächstes“ auf dem Dashboard).
 */
export const LEKTION_PARAM = "lektion";

/** `/ausbildung/<modul>?lektion=<videoId>` — tiefer Link auf eine Lektion. */
export function lessonHref(module: { id: string; slug: string | null }, videoId: string): string {
  return `${moduleHref(module)}?${LEKTION_PARAM}=${encodeURIComponent(videoId)}`;
}

export function isUuidParam(param: string): boolean {
  return UUID_RE.test(param);
}
