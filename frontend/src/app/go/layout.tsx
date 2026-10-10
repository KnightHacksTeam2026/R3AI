import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "R3AI Go | A little care goes a long way",
  description: "Explore demo cleanup missions and keep a personal cleanup log with R3AI Go.",
  manifest: "/go/manifest.webmanifest",
  appleWebApp: { capable: true, title: "R3AI Go", statusBarStyle: "default" },
  icons: { icon: "/go/icon-192.png", apple: "/go/icon-180.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f7f2",
};

export default function GoLayout({ children }: { children: ReactNode }) {
  return children;
}
