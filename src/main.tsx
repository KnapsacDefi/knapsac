import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Ensure Buffer is globally available before any other imports
import { Buffer } from 'buffer'
if (typeof window !== 'undefined') {
  window.Buffer = Buffer
  if (!window.global) {
    window.global = window
  }
}

createRoot(document.getElementById("root")!).render(<App />);
