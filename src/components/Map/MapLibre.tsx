/**
 * Map + cycling route preview (calls our Spring API only — never brouter.de).
 *
 * Flow: first map click = start, second = end → fetchRoute → GeoJSON line via Source+Layer.
 * - react-map-gl / MapLibre stack comes from the VAN-60 PR.
 * - Route line colour/width are cosmetic; change freely for design.
 * - NavigationControl is optional UX (zoom); safe to remove if headers/chrome are redesigned.
 * - reset start/route on API error so the user can retry without a full page reload.
 */
import type { FeatureCollection } from 'geojson'
import { useCallback, useState } from 'react'
import Map, { Layer, NavigationControl, Source } from 'react-map-gl/maplibre'

import { fetchRoute } from '@api/routing'

import 'maplibre-gl/dist/maplibre-gl.css'
import { MapContainer, MapFrame, MapHint } from './Map.styled'

const TALLINN_CENTER = {
  latitude: 59.4372,
  longitude: 24.7535,
  zoom: 12,
}

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/bright'

type LatLon = { lat: number; lon: number }

/** MapLibre layer spec for the route geometry — visual only; tweak for brand/accessibility. */
const lineLayerStyle = {
  id: 'route-line',
  type: 'line' as const,
  paint: {
    'line-color': '#dc2626',
    'line-width': 4,
    'line-opacity': 0.9,
  },
  layout: {
    'line-cap': 'round' as const,
    'line-join': 'round' as const,
  },
}

const MapLibre = () => {
  /** First click; cleared after a failed fetch so the user can pick again. */
  const [start, setStart] = useState<LatLon | null>(null)
  /** GeoJSON from GET /api/routes/calculate; null until a successful fetch. */
  const [route, setRoute] = useState<FeatureCollection | null>(null)
  const [hint, setHint] = useState<string>('Click map: 1) start 2) end. Click again after a route to reset.')
  const [loadError, setLoadError] = useState<string | null>(null)

  const onMapClick = useCallback(
    async (e: { lngLat: { lat: number; lng: number } }) => {
      const { lat, lng } = e.lngLat
      setLoadError(null)

      if (route) {
        setRoute(null)
        setStart({ lat, lon: lng })
        setHint('Start set. Click end point.')
        return
      }

      if (!start) {
        setStart({ lat, lon: lng })
        setHint('Start set. Click end point.')
        return
      }

      setHint('Loading route…')
      try {
        // Order matches backend: startLat, startLon, endLat, endLon (BRouter lon/lat is handled in Java).
        const geojson = await fetchRoute(start.lat, start.lon, lat, lng)
        setRoute(geojson)
        setHint('Route shown. Click map to pick a new start.')
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not load route'
        setLoadError(message)
        setHint('Click end point again or click map to reset start.')
        setStart(null)
        setRoute(null)

      }
    },
    [route, start],
  )

  return (
    <MapContainer>
      <MapHint>
        {hint}
        {loadError ? ` — ${loadError}` : ''}
      </MapHint>
      <MapFrame>
        <Map
          style={{ width: '100%', height: '100%' }}
          mapStyle={MAP_STYLE}
          initialViewState={TALLINN_CENTER}
          onClick={onMapClick}
        >
          {/* Optional: delete if product wants a cleaner map chrome. */}
          <NavigationControl position="top-right" />
          {route ? (
            <Source id="cycle-route" type="geojson" data={route}>
              <Layer {...lineLayerStyle} />
            </Source>
          ) : null}
        </Map>
      </MapFrame>
    </MapContainer>
  )
}

export default MapLibre
