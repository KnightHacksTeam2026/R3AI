"use client";

import { useEffect, useRef, useState } from "react";
import type { Coordinate } from "../command/types";

export type GoPosition = { coordinate: Coordinate; accuracy: number; timestamp: number };

export default function useGoLocation(onPosition: (position: GoPosition) => void) {
  const [position, setPosition] = useState<GoPosition | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const onFix = useRef(onPosition);
  useEffect(() => { onFix.current = onPosition; }, [onPosition]);

  useEffect(() => {
    if (!enabled) return;
    let watch: number | undefined;
    let disposed = false;
    const stopWatch = () => {
      generation.current++;
      if (watch !== undefined) navigator.geolocation.clearWatch(watch);
      watch = undefined;
    };
    const startWatch = () => {
      stopWatch();
      if (document.hidden || disposed) return;
      const current = generation.current;
      watch = navigator.geolocation.watchPosition(value => {
        if (disposed || current !== generation.current) return;
        const next: GoPosition = { coordinate: [value.coords.longitude, value.coords.latitude], accuracy: value.coords.accuracy, timestamp: value.timestamp };
        setPosition(next);
        onFix.current(next);
        setPending(false);
        setError("");
      }, value => {
        if (disposed || current !== generation.current) return;
        setPending(false);
        setError(value.code === 1 ? "Location access is off. Allow location in your browser’s site settings, then try again. You can still explore the map." : value.code === 3 ? "Your location took too long to arrive. Move to an open area and try again." : "Your location is unavailable. Check your phone’s location settings and try again.");
        setPosition(null);
        setEnabled(false);
        stopWatch();
      }, { enableHighAccuracy: true, maximumAge: 15000, timeout: 15000 });
    };
    const visibility = () => { if (document.hidden) stopWatch(); else startWatch(); };
    startWatch();
    document.addEventListener("visibilitychange", visibility);
    return () => { disposed = true; stopWatch(); document.removeEventListener("visibilitychange", visibility); };
  }, [enabled, attempt]);

  function locate() {
    if (!window.isSecureContext) { setError("Location needs a secure HTTPS connection. You can still browse the map."); return; }
    if (!("geolocation" in navigator)) { setError("This browser doesn’t support location. You can still browse the map."); return; }
    setError("");
    setPending(true);
    setEnabled(true);
    setAttempt(value => value + 1);
  }

  function stop() {
    generation.current++;
    setEnabled(false);
    setPosition(null);
    setPending(false);
    setError("");
  }

  return { position, enabled, pending, error, locate, stop };
}
