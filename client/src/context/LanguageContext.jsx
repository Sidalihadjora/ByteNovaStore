import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../translations';

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('soukdz_lang') || 'fr';
  });

  useEffect(() => {
    localStorage.setItem('soukdz_lang', language);
    const dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'fr' ? 'ar' : 'fr'));
  };

  const t = (key, params = {}) => {
    let str = translations[language]?.[key] || translations['fr']?.[key] || key;
    for (const [pKey, pVal] of Object.entries(params)) {
      str = str.replace(`{${pKey}}`, pVal);
    }
    return str;
  };

  const formatPrice = (amount) => {
    if (amount === null || amount === undefined) return '';
    const num = Number(amount);
    const formatted = num.toLocaleString(language === 'ar' ? 'ar-DZ' : 'fr-FR');
    const currency = language === 'ar' ? 'د.ج' : 'DA';
    return `${formatted} ${currency}`;
  };

  const isRtl = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t, formatPrice, isRtl }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
