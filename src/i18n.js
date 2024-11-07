import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';

// Initialize i18next
i18n
  .use(initReactI18next) // if using with React
  .use(resourcesToBackend((language, namespace) => import(`./locales/${language}/${namespace}.json`)))
  .init({
    lng: 'en', // default language
    fallbackLng: 'en', // fallback language if the selected one is not available
    ns: ['translation'], // namespace(s)
    defaultNS: 'translation', // default namespace
    interpolation: {
      escapeValue: false, // React already handles escaping
    },
  });

export default i18n;
