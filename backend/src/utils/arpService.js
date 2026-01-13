/**
 * ARP Service - Get MAC addresses from ARP cache
 * Used for detecting IP conflicts by monitoring MAC changes
 */

const { exec } = require('child_process');
const os = require('os');

/**
 * Get MAC address for an IP from the ARP cache
 * @param {string} ipAddress - IP address to lookup
 * @returns {Promise<string|null>} MAC address or null if not found
 */
const getMacFromArp = (ipAddress) => {
    return new Promise((resolve) => {
        const isWindows = os.platform() === 'win32';

        // Windows: arp -a <ip>
        // Linux: arp -n <ip> or ip neigh show <ip>
        const command = isWindows
            ? `arp -a ${ipAddress}`
            : `arp -n ${ipAddress}`;

        exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
            if (error) {
                // ARP entry might not exist
                resolve(null);
                return;
            }

            try {
                const mac = parseArpOutput(stdout, ipAddress, isWindows);
                resolve(mac);
            } catch (parseError) {
                console.error(`ARP parse error for ${ipAddress}:`, parseError.message);
                resolve(null);
            }
        });
    });
};

/**
 * Parse ARP command output to extract MAC address
 */
const parseArpOutput = (output, ipAddress, isWindows) => {
    if (!output) return null;

    const lines = output.split('\n');

    for (const line of lines) {
        // Check if line contains the IP we're looking for
        if (!line.includes(ipAddress)) continue;

        // MAC address pattern: XX-XX-XX-XX-XX-XX (Windows) or XX:XX:XX:XX:XX:XX (Linux)
        const macPattern = isWindows
            ? /([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}/
            : /([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}/;

        const match = line.match(macPattern);
        if (match) {
            // Normalize MAC to uppercase with colons
            return match[0].toUpperCase().replace(/-/g, ':');
        }
    }

    return null;
};

/**
 * Get all ARP entries (for debugging/monitoring)
 * @returns {Promise<Array>} Array of {ip, mac} objects
 */
const getAllArpEntries = () => {
    return new Promise((resolve) => {
        const isWindows = os.platform() === 'win32';
        const command = isWindows ? 'arp -a' : 'arp -n';

        exec(command, { timeout: 10000 }, (error, stdout) => {
            if (error) {
                resolve([]);
                return;
            }

            const entries = [];
            const lines = stdout.split('\n');

            // IP pattern
            const ipPattern = /\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/;
            // MAC pattern
            const macPattern = isWindows
                ? /([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}/
                : /([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}/;

            for (const line of lines) {
                const ipMatch = line.match(ipPattern);
                const macMatch = line.match(macPattern);

                if (ipMatch && macMatch) {
                    entries.push({
                        ip: ipMatch[1],
                        mac: macMatch[0].toUpperCase().replace(/-/g, ':'),
                    });
                }
            }

            resolve(entries);
        });
    });
};

/**
 * Force ARP refresh by pinging the IP first
 * This ensures the ARP cache is current
 */
const refreshArpEntry = async (ipAddress) => {
    return new Promise((resolve) => {
        const isWindows = os.platform() === 'win32';
        // Quick ping to refresh ARP cache
        const pingCmd = isWindows
            ? `ping -n 1 -w 1000 ${ipAddress}`
            : `ping -c 1 -W 1 ${ipAddress}`;

        exec(pingCmd, { timeout: 3000 }, () => {
            // Ignore ping result, just need to refresh ARP
            resolve();
        });
    });
};

module.exports = {
    getMacFromArp,
    getAllArpEntries,
    refreshArpEntry,
};
