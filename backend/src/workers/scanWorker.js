const { parentPort, workerData } = require('worker_threads');
const ping = require('ping');

// Function to scan a single IP
const scanIp = async (ip) => {
    try {
        const res = await ping.promise.probe(ip, {
            timeout: 1, // 1 second timeout for speed
            extra: ['-n', '1'], // Windows specific: just 1 ping
        });
        return res.alive ? { ip, alive: true, ms: res.time } : null;
    } catch (error) {
        return null;
    }
};

const runScan = async () => {
    const { subnet } = workerData; // e.g., "192.168.1"
    const results = [];

    // Scan range 1-254
    const promises = [];
    for (let i = 1; i < 255; i++) {
        const ip = `${subnet}.${i}`;
        promises.push(scanIp(ip));
    }

    // Process all pings
    const allResults = await Promise.all(promises);

    // Filter only alive hosts
    const aliveHosts = allResults.filter(r => r !== null);

    parentPort.postMessage({ status: 'complete', hosts: aliveHosts });
};

runScan();
