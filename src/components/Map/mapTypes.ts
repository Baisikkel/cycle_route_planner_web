import type { FeatureCollection } from 'geojson'

export type AppMapPoint = {
  lat: number
  lon: number
}

export type AppMapPosition = {
  latitude: number
  longitude: number
}

export type AppMapViewState = AppMapPosition & {
  zoom: number
}

export type AppMapMarker = AppMapPosition & {
  id: string
  color: string
  label: string
}

export type AppMapPointerEvent = {
  lngLat: AppMapPoint
  point: { x: number; y: number }
  originalEvent: Event
}

export type AppMapTouchEvent = AppMapPointerEvent & {
  originalEvent: TouchEvent
}

export type AppMapBounds = [[number, number], [number, number]]

export type AppMapPadding =
  | number
  | {
      top: number
      bottom: number
      left: number
      right: number
    }

export type AppMapFitBoundsOptions = {
  padding?: AppMapPadding
  duration?: number
}

export type AppMapEaseOptions = {
  center?: [number, number]
  bearing?: number
  zoom?: number
  pitch?: number
  padding?: AppMapPadding
  duration?: number
}

export type AppMapHandle = {
  fitBounds: (bounds: AppMapBounds, options?: AppMapFitBoundsOptions) => void
  easeTo: (options: AppMapEaseOptions) => void
  getContainer: () => HTMLElement | null
  getBearing: () => number
}

export type AppMapSelectionPopup = {
  point: AppMapPoint
  onClose: () => void
  onSetStart: () => void
  onSetDestination: () => void
}

export type AppMapCanvasProps = {
  initialViewState: AppMapViewState
  route: FeatureCollection | null
  waypointMarkers: AppMapMarker[]
  selectionPopup: AppMapSelectionPopup | null
  showNavigationControl: boolean
  userPosition: AppMapPosition | null
  userHeading: number | null
  navigationPosition: AppMapPosition | null
  onMapClick: () => void
  onMapContextMenu: (event: AppMapPointerEvent) => void
  onMapTouchEnd: () => void
  onMapTouchMove: (event: AppMapTouchEvent) => void
  onMapTouchStart: (event: AppMapTouchEvent) => void
  onUserMoveStart: () => void
}
