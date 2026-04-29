import { apiClient } from '../client'

export type AddressSuggestion = {
  id: string
  label: string
  address: string
  lat: number
  lon: number
  settlement?: string
  municipality?: string
}

type RawAddressSuggestion = {
  id?: string | number
  label?: string
  address?: string
  displayText?: string
  displayName?: string
  display_name?: string
  name?: string
  lat?: number | string
  lon?: number | string
  lng?: number | string
  longitude?: number | string
  settlement?: string
  municipality?: string
}

const MIN_QUERY_LENGTH = 2
const DEFAULT_LIMIT = 6

const toNumber = (value: number | string | undefined): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const normalizeSuggestion = (
  suggestion: RawAddressSuggestion,
  index: number,
): AddressSuggestion | null => {
  const lat = toNumber(suggestion.lat)
  const lon = toNumber(suggestion.lon ?? suggestion.lng ?? suggestion.longitude)
  const label =
    suggestion.label ??
    suggestion.address ??
    suggestion.displayText ??
    suggestion.displayName ??
    suggestion.display_name ??
    suggestion.name

  if (!label || lat === null || lon === null) return null

  return {
    id: String(suggestion.id ?? `${lat}:${lon}:${index}`),
    label,
    address: suggestion.address ?? suggestion.displayText ?? suggestion.displayName ?? label,
    lat,
    lon,
    settlement: suggestion.settlement,
    municipality: suggestion.municipality,
  }
}

export async function searchAddresses(
  query: string,
  limit = DEFAULT_LIMIT,
): Promise<AddressSuggestion[]> {
  const trimmedQuery = query.trim()
  if (trimmedQuery.length < MIN_QUERY_LENGTH) return []

  const response = await apiClient.get<RawAddressSuggestion[]>('/address/search', {
    params: { query: trimmedQuery, limit },
  })

  return response.data
    .map((suggestion, index) => normalizeSuggestion(suggestion, index))
    .filter((suggestion): suggestion is AddressSuggestion => suggestion !== null)
}
