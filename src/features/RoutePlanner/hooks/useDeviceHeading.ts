import { useEffect, useRef, useState } from 'react'

type DeviceOrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

type OrientationEventWithWebkit = DeviceOrientationEvent & {
  webkitCompassHeading?: number
}

export type DeviceHeadingState = {
  heading: number | null
  headingSource: 'compass' | 'gps' | null
}

export function useDeviceHeading(gpsHeading: number | null, active: boolean): DeviceHeadingState {
  const [compassHeading, setCompassHeading] = useState<number | null>(null)
  const listenerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null)
  const eventNameRef = useRef<string | null>(null)

  useEffect(() => {
    if (!active) return

    let cancelled = false

    const onOrientation = (e: DeviceOrientationEvent) => {
      const evt = e as OrientationEventWithWebkit

      if (evt.webkitCompassHeading != null && isFinite(evt.webkitCompassHeading)) {
        setCompassHeading(evt.webkitCompassHeading)
        return
      }

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

      if ('ondeviceorientationabsolute' in window) {
        let receivedAbsolute = false

        const onFirstAbsolute = (e: Event) => {
          const evt = e as DeviceOrientationEvent
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
            window.removeEventListener('deviceorientationabsolute', onFirstAbsolute)
            listen('deviceorientationabsolute')
          } else {
            window.removeEventListener('deviceorientationabsolute', onFirstAbsolute)
            listen('deviceorientation')
          }
        }, 1000)
      } else {
        listen('deviceorientation')
      }
    }

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

  if (compassHeading != null) {
    return { heading: compassHeading, headingSource: 'compass' }
  }
  if (gpsHeading != null) {
    return { heading: gpsHeading, headingSource: 'gps' }
  }
  return { heading: null, headingSource: null }
}
