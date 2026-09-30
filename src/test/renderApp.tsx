import { render, screen } from '@testing-library/react'
import App from '../app/App'
import { demoDataset } from './dataset'

export async function renderApp(hash = '#/dashboard') {
  location.hash = hash
  const data = demoDataset()
  const utils = render(<App load={() => Promise.resolve(data)} />)
  await screen.findByText('remediación automatizada de vulnerabilidades')
  return { ...utils, data }
}
