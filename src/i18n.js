import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import LanguageDetector from 'i18next-browser-languagedetector'; // Import language detector
import { SUPPORTED_UI_LANGUAGES, FALLBACK_UI_LANGUAGE, getBaseLanguage } from './utils/constant';

// Initialize i18next
i18n
  .use(LanguageDetector) // Add the language detection plugin
  .use(initReactI18next) // If using with React
  .use(resourcesToBackend((language, namespace) => import(`./locales/${language}/${namespace}.json`)))
  .init({
    //lng: 'en', // default language instead of language detection by the browser
    fallbackLng: FALLBACK_UI_LANGUAGE, // fallback language if the selected one is not available
    // Only "en" and "ja" translations exist. Without these two options a device reporting a region
    // (Android usually reports "ja-JP") makes i18next request a "./locales/ja-JP/translation.json"
    // that does not exist, before it falls back to "ja"
    supportedLngs: SUPPORTED_UI_LANGUAGES,
    load: 'languageOnly', // only "ja" / "en" resources are requested, never "ja-JP" / "en-GB"
    ns: ['translation'], // namespace(s)
    defaultNS: 'translation', // default namespace
    interpolation: {
      escapeValue: false, // React already handles escaping
    },
    detection: {
      // Methods to detect language in order
      order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage', 'cookie'], // Save detected language in cookie and localStorage
      // Drop the region as soon as the language is detected, so `i18n.language` is "ja" / "en"
      // and not "ja-JP", and so a device that cached "ja-JP" in a previous version is migrated.
      // A function is required here: this version of the detector only knows the "Iso15897"
      // string shorthand and calls any other string as if it were a function
      convertDetectedLanguage: (language) => getBaseLanguage(language),
    },
  });

// index.html declares `lang="en"`, so a Japanese page is announced as English until a component
// updates it. Chrome on Android uses that attribute to decide whether it translates the page
// automatically, and its translation corrupts the labels of the language selector
const applyDocumentLanguage = (language) => {
  document.documentElement.setAttribute('lang', language || FALLBACK_UI_LANGUAGE);
};
applyDocumentLanguage(i18n.language);
i18n.on('languageChanged', applyDocumentLanguage);

export default i18n;

