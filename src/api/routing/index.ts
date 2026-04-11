/**
 * HTTP client for cycle routing — calls **our** backend only.
 *
 * - Path `/routes/calculate` is relative to `VITE_API_BASE_URL` (see `.env.development`). Example:
 *   base `http://localhost:8080/api` + this path → `http://localhost:8080/api/routes/calculate`.
 * - Do **not** add brouter.de (or any external router URL) here — ticket + Option B expect routing
 *   to stay server-side.
 * - Typed as GeoJSON FeatureCollection because Spring returns raw BRouter GeoJSON; swap type only
 *   if the API contract changes.
 * - `@types/geojson` in devDependencies exists only for this typing (safe to remove if you replace
 *   with a narrower app-specific type).
 */
import type { FeatureCollection } from 'geojson'

import { apiClient } from '../client'

export async function fetchRoute(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
): Promise<FeatureCollection> {
  const response = await apiClient.get<FeatureCollection>('/routes/calculate', {
    params: { startLat, startLon, endLat, endLon },
  })
  return response.data
}
