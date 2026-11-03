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

/**
 * Take the splash down once React has actually painted.
 *
 * It fades rather than vanishes, and it is removed from the page afterwards so
 * it can never sit invisibly over the app swallowing taps. If the browser
 * skips the transition (reduced motion, a backgrounded tab), the timeout still
 * clears it — the splash has no way to get stuck.
 */
function dismissSplash() {
  const boot = document.getElementById('boot');
  if (!boot) return;
  // Wait for the frame React painted into, so the fade starts over real content.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      boot.classList.add('boot-hide');
      const done = () => boot.remove();
      boot.addEventListener('transitionend', done, { once: true });
      setTimeout(done, 400);
    });
  });
}

dismissSplash();
