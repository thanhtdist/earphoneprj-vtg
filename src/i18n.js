import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import LanguageDetector from 'i18next-browser-languagedetector'; // Import language detector
import { SUPPORTED_UI_LANGUAGES, FALLBACK_UI_LANGUAGE } from './utils/constant';

// Initialize i18next
i18n
  .use(LanguageDetector) // Add the language detection plugin
  .use(initReactI18next) // If using with React
  .use(resourcesToBackend((language, namespace) => import(`./locales/${language}/${namespace}.json`)))
  .init({
    //lng: 'en', // default language instead of language detection by the browser
    fallbackLng: FALLBACK_UI_LANGUAGE, // fallback language if the selected one is not available
    // Only the languages in SUPPORTED_UI_LANGUAGES have translations. A device reporting a region
    // (Android usually reports "ja-JP") is matched to the supported tag ("ja") instead of making
    // i18next request a "./locales/ja-JP/translation.json" that does not exist.
    // The default `load` is kept on purpose: "languageOnly" would drop the region of the two
    // Chinese files ("zh-CN" / "zh-TW") and ask for a "zh" file that does not exist
    supportedLngs: SUPPORTED_UI_LANGUAGES,
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

// index.html declares `lang="en"`, so a Japanese page is announced as English until a component
// updates it. Chrome on Android uses that attribute to decide whether it translates the page
// automatically, and its translation corrupts the labels of the language selector
const applyDocumentLanguage = (language) => {
  document.documentElement.setAttribute('lang', language || FALLBACK_UI_LANGUAGE);
};
applyDocumentLanguage(i18n.language);
i18n.on('languageChanged', applyDocumentLanguage);

export default i18n;

