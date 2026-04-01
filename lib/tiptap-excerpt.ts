import type { JSONContent } from "@tiptap/core";

/** Kurzer Teaser aus TipTap-JSON; bei Klartext-Fallback String kürzen. */
export function plainTextFromTiptapJson(jsonStr: string, maxLen = 200): string {
  try {
    const doc = JSON.parse(jsonStr) as JSONContent;
    const parts: string[] = [];
    const walk = (n: JSONContent | undefined) => {
      if (!n) return;
      if (typeof n.text === "string") parts.push(n.text);
      if (Array.isArray(n.content)) n.content.forEach(walk);
    };
    walk(doc);
    const s = parts.join(" ").replace(/\s+/g, " ").trim();
    if (s.length <= maxLen) return s;
    return `${s.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
  } catch {
    const s = jsonStr.replace(/\s+/g, " ").trim();
    if (s.length <= maxLen) return s;
    return `${s.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
  }
}
