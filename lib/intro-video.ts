/** Standard-Intro nach Codex — per NEXT_PUBLIC_INTRO_VIDEO_URL überschreibbar. */
export const DEFAULT_INTRO_VIDEO_URL =
  "https://capitalcircle.nbg1.your-objectstorage.com/videos/0329%20(1).mp4";

export function getIntroVideoUrl(): string {
  return process.env.NEXT_PUBLIC_INTRO_VIDEO_URL?.trim() || DEFAULT_INTRO_VIDEO_URL;
}
