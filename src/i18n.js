import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import LanguageDetector from 'i18next-browser-languagedetector'; // Import language detector

// Initialize i18next
i18n
  .use(LanguageDetector) // Add the language detection plugin
  .use(initReactI18next) // If using with React
  .use(resourcesToBackend((language, namespace) => import(`./locales/${language}/${namespace}.json`)))
  .init({
    lng: 'en', // default language
    fallbackLng: 'en', // fallback language if the selected one is not available
    ns: ['translation'], // namespace(s)
    defaultNS: 'translation', // default namespace
    interpolation: {
      escapeValue: false, // React already handles escaping
    },
    detection: {
      // Methods to detect language in order
      order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage', 'cookie'], // Save detected language in cookie and localStorage
    },
  });

export default i18n;

