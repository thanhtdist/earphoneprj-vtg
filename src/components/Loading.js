import React from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/Loading.css'; // Import the CSS file

const Loading = () => {
  // No suspense: the admin pages show this before the locale file has loaded and have no
  // <Suspense> boundary, so the spinner must render right away (the text is screen-reader only)
  const { t } = useTranslation(undefined, { useSuspense: false });
  return (
    <div className="loading-overlay">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">{t('loading')}</span>
      </div>
    </div>
  );
};

export default Loading;