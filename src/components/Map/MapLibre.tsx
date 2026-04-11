/**
 * Map + cycling route preview (calls our Spring API only — never brouter.de).
 *
 * Flow: first map click = start, second = end → fetchRoute → GeoJSON line via Source+Layer.
 * - react-map-gl / MapLibre stack comes from the VAN-60 PR.
 * - Route line colour/width are cosmetic; change freely for design.
 * - NavigationControl is optional UX (zoom); safe to remove if headers/chrome are redesigned.
 * - reset start/route on API error so the user can retry without a full page reload.
 */
import { useCallback, useState } from 'react'
import Map, { Layer, NavigationControl, Source } from 'react-map-gl/maplibre'

import { MapContainer, MapFrame, MapHint } from './Map.styled'
import { useRoute } from './useRoute'

import 'maplibre-gl/dist/maplibre-gl.css'

const TALLINN_CENTER = {
  latitude: 59.4372,
  longitude: 24.7535,
  zoom: 12,
}

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/bright'

export type LatLon = { lat: number; lon: number }

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
  const {
    route,
    // status,
    // error,
    start,
    setStart,
    setEnd,
    clearRoute,
  } = useRoute()
  const [hint, setHint] = useState<string>(
    'Click map: 1) start 2) end. Click again after a route to reset.',
  )
  const [loadError, setLoadError] = useState<string | null>(null)

  const onMapClick = useCallback(
    (e: { lngLat: { lat: number; lng: number } }) => {
      const { lat, lng } = e.lngLat
      setLoadError(null)

      if (route) {
        clearRoute()
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
      setEnd({ lat, lon: lng })
    },
    [route, start, clearRoute, setStart, setEnd],
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
