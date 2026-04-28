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
    if (!active) return

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

    const listen = (eventName: string) => {
      window.addEventListener(eventName, onOrientation as EventListener)
      listenerRef.current = onOrientation
      eventNameRef.current = eventName
    }

    const startListening = () => {
      if (cancelled) return

      // Prefer deviceorientationabsolute (Android Chrome) for absolute compass heading.
      // However, 'ondeviceorientationabsolute' in window is true on desktop Chrome too
      // (where no compass exists), so we try it first and fall back to deviceorientation
      // if no events fire within 1 second.
      if ('ondeviceorientationabsolute' in window) {
        let receivedAbsolute = false

        const onFirstAbsolute = (e: Event) => {
          const evt = e as DeviceOrientationEvent
          // Chrome desktop fires this event with all-null values — ignore those
          if (evt.alpha == null) return
          receivedAbsolute = true
          window.removeEventListener('deviceorientationabsolute', onFirstAbsolute)
          onOrientation(evt)
        }

        window.addEventListener('deviceorientationabsolute', onFirstAbsolute)

        setTimeout(() => {
          if (cancelled) {
            window.removeEventListener('deviceorientationabsolute', onFirstAbsolute)
            return
          }
          if (receivedAbsolute) {
            // Got absolute events — use that permanently
            window.removeEventListener('deviceorientationabsolute', onFirstAbsolute)
            listen('deviceorientationabsolute')
          } else {
            // No absolute events — fall back to regular deviceorientation
            window.removeEventListener('deviceorientationabsolute', onFirstAbsolute)
            listen('deviceorientation')
          }
        }, 1000)
      } else {
        // iOS / Firefox — use regular deviceorientation (with webkitCompassHeading on iOS)
        listen('deviceorientation')
      }
    }

    // iOS 13+ requires explicit permission request (must be called from a user gesture)
    const DOE = DeviceOrientationEvent as DeviceOrientationEventWithPermission
    if (typeof DOE.requestPermission === 'function') {
      DOE.requestPermission()
        .then((state) => {
          if (state === 'granted') {
            startListening()
          } else {
            console.warn('Compass permission denied — using GPS heading as fallback')
          }
        })
        .catch((err) => {
          console.warn('Compass permission request failed — using GPS heading as fallback', err)
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
      setCompassHeading(null)
    }
  }, [active])

  // Priority: compass > GPS > null
  if (compassHeading != null) {
    return { heading: compassHeading, headingSource: 'compass' }
  }
  if (gpsHeading != null) {
    return { heading: gpsHeading, headingSource: 'gps' }
  }
  return { heading: null, headingSource: null }
}
