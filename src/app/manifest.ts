import type { MetadataRoute } from "next";

// Makes the site installable and lets PWABuilder package it as an Android app (TWA).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Build Maintain",
    short_name: "Build Maintain",
    description: "Building maintenance management app",
    start_url: "/",
    display: "standalone",
    background_color: "#0F1222",
    theme_color: "#0F1222",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
