import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSettings, updateSettings as saveSettings } from '../services/settingsService.js';
import { DEFAULT_SETTINGS } from '../utils/constants.js';

const SettingsContext = createContext(null);

/**
 * Provides platform settings loaded through settingsService:
 *  - settings: { deliveryFee, partnerIncentive, servicePlaces:[{id,name}], supportPhone, supportWhatsApp, platformUpiId, platformUpiName }
 *  - status: 'loading' | 'ready' | 'error'
 *  - error: the failure behind status 'error', so screens can say what went wrong
 *  - reload(), updateSettings(patch)
 *  - getPlace(placeId) → place object or undefined
 */
export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      setSettings(await getSettings());
      setStatus('ready');
    } catch (e) {
      // Keep it. Throwing the error away left every screen guessing "check your
      // internet", which is wrong — and costs real time — when the actual cause
      // is a bad API key or a server fault.
      setError(e);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const updateSettings = useCallback(async (patch) => {
    const next = await saveSettings(patch);
    setSettings(next);
    return next;
  }, []);

  const value = useMemo(() => {
    const placeById = Object.fromEntries(settings.servicePlaces.map((p) => [p.id, p]));
    return { settings, status, error, reload, updateSettings, getPlace: (id) => placeById[id] };
  }, [settings, status, error, reload, updateSettings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
