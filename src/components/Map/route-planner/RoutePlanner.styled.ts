import styled from 'styled-components'

export const PlannerPanel = styled.section`
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};
  max-height: min(50dvh, 380px);
  padding: ${({ theme }) => theme.spacing(2)};
  overflow-y: auto;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.shadow.md};

  @media (min-width: 720px) {
    right: auto;
    width: 420px;
    max-height: 58vh;
  }
`

export const PlannerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(2)};
`

export const PlannerTitle = styled.h2`
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.2;
  color: ${({ theme }) => theme.colors.text};
`

export const AddStopButton = styled.button`
  min-height: 40px;
  padding: ${({ theme }) => `${theme.spacing(2)} ${theme.spacing(3)}`};
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primaryDark};
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
`

export const WaypointList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};
`

export const WaypointRowShell = styled.div<{ $dragging?: boolean }>`
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto;
  gap: ${({ theme }) => theme.spacing(2)};
  align-items: start;
  border-radius: ${({ theme }) => theme.radius.sm};
  opacity: ${({ $dragging }) => ($dragging ? 0.72 : 1)};
`

export const RoleBadge = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-top: 8px;
  border: 2px solid ${({ $color }) => $color};
  border-radius: 50%;
  color: ${({ $color }) => $color};
  background: ${({ theme }) => theme.colors.surface};
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 1;
`

export const FieldColumn = styled.div`
  position: relative;
  min-width: 0;
`

export const InlineLeftControl = styled.div`
  position: absolute;
  top: 2px;
  left: 2px;
  z-index: 2;
`

export const AddressInput = styled.input<{ $hasLeftControl?: boolean }>`
  width: 100%;
  min-height: 44px;
  box-sizing: border-box;
  padding: ${({ theme }) =>
    `${theme.spacing(2)} ${theme.spacing(10)} ${theme.spacing(2)} ${theme.spacing(3)}`};
  padding-left: ${({ $hasLeftControl, theme }) =>
    $hasLeftControl ? theme.spacing(10) : theme.spacing(3)};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.colors.surfaceMuted};
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  font-size: 1rem;

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primaryMuted};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

export const ClearButton = styled.button`
  position: absolute;
  top: 2px;
  right: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  font: inherit;
  font-size: 1.1rem;
  cursor: pointer;
  touch-action: manipulation;
`

export const SuggestionList = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 25;
  max-height: 220px;
  overflow-y: auto;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  box-shadow: ${({ theme }) => theme.shadow.md};
`

export const SuggestionButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  min-height: 50px;
  padding: ${({ theme }) => theme.spacing(3)};
  border: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  text-align: left;
  font: inherit;
  cursor: pointer;
  touch-action: manipulation;

  &:last-child {
    border-bottom: 0;
  }

  &:active {
    background: ${({ theme }) => theme.colors.surfaceMuted};
  }
`

export const SuggestionLabel = styled.span`
  font-size: 0.95rem;
  line-height: 1.25;
`

export const SuggestionMeta = styled.span`
  margin-top: 2px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.78rem;
  line-height: 1.2;
`

export const SuggestionState = styled.div`
  min-height: 44px;
  padding: ${({ theme }) => theme.spacing(3)};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.9rem;
`

export const RowControls = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1)};
`

export const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  touch-action: manipulation;

  &:disabled {
    cursor: default;
    opacity: 0.45;
  }
`

export const DragHandleButton = styled(IconButton)`
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
`

export const InlineDragHandleButton = styled(DragHandleButton)`
  width: 40px;
  height: 40px;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: 400;
`

export const Grip = styled.span`
  display: flex;
  flex-direction: column;
  gap: 3px;

  &::before,
  &::after,
  span {
    content: '';
    display: block;
    width: 16px;
    height: 2px;
    border-radius: 999px;
    background: currentColor;
  }
`
