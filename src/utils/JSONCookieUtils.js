// Utility for working with JSON cookies
const JSONCookieUtils = {
    /**
     * Set a JSON cookie
     * @param {string} name - Name of the cookie
     * @param {Object} jsonValue - JSON object to store
     * @param {number} days - Expiration time in days
     */
    setJSONCookie(name, jsonValue, days) {
        const now = new Date();
        now.setTime(now.getTime() + days * 24 * 60 * 60 * 1000); // Convert days to milliseconds
        const expires = now.toUTCString();
        document.cookie = `${name}=${encodeURIComponent(JSON.stringify(jsonValue))}; expires=${expires}; path=/`;
    },

    /**
     * Get a JSON cookie
     * @param {string} name - Name of the cookie to retrieve
     * @returns {Object|null} - Parsed JSON object or null if not found
     */
    getJSONCookie(name) {
        const cookies = document.cookie.split(";");
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith(`${name}=`)) {
                const value = cookie.substring(name.length + 1);
                try {
                    return JSON.parse(decodeURIComponent(value));
                } catch (e) {
                    console.error("Error parsing JSON from cookie:", e);
                    return null;
                }
            }
        }
        return null;
    },

    /**
     * Delete a cookie
     * @param {string} name - Name of the cookie to delete
     */
    deleteCookie(name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
    }
};

export default JSONCookieUtils;
