import type { FeatureCollection } from 'geojson'

import { createStore } from '@lib/state/createStore'

import { createInitialWaypoints, createWaypoint, reorderStopsById } from './routeUtils'
import type {
  LatLon,
  RouteMetadata,
  RouteStatus,
  RouteWaypoint,
  WaypointRole,
  WaypointSource,
} from './types'

type RouteState = {
  route: FeatureCollection | null
  metadata: RouteMetadata | null
  status: RouteStatus
  error: string | null
  waypoints: RouteWaypoint[]
  stopCounter: number
  clearRoute: () => void
  setStart: (point: LatLon | null, label?: string, source?: WaypointSource) => void
  setEnd: (point: LatLon | null, label?: string, source?: WaypointSource) => void
  setWaypointAddress: (
    waypointId: string,
    point: LatLon,
    label: string,
    source?: WaypointSource,
  ) => void
  clearWaypoint: (waypointId: string) => void
  clearAllWaypoints: () => void
  addStop: () => void
  removeStop: (waypointId: string) => void
  moveStop: (waypointId: string, direction: 'up' | 'down') => void
  reorderStops: (activeId: string, overId: string) => void
  startFetching: () => void
  finishFetching: (route: FeatureCollection, metadata: RouteMetadata) => void
  failFetching: (error: string) => void
}

const resetRouteResult = {
  route: null,
  metadata: null,
  status: 'idle' as RouteStatus,
  error: null,
}

const updateEndpoint = (
  waypoints: RouteWaypoint[],
  role: Extract<WaypointRole, 'start' | 'destination'>,
  point: LatLon | null,
  label = '',
  source: WaypointSource = 'map',
) =>
  waypoints.map((waypoint) =>
    waypoint.role === role
      ? {
          ...waypoint,
          label: point ? label : '',
          lat: point?.lat ?? null,
          lon: point?.lon ?? null,
          source: point ? source : 'address',
        }
      : waypoint,
  )

export const useRouteStore = createStore<RouteState>((set, get) => ({
  route: null,
  metadata: null,
  status: 'idle',
  error: null,
  waypoints: createInitialWaypoints(),
  stopCounter: 0,

  clearRoute: () => set(resetRouteResult),

  setStart: (point, label, source) =>
    set((state) => ({
      ...(point ? {} : resetRouteResult),
      waypoints: updateEndpoint(state.waypoints, 'start', point, label, source),
    })),

  setEnd: (point, label, source) =>
    set((state) => ({
      ...(point ? {} : resetRouteResult),
      waypoints: updateEndpoint(state.waypoints, 'destination', point, label, source),
    })),

  setWaypointAddress: (waypointId, point, label, source = 'address') =>
    set((state) => ({
      waypoints: state.waypoints.map((waypoint) =>
        waypoint.id === waypointId
          ? {
              ...waypoint,
              label,
              lat: point.lat,
              lon: point.lon,
              source,
            }
          : waypoint,
      ),
    })),

  clearWaypoint: (waypointId) =>
    set((state) => {
      const waypoint = state.waypoints.find((item) => item.id === waypointId)
      const shouldClearRoute = waypoint?.role === 'start' || waypoint?.role === 'destination'

      return {
        ...(shouldClearRoute ? resetRouteResult : {}),
        waypoints: state.waypoints.map((item) =>
          item.id === waypointId
            ? { ...item, label: '', lat: null, lon: null, source: 'address' }
            : item,
        ),
      }
    }),

  clearAllWaypoints: () =>
    set((state) => ({
      ...resetRouteResult,
      waypoints: state.waypoints.map((waypoint) => ({
        ...waypoint,
        label: '',
        lat: null,
        lon: null,
        source: 'address',
      })),
    })),

  addStop: () =>
    set((state) => {
      const stopCounter = state.stopCounter + 1
      const stop = createWaypoint('stop', `stop-${Date.now()}-${stopCounter}`)
      const destinationIndex = state.waypoints.findIndex(
        (waypoint) => waypoint.role === 'destination',
      )
      const waypoints =
        destinationIndex < 0
          ? [...state.waypoints, stop]
          : [
              ...state.waypoints.slice(0, destinationIndex),
              stop,
              ...state.waypoints.slice(destinationIndex),
            ]

      return { stopCounter, waypoints }
    }),

  removeStop: (waypointId) =>
    set((state) => ({
      waypoints: state.waypoints.filter(
        (waypoint) => waypoint.role !== 'stop' || waypoint.id !== waypointId,
      ),
    })),

  moveStop: (waypointId, direction) => {
    const currentStops = get().waypoints.filter((waypoint) => waypoint.role === 'stop')
    const currentIndex = currentStops.findIndex((waypoint) => waypoint.id === waypointId)
    const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    const overWaypoint = currentStops[nextIndex]

    if (!overWaypoint) return
    get().reorderStops(waypointId, overWaypoint.id)
  },

  reorderStops: (activeId, overId) =>
    set((state) => ({
      waypoints: reorderStopsById(state.waypoints, activeId, overId),
    })),

  startFetching: () => set({ status: 'loading', error: null }),

  finishFetching: (route, metadata) => set({ route, metadata, status: 'success', error: null }),

  failFetching: (error) => set({ route: null, metadata: null, status: 'error', error }),
}))

export const selectStartWaypoint = (state: RouteState) =>
  state.waypoints.find((waypoint) => waypoint.role === 'start')

export const selectDestinationWaypoint = (state: RouteState) =>
  state.waypoints.find((waypoint) => waypoint.role === 'destination')
