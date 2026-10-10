"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}

function getPlatform(): "desktop" | "mobile" | "installed" | "loading" {
  if (window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone) return "installed";
  const agent = navigator as Navigator & { userAgentData?: { mobile: boolean } };
  const mobile = agent.userAgentData?.mobile || /Android|iPhone|iPad|iPod/i.test(agent.userAgent) ||
    (/Macintosh/i.test(agent.userAgent) && agent.maxTouchPoints > 1) ||
    (window.matchMedia("(pointer: coarse)").matches && window.matchMedia("(max-width: 1024px)").matches);
  return mobile ? "mobile" : "desktop";
}

function subscribe(listener: () => void) {
  const standalone = window.matchMedia("(display-mode: standalone)");
  standalone.addEventListener("change", listener);
  window.addEventListener("resize", listener);
  return () => {
    standalone.removeEventListener("change", listener);
    window.removeEventListener("resize", listener);
  };
}

export default function useGoPlatform() {
  const platform = useSyncExternalStore(subscribe, getPlatform, () => "loading" as const);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installError, setInstallError] = useState("");

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      if (!isIOS()) setInstallEvent(event as InstallEvent);
    };
    const onInstalled = () => { setInstalled(true); setInstallEvent(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/go-sw.js", { scope: "/go", updateViaCache: "none" })
        .catch((error) => console.error("R3AI Go offline fallback:", error));
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install(): Promise<boolean> {
    if (!installEvent) return false;
    setInstalling(true);
    setInstallError("");
    try {
      await installEvent.prompt();
      // Only appinstalled confirms installation; accepting the prompt alone
      // does not guarantee that the browser completed it.
      await installEvent.userChoice;
    } catch {
      setInstallError("Installation did not open. You can also add Go from your browser menu.");
    } finally {
      setInstallEvent(null);
      setInstalling(false);
    }
    return true;
  }

  return { platform, installed: installed || platform === "installed", installing, installError, install };
}
