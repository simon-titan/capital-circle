import type { Metadata } from "next";
import { VideoOnlyClient } from "@/components/landing/VideoOnlyClient";

export const metadata: Metadata = {
  title: "Video — Capital Circle",
  description: "Schau dir das Video an.",
  robots: { index: false, follow: false },
};

export default function VideoPage() {
  return <VideoOnlyClient />;
}
