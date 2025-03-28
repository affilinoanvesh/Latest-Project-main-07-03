import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// We can use StrictMode now because we have a custom StrictModeDroppable component
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);