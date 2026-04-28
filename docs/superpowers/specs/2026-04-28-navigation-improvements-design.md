# Navigation Mode Improvements — Design Spec

## Problem

The current navigation mode has three issues:

1. **Zoom too far out** — `NAVIGATION_ZOOM = 16` shows a wide city-block view; cyclists need street-level detail to see upcoming turns and obstacles.
2. **No compass heading** — heading comes only from GPS `coords.heading`, which is null when stationary, sluggish at low speeds, and represents direction of travel rather than where the phone is pointing.
3. **Subtle 3D perspective** — `NAVIGATION_PITCH = 20` provides minimal look-ahead; a steeper pitch improves spatial awareness at higher zoom levels.

## Approach

**Option C: New `useDeviceHeading` hook with merged output.**

A dedicated hook that internally reads both the device compass (`DeviceOrientationEvent`) and GPS heading, applies priority logic (compass preferred, GPS fallback), and exposes a single `heading` value. Consumers don't need to know the source.

## Changes

### 1. Constants in `useNavigationMode.ts`

| Constant | Before | After |
|---|---|---|
| `NAVIGATION_ZOOM` | 16 | 18 |
| `NAVIGATION_PITCH` | 20 | 45 |

No other changes to `useNavigationMode.ts`. The hook already receives `heading` as a parameter and uses it in `easeTo({ bearing: heading ?? 0 })`.

### 2. New hook: `useDeviceHeading.ts`

Location: `src/components/Map/useDeviceHeading.ts`

**API:**

```ts
function useDeviceHeading(
  gpsHeading: number | null,
  active: boolean,
): {
  heading: number | null
  headingSource: 'compass' | 'gps' | null
}
```

**Parameters:**
- `gpsHeading` — GPS-derived heading from `useGeolocation` (fallback source)
- `active` — when `true`, listens to `DeviceOrientationEvent`; when `false`, removes the listener to save battery. Should be set to `isNavigating` in practice.

**Behavior:**

1. When `active` becomes `true`:
   - On iOS 13+: calls `DeviceOrientationEvent.requestPermission()` (requires prior user gesture — the "Let's ride" tap serves as this gesture)
   - Adds a `deviceorientationabsolute` event listener (preferred) or falls back to `deviceorientation`
2. On each orientation event:
   - iOS Safari: reads `event.webkitCompassHeading` (degrees clockwise from north, 0–360)
   - Other browsers: reads `event.alpha` and converts: `compassHeading = (360 - event.alpha) % 360` (when `event.absolute` is true)
   - Stores the compass heading in state
3. Priority logic (evaluated on every render):
   - If compass heading is available → use it, `headingSource = 'compass'`
   - Else if GPS heading is available → use it, `headingSource = 'gps'`
   - Else → `heading = null`, `headingSource = null`
4. When `active` becomes `false`:
   - Removes the `deviceorientation` listener
   - Resets compass heading to null

**Edge cases:**
- Desktop browsers: `DeviceOrientationEvent` is absent or provides no data → falls back to GPS heading seamlessly
- Android Chrome: `deviceorientationabsolute` provides absolute compass heading directly
- iOS Safari: requires `requestPermission()` first; `webkitCompassHeading` is the reliable property
- Permission denied: compass heading stays null, GPS heading is used as fallback

### 3. Wiring in `MapLibre.tsx`

Current flow:
```
useGeolocation() → { heading } → useNavigationMode(mapRef, position, heading, route)
                                → <BikeEmoji $heading={heading}>
                                → <NavigationArrowOverlay $heading={heading}>
```

New flow:
```
useGeolocation() → { heading: gpsHeading }
useDeviceHeading(gpsHeading, isNavigating) → { heading }
  → useNavigationMode(mapRef, position, heading, route)
  → <BikeEmoji $heading={heading}>
  → <NavigationArrowOverlay $heading={heading}>
```

Changes in `MapLibre.tsx`:
1. Import `useDeviceHeading`
2. Destructure GPS heading as `heading: gpsHeading` from `useGeolocation()`
3. Call `const { heading } = useDeviceHeading(gpsHeading, isNavigating)`
4. Pass `heading` (merged) to `useNavigationMode`, `BikeEmoji`, and `NavigationArrowOverlay` — same as current code, just a different source

### 4. No changes needed

- `useGeolocation.ts` — continues exposing GPS heading as before
- `useNavigationMode.ts` — only constant changes (zoom/pitch); logic unchanged
- `useRouteTracking.ts` — doesn't use heading
- `ActiveRide.tsx` — doesn't use heading
- `Map.styled.ts` — the `$heading` prop still works the same way

## Testing Notes

- Compass heading can only be tested on real mobile devices (not desktop browsers)
- The GPS fallback path should be verified on desktop (no compass available → GPS heading used)
- iOS permission flow requires HTTPS (or localhost)
- Verify the "Let's ride" tap satisfies iOS's user-gesture requirement for `requestPermission()`
