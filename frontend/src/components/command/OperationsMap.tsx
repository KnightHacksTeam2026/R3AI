"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MapLibreMap, Marker, StyleSpecification } from "maplibre-gl";
import type { FeatureCollection, LineString } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { BOT_ICONS } from "./BotIcon";
import { cleanupCoverage, scanCoverage } from "./coverageGeometry";
import { routePosition } from "./routeGeometry";
import type { PlaceResult } from "./placeSearch";
import type { Coordinate, WasteObservation, RobotState, Theme } from "./types";

export type OperationsMapHandle = {
  zoomIn: () => void; zoomOut: () => void; recenter: () => void;
  focusBot: (bot: RobotState) => void;
  focusPlace: (place: PlaceResult) => void;
};
const GLOBE_CAMERA = {
  center: [-40, 25] as [number, number],
  zoom: 1.6,
  pitch: 0,
  bearing: 0,
};

function mapStyle(theme: Theme): StyleSpecification {
  const dark = theme === "dark";
  return {
    version: 8,
    projection: { type: "globe" },
    sky: {
      "sky-color": "rgba(0,0,0,0)",
      "horizon-color": dark ? "#568b92" : "#b8d9e2",
      "fog-color": "rgba(0,0,0,0)",
      "sky-horizon-blend": 0.3,
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 0.7, 5, 0],
    },
    sources: {
      basemap: {
        type: "raster",
        tiles: ["https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
        tileSize: 256,
        maxzoom: 19,
        attribution: 'Imagery © <a href="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer">Esri, Maxar, Earthstar Geographics, and the GIS User Community</a>',
      },
    },
    layers: [{
      id: "basemap",
      type: "raster",
      source: "basemap",
      paint: { "raster-brightness-max": dark ? 0.82 : 1 },
    }],
  };
}


type Props = {
  theme: Theme; observations: WasteObservation[]; bots: RobotState[];
  selectedBotId: string;
  onSelectBot: (id: string) => void;
  onCenterChange: (center: Coordinate) => void;
  onRetry: () => void;
  onStatusChange: (status: "loading" | "ready" | "error") => void;
  showWaste: boolean; showRoute: boolean; showBots: boolean;
};

type OverlayData = Pick<Props, "observations" | "bots" | "selectedBotId" | "showWaste" | "showRoute">;

function renderOverlays(instance: MapLibreMap, data: OverlayData) {
  if (!instance.isStyleLoaded()) return;
  const selected = data.bots.find(bot => bot.id === data.selectedBotId);
  const coverage = selected?.collection?.phase === "scanning" && selected.collection.scanFrames?.length
    ? scanCoverage(selected)
    : cleanupCoverage(data.observations, data.selectedBotId);
  if (!instance.getSource("cleanup-coverage")) {
    instance.addSource("cleanup-coverage", { type: "geojson", data: coverage });
    instance.addLayer({ id: "coverage-fill", type: "fill", source: "cleanup-coverage", paint: {
      "fill-color": ["case", ["get", "cleaned"], "#b9ef87", "#f2c27b"],
      "fill-opacity": 0.28,
    } });
    instance.addLayer({ id: "mapped-outline", type: "line", source: "cleanup-coverage", filter: ["==", ["get", "cleaned"], false], paint: {
      "line-color": "#f2c27b", "line-width": 2, "line-dasharray": [2, 2],
    } });
    instance.addLayer({ id: "cleaned-outline", type: "line", source: "cleanup-coverage", filter: ["==", ["get", "cleaned"], true], paint: {
      "line-color": "#b9ef87", "line-width": 3,
    } });
  } else (instance.getSource("cleanup-coverage") as GeoJSONSource).setData(coverage);
  for (const id of ["coverage-fill", "mapped-outline", "cleaned-outline"]) instance.setLayoutProperty(id, "visibility", data.showWaste ? "visible" : "none");

  const empty: FeatureCollection<LineString> = { type: "FeatureCollection", features: [] };
  const line = (coordinates: Coordinate[]): FeatureCollection<LineString> => coordinates.length < 2 ? empty : {
    type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates } }],
  };
  const planned = selected ? line(selected.route.coordinates) : empty;
  const traveled = selected ? line(routePosition(selected.route, selected.distanceM).traveled) : empty;
  for (const [id, routeData] of [["planned-route", planned], ["traveled-route", traveled]] as const) {
    if (!instance.getSource(id)) {
      instance.addSource(id, { type: "geojson", data: routeData });
      instance.addLayer({ id, type: "line", source: id, layout: { "line-cap": "round", "line-join": "round" }, paint: {
        "line-width": id === "traveled-route" ? 5 : 3,
        ...(id === "planned-route" ? { "line-dasharray": [2, 2], "line-opacity": 0.7 } : { "line-opacity": 1 }),
      } }, "mapped-outline");
    } else (instance.getSource(id) as GeoJSONSource).setData(routeData);
    instance.setLayoutProperty(id, "visibility", data.showRoute ? "visible" : "none");
    instance.setPaintProperty(id, "line-color", "#63d8c4");
  }
}

function createBotButton(bot: RobotState): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `command-bot-marker ${bot.type}`;
  const icon = document.createElement("img");
  icon.src = BOT_ICONS[bot.type];
  icon.width = 42;
  icon.height = 42;
  icon.alt = "";
  icon.draggable = false;
  icon.setAttribute("aria-hidden", "true");
  button.appendChild(icon);
  return button;
}

const OperationsMap = forwardRef<OperationsMapHandle, Props>((props, ref) => {
  const { theme, observations, bots, selectedBotId, onSelectBot, onCenterChange, showWaste, showRoute, showBots, onRetry, onStatusChange } = props;
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const appliedTheme = useRef<Theme>("light");
  const markers = useRef(new Map<string, Marker>());
  const overlayData = useRef<OverlayData>({ observations, bots, selectedBotId, showWaste, showRoute });
  const callbacks = useRef({ onSelectBot, onCenterChange });
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => { onStatusChange(mapStatus); }, [mapStatus, onStatusChange]);

  useEffect(() => { callbacks.current = { onSelectBot, onCenterChange }; }, [onSelectBot, onCenterChange]);

  useEffect(() => {
    if (!container.current || map.current) return;
    // Explicit emitted worker asset: keep the installed MapLibre v6 / Next fix.
    maplibregl.setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());
    let instance: MapLibreMap;
    try {
      instance = new maplibregl.Map({ container: container.current, style: mapStyle("light"), ...GLOBE_CAMERA, minZoom: 0, maxZoom: 19, canvasContextAttributes: { antialias: true } });
    } catch {
      const timer = window.setTimeout(() => {
        setMapStatus("error");
        setErrorMessage("The globe needs WebGL 2. Enable hardware acceleration and reload.");
      }, 0);
      return () => window.clearTimeout(timer);
    }
    map.current = instance;
    let failed = false;
    const loadingTimeout = window.setTimeout(() => {
      failed = true;
      setMapStatus("error");
      setErrorMessage("Earth imagery is taking longer than expected. Check your connection and retry the map.");
    }, 20000);
    const botMarkers = markers.current;
    appliedTheme.current = "light";
    instance.on("load", () => {
      window.clearTimeout(loadingTimeout);
      renderOverlays(instance, overlayData.current);
      if (!failed) setMapStatus("ready");
    });
    instance.on("style.load", () => renderOverlays(instance, overlayData.current));
    instance.on("moveend", () => {
      const center = instance.getCenter();
      callbacks.current.onCenterChange([center.lng, center.lat]);
    });
    instance.on("error", event => {
      failed = true;
      window.clearTimeout(loadingTimeout);
      console.error("Command globe:", event.error);
      setMapStatus("error");
      setErrorMessage(event.error.message.includes("Worker") ? "The map engine could not start. Retry, or reload the page if the issue persists." : "Some map assets could not load. Check your connection and retry. Your simulation is preserved.");
    });
    instance.on("idle", () => {
      // style.load can precede source readiness, including after a theme switch.
      if (instance.isStyleLoaded() && !instance.getSource("cleanup-coverage")) renderOverlays(instance, overlayData.current);
      if (!failed && instance.areTilesLoaded()) setMapStatus("ready");
    });
    const resizeObserver = new ResizeObserver(() => instance.resize());
    resizeObserver.observe(container.current);
    return () => {
      window.clearTimeout(loadingTimeout);
      resizeObserver.disconnect();
      botMarkers.forEach(marker => marker.remove());
      botMarkers.clear();
      instance.remove();
      map.current = null;
    };
  }, []);

  useImperativeHandle(ref, () => ({
    focusPlace: place => {
      const instance = map.current;
      if (!instance) return;
      const desktop = instance.getContainer().clientWidth >= 1024;
      const sideInset = Math.min(320, Math.max(280, instance.getContainer().clientWidth * 0.24)) + 44;
      const padding = desktop ? { top: 118, bottom: 100, left: sideInset, right: sideInset } : { top: 180, bottom: instance.getContainer().clientHeight * 0.45, left: 30, right: 30 };
      // Overseas territories can span most of the globe; use the label center then.
      if (place.bounds && place.bounds[1][0] - place.bounds[0][0] < 150) instance.fitBounds(place.bounds, { padding, maxZoom: place.kind === "country" ? 6 : 12, duration: 1400 });
      else instance.flyTo({ center: place.center, zoom: place.kind === "country" ? 4 : 11, padding: 0, offset: desktop ? [0, 0] : [0, -instance.getContainer().clientHeight * 0.16], duration: 1400 });
    },
    zoomIn: () => map.current?.zoomIn(), zoomOut: () => map.current?.zoomOut(),
    recenter: () => map.current?.flyTo({ ...GLOBE_CAMERA, padding: 0, duration: 1100 }),
    focusBot: bot => {
      const instance = map.current;
      if (!instance) return;
      const bounds = new maplibregl.LngLatBounds();
      bot.route.coordinates.forEach(point => bounds.extend(point));
      const desktop = instance.getContainer().clientWidth >= 1024;
      const height = instance.getContainer().clientHeight;
      if (!desktop) {
        // At phone size, prioritize the actual bot over fitting every waypoint
        // behind the sheet. The whole route remains available by panning.
        instance.flyTo({ center: [bot.longitude, bot.latitude], zoom: 15, padding: 0, offset: [0, -height * 0.18], duration: 1400 });
        return;
      }
      const sideInset = Math.min(320, Math.max(280, instance.getContainer().clientWidth * 0.24)) + 44;
      instance.fitBounds(bounds, { absolutePadding: true, padding: { top: 118, bottom: 100, left: sideInset, right: sideInset }, maxZoom: 16, duration: 1400 });
    },
  }), []);

  useEffect(() => {
    if (map.current && appliedTheme.current !== theme) {
      map.current.setStyle(mapStyle(theme), { diff: false });
      appliedTheme.current = theme;
    }
  }, [theme]);

  useEffect(() => {
    const instance = map.current;
    overlayData.current = { observations, bots, selectedBotId, showWaste, showRoute };
    if (!instance) return;
    renderOverlays(instance, overlayData.current);
    const activeIds = new Set(bots.map(bot => bot.id));
    for (const [id, marker] of markers.current) {
      if (!activeIds.has(id)) { marker.remove(); markers.current.delete(id); }
    }
    for (const bot of bots) {
      let marker = markers.current.get(bot.id);
      if (!marker) {
        const button = createBotButton(bot);
        button.onclick = () => callbacks.current.onSelectBot(bot.id);
        marker = new maplibregl.Marker({ element: button }).setLngLat([bot.longitude, bot.latitude]).addTo(instance);
        markers.current.set(bot.id, marker);
      }
      marker.setLngLat([bot.longitude, bot.latitude]);
      const element = marker.getElement();
      element.style.display = showBots ? "" : "none";
      element.dataset.selected = String(bot.id === selectedBotId);
      element.title = `${bot.id} · ${bot.type} · ${bot.status} · ${Math.round(bot.batteryPct)}% battery · simulated`;
      element.setAttribute("aria-label", element.title);
      element.setAttribute("aria-pressed", String(bot.id === selectedBotId));
    }
  }, [observations, bots, selectedBotId, showWaste, showRoute, showBots, theme]);

  return <div className="absolute inset-0" data-map-status={mapStatus} inert={mapStatus === "loading"}>
    <div ref={container} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-label="Interactive global operations globe. Drag to rotate; scroll or pinch to zoom. Select a ground robot to view its mapped and cleaned waste areas." />
    {mapStatus === "error" && <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4"><div className="command-glass pointer-events-auto max-w-xs rounded-2xl px-5 py-4 text-center text-sm"><p role="alert">{errorMessage}</p><button type="button" onClick={onRetry} className="command-primary-button mt-3">Retry map</button></div></div>}
  </div>;
});

OperationsMap.displayName = "OperationsMap";
export default OperationsMap;
