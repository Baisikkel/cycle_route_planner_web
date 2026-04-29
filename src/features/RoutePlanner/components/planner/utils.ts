import type { AddressSuggestion } from '@api/address'

export const getSuggestionMeta = (suggestion: AddressSuggestion) =>
  [suggestion.settlement, suggestion.municipality].filter(Boolean).join(', ')
