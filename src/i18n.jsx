/* oxlint-disable react/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import en from './i18n/en';
import fr from './i18n/fr';
import ar from './i18n/ar';

export const LANGS = [
  { id: 'ar', label: 'العربية', short: 'AR', dir: 'rtl' },
  { id: 'fr', label: 'Français', short: 'FR', dir: 'ltr' },
  { id: 'en', label: 'English', short: 'EN', dir: 'ltr' },
];

const dict = { en, fr, ar };
const STORAGE_KEY = 'atlasagri-lang';
const LangContext = createContext(null);

const readLang = () => {
  try {
    // Shareable links can pin a language: ?lang=ar or &lang=ar.
    const hasWindow = typeof window !== 'undefined' && Boolean(window.location);
    const query = hasWindow ? window.location.search : '';
    const hashQuery = hasWindow ? (window.location.hash.split('?')[1] ?? '') : '';
    for (const raw of [query, hashQuery]) {
      const fromUrl = new URLSearchParams(raw).get('lang');
      if (dict[fromUrl]) return fromUrl;
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    return dict[saved] ? saved : 'en';
  } catch {
    return 'en';
  }
};

export function LangProvider({ children }) {
  const [lang, setLang] = useState(readLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* private mode */ }
  }, [lang]);

  const value = useMemo(() => {
    const t = dict[lang];
    // Read a translated field: {en, fr, ar} objects, or obj.field / obj.field_fr.
    // Falls back to English so a missing translation never blanks the screen.
    const pick = (obj, field) => {
      if (obj == null) return '';
      if (field === undefined) return obj[lang] ?? obj.en ?? obj.fr ?? '';
      return obj[`${field}_${lang}`] ?? obj[field];
    };
    const number = (n, digits = 0) => Number(n).toLocaleString(lang === 'ar' ? 'en-GB' : lang, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    return {
      lang,
      dir: lang === 'ar' ? 'rtl' : 'ltr',
      t,
      pick,
      number,
      setLang,
      toggle: () => setLang(lang === 'ar' ? 'en' : lang === 'en' ? 'fr' : 'ar'),
    };
  }, [lang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
