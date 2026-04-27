export function getMapHint(
  t: (key: string) => string,
  permission: string,
  hasRoute: boolean,
  isOffRoute: boolean,
  loading: boolean,
  hasStart: boolean,
): string {
  if (loading) return t('Loading routeâ€¦')
  if (isOffRoute) return t('You are off route. Re-routingâ€¦')
  if (hasRoute) return t('Following your route. Long-press map to plan a new one.')
  if (hasStart && permission !== 'granted') return t('Long-press map to set destination')
  if (permission === 'granted') return t('Long-press map to set destination')
  if (permission === 'prompt')
    return t('Allow location, or long-press map to set start and destination')
  return t('Long-press map to set start and destination')
}
