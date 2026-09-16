import { NextResponse } from "next/server";
import { DEFAULT_YOUTUBE_CHANNEL_ID, parseYoutubeFeed, youtubeFeedUrl } from "@/lib/journal/youtube";

/** Ein Upstream-Request pro Stunde für alle Nutzer zusammen. */
export const revalidate = 3600;

export async function GET() {
  const channelId = process.env.YOUTUBE_CHANNEL_ID?.trim() || DEFAULT_YOUTUBE_CHANNEL_ID;

  try {
    const response = await fetch(youtubeFeedUrl(channelId), {
      next: { revalidate },
      headers: { Accept: "application/atom+xml" },
    });

    if (!response.ok) {
      return NextResponse.json({ ok: true, videos: [] });
    }

    const videos = parseYoutubeFeed(await response.text());
    return NextResponse.json({ ok: true, videos });
  } catch (e) {
    // Der Feed ist Beiwerk auf dem Home-Tab: bei Ausfall lieber nichts anzeigen
    // als die Seite scheitern lassen.
    console.error("[journal/youtube]", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: true, videos: [] });
  }
}
