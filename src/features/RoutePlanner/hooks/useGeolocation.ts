import { useCallback, useEffect, useRef, useState } from 'react'

/** 'prompt' = browser hasn't asked yet, 'unsupported' = no GPS API in this browser. */
type PermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported'

/** Coordinates from the device GPS. Always { latitude, longitude } — never an array. */
type Position = { latitude: number; longitude: number }

export type GeolocationState = {
  /** Current permission status — drives UI: which hints to show, which click flow to use. */
  permission: PermissionState
  /** Latest GPS reading, or null if not yet available / denied. */
  position: Position | null
  /** GPS accuracy in meters — small = precise, large = rough (e.g. WiFi-only). */
  accuracy: number | null
  /** Compass heading in degrees (0 = north). null when standing still or unsupported. */
  heading: number | null
  /** Ground speed in m/s. null when standing still. */
  speed: number | null
  /** Human-readable error message if something went wrong, otherwise null. */
  error: string | null
}

/**
 * watchPosition config — tradeoff between accuracy and battery life.
 * maximumAge: reuse a GPS reading up to 3 s old instead of forcing a new one.
 * timeout: give up after 10 s if no signal (e.g. indoors, airplane mode).
 */
const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 3000,
  timeout: 10000,
}

/** Map browser error codes to user-friendly strings. */
const ERROR_MESSAGES: Record<number, string> = {
  [GeolocationPositionError.PERMISSION_DENIED]: 'Location permission denied',
  [GeolocationPositionError.POSITION_UNAVAILABLE]: 'Location unavailable',
  [GeolocationPositionError.TIMEOUT]: 'Location request timed out',
}

/**
 * Continuously reads the device GPS and exposes position + permission state.
 * What is Permissions API: https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API
 * TLDR: we use it to check if user has granted permission to use GPS, and if not, we show a popup to ask for permission.
 *
 * Lifecycle:
 *  1. On mount → check Permissions API for current state (Chrome/Firefox).
 *     Safari has no Permissions API, so we skip straight to step 2.
 *  2. Call navigator.geolocation.watchPosition() — the browser shows its
 *     own permission popup if needed. Each GPS update fires onSuccess.
 *  3. On unmount → clearWatch() to stop GPS and save battery.
 *  4. If user toggles permission in browser settings mid-session,
 *     the 'change' listener reacts (start/stop watching accordingly).
 */
export function useGeolocation(): GeolocationState {
  const [permission, setPermission] = useState<PermissionState>('prompt')
  const [position, setPosition] = useState<Position | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [heading, setHeading] = useState<number | null>(null)
  const [speed, setSpeed] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  /** ID returned by watchPosition — needed to call clearWatch on cleanup. */
  const watchIdRef = useRef<number | null>(null)

  /** Called by the browser every time a new GPS reading is available. */
  const onSuccess = useCallback((pos: GeolocationPosition) => {
    setPermission('granted')
    setPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
    setAccuracy(pos.coords.accuracy)
    setHeading(pos.coords.heading)
    setSpeed(pos.coords.speed)
    setError(null)
  }, [])

  /** Called when GPS fails — permission denied, no signal, or timeout. */
  // For example: gps chip can't get a fix - 10 seconds
  // position unavailable, airplane mode etc - immediately
  const onError = useCallback((err: GeolocationPositionError) => {
    if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
      setPermission('denied')
    }
    setError(ERROR_MESSAGES[err.code] ?? 'Unknown geolocation error')
  }, [])

  /** Begin continuous GPS tracking. No-op if already watching. */
  const startWatching = useCallback(() => {
    if (watchIdRef.current !== null) return
    if (!navigator.geolocation) {
      setPermission('unsupported')
      return
    }
    watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, WATCH_OPTIONS)
  }, [onSuccess, onError])

  /** Stop GPS tracking and release the watch. */
  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  /** Main effect: probe permission, start watching, listen for changes, clean up. */
  useEffect(() => {
    if (!navigator.geolocation) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPermission('unsupported')
      return
    }

    let permissionStatus: PermissionStatus | null = null
    let onChange: (() => void) | null = null

    // Try Permissions API first (Chrome, Firefox) to read state without triggering popup
    if (navigator.permissions) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((status) => {
          permissionStatus = status
          setPermission(status.state as PermissionState)

          // React if user toggles permission in browser settings while app is open
          // if we do not listen for this, app could be stuck in broken state; in safari user needs to reload
          onChange = () => {
            const newState = status.state as PermissionState
            setPermission(newState)
            if (newState === 'denied') {
              stopWatching()
              setPosition(null)
            } else {
              startWatching()
            }
          }
          status.addEventListener('change', onChange)

          if (status.state !== 'denied') {
            startWatching()
          }
        })
        .catch(() => {
          // Permissions API not working (older browser) — just try GPS directly
          startWatching()
        })
    } else {
      // Safari: no Permissions API at all — watchPosition will trigger the popup,
      // and we derive granted/denied from the success/error callbacks
      startWatching()
    }

    return () => {
      stopWatching()
      if (permissionStatus && onChange) {
        permissionStatus.removeEventListener('change', onChange)
      }
    }
  }, [startWatching, stopWatching])

  return { permission, position, accuracy, heading, speed, error }
}
