const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function moduleHref(module: { id: string; slug: string | null }): string {
  const seg = module.slug?.trim() || module.id;
  return `/ausbildung/${encodeURIComponent(seg)}`;
}

export function isUuidParam(param: string): boolean {
  return UUID_RE.test(param);
}
