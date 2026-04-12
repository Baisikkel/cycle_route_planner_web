/**
 * Navigation mode hook — manages the "Active ride" state and map view following.
 *
 * When the user taps "Let's ride", this hook:
 *  1. Switches to navigation mode (fullscreen, rotated map)
 *  2. Continuously moves/rotates the map to follow the user's GPS position and heading
 *  3. Pauses following when the user manually pans or zooms the map
 *  4. Re-enables following when the user taps the "recenter" button
 *
 * The map view is controlled imperatively via mapRef.easeTo() — we push updates
 * (center, bearing, zoom, pitch) but let MapLibre manage its own internal state.
 * This way pinch-zoom and pan gestures continue to work naturally.
 *
 * Map center offset: during navigation, the user's GPS position appears at the
 * bottom ~30% of the screen (not the center) so there's more "look-ahead" space
 * in the direction of travel. This is achieved with easeTo({ padding: { top: ... } }),
 * which shifts the effective map center downward.
 *
 * Coordinate convention:
 *  - position: { latitude, longitude } (from useGeolocation)
 *  - MapLibre center: [longitude, latitude] (GeoJSON standard)
 *  - heading: degrees clockwise from north (0 = north, 90 = east)
 */
import bbox from '@turf/bbox'
import type { FeatureCollection } from 'geojson'
import { useCallback, useEffect, useState } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'

type Position = { latitude: number; longitude: number }

/** Street-level zoom for cycling navigation. */
const NAVIGATION_ZOOM = 16
/** Slight 3D tilt for better orientation while riding. */
const NAVIGATION_PITCH = 20
/** Smooth animation between GPS ticks (every 1–3 seconds). */
const EASE_DURATION_MS = 1000
/** Pixel margin around the route when zooming to show the full route. */
const ROUTE_BOUNDS_PADDING = 60

/**
 * Calculates the top padding for easeTo() so the user's GPS position appears
 * just above the bottom panel (at ~155px from the bottom) instead of at the center.
 * This gives more "look-ahead" space in the direction of travel (like Waze/Google Maps).
 *
 * How it works: maplibre's padding.top = N shifts the effective map center down
 * by N/2 pixels. The navigation arrow overlay sits at bottom: 155px.
 * To make the map center align with that screen position, we calculate:
 *   desired Y from top = containerHeight - 155 - 30 (arrow half-height)
 *   offset from geometric center = desired Y - (containerHeight / 2)
 *   padding.top = offset * 2
 */
function getNavigationPadding(mapRef: React.RefObject<MapRef | null>) {
  const container = mapRef.current?.getContainer()
  const height = container?.clientHeight ?? 700
  const arrowYFromTop = height - 150 - 30
  const offset = arrowYFromTop - height / 2
  // All four sides must be set explicitly — MapLibre preserves previous padding values.
  // Without left/right: 0, leftover padding from fitBounds (padding: 60) shifts the center.
  return { top: Math.round(offset * 2), bottom: 0, left: 0, right: 20 }
}

export type NavigationModeState = {
  /** Whether the user is in active navigation (fullscreen, map follows). */
  isNavigating: boolean
  /** Whether the map auto-follows the user's position. False when user pans away manually. */
  autoFollow: boolean
  /** Start navigation mode — map enters fullscreen and begins following. */
  startRide: () => void
  /** Exit navigation mode — map returns to normal planning view. */
  stopRide: () => void
  /** Re-enable auto-follow after user panned away. */
  recenter: () => void
  /**
   * Call this from the map's onMoveStart handler when the user manually
   * pans or zooms the map. Pauses auto-follow until recenter() is called.
   */
  handleUserInteraction: () => void
  /** Zoom out to show the full route, pausing auto-follow. */
  showRouteOverview: () => void
}

/**
 * Hook that manages navigation mode state and map view following.
 *
 * @param mapRef — ref to the MapLibre map instance for imperative control
 * @param position — current GPS position from useGeolocation
 * @param heading — compass heading in degrees from useGeolocation (null when stationary)
 * @param route — current route GeoJSON from useRoute (needed for fitBounds on exit/overview)
 */
export function useNavigationMode(
  mapRef: React.RefObject<MapRef | null>,
  position: Position | null,
  heading: number | null,
  route: FeatureCollection | null,
): NavigationModeState {
  const [isNavigating, setIsNavigating] = useState(false)
  const [autoFollow, setAutoFollow] = useState(false)

  /**
   * Resets the map to a flat top-down view and zooms to show the full route.
   * @param withPanels — true when the overlay panels are still visible (route overview),
   *   adds extra top/bottom padding so the route fits between the panels.
   *   false when exiting navigation (panels disappear, normal padding is enough).
   */
  const zoomToFullRoute = useCallback(
    (withPanels: boolean) => {
      if (!mapRef.current) return

      mapRef.current.easeTo({
        pitch: 0,
        bearing: 0,
        padding: { top: 0, bottom: 0, left: 0, right: 0 },
        duration: 300,
      })

      if (route) {
        const fitPadding = withPanels
          ? { top: 160, bottom: 200, left: 40, right: 40 }
          : ROUTE_BOUNDS_PADDING
        const [minLng, minLat, maxLng, maxLat] = bbox(route)
        // TODO: this 350ms is a magic number — it waits for the pitch/bearing
        // reset (300ms) to finish before starting fitBounds. Fragile because it
        // could break on slow devices. Find a reliable way to sequence these
        // two animations (e.g. MapLibre moveend event, or a different approach).
        setTimeout(() => {
          mapRef.current?.fitBounds(
            [
              [minLng, minLat],
              [maxLng, maxLat],
            ],
            { padding: fitPadding, duration: 500 },
          )
        }, 350)
      }
    },
    [mapRef, route],
  )

  /**
   * Start navigation: go fullscreen, enable following.
   * Does NOT call easeTo here — the following effect handles the first map move
   * after React re-renders the fullscreen container. If we called easeTo here,
   * the container would still be at 75vh (old size) and the padding calculation
   * would be wrong. The effect fires after the DOM update with the correct 100vh height.
   */
  const startRide = useCallback(() => {
    setIsNavigating(true)
    setAutoFollow(true)
    // Push a history entry so the browser back button / swipe-back exits navigation
    // instead of leaving the page. The popstate listener below handles the exit.
    window.history.pushState({ activeRide: true }, '')
  }, [])

  /**
   * Exit navigation: return to planning view.
   * Only resets pitch/bearing/padding here — the fitBounds to show the full route
   * is handled by MapLibre's existing effect that watches [route, isNavigating].
   * Keeping them separate avoids two competing fitBounds calls and lets the
   * container resize (100vh → 75vh) settle before the bounds are calculated.
   */
  const stopRide = useCallback(() => {
    setIsNavigating(false)
    setAutoFollow(false)

    if (mapRef.current) {
      mapRef.current.easeTo({
        pitch: 0,
        bearing: 0,
        padding: { top: 0, bottom: 0, left: 0, right: 0 },
        duration: 300,
      })
    }
  }, [mapRef])

  /** Re-enable auto-follow after user panned away. */
  const recenter = useCallback(() => {
    setAutoFollow(true)
  }, [])

  /**
   * Called when the user manually moves the map (detected via onMoveStart
   * with an originalEvent). Pauses auto-follow so the user can explore freely.
   * They can re-enable following by tapping the recenter button.
   */
  const handleUserInteraction = useCallback(() => {
    setAutoFollow(false)
  }, [])

  /** Zoom out to show the full route while staying in navigation mode. */
  const showRouteOverview = useCallback(() => {
    setAutoFollow(false)
    zoomToFullRoute(true)
  }, [zoomToFullRoute])

  /**
   * Main map following effect: smoothly moves and rotates the map to match
   * the user's current GPS position and heading.
   *
   * The user's position appears at the bottom ~30% of the screen (via padding offset)
   * so there's more space to see the road ahead. The easeTo animation (1s) overlaps
   * smoothly with GPS ticks (every 1–3s) — MapLibre cancels the previous animation
   * when a new easeTo starts.
   */
  useEffect(() => {
    if (!isNavigating || !autoFollow || !position || !mapRef.current) return

    mapRef.current.easeTo({
      center: [position.longitude, position.latitude],
      bearing: heading ?? 0,
      zoom: NAVIGATION_ZOOM,
      pitch: NAVIGATION_PITCH,
      padding: getNavigationPadding(mapRef),
      duration: EASE_DURATION_MS,
    })
  }, [isNavigating, autoFollow, position, heading, mapRef])

  /**
   * Browser back button / swipe-back exits navigation mode.
   * startRide pushes a history entry; this listener catches the popstate
   * event when the user navigates back and calls stopRide to exit cleanly.
   */
  useEffect(() => {
    if (!isNavigating) return

    const onPopState = () => {
      setIsNavigating(false)
      setAutoFollow(false)
      if (mapRef.current) {
        mapRef.current.easeTo({
          pitch: 0,
          bearing: 0,
          padding: { top: 0, bottom: 0, left: 0, right: 0 },
          duration: 300,
        })
      }
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [isNavigating, mapRef])

  return {
    isNavigating,
    autoFollow,
    startRide,
    stopRide,
    recenter,
    handleUserInteraction,
    showRouteOverview,
  }
}
