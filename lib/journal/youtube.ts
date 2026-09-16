/**
 * YouTube-Uploads über den öffentlichen RSS-Feed.
 *
 * Kein API-Key, kein Quota, kein Google-Cloud-Projekt — der Feed unter
 * /feeds/videos.xml?channel_id=… liefert die letzten ~15 Videos.
 * Die Struktur ist flach und stabil, ein XML-Parser wäre Overhead.
 */

export const DEFAULT_YOUTUBE_CHANNEL_ID = "UCi-h5c0H8_plPtLcOwqfpXg"; // @emre.capital

export interface YoutubeVideo {
  videoId: string;
  title: string;
  published: string;
  thumbnail: string;
  url: string;
}

/**
 * Uploads-Playlist ohne Shorts.
 *
 * Der Kanal-Feed (`?channel_id=UC…`) mischt Shorts unter die Uploads und trägt
 * kein Merkmal, an dem man sie erkennen könnte — weder Dauer noch Typ. YouTube
 * pflegt aber pro Kanal Systemplaylists, deren ID sich aus der Kanal-ID ergibt:
 *
 *   UU…   alle Uploads          UULF…  nur Long-Form ("Videos"-Reiter)
 *   UUSH… nur Shorts            UULV…  nur Livestreams
 *
 * `?playlist_id=UULF…` liefert also genau das, was wir zeigen wollen — ohne
 * einen einzigen Zusatz-Request pro Video.
 */
export function longFormPlaylistId(channelId: string): string {
  return `UULF${channelId.replace(/^UC/, "")}`;
}

export function youtubeFeedUrl(channelId: string): string {
  return `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(longFormPlaylistId(channelId))}`;
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

function decodeEntities(value: string): string {
  return value
    .replace(/&(?:amp|lt|gt|quot|apos|#39);/g, (match) => ENTITIES[match] ?? match)
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

function extract(entry: string, tag: string): string | null {
  const match = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return match ? decodeEntities(match[1].trim()) : null;
}

export function parseYoutubeFeed(xml: string, limit = 8): YoutubeVideo[] {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  const videos: YoutubeVideo[] = [];

  for (const entry of entries) {
    const videoId = extract(entry, "yt:videoId");
    const title = extract(entry, "title");
    if (!videoId || !title) continue;

    const thumbnailMatch = entry.match(/<media:thumbnail[^>]*url="([^"]+)"/);

    videos.push({
      videoId,
      title,
      published: extract(entry, "published") ?? "",
      // hqdefault existiert für jedes Video, auch wenn der Feed mal kein
      // media:thumbnail mitliefert.
      thumbnail: thumbnailMatch?.[1] ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${videoId}`,
    });

    if (videos.length >= limit) break;
  }

  return videos;
}
