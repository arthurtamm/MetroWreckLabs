import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Lifespan from './games/lifespan/Lifespan'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Lifespan />
  </StrictMode>,
)
