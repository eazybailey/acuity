import type { MetadataRoute } from "next";

// Unbranded on purpose: no name, colours or icons until the design system lands.
// No service worker yet.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Studio app",
    short_name: "Studio app",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
  };
}
