import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Capital Circle Institut",
    short_name: "Capital Circle",
    description: "Exklusive Trading-Lernplattform",
    start_url: "/",
    display: "browser",
    background_color: "#0F1317",
    theme_color: "#0F1317",
    icons: [
      {
        src: "/new-apple.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
