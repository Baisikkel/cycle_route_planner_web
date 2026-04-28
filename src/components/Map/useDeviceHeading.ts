/**
 * Device heading hook — merges compass and GPS heading into a single value.
 *
 * Priority: compass heading (DeviceOrientationEvent) > GPS heading (fallback).
 *
 * The compass listener only activates when `active` is true (during navigation)
 * to save battery. On desktop or when compass permission is denied, falls back
 * to GPS heading seamlessly.
 *
 * Compass heading sources by platform:
 *  - iOS Safari: event.webkitCompassHeading (degrees CW from north, 0–360)
 *  - Android Chrome: deviceorientationabsolute event, heading = (360 - alpha) % 360
 *  - Desktop: no compass data → GPS fallback
 *
 * iOS 13+ requires DeviceOrientationEvent.requestPermission() on a user gesture.
 * The "Let's ride" button tap satisfies this requirement because startRide (which
 * sets isNavigating = true → active = true) runs in that click handler.
 */
import { useEffect, useRef, useState } from 'react'

type DeviceOrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

type OrientationEventWithWebkit = DeviceOrientationEvent & {
  webkitCompassHeading?: number
}

export type DeviceHeadingState = {
  /** Best-available heading in degrees CW from north (0–360). null if unavailable. */
  heading: number | null
  /** Which source provided the current heading value. */
  headingSource: 'compass' | 'gps' | null
}

/**
 * @param gpsHeading — raw GPS heading from useGeolocation (fallback when compass unavailable)
 * @param active — true during navigation mode, false otherwise (saves battery)
 */
export function useDeviceHeading(gpsHeading: number | null, active: boolean): DeviceHeadingState {
  const [compassHeading, setCompassHeading] = useState<number | null>(null)
  const listenerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null)
  const eventNameRef = useRef<string | null>(null)

  useEffect(() => {
    if (!active) {
      if (listenerRef.current && eventNameRef.current) {
        window.removeEventListener(eventNameRef.current, listenerRef.current as EventListener)
        listenerRef.current = null
        eventNameRef.current = null
      }
      return
    }

    let cancelled = false

    const onOrientation = (e: DeviceOrientationEvent) => {
      const evt = e as OrientationEventWithWebkit

      // iOS Safari: webkitCompassHeading is degrees CW from north (most reliable on iOS)
      if (evt.webkitCompassHeading != null && isFinite(evt.webkitCompassHeading)) {
        setCompassHeading(evt.webkitCompassHeading)
        return
      }

      // Android / other: alpha is degrees CCW from north when event is absolute
      if (evt.alpha != null && isFinite(evt.alpha)) {
        setCompassHeading((360 - evt.alpha) % 360)
      }
    }

    const startListening = () => {
      if (cancelled) return

      // Prefer deviceorientationabsolute (Android Chrome) for absolute compass heading.
      // Fall back to deviceorientation (iOS, Firefox) — supplemented by webkitCompassHeading on iOS.
      const useAbsolute = 'ondeviceorientationabsolute' in window
      const eventName = useAbsolute ? 'deviceorientationabsolute' : 'deviceorientation'

      window.addEventListener(eventName, onOrientation as EventListener)
      listenerRef.current = onOrientation
      eventNameRef.current = eventName
    }

    // iOS 13+ requires explicit permission request (must be called from a user gesture)
    const DOE = DeviceOrientationEvent as DeviceOrientationEventWithPermission
    if (typeof DOE.requestPermission === 'function') {
      DOE.requestPermission()
        .then((state) => {
          if (state === 'granted') {
            startListening()
          }
          // If denied, compassHeading stays null → GPS fallback
        })
        .catch(() => {
          // Permission API failed — compass unavailable, GPS fallback
        })
    } else {
      // Android, desktop — no permission needed
      startListening()
    }

    return () => {
      cancelled = true
      if (listenerRef.current && eventNameRef.current) {
        window.removeEventListener(eventNameRef.current, listenerRef.current as EventListener)
        listenerRef.current = null
        eventNameRef.current = null
      }
    }
  }, [active])

  // Priority: compass (only when active) > GPS > null
  if (active && compassHeading != null) {
    return { heading: compassHeading, headingSource: 'compass' }
  }
  if (gpsHeading != null) {
    return { heading: gpsHeading, headingSource: 'gps' }
  }
  return { heading: null, headingSource: null }
}
