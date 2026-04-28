import styled from 'styled-components'

import { type ErrorType } from './NotificationToast'

const getBgColor = (type: ErrorType | null): string => {
  switch (type) {
    case 'offline':
    case 'server_error':
      return '#ff4d4f' // Red for critical
    case 'gps_lost':
    case 'off_course':
    case 'rerouting':
      return '#faad14' // Orange/Yellow for warnings
    default:
      return '#ff4d4f'
  }
}

export const ToastContainer = styled.div<{ $isVisible: boolean; $errorType: ErrorType | null }>`
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: ${(props) => (props.$isVisible ? 'flex' : 'none')};
  align-items: center;
  background-color: ${(props) => getBgColor(props.$errorType)};
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-weight: 600;
  min-width: 300px;
  justify-content: space-between;
  transition: background-color 0.3s ease;
`

export const CloseButton = styled.button`
  margin-left: 15px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`
