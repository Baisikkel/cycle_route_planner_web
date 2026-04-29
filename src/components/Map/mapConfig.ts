export const TALLINN_CENTER = {
  latitude: 59.4372,
  longitude: 24.7535,
  zoom: 12,
}

export const MAP_STYLE = 'https://tiles.openfreemap.org/styles/bright'

export const LONG_PRESS_MS = 400
export const LONG_PRESS_MOVE_THRESHOLD = 10

export const START_COLOR = '#16a34a'
export const STOP_COLOR = '#d97706'
export const DESTINATION_COLOR = '#dc2626'

export const lineLayerStyle = {
  id: 'route-line',
  type: 'line' as const,
  paint: {
    'line-color': '#2563eb',
    'line-width': 4,
    'line-opacity': 0.9,
  },
  layout: {
    'line-cap': 'round' as const,
    'line-join': 'round' as const,
  },
}
