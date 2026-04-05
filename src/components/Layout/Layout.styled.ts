import styled from 'styled-components'

export const Page = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  display: flex;
  flex-direction: column;
`

export const Container = styled.div`
  width: min(1200px, 100%);
  margin: 0 auto;
  overflow: auto;
  padding: ${({ theme }) => `${theme.spacing(5)} ${theme.spacing(4)}`};
`

export const Main = styled.main`
  flex: 1;
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing(2)} 0 ${theme.spacing(6)}`};
`
