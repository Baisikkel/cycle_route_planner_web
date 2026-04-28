import { useCallback, useEffect, useRef, useState } from 'react'

import type { AppMapPointerEvent, AppMapTouchEvent } from '@components/Map'
import { LONG_PRESS_MOVE_THRESHOLD, LONG_PRESS_MS } from '@components/Map/mapConfig'

import type { LatLon } from '../routing/types'

export function useLongPressPopup() {
  const [popupPoint, setPopupPoint] = useState<LatLon | null>(null)

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartGeoRef = useRef<LatLon | null>(null)
  const touchStartPointRef = useRef<{ x: number; y: number } | null>(null)

  const openPopup = useCallback((point: LatLon) => {
    setPopupPoint(point)
  }, [])

  const closePopup = useCallback(() => setPopupPoint(null), [])

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    touchStartGeoRef.current = null
    touchStartPointRef.current = null
  }, [])

  const onMapTouchStart = useCallback(
    (event: AppMapTouchEvent) => {
      if (event.originalEvent.touches.length !== 1) {
        cancelLongPress()
        return
      }

      touchStartGeoRef.current = event.lngLat
      touchStartPointRef.current = { x: event.point.x, y: event.point.y }

      longPressTimerRef.current = setTimeout(() => {
        if (touchStartGeoRef.current) openPopup(touchStartGeoRef.current)
        longPressTimerRef.current = null
      }, LONG_PRESS_MS)
    },
    [cancelLongPress, openPopup],
  )

  const onMapTouchMove = useCallback(
    (event: AppMapTouchEvent) => {
      if (event.originalEvent.touches.length !== 1) {
        cancelLongPress()
        return
      }
      if (!touchStartPointRef.current) return

      const dx = event.point.x - touchStartPointRef.current.x
      const dy = event.point.y - touchStartPointRef.current.y
      if (Math.sqrt(dx * dx + dy * dy) > LONG_PRESS_MOVE_THRESHOLD) cancelLongPress()
    },
    [cancelLongPress],
  )

  const onMapTouchEnd = useCallback(() => {
    cancelLongPress()
  }, [cancelLongPress])

  const onMapContextMenu = useCallback(
    (event: AppMapPointerEvent) => {
      event.originalEvent.preventDefault()
      openPopup(event.lngLat)
    },
    [openPopup],
  )

  const onMapClick = useCallback(() => {
    if (popupPoint) closePopup()
  }, [popupPoint, closePopup])

  useEffect(() => {
    if (!popupPoint) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePopup()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [popupPoint, closePopup])

  return {
    popupPoint,
    closePopup,
    onMapClick,
    onMapContextMenu,
    onMapTouchEnd,
    onMapTouchMove,
    onMapTouchStart,
  }
}
