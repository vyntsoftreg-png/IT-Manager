const { Worker } = require('worker_threads');
const path = require('path');
const { emitEvent } = require('./socketService');

let isScanning = false;

const startNetworkScan = (subnet = '192.168.1') => {
    if (isScanning) {
        console.log('⚠️ Scan already in progress');
        return;
    }

    console.log(`🚀 Starting network scan for ${subnet}.x`);
    isScanning = true;
    emitEvent('scan:start', { subnet });

    const workerPath = path.join(__dirname, '../workers/scanWorker.js');
    const worker = new Worker(workerPath, {
        workerData: { subnet }
    });

    worker.on('message', (msg) => {
        if (msg.status === 'complete') {
            console.log(`✅ Scan complete. Found ${msg.hosts.length} devices.`);
            emitEvent('scan:complete', { hosts: msg.hosts });
            isScanning = false;
        }
    });

    worker.on('error', (err) => {
        console.error('❌ Worker error:', err);
        emitEvent('scan:error', { error: err.message });
        isScanning = false;
    });

    worker.on('exit', (code) => {
        if (code !== 0) {
            console.error(`Status Worker stopped with exit code ${code}`);
            isScanning = false;
        }
    });
};

module.exports = {
    startNetworkScan,
};
