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
// Configure helmet for SPA - allow inline scripts needed by Vite/React
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for Vite/Dev
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "http://localhost:5173", "ws://localhost:5173"], // Vite HMR
        },
    },
    crossOriginEmbedderPolicy: false,
}));
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
}));
app.set('trust proxy', true); // Trust proxy headers (X-Forwarded-For)
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' })); // Increased limit for backup imports
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api', routes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
        // Sync database - columns were added via migrate.js
        await sequelize.sync();
        console.log('✅ Database synchronized');

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

        server.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`📚 API available at http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;
