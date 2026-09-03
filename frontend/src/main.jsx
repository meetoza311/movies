import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { startApiWarmup } from './services/api.js';

// Wake Render API ASAP (before UI mounts)
startApiWarmup();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
