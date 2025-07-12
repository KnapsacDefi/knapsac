import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Buffer polyfill for Privy and crypto operations
import { Buffer } from 'buffer'
window.Buffer = Buffer
globalThis.Buffer = Buffer

createRoot(document.getElementById("root")!).render(<App />);
