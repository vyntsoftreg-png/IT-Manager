const socketIo = require('socket.io');

let io;

const initSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    io.on('connection', (socket) => {
        console.log('🔌 Client connected:', socket.id);

        socket.on('disconnect', () => {
            console.log('❌ Client disconnected:', socket.id);
        });
    });

    return io;
};

const getIo = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

// Helper methods to emit events
const emitEvent = (event, data) => {
    try {
        const socket = getIo();
        socket.emit(event, data);
    } catch (error) {
        console.error('Socket emit error:', error.message);
    }
};

module.exports = {
    initSocket,
    getIo,
    emitEvent,
};
