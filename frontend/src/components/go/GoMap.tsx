"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MapInstance, StyleSpecification } from "maplibre-gl";
import type { FeatureCollection, LineString, Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { DEFAULT_CENTER, type CleanupRoute } from "./cleanupRoutes";
import type { Coordinate } from "../command/types";
import type { GoPosition } from "./useGoLocation";
import styles from "./GoExplorer.module.css";
import useTheme from "../shared/useTheme";

export type GoMapHandle = { focus: (coordinate: Coordinate) => void; fit: (route: CleanupRoute) => void; zoom: (direction: number) => void; north: () => void };
type Props = { routes: CleanupRoute[]; selectedId: string | null; position: GoPosition | null; onSelect: (id: string) => void; onMove: (center: Coordinate) => void };

const fallbackStyle: StyleSpecification = {
  version: 8,
  sources: { streets: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, maxzoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors' } },
  layers: [{ id: "streets", type: "raster", source: "streets", paint: { "raster-saturation": -0.65, "raster-contrast": -0.12 } }],
};

const GoMap = forwardRef<GoMapHandle, Props>(function GoMap({ routes, selectedId, position, onSelect, onMove }, ref) {
  const { theme } = useTheme();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapInstance | null>(null);
  const callbacks = useRef({ onSelect, onMove });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { callbacks.current = { onSelect, onMove }; }, [onSelect, onMove]);

  function padding() {
    const desktop = (container.current?.clientWidth ?? 0) >= 800;
    return desktop ? { top: 110, bottom: 80, left: 450, right: 100 } : { top: 130, bottom: Math.min((container.current?.clientHeight ?? 800) * 0.49, 410), left: 50, right: 70 };
  }

  useImperativeHandle(ref, () => ({
    focus: coordinate => {
      callbacks.current.onMove(coordinate);
      map.current?.flyTo({ center: coordinate, zoom: 14.5, padding: padding(), duration: 900 });
    },
    fit: route => {
      const bounds = new maplibregl.LngLatBounds();
      route.coordinates.forEach(point => bounds.extend(point));
      map.current?.fitBounds(bounds, { padding: padding(), maxZoom: 16, duration: 800 });
    },
    zoom: direction => { if (direction > 0) map.current?.zoomIn(); else map.current?.zoomOut(); },
    north: () => map.current?.resetNorthPitch({ duration: 500 }),
  }), []);

  useEffect(() => {
    if (!container.current) return;
    let instance: MapInstance;
    let disposed = false;
    let settled = false;
    let hadError = false;
    maplibregl.setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());
    try {
      instance = new maplibregl.Map({ container: container.current, style: process.env.NEXT_PUBLIC_GO_MAP_STYLE_URL || fallbackStyle, center: DEFAULT_CENTER, zoom: 14.2, minZoom: 2, maxZoom: 19, attributionControl: false });
    } catch {
      const timer = window.setTimeout(() => setError("The map couldn’t start. Enable hardware acceleration or explore the route list below."), 0);
      return () => window.clearTimeout(timer);
    }
    map.current = instance;
    instance.addControl(new maplibregl.AttributionControl({ compact: false }), "top-left");
    const timeout = window.setTimeout(() => { if (!settled) setError("The map is taking longer than expected. Check your connection or use the route list."); }, 18000);
    instance.on("load", () => {
      if (disposed) return;
      settled = true;
      window.clearTimeout(timeout);
      instance.addSource("routes", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      instance.addLayer({ id: "route-casing", type: "line", source: "routes", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffffff", "line-width": 9, "line-opacity": 0.95 } });
      instance.addLayer({ id: "route-line", type: "line", source: "routes", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ["case", ["get", "selected"], "#1674ed", "#29845d"], "line-width": ["case", ["get", "selected"], 6, 4], "line-opacity": 0.95 } });
      instance.addSource("location", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      instance.addLayer({ id: "location-accuracy", type: "circle", source: "location", paint: { "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], 0, ["get", "radius"], 20, ["*", ["get", "radius"], 1048576]], "circle-color": "#1674ed", "circle-opacity": 0.1, "circle-stroke-width": 1, "circle-stroke-color": "#1674ed", "circle-stroke-opacity": 0.2 } });
      instance.addLayer({ id: "location-dot", type: "circle", source: "location", paint: { "circle-radius": 7, "circle-color": "#1674ed", "circle-stroke-width": 3, "circle-stroke-color": "#ffffff" } });
      setReady(true);
      if (!hadError) setError("");
    });
    instance.on("error", () => { hadError = true; if (!disposed) setError("Some map details couldn’t load. Check your connection and retry."); });
    instance.on("moveend", () => { const center = instance.getCenter(); callbacks.current.onMove([center.lng, center.lat]); });
    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(container.current);
    return () => { disposed = true; window.clearTimeout(timeout); observer.disconnect(); instance.remove(); map.current = null; };
  }, [attempt]);

  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance?.getLayer("streets") || process.env.NEXT_PUBLIC_GO_MAP_STYLE_URL) return;
    instance.setPaintProperty("streets", "raster-brightness-max", theme === "dark" ? 0.3 : 1);
    instance.setPaintProperty("streets", "raster-saturation", theme === "dark" ? -0.85 : -0.65);
  }, [theme, ready]);

  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance?.getSource("routes")) return;
    const data: FeatureCollection<LineString> = { type: "FeatureCollection", features: [...routes].sort((a, b) => Number(a.id === selectedId) - Number(b.id === selectedId)).map(route => ({ type: "Feature", properties: { selected: route.id === selectedId }, geometry: { type: "LineString", coordinates: route.coordinates } })) };
    (instance.getSource("routes") as GeoJSONSource).setData(data);
    const markers = routes.map(route => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = styles.mapPin;
      button.dataset.selected = String(route.id === selectedId);
      button.textContent = "↟";
      button.setAttribute("aria-label", `${route.name}${route.sample ? ", sample route" : ""}`);
      button.setAttribute("aria-pressed", String(route.id === selectedId));
      button.addEventListener("click", () => callbacks.current.onSelect(route.id));
      return new maplibregl.Marker({ element: button, anchor: "bottom" }).setLngLat(route.coordinates[0]).addTo(instance);
    });
    return () => markers.forEach(marker => marker.remove());
  }, [routes, selectedId, ready]);

  useEffect(() => {
    const source = map.current?.getSource("location") as GeoJSONSource | undefined;
    if (!ready || !source) return;
    const data: FeatureCollection<Point> = { type: "FeatureCollection", features: position ? [{ type: "Feature", properties: { radius: Math.min(position.accuracy, 10000) / (78271.517 * Math.max(0.01, Math.cos(position.coordinate[1] * Math.PI / 180))) }, geometry: { type: "Point", coordinates: position.coordinate } }] : [] };
    source.setData(data);
  }, [position, ready]);

  return <div className={styles.mapSurface}>
    <div ref={container} className={styles.mapCanvas} role="region" aria-label="Cleanup routes map. Drag to explore and use the zoom controls. Routes are also available in the list." />
    {(!ready || error) && <div className={styles.mapNotice} role="status">{error || "Opening your map…"}{error && <button onClick={() => { setReady(false); setError(""); setAttempt(value => value + 1); }}>Retry map</button>}</div>}
  </div>;
});

export default GoMap;
