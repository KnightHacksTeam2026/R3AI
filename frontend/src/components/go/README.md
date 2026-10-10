# Go map explorer

`/go` now opens the map on phones, tablets, and desktop. On phones, the route panel expands using its handle (tap, keyboard, or swipe). Desktop uses a scrollable sidebar. The original download and demo-list components remain in the repository but are no longer the Go entry point. Existing cleanup logs retain their storage format.

## Routes and configuration

Without configuration, Go shows three **explicitly labeled sample paths in Orlando**. These are approximate illustrations, not surveyed pedestrian routes or verified waste reports. They are independent of Command's OSRM driving snapshots. No real cleanup backend is included.

Set these public variables before building:

```dotenv
NEXT_PUBLIC_GO_ROUTES_URL=https://your-api.example/cleanup-routes
NEXT_PUBLIC_GO_MAP_STYLE_URL=https://your-map-provider.example/style.json
```

The route endpoint must return a JSON array of objects with this shape:

```json
[
  {
    "id": "your-stable-route-id",
    "name": "Riverside cleanup",
    "area": "Your neighborhood",
    "description": "Public access and cleanup details from your route provider.",
    "category": "Waterfront",
    "coordinates": [[-81.372, 28.544], [-81.371, 28.545]],
    "sample": false
  }
]
```

Categories are `Park`, `Waterfront`, or `Neighborhood`. Coordinates are `[longitude, latitude]`. Supply actual pedestrian-accessible geometry and current cleanup information. Validation rejects malformed geometry, out-of-range coordinates, duplicate IDs, excessive counts, and invalid text. Limits: 500 routes, 10,000 vertices per route, 160-character identifiers/names/areas, 2,000-character descriptions, and a 5 MB response check. Requests time out after 12 seconds and abort on unmount. Failed live requests never fall back to sample listings. An empty array is a valid no-results response.

The entire bounded route catalog is fetched without sending the phone's coordinates or credentials. Filtering is local: route starts within 5 km of the map center, sorted by straight-line distance. Search matches route names and neighborhoods in this catalog; it is not a global place geocoder. Saved routes can appear beyond that radius. Walking times are approximate distance / 70 meters per minute and exclude cleanup time. Directions open Google Maps at the route's starting coordinate; Go does not provide turn-by-turn guidance.

Use a same-origin endpoint, or configure CORS for your deployed origin. For authenticated or large catalogs, add a backend adapter and viewport pagination rather than putting secrets in public variables.

The map accepts any compatible MapLibre style URL. Its fallback is OpenStreetMap standard raster tiles with visible attribution and normal browser caching. For a production launch, configure a provider appropriate to expected traffic and its attribution requirements. OSM's public service has no availability guarantee: https://operations.osmfoundation.org/policies/tiles/. The service worker does not prefetch or store map tiles.

## Phone location and privacy

Location starts only after tapping **Locate me** or the map location button. The browser requests permission. HTTPS (or localhost) is required; the deployment's Permissions-Policy must allow geolocation for the site. Denied access, unsupported browsers, insecure origins, unavailable fixes, and timeouts leave manual exploration available.

`watchPosition` updates a blue position dot and accuracy circle. Watches pause while the document is hidden, resume while visible, and clear on unmount or **Turn location off**. Location fixes are held in memory, not written to local storage or sent to the route feed. Map providers receive normal tile requests for the viewed area; opening external directions shares the selected route start with Google Maps. No background navigation is promised for an installed PWA.

Saved route IDs and personal cleanup entries stay in local storage. Storage failure leaves the current session usable with a visible notice. These records are self-reported, are not synchronized with Command, and have no server backup. Existing personal logs are preserved.

## Release verification

Run `node scripts/check-go.cjs`, `npx tsc --noEmit`, `npm run lint`, and `npm run build` from `frontend`.

On physical iOS Safari and Android Chrome, check location allow/deny/revoke, weak GPS, background/resume, offline/reconnect, installation, safe-area insets, keyboard navigation, short landscape viewports, WebGL unavailable, route feed failures, empty nearby areas, and storage failure. Confirm production map-provider configuration and the real route feed before describing listings as live. Browser-emulated location cannot establish actual phone GPS reliability.
