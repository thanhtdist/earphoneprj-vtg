class LocalStorageUtils {
    // Method to save data with an expiration time
    static setWithExpiry(key, value, timelife) {
        const now = new Date();
        const item = {
            value: value,
            expiry: now.getTime() + timelife, // Expiration time
        };
        localStorage.setItem(key, JSON.stringify(item));
    }

    // Method to get data and check the expiration time
    static getWithExpiry(key) {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) return null; // If there is no data

        const item = JSON.parse(itemStr);
        const now = new Date();

        // Check the expiration time
        if (now.getTime() > item.expiry) {
            localStorage.removeItem(key); // Remove if expired
            return null;
        }
        return item.value;
    }
}

export default LocalStorageUtils;
