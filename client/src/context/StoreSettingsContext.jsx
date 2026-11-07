import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';

const StoreSettingsContext = createContext(null);

const defaultSettings = {
  store_name: 'ByteNova Store',
  store_name_ar: 'ByteNova Store',
  website_title: 'ByteNova Store',
  primary_color: '#2563eb',
  secondary_color: '#4f46e5'
};

export function StoreSettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [wilayaStats, setWilayaStats] = useState({ wilaya_count: 0, commune_count: 0 });

  const refreshSettings = useCallback(async () => {
    const [settingsResponse, statsResponse] = await Promise.all([
      api.settings.getPublic(),
      api.wilayas.getStats()
    ]);

    if (settingsResponse.success && settingsResponse.settings) {
      setSettings({ ...defaultSettings, ...settingsResponse.settings });
    } else {
      throw new Error(settingsResponse.message || 'Unable to load public store settings.');
    }

    if (statsResponse.success && statsResponse.stats) {
      setWilayaStats(statsResponse.stats);
    } else {
      throw new Error(statsResponse.message || 'Unable to load Wilaya statistics.');
    }
  }, []);

  useEffect(() => {
    refreshSettings().catch(error => {
      console.error('Unable to load store settings:', error);
    });
  }, [refreshSettings]);

  useEffect(() => {
    const storeName = settings.store_name || defaultSettings.store_name;
    document.title = settings.website_title || storeName;
    document.documentElement.style.setProperty('--brand-primary', settings.primary_color || defaultSettings.primary_color);
    document.documentElement.style.setProperty('--brand-secondary', settings.secondary_color || defaultSettings.secondary_color);

    let description = document.querySelector('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.name = 'description';
      document.head.appendChild(description);
    }
    description.setAttribute('content', settings.store_description || '');

    if (settings.store_favicon) {
      let favicon = document.querySelector('link[data-store-settings-favicon]');
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        favicon.dataset.storeSettingsFavicon = 'true';
        document.head.appendChild(favicon);
      }
      favicon.href = settings.store_favicon;
    } else {
      document.querySelector('link[data-store-settings-favicon]')?.remove();
    }
  }, [settings]);

  const value = { settings, wilayaStats, refreshSettings };
  return (
    <StoreSettingsContext.Provider value={value}>
      {children}
    </StoreSettingsContext.Provider>
  );
}

export function useStoreSettings() {
  const context = useContext(StoreSettingsContext);
  if (!context) {
    throw new Error('useStoreSettings must be used within a StoreSettingsProvider');
  }
  return context;
}
