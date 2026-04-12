/**
 * Styled components for the Active Ride navigation overlays.
 *
 * These render on top of the fullscreen map during navigation mode.
 * Layout: TopPanel at the top, BottomPanel at the bottom, map visible in between.
 *
 * Designed mobile-first (used on smartphones) — large tap targets (56px buttons),
 * safe-area padding for iOS notch/home indicator, high contrast for outdoor visibility.
 *
 * Panel shapes: LARGE circles (600–800px diameter) positioned mostly off-screen,
 * so only a curved slice is visible at the screen edge. This creates the organic,
 * map-app feel from the mockup — not a box with rounded corners, but the arc
 * of a huge circle peeking in from above/below.
 */
import styled from 'styled-components'

// ─── Top Panel (turn-by-turn instruction) ────────────────────────────────────

/**
 * A very large circle (600px) positioned mostly ABOVE the screen.
 * Only the bottom arc is visible, creating a curved "shelf" at the top.
 * The circle is centered horizontally and shifted up so ~80px of its
 * bottom edge peeks onto the screen.
 *
 * Content (turn icon + text) is positioned at the bottom of the circle
 * using flexbox + padding so it sits in the visible arc area.
 */
export const TopPanel = styled.div`
  position: absolute;
  width: 800px;
  height: 800px;
  border-radius: 50%;
  top: -680px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  background: rgb(246, 228, 110);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 40px;
  overflow: hidden;
`

/** Inner wrapper that positions the turn/progress content in the visible bottom arc. */
export const TopPanelContent = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
  max-width: 300px;
`

/**
 * Container for the turn direction icon (arrow SVG).
 * Fixed size for consistent layout regardless of icon content.
 */
export const TurnIconContainer = styled.div`
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`

/** Text block next to the turn icon — shows distance and street name. */
export const TurnInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
`

/** Distance to the next turn (e.g. "50 m"). Large bold text for readability while riding. */
export const TurnDistance = styled.span`
  font-size: 1.8rem;
  font-weight: 600;
  color: rgba(101, 46, 11, 0.97);
  line-height: 1.2;
`

/** Street name for the next turn (e.g. "Puhke tänav"). Smaller text below distance. */
export const TurnStreet = styled.span`
  font-size: 1.4rem;
  font-weight: 600;
  color: rgb(46, 49, 7);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

// ─── Progress bar (shown in route overview instead of turn info) ─────────────

/**
 * Horizontal row: total distance | progress bar with bike icon | total time.
 * Shown in the top panel when the user zooms out to see the full route.
 * The bike icon position on the bar shows progress (0% for now — another dev provides real value).
 */
export const ProgressBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 300px;
`

/** Total distance or time label at the ends of the progress bar. */
export const ProgressLabel = styled.span`
  font-size: 1.2rem;
  font-weight: 800;
  color: rgb(46, 49, 7);
  white-space: nowrap;
  text-transform: uppercase;
  flex-shrink: 0;
`

/** The track/bar between the distance and time labels. */
export const ProgressTrack = styled.div`
  flex: 1;
  height: 4px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
  position: relative;
`

/**
 * Bike icon that sits on the progress bar showing how far along the route the user is.
 * Position is controlled via $progress prop (0–100%). Defaults to 0 (start) for now.
 */
export const ProgressBike = styled.span<{ $progress?: number }>`
  position: absolute;
  top: 0.5%;
  left: ${({ $progress }) => $progress ?? 0}%;
  transform: translate(-50%, -50%);
  font-size: 1.2rem;
  line-height: 1;
`

// ─── Bottom Panel (controls + metadata) ──────────────────────────────────────

/**
 * A very large circle (800px) positioned mostly BELOW the screen.
 * Only the top arc is visible, creating a curved "dock" at the bottom.
 * The circle is centered horizontally and shifted down so ~140px of its
 * top edge peeks onto the screen — enough room for buttons + metadata.
 *
 * Content is positioned at the top of the circle using flexbox + padding.
 */
export const BottomPanel = styled.div`
  position: absolute;
  width: 800px;
  height: 800px;
  border-radius: 50%;
  bottom: calc(-670px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  background: rgb(228, 255, 122);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 30px;
  overflow: hidden;
`

/** Horizontal row of circle action buttons. */
export const ButtonRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 50px;
`

/**
 * Circular action button (cancel, recenter, route overview).
 * 52px for comfortable tap targets on mobile (Apple HIG recommends 44px minimum).
 * Semi-transparent white for visibility on the green circle background.
 */
export const CircleButton = styled.button`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.86);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  touch-action: manipulation;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  transition: transform 0.1s ease;

  &:active {
    transform: scale(0.93);
  }

  svg {
    width: 30px;
    height: 30px;
  }
`

/**
 * Distance and time display below the buttons.
 * Shows placeholder dashes when real data isn't available yet
 * (another dev provides remaining distance + ETA).
 */
export const MetadataText = styled.p`
  margin: 6px 0 0;
  width: 200px;
  display: flex;
  justify-content: space-between;
  font-size: 1rem;
  font-weight: 500;
  color: rgb(46, 49, 7);
  text-transform: uppercase;
  letter-spacing: 0.01em;
`

// ─── "Let's ride" button (shown in planning mode when route exists) ──────────

/**
 * Green pill-shaped button positioned at the bottom of the map in planning mode.
 * Tapping this enters navigation mode. Only visible when a route is ready.
 * Large size and bold text for easy discoverability.
 */
export const LetsRideButton = styled.button`
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  padding: 10px 100px;
  white-space: nowrap;
  border: none;
  border-radius: 9999px;
  background: rgb(225, 255, 105);
  color: rgba(37, 22, 6, 0.97);
  font-size: 1.2rem;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
  box-shadow: 0 4px 16px rgba(22, 163, 74, 0.4);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;

  &:active {
    transform: translateX(-50%) scale(0.95);
    box-shadow: 0 2px 8px rgba(22, 163, 74, 0.3);
  }
`
