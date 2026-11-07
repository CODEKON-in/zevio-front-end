import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SettingsProvider } from './context/SettingsContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { LocationProvider } from './context/LocationContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import App from './App.jsx';
import './styles/variables.css';
import './styles/global.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SettingsProvider>
        <AuthProvider>
          <CartProvider>
            <LocationProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </LocationProvider>
          </CartProvider>
        </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>
  </StrictMode>,
);

/*
 * Tell the intro in index.html that the app has painted. The intro then
 * fades out at the end of its ~1.4s animation (or at once, if that already
 * passed). Two frames: the first commits React's DOM, the second is painted.
 */
requestAnimationFrame(() => {
  requestAnimationFrame(() => window.dispatchEvent(new Event('mynt:ready')));
});

/*
 * The few looping animations (empty-state float, skeleton shimmer, status
 * pulse) pause while the tab is in the background: CSS reads html[data-hidden].
 */
function trackVisibility() {
  const sync = () => document.documentElement.toggleAttribute('data-hidden', document.hidden);
  document.addEventListener('visibilitychange', sync);
  sync();
}

trackVisibility();
