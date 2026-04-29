/**
 * Formatters for route metadata (distance, ETA) shown in the UI.
 *
 * Kept as a shared module so the planning panel and the active-ride panel
 * render the same values in the same format — avoids the two views drifting
 * apart if we change rounding rules later.
 */

/**
 * Formats a distance in metres as a human-readable string in kilometres.
 *
 * @param distanceMeters — distance from route metadata (in metres)
 * @returns e.g. "1.9 km"
 */
export function formatDistance(distanceMeters: number): string {
  const kilometres = distanceMeters / 1000
  return `${kilometres.toFixed(1)} km`
}

/**
 * Formats an ETA in seconds as a human-readable string.
 * Under an hour: "X min". One hour or more: "Xh Ym".
 *
 * @param etaSeconds — estimated time of arrival from route metadata (in seconds)
 * @returns e.g. "8 min" or "1h 23m"
 */
export function formatETA(etaSeconds: number): string {
  const totalMinutes = Math.round(etaSeconds / 60)
  if (totalMinutes < 60) {
    return `${totalMinutes} min`
  }
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes}m`
}
