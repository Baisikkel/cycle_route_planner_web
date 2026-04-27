import { useEffect, useRef, useState } from 'react'

import { searchAddresses, type AddressSuggestion } from '@api/address'

import { ADDRESS_SEARCH_LIMIT } from './config'

type AutocompleteStatus = 'idle' | 'loading' | 'success' | 'error'

type UseAddressAutocompleteOptions = {
  initialLabel: string
  selectedLabel: string
  hasSelectedPoint: boolean
}

export function useAddressAutocomplete({
  initialLabel,
  selectedLabel,
  hasSelectedPoint,
}: UseAddressAutocompleteOptions) {
  const [query, setQuery] = useState(initialLabel)
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [status, setStatus] = useState<AutocompleteStatus>('idle')
  const [focused, setFocused] = useState(false)
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const trimmedQuery = query.trim()

    if (trimmedQuery.length < 2) return
    if (hasSelectedPoint && trimmedQuery === selectedLabel.trim()) return

    let cancelled = false
    const timer = setTimeout(() => {
      setStatus('loading')
      searchAddresses(trimmedQuery, ADDRESS_SEARCH_LIMIT)
        .then((results) => {
          if (cancelled) return
          setSuggestions(results)
          setStatus('success')
        })
        .catch(() => {
          if (cancelled) return
          setSuggestions([])
          setStatus('error')
        })
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [hasSelectedPoint, query, selectedLabel])

  const showSuggestions =
    focused &&
    query.trim().length >= 2 &&
    (status === 'loading' || status === 'error' || suggestions.length > 0 || status === 'success')

  const resetSearch = () => {
    setSuggestions([])
    setStatus('idle')
  }

  const updateQuery = (nextQuery: string) => {
    setQuery(nextQuery)
    if (nextQuery.trim().length < 2) resetSearch()
  }

  const selectSuggestion = (suggestion: AddressSuggestion) => {
    setQuery(suggestion.label)
    resetSearch()
    setFocused(false)
  }

  const clear = () => {
    setQuery('')
    resetSearch()
  }

  const handleFocus = () => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    setFocused(true)
  }

  const handleBlur = () => {
    blurTimerRef.current = setTimeout(() => setFocused(false), 120)
  }

  return {
    query,
    status,
    suggestions,
    showSuggestions,
    clear,
    handleBlur,
    handleFocus,
    selectSuggestion,
    updateQuery,
  }
}
