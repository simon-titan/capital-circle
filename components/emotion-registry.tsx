"use client";

import createCache, { type EmotionCache } from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { useServerInsertedHTML } from "next/navigation";
import { useState, type ReactNode } from "react";

/**
 * Emotion-Registry für den App Router (Chakra UI v2 baut auf Emotion).
 *
 * Ohne sie rendert Emotion seine Styles beim Server-Rendern als `<style>`
 * **mitten in den Baum**, direkt vor das erste gestylte Element — darunter
 * Chakras globale CSS-Variablen (`data-emotion="css-global …"`). Der Browser
 * erwartet an der Stelle das Element selbst, React meldet „Hydration failed"
 * und baut die Seite im Client neu. Das trat sporadisch auf `/training`,
 * `/call`, `/termin` und der Zertifikat-Vorschau auf (06.11.2026).
 *
 * Mit `cache.compat = true` schreibt Emotion keine Inline-Styles mehr; die hier
 * gesammelten Styles gehen stattdessen über `useServerInsertedHTML` in den
 * Kopf des gestreamten HTML. `@chakra-ui/next-js` hilft dabei nicht mehr — sein
 * `CacheProvider` ist in v2.4 eine leere Hülle.
 */
export function EmotionRegistry({ children }: { children: ReactNode }) {
  const [{ cache, leeren }] = useState(() => {
    const cache: EmotionCache = createCache({ key: "css" });
    cache.compat = true;
    const original = cache.insert;
    let neu: { name: string; global: boolean }[] = [];
    cache.insert = (...args) => {
      const [selector, serialized] = args;
      if (cache.inserted[serialized.name] === undefined) {
        neu.push({ name: serialized.name, global: !selector });
      }
      return original(...args);
    };
    const leeren = () => {
      const bisher = neu;
      neu = [];
      return bisher;
    };
    return { cache, leeren };
  });

  useServerInsertedHTML(() => {
    const eingefuegt = leeren();
    if (eingefuegt.length === 0) return null;

    let styles = "";
    let attribut = cache.key;
    const globale: { name: string; style: string }[] = [];
    for (const { name, global } of eingefuegt) {
      const style = cache.inserted[name];
      if (typeof style !== "string") continue;
      if (global) {
        globale.push({ name, style });
      } else {
        styles += style;
        attribut += ` ${name}`;
      }
    }

    return (
      <>
        {globale.map(({ name, style }) => (
          <style key={name} data-emotion={`${cache.key}-global ${name}`} dangerouslySetInnerHTML={{ __html: style }} />
        ))}
        {styles ? <style data-emotion={attribut} dangerouslySetInnerHTML={{ __html: styles }} /> : null}
      </>
    );
  });

  return <CacheProvider value={cache}>{children}</CacheProvider>;
}
