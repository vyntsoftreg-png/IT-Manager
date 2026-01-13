const ping = require('ping');
const net = require('net');

// Ping configuration
const PING_CONFIG = {
    timeout: 2,          // 2 seconds timeout
    extra: ['-n', '1'],  // Windows: 1 ping
};

// Common ports for Windows and Linux services
const DEFAULT_PROBE_PORTS = [
    22,    // SSH (Linux)
    80,    // HTTP
    443,   // HTTPS
    445,   // SMB (Windows)
    3389,  // RDP (Windows)
    135,   // RPC (Windows)
    139,   // NetBIOS (Windows)
    21,    // FTP
    23,    // Telnet
    3306,  // MySQL
    5432,  // PostgreSQL
    1433,  // SQL Server
    8080,  // HTTP Alt
];

const TCP_TIMEOUT = 2000; // 2 seconds

// Ping a single IP (ICMP only)
const pingIp = async (ipAddress) => {
    try {
        const result = await ping.promise.probe(ipAddress, PING_CONFIG);
        return {
            ip: ipAddress,
            status: result.alive ? 'online' : 'offline',
            responseTime: result.time === 'unknown' ? null : parseFloat(result.time),
            alive: result.alive,
            output: result.output, // For debugging
        };
    } catch (error) {
        console.error(`Ping error for ${ipAddress}:`, error.message);
        return {
            ip: ipAddress,
            status: 'error',
            responseTime: null,
            alive: false,
            error: error.message,
        };
    }
};

// TCP port probe - check if a single port is open
const tcpProbePort = (ip, port, timeout = TCP_TIMEOUT) => {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let resolved = false;

        socket.setTimeout(timeout);

        socket.on('connect', () => {
            resolved = true;
            socket.destroy();
            resolve({ port, open: true });
        });

        socket.on('timeout', () => {
            if (!resolved) {
                resolved = true;
                socket.destroy();
                resolve({ port, open: false });
            }
        });

        socket.on('error', () => {
            if (!resolved) {
                resolved = true;
                socket.destroy();
                resolve({ port, open: false });
            }
        });

        socket.connect(port, ip);
    });
};

// TCP probe multiple ports in parallel
const tcpProbe = async (ip, ports = DEFAULT_PROBE_PORTS) => {
    const results = await Promise.all(ports.map(port => tcpProbePort(ip, port)));
    const openPorts = results.filter(r => r.open).map(r => r.port);

    return {
        ip,
        anyOpen: openPorts.length > 0,
        openPorts,
        checkedPorts: ports.length,
    };
};

// Smart ping: ICMP first, TCP probe if timeout
const smartPing = async (ipAddress, probePorts = DEFAULT_PROBE_PORTS) => {
    const { getMacFromArp } = require('./arpService');

    // Step 1: Try ICMP ping first
    const icmpResult = await pingIp(ipAddress);

    // If ICMP succeeds, host is online
    if (icmpResult.alive) {
        // Get MAC address from ARP cache for conflict detection
        const mac = await getMacFromArp(ipAddress);
        return {
            ip: ipAddress,
            status: 'online',
            responseTime: icmpResult.responseTime,
            method: 'icmp',
            mac: mac, // MAC address for conflict detection
        };
    }

    // Step 2: ICMP failed - check if it's "Request timed out" vs "Host unreachable"
    // On Windows, "Host unreachable" means definitely offline
    const output = (icmpResult.output || '').toLowerCase();
    const isHostUnreachable = output.includes('unreachable') ||
        output.includes('destination host') ||
        output.includes('network is unreachable');

    if (isHostUnreachable) {
        // Definitely offline, no need to TCP probe
        return {
            ip: ipAddress,
            status: 'offline',
            responseTime: null,
            method: 'icmp',
            mac: null,
        };
    }

    // Step 3: ICMP timeout - probe TCP ports to detect if ICMP is blocked
    const tcpResult = await tcpProbe(ipAddress, probePorts);

    if (tcpResult.anyOpen) {
        // Host is online but blocking ICMP - get MAC
        const mac = await getMacFromArp(ipAddress);
        return {
            ip: ipAddress,
            status: 'blocked', // ICMP blocked, but host is online
            responseTime: null,
            method: 'tcp',
            mac: mac,
        };
    }

    // All TCP ports also timeout - host is offline
    return {
        ip: ipAddress,
        status: 'offline',
        responseTime: null,
        method: 'tcp',
        mac: null,
    };
};

// Smart ping batch - parallel processing
const smartPingBatch = async (ipAddresses, concurrency = 10, probePorts = DEFAULT_PROBE_PORTS) => {
    const results = {};

    for (let i = 0; i < ipAddresses.length; i += concurrency) {
        const batch = ipAddresses.slice(i, i + concurrency);
        const batchResults = await Promise.all(
            batch.map(ip => smartPing(ip, probePorts))
        );

        batchResults.forEach(result => {
            results[result.ip] = result;
        });
    }

    return results;
};

// Ping multiple IPs in parallel (batch) - original simple version
const pingBatch = async (ipAddresses, concurrency = 10) => {
    const results = {};

    for (let i = 0; i < ipAddresses.length; i += concurrency) {
        const batch = ipAddresses.slice(i, i + concurrency);
        const batchResults = await Promise.all(batch.map(ip => pingIp(ip)));

        batchResults.forEach(result => {
            results[result.ip] = result;
        });
    }

    return results;
};

// Get summary from ping results
const getSummary = (results) => {
    const values = Object.values(results);
    return {
        total: values.length,
        online: values.filter(r => r.status === 'online').length,
        offline: values.filter(r => r.status === 'offline').length,
        blocked: values.filter(r => r.status === 'blocked').length,
        error: values.filter(r => r.status === 'error').length,
        avgResponseTime: values
            .filter(r => r.responseTime !== null)
            .reduce((sum, r, _, arr) => sum + r.responseTime / arr.length, 0),
    };
};

module.exports = {
    pingIp,
    pingBatch,
    smartPing,
    smartPingBatch,
    tcpProbe,
    getSummary,
    PING_CONFIG,
    DEFAULT_PROBE_PORTS,
    TCP_TIMEOUT,
};
