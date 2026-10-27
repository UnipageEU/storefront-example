import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { startCartSync } from './state/cart.js';
import './styles/tokens.css';
import './styles/base.css';

startCartSync();

createRoot(document.getElementById('app')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
