// Backup feature added
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const http = require('http');
const { sequelize } = require('./models');
const routes = require('./routes');
const { initSocket } = require('./services/socketService');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const isDev = process.env.NODE_ENV !== 'production';
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: isDev
                ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
                : ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: isDev
                ? ["'self'", "http://localhost:5173", "ws://localhost:5173", "http:", "ws:"]
                : ["'self'"],
            upgradeInsecureRequests: isDev ? null : [],
        },
    },
    crossOriginEmbedderPolicy: false,
    strictTransportSecurity: !isDev,
}));
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
}));
app.set('trust proxy', true);
app.use(morgan(isDev ? 'dev' : 'combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint (before routes to always be accessible)
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'IT Manager API is running', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', routes);

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
    const frontendPath = path.join(__dirname, '../../frontend/dist');
    app.use(express.static(frontendPath));

    // Handle SPA routing - serve index.html for all non-API routes
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) {
            return next();
        }
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

// 404 handler for API routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});

// Start server
const startServer = async () => {
    try {
        // Run database migrations (add missing columns)
        const { runMigrations, seedPersonalTaskNumbers, generateMissingThumbnails } = require('./database/migrations');
        await runMigrations(sequelize);

        await sequelize.sync();
        console.log('✅ Database synchronized');

        // Post-sync data migrations
        await seedPersonalTaskNumbers();

        // Background thumbnail generation (non-blocking)
        generateMissingThumbnails();

        // Auto-seed default admin user if no users exist
        const { User } = require('./models');
        const userCount = await User.count();
        if (userCount === 0) {
            console.log('🔄 No users found, creating default admin...');
            await User.create({
                username: 'admin',
                email: process.env.ADMIN_EMAIL || 'admin@itmanager.local',
                password_hash: process.env.ADMIN_PASSWORD || 'admin123',
                full_name: 'Administrator',
                role: 'admin',
                is_active: true,
            });
            console.log('✅ Default admin created');
        }

        const server = http.createServer(app);

        // Initialize Socket.io
        initSocket(server);
        console.log('🔌 Socket.io initialized');

        // Start Telegram reminder worker
        const { startReminderWorker } = require('./workers/reminderWorker');
        startReminderWorker();
        console.log('📬 Telegram reminder worker started');
        
        // Start weekly report worker
        const { initScheduledReports } = require('./workers/reportWorker');
        initScheduledReports();
        console.log('📊 Weekly report worker started');

        // Start Daily SLA worker
        const { initSlaWorker } = require('./workers/slaWorker');
        initSlaWorker();
        console.log('⏱️ SLA worker started');

        const serverInstance = server.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on http://localhost:${PORT} (Bound to 0.0.0.0)`);
            console.log(`📚 API available at http://localhost:${PORT}/api`);
        });

        // Graceful shutdown for fast nodemon restarts
        const gracefulShutdown = () => {
            serverInstance.close(() => {
                console.log('❌ Existing server closed.');
                process.exit(0);
            });
            // Force exit if hanging
            setTimeout(() => { process.exit(1); }, 2000);
        };
        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);
        process.on('SIGUSR2', gracefulShutdown); // Nodemon restart signal

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;
