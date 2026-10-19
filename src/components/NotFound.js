import React from 'react';
import { useTranslation } from 'react-i18next';

function NotFound() {
    const { t } = useTranslation();
    console.log("Not Found Page");
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh"
            }}
        >
            <h2>{t('notFoundPage')}</h2>
        </div>
    );
}

export default NotFound;