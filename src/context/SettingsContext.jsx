import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSettings, updateSettings as saveSettings } from '../services/settingsService.js';
import { DEFAULT_SETTINGS } from '../utils/constants.js';

const SettingsContext = createContext(null);

/**
 * Provides platform settings loaded through settingsService:
 *  - settings: { deliveryFee, partnerIncentive, servicePlaces:[{id,name}], supportPhone, supportWhatsApp, platformUpiId, platformUpiName }
 *  - status: 'loading' | 'ready' | 'error'
 *  - reload(), updateSettings(patch)
 *  - getPlace(placeId) → place object or undefined
 */
export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [status, setStatus] = useState('loading');

  const reload = useCallback(async () => {
    setStatus('loading');
    try {
      setSettings(await getSettings());
      setStatus('ready');
    } catch {
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
    return { settings, status, reload, updateSettings, getPlace: (id) => placeById[id] };
  }, [settings, status, reload, updateSettings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
