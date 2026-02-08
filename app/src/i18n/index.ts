import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './locales/fr.json';
import en from './locales/en.json';

// Storage key for language preference
const LANGUAGE_STORAGE_KEY = 'eclipse-language';

// Get saved language or detect system language
const getSavedLanguage = (): string => {
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (saved && ['fr', 'en'].includes(saved)) {
    return saved;
  }

  // Detect system language (AC6)
  const systemLang = navigator.language.split('-')[0];
  return ['fr', 'en'].includes(systemLang) ? systemLang : 'fr';
};

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: getSavedLanguage(),
  fallbackLng: 'fr',
  interpolation: {
    escapeValue: false, // React handles escaping
  },
});

// Helper to change language and persist
export const changeLanguage = (lang: string) => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  i18n.changeLanguage(lang);
};

export default i18n;
