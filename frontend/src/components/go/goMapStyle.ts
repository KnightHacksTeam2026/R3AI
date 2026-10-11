import type { ExpressionSpecification, StyleSpecification } from "maplibre-gl";
import type { Theme } from "../command/types";

/** Original cartography inspired by the quiet hierarchy of native map apps. */
export function goMapStyle(theme: Theme): StyleSpecification {
  const dark = theme === "dark";
  const land = dark ? "#24282c" : "#f2f0e9";
  const park = dark ? "#304a3b" : "#dce9cc";
  const water = dark ? "#1b374b" : "#b9ddef";
  const road = dark ? "#565c63" : "#ffffff";
  const edge = dark ? "#343a41" : "#dedbd2";
  const text = dark ? "#d4d9df" : "#525a62";
  const halo = dark ? "#24282c" : "#faf9f5";
  const names: ExpressionSpecification = ["coalesce", ["get", "name:en"], ["get", "name"]];
  return {
    version: 8,
    name: "R3AI Go",
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      streets: {
        type: "vector",
        url: "https://tiles.openfreemap.org/planet",
        attribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      },
    },
    layers: [
      { id: "land", type: "background", paint: { "background-color": land } },
      { id: "green-cover", type: "fill", source: "streets", "source-layer": "landcover", filter: ["in", "class", "wood", "grass"], paint: { "fill-color": park, "fill-opacity": 0.65 } },
      { id: "parks", type: "fill", source: "streets", "source-layer": "park", paint: { "fill-color": park } },
      { id: "water", type: "fill", source: "streets", "source-layer": "water", paint: { "fill-color": water } },
      { id: "waterways", type: "line", source: "streets", "source-layer": "waterway", minzoom: 12, paint: { "line-color": water, "line-width": ["interpolate", ["linear"], ["zoom"], 12, 1, 17, 4] } },
      { id: "buildings", type: "fill", source: "streets", "source-layer": "building", minzoom: 14, paint: { "fill-color": dark ? "#3b4046" : "#e4e1d9", "fill-outline-color": dark ? "#454b52" : "#d5d2ca", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0.35, 16, 0.85] } },
      { id: "road-edges", type: "line", source: "streets", "source-layer": "transportation", filter: ["in", "class", "motorway", "trunk", "primary", "secondary", "tertiary", "minor", "service"], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": edge, "line-width": ["interpolate", ["exponential", 1.4], ["zoom"], 6, 0.5, 12, 3, 16, 10, 19, 26] } },
      { id: "roads", type: "line", source: "streets", "source-layer": "transportation", filter: ["in", "class", "motorway", "trunk", "primary", "secondary", "tertiary", "minor", "service"], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": road, "line-width": ["interpolate", ["exponential", 1.4], ["zoom"], 6, 0.3, 12, 1.8, 16, 8, 19, 23] } },
      { id: "main-roads", type: "line", source: "streets", "source-layer": "transportation", filter: ["in", "class", "motorway", "trunk", "primary"], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": dark ? "#857455" : "#f5d998", "line-width": ["interpolate", ["exponential", 1.3], ["zoom"], 6, 0.7, 12, 2.5, 16, 8, 19, 23] } },
      { id: "paths", type: "line", source: "streets", "source-layer": "transportation", minzoom: 14, filter: ["in", "class", "path", "track"], paint: { "line-color": dark ? "#809381" : "#a6b89c", "line-width": 1.5, "line-dasharray": [2, 2] } },
      { id: "street-names", type: "symbol", source: "streets", "source-layer": "transportation_name", minzoom: 14, layout: { "symbol-placement": "line", "text-field": [...names], "text-font": ["Noto Sans Regular"], "text-size": 11, "symbol-spacing": 300, "text-max-angle": 30 }, paint: { "text-color": text, "text-halo-color": halo, "text-halo-width": 1.5 } },
      { id: "place-names", type: "symbol", source: "streets", "source-layer": "place", filter: ["in", "class", "country", "state", "city", "town", "village", "suburb", "neighbourhood"], layout: { "text-field": [...names], "text-font": ["Noto Sans Regular"], "text-size": ["interpolate", ["linear"], ["zoom"], 3, 11, 10, 14, 16, 16], "text-padding": 18, "text-max-width": 9, "symbol-sort-key": ["coalesce", ["get", "rank"], 10] }, paint: { "text-color": text, "text-halo-color": halo, "text-halo-width": 2 } },
    ],
  };
}
