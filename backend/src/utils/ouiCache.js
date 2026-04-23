const fs = require('fs');
const path = require('path');
const https = require('https');

const CACHE_FILE = path.join(__dirname, '../../data/mac_vendors.json');

// Initialize cache file if not exists
const ensureCacheDir = () => {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(CACHE_FILE)) {
        fs.writeFileSync(CACHE_FILE, JSON.stringify({}));
    }
};

// Queue for API requests to respect rate limits (1 req/sec for macvendors.com)
const apiQueue = [];
let isProcessingQueue = false;

// Load cache into memory
let memoryCache = null;
const getCache = () => {
    if (!memoryCache) {
        ensureCacheDir();
        try {
            const data = fs.readFileSync(CACHE_FILE, 'utf8');
            memoryCache = JSON.parse(data);
        } catch (e) {
            memoryCache = {};
        }
    }
    return memoryCache;
};

// Save cache to disk (debounced)
let saveTimeout = null;
const saveCache = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        ensureCacheDir();
        try {
            fs.writeFileSync(CACHE_FILE, JSON.stringify(memoryCache, null, 2));
        } catch (e) {
            console.error('Failed to save OUI cache:', e.message);
        }
    }, 2000);
};

// Perform HTTP request to macvendors.com
const fetchVendorFromApi = (prefix) => {
    return new Promise((resolve) => {
        const url = `https://api.macvendors.com/${encodeURIComponent(prefix)}`;

        const req = https.get(url, { timeout: 5000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(data.trim());
                } else if (res.statusCode === 404) {
                    resolve('Unknown Vendor');
                } else {
                    resolve(null); // Rate limit or server error - don't cache
                }
            });
        });

        req.on('error', () => resolve(null));
        req.on('timeout', () => { req.destroy(); resolve(null); });
    });
};

// Process the rate-limited queue in background
const processQueue = async () => {
    if (isProcessingQueue || apiQueue.length === 0) return;

    isProcessingQueue = true;
    while (apiQueue.length > 0) {
        const prefix = apiQueue.shift();

        // Skip if already cached while waiting
        const cache = getCache();
        if (cache[prefix]) continue;

        const vendor = await fetchVendorFromApi(prefix);

        if (vendor) {
            cache[prefix] = vendor;
            saveCache();
        }

        // macvendors.com free tier: ~1 req/sec
        if (apiQueue.length > 0) {
            await new Promise(r => setTimeout(r, 1100));
        }
    }
    isProcessingQueue = false;
};

/**
 * Get the vendor name from a MAC address (synchronous, non-blocking).
 * Returns cached result immediately, or queues background API lookup.
 * @param {string} mac - Full MAC address (e.g., "00:1A:2B:3C:4D:5E")
 * @returns {string} Vendor name or placeholder
 */
const getVendorFromMac = (mac) => {
    try {
        if (!mac || mac.length < 8) return 'Unknown';

        // First 3 octets = OUI prefix (e.g., "00:1A:2B")
        const prefix = mac.toUpperCase().replace(/-/g, ':').substring(0, 8);
        const cache = getCache();

        // Return cached value immediately
        if (cache[prefix]) {
            return cache[prefix];
        }

        // Queue background API lookup (non-blocking)
        if (!apiQueue.includes(prefix)) {
            apiQueue.push(prefix);
            processQueue();
        }

        return 'Resolving...';
    } catch (e) {
        return 'Unknown';
    }
};

module.exports = {
    getVendorFromMac,
};
