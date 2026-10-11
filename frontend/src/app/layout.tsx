import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "R3AI | Recognize. Recover. Restore.",
  description: "AI-powered environmental restoration platform",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      suppressHydrationWarning
      lang="en"
      className="h-full antialiased"
    >
      <head><script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("r3ai-theme")||localStorage.getItem("r3ai-command-theme");document.documentElement.dataset.theme=t==="dark"||t==="light"?t:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}catch(e){document.documentElement.dataset.theme=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}` }} /></head>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
