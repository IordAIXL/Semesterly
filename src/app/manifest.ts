import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Semesterly",
    short_name: "Semesterly",
    description: "A student command center for priorities, courses, calendar, and trust controls.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafd",
    theme_color: "#1a73e8",
    orientation: "portrait-primary",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/maskable-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Today", short_name: "Today", description: "Open today’s priority plan", url: "/?view=today", icons: [{ src: "/icon.svg", sizes: "any" }] },
      { name: "Calendar", short_name: "Calendar", description: "Open calendar", url: "/?view=calendar", icons: [{ src: "/icon.svg", sizes: "any" }] },
      { name: "Courses", short_name: "Courses", description: "Open courses", url: "/?view=courses", icons: [{ src: "/icon.svg", sizes: "any" }] },
    ],
  };
}
