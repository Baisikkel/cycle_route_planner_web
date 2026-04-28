# Navigation Mode Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve navigation mode with closer zoom (18), steeper pitch (45°), and compass-based heading with GPS fallback.

**Architecture:** New `useDeviceHeading` hook merges compass (`DeviceOrientationEvent`) and GPS heading into a single value. `isNavigating` state is lifted from `useNavigationMode` into `MapLibre.tsx` to break a circular dependency between the two hooks. `useNavigationMode` accepts `isNavigating`/`setIsNavigating` as params instead of managing that state internally.

**Tech Stack:** React hooks, DeviceOrientationEvent Web API, MapLibre GL JS, TypeScript

**Note:** No test framework is configured. Compass heading requires real mobile devices. Verification is via `tsc` type-checking and `eslint`.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/components/Map/useNavigationMode.ts` | Modify | Update zoom/pitch constants; accept `isNavigating`/`setIsNavigating` as params |
| `src/components/Map/useDeviceHeading.ts` | Create | Compass listener + GPS fallback → single `heading` value |
| `src/components/Map/MapLibre.tsx` | Modify | Lift `isNavigating` state; wire `useDeviceHeading` between `useGeolocation` and `useNavigationMode` |

---

### Task 1: Update zoom and pitch constants

**Files:**
- Modify: `src/components/Map/useNavigationMode.ts:32-34`

- [ ] **Step 1: Update NAVIGATION_ZOOM and NAVIGATION_PITCH**

In `src/components/Map/useNavigationMode.ts`, change:

```ts
/** Street-level zoom for cycling navigation. */
const NAVIGATION_ZOOM = 16
/** Slight 3D tilt for better orientation while riding. */
const NAVIGATION_PITCH = 20
```

to:

```ts
/** Street-level zoom for cycling navigation — close enough to see buildings and turns. */
const NAVIGATION_ZOOM = 18
/** 3D tilt for look-ahead perspective while riding (like Google Maps navigation). */
const NAVIGATION_PITCH = 45
```

- [ ] **Step 2: Verify build**

Run: `npx tsc -b --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Map/useNavigationMode.ts
git commit -m "feat(nav): increase zoom to 18 and pitch to 45° for closer navigation view"
```

---

### Task 2: Lift isNavigating state from useNavigationMode to MapLibre

**Why:** `useDeviceHeading` (Task 3) needs `isNavigating` to activate the compass listener, but `useNavigationMode` needs the merged `heading` from `useDeviceHeading`. Circular dependency. Lifting `isNavigating` to MapLibre breaks the cycle.

**Files:**
- Modify: `src/components/Map/useNavigationMode.ts:62-97`
- Modify: `src/components/Map/MapLibre.tsx:136,192-200`

- [ ] **Step 1: Update NavigationModeState type**

In `src/components/Map/useNavigationMode.ts`, remove `isNavigating` from the return type since it's now managed externally:

```ts
export type NavigationModeState = {
  /** Whether the user is in active navigation (fullscreen, map follows). */
  isNavigating: boolean
  /** Whether the map auto-follows the user's position. False when user pans away manually. */
  autoFollow: boolean
```

Change to:

```ts
export type NavigationModeState = {
  /** Whether the map auto-follows the user's position. False when user pans away manually. */
  autoFollow: boolean
```

- [ ] **Step 2: Update useNavigationMode signature and remove internal isNavigating state**

In `src/components/Map/useNavigationMode.ts`, change:

```ts
export function useNavigationMode(
  mapRef: React.RefObject<MapRef | null>,
  position: Position | null,
  heading: number | null,
  route: FeatureCollection | null,
): NavigationModeState {
  const [isNavigating, setIsNavigating] = useState(false)
  const [autoFollow, setAutoFollow] = useState(false)
```

to:

```ts
export function useNavigationMode(
  mapRef: React.RefObject<MapRef | null>,
  position: Position | null,
  heading: number | null,
  route: FeatureCollection | null,
  isNavigating: boolean,
  setIsNavigating: React.Dispatch<React.SetStateAction<boolean>>,
): NavigationModeState {
  const [autoFollow, setAutoFollow] = useState(false)
```

- [ ] **Step 3: Update the return statement**

In `src/components/Map/useNavigationMode.ts`, change:

```ts
  return {
    isNavigating,
    autoFollow,
    startRide,
    stopRide,
    recenter,
    handleUserInteraction,
    showRouteOverview,
  }
```

to:

```ts
  return {
    autoFollow,
    startRide,
    stopRide,
    recenter,
    handleUserInteraction,
    showRouteOverview,
  }
```

- [ ] **Step 4: Update JSDoc**

In `src/components/Map/useNavigationMode.ts`, update the function JSDoc:

```ts
/**
 * Hook that manages navigation mode state and map view following.
 *
 * @param mapRef — ref to the MapLibre map instance for imperative control
 * @param position — current GPS position from useGeolocation
 * @param heading — compass heading in degrees from useGeolocation (null when stationary)
 * @param route — current route GeoJSON from useRoute (needed for fitBounds on exit/overview)
 */
```

to:

```ts
/**
 * Hook that manages navigation mode state and map view following.
 *
 * @param mapRef — ref to the MapLibre map instance for imperative control
 * @param position — current GPS position from useGeolocation
 * @param heading — best-available heading from useDeviceHeading (compass or GPS fallback)
 * @param route — current route GeoJSON from useRoute (needed for fitBounds on exit/overview)
 * @param isNavigating — whether active navigation is on (lifted state from MapLibre)
 * @param setIsNavigating — state setter for isNavigating (lifted state from MapLibre)
 */
```

- [ ] **Step 5: Lift isNavigating state in MapLibre.tsx**

In `src/components/Map/MapLibre.tsx`, add `isNavigating` state before the `useNavigationMode` call. Change:

```ts
  const {
    isNavigating,
    autoFollow,
    startRide,
    stopRide,
    recenter,
    handleUserInteraction,
    showRouteOverview,
  } = useNavigationMode(mapRef, position, heading, route)
```

to:

```ts
  const [isNavigating, setIsNavigating] = useState(false)

  const {
    autoFollow,
    startRide,
    stopRide,
    recenter,
    handleUserInteraction,
    showRouteOverview,
  } = useNavigationMode(mapRef, position, heading, route, isNavigating, setIsNavigating)
```

Note: `useState` is already imported in MapLibre.tsx (line 29).

- [ ] **Step 6: Verify build**

Run: `npx tsc -b --noEmit`
Expected: No errors. `isNavigating` is still in scope in MapLibre.tsx (from useState) and used the same way in JSX.

- [ ] **Step 7: Commit**

```bash
git add src/components/Map/useNavigationMode.ts src/components/Map/MapLibre.tsx
git commit -m "refactor(nav): lift isNavigating state to MapLibre

Prepares for useDeviceHeading hook which needs isNavigating to
activate compass listener, breaking circular dependency."
```

---

### Task 3: Create useDeviceHeading hook

**Files:**
- Create: `src/components/Map/useDeviceHeading.ts`

- [ ] **Step 1: Create the hook file**

Create `src/components/Map/useDeviceHeading.ts`:

```ts
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
export function useDeviceHeading(
  gpsHeading: number | null,
  active: boolean,
): DeviceHeadingState {
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
      setCompassHeading(null)
      return
    }

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
      if (listenerRef.current && eventNameRef.current) {
        window.removeEventListener(eventNameRef.current, listenerRef.current as EventListener)
        listenerRef.current = null
        eventNameRef.current = null
      }
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
```

- [ ] **Step 2: Verify build**

Run: `npx tsc -b --noEmit`
Expected: No errors. The hook is not imported yet but should compile.

- [ ] **Step 3: Commit**

```bash
git add src/components/Map/useDeviceHeading.ts
git commit -m "feat(nav): add useDeviceHeading hook with compass priority and GPS fallback

Reads DeviceOrientationEvent for compass heading on mobile browsers.
Falls back to GPS heading on desktop or when permission is denied.
Handles iOS requestPermission() for Safari 13+.
Prefers deviceorientationabsolute on Android Chrome."
```

---

### Task 4: Wire useDeviceHeading into MapLibre

**Files:**
- Modify: `src/components/Map/MapLibre.tsx:56,136`

- [ ] **Step 1: Add import**

In `src/components/Map/MapLibre.tsx`, after the line:

```ts
import { useGeolocation } from './useGeolocation'
```

add:

```ts
import { useDeviceHeading } from './useDeviceHeading'
```

- [ ] **Step 2: Rename GPS heading and add useDeviceHeading call**

In `src/components/Map/MapLibre.tsx`, change:

```ts
  const { permission, position, heading, error: geoError } = useGeolocation()
```

to:

```ts
  const { permission, position, heading: gpsHeading, error: geoError } = useGeolocation()
```

Then, after the `const [isNavigating, setIsNavigating] = useState(false)` line (added in Task 2), add:

```ts
  const { heading } = useDeviceHeading(gpsHeading, isNavigating)
```

The final hook call order in MapLibre should be:

```ts
  const { permission, position, heading: gpsHeading, error: geoError } = useGeolocation()
  const { route, ... } = useRoute()

  // ... (popupPoint, panelCollapsed, refs, etc.) ...

  const [isNavigating, setIsNavigating] = useState(false)
  const { heading } = useDeviceHeading(gpsHeading, isNavigating)

  const {
    autoFollow, startRide, stopRide, recenter,
    handleUserInteraction, showRouteOverview,
  } = useNavigationMode(mapRef, position, heading, route, isNavigating, setIsNavigating)
```

All downstream usage of `heading` (in JSX for `BikeEmoji`, `NavigationArrowOverlay`, and in `useNavigationMode`) now receives the compass-merged value without any changes.

- [ ] **Step 3: Verify build**

Run: `npx tsc -b --noEmit`
Expected: No errors.

- [ ] **Step 4: Run linter**

Run: `npx eslint src/components/Map/MapLibre.tsx src/components/Map/useDeviceHeading.ts src/components/Map/useNavigationMode.ts`
Expected: No errors (or only pre-existing warnings).

- [ ] **Step 5: Commit**

```bash
git add src/components/Map/MapLibre.tsx
git commit -m "feat(nav): wire useDeviceHeading for compass-based map rotation

Map now rotates based on device compass heading during navigation.
GPS heading is used as fallback on desktop or when compass unavailable.
gpsHeading renamed for clarity at the wiring site."
```

---

### Task 5: Manual verification

- [ ] **Step 1: Run dev server and test on desktop**

Run: `npm run dev`

Open in desktop browser → start a ride → map should follow with GPS heading (compass unavailable on desktop, so GPS fallback kicks in). Verify zoom is noticeably closer (18) and pitch is steeper (45°).

- [ ] **Step 2: Test on mobile (if available)**

Open on a phone (must be HTTPS or localhost) → start a ride → rotate the phone while stationary → map should rotate with the compass. The heading source should be 'compass'.

- [ ] **Step 3: Test iOS Safari (if available)**

Open on iPhone → tap "Let's ride" → should see iOS compass permission prompt → approve → map rotates with compass heading.
