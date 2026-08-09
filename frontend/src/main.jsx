import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/app.css'
import 'leaflet/dist/leaflet.css'

window.BACKEND_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') 
  : 'http://localhost:8000';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
