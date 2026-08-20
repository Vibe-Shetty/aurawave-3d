import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import SplashScreen from './SplashScreen.jsx'
import OutroScreen from './OutroScreen.jsx'
import './index.css'

const isSplash = window.location.search.includes('view=splash') || window.location.hash.includes('splash');
const isOutro = window.location.search.includes('view=outro') || window.location.hash.includes('outro');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isSplash ? <SplashScreen /> : isOutro ? <OutroScreen /> : <App />}
  </StrictMode>,
)


