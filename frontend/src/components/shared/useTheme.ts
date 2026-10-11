"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";
const key = "r3ai-theme";
const eventName = "r3ai-theme-change";
let preference: Theme | null = null;

function savedTheme(): Theme | null {
  if (preference) return preference;
  try {
    const saved = localStorage.getItem(key) ?? localStorage.getItem("r3ai-command-theme");
    return saved === "light" || saved === "dark" ? saved : null;
  } catch { return preference; }
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new Event(eventName));
}

function subscribe(listener: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const sync = () => applyTheme(savedTheme() ?? (media.matches ? "dark" : "light"));
  const storage = (event: StorageEvent) => { if (!event.key || event.key === key || event.key === "r3ai-command-theme") { preference = null; sync(); } };
  window.addEventListener(eventName, listener);
  window.addEventListener("storage", storage);
  media.addEventListener("change", sync);
  sync();
  return () => {
    window.removeEventListener(eventName, listener);
    window.removeEventListener("storage", storage);
    media.removeEventListener("change", sync);
  };
}

function snapshot(): Theme { return document.documentElement.dataset.theme === "dark" ? "dark" : "light"; }
function serverSnapshot(): Theme { return "light"; }

export default function useTheme() {
  const theme = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  function setTheme(next: Theme) {
    preference = next;
    try { localStorage.setItem(key, next); } catch { /* Keep the preference for this visit. */ }
    applyTheme(next);
  }
  return { theme, setTheme };
}
