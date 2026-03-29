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
            connectSrc: ["'self'", "http://localhost:5173", "ws://localhost:5173", "http:", "ws:"], // Allow insecure connections
            upgradeInsecureRequests: null, // Disable auto-upgrade to HTTPS
        },
    },
    crossOriginEmbedderPolicy: false,
    strictTransportSecurity: false, // Disable HSTS to prevent forced HTTPS
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
        // Migrate: add is_public column to documents if missing
        try {
            const [cols] = await sequelize.query("PRAGMA table_info('documents')");
            if (!cols.find(c => c.name === 'is_public')) {
                await sequelize.query("ALTER TABLE documents ADD COLUMN is_public TINYINT(1) DEFAULT 1");
                await sequelize.query("UPDATE documents SET is_public = 1 WHERE is_public IS NULL");
                console.log('✅ Added is_public column to documents');
            }
            if (!cols.find(c => c.name === 'thumbnail')) {
                await sequelize.query("ALTER TABLE documents ADD COLUMN thumbnail BLOB");
                console.log('✅ Added thumbnail column to documents');
            }
        } catch (e) { /* table may not exist yet, sync will create it */ }

        // Migrate: add task_number column to personal_tasks if missing
        try {
            const [ptCols] = await sequelize.query("PRAGMA table_info('personal_tasks')");
            if (!ptCols.find(c => c.name === 'task_number')) {
                await sequelize.query("ALTER TABLE personal_tasks ADD COLUMN task_number VARCHAR(30)");
                console.log('✅ Added task_number column to personal_tasks');
            }
        } catch (e) { /* table may not exist yet, sync will create it */ }
        // Migrate: add rating columns to tasks if missing
        try {
            const [taskCols] = await sequelize.query("PRAGMA table_info('tasks')");
            if (!taskCols.find(c => c.name === 'rating')) {
                await sequelize.query("ALTER TABLE tasks ADD COLUMN rating INTEGER");
                console.log('✅ Added rating column to tasks');
            }
            if (!taskCols.find(c => c.name === 'rating_comment')) {
                await sequelize.query("ALTER TABLE tasks ADD COLUMN rating_comment TEXT");
                console.log('✅ Added rating_comment column to tasks');
            }
            if (!taskCols.find(c => c.name === 'rated_at')) {
                await sequelize.query("ALTER TABLE tasks ADD COLUMN rated_at DATETIME");
                console.log('✅ Added rated_at column to tasks');
            }
        } catch (e) { /* table may not exist yet, sync will create it */ }

        await sequelize.sync();
        console.log('✅ Database synchronized');

        // Migrate: assign task_numbers to existing personal tasks without one
        try {
            const { PersonalTask } = require('./models');
            const tasksWithoutNumber = await PersonalTask.findAll({
                where: { task_number: null, parent_id: null },
                order: [['created_at', 'ASC']]
            });
            if (tasksWithoutNumber.length > 0) {
                console.log(`🔄 Assigning task_numbers to ${tasksWithoutNumber.length} personal tasks...`);
                for (let i = 0; i < tasksWithoutNumber.length; i++) {
                    const task = tasksWithoutNumber[i];
                    const year = new Date(task.created_at).getFullYear();
                    const task_number = `${year}-MyTask-${String(i + 1).padStart(4, '0')}`;
                    await task.update({ task_number });
                }
                console.log('✅ Personal task numbers assigned');
            }
        } catch (e) {
            console.error('Migration error (personal task numbers):', e.message);
        }

        // Background: generate thumbnails for existing documents without one
        (async () => {
            try {
                const { Document } = require('./models');
                const XLSX = require('xlsx');
                const mammoth = require('mammoth');
                const docs = await Document.findAll({
                    where: { thumbnail: null, file_extension: ['docx', 'xlsx', 'pptx'] },
                    attributes: ['id', 'file_data', 'file_extension'],
                });
                if (docs.length === 0) return;
                console.log(`🔄 Generating thumbnails for ${docs.length} documents...`);
                const { generateThumbnailForExisting } = require('./controllers/documentController');
                for (const doc of docs) {
                    try {
                        const thumb = await generateThumbnailForExisting(doc.file_data, doc.file_extension);
                        if (thumb) {
                            await doc.update({ thumbnail: thumb });
                            console.log(`  ✅ Thumbnail for doc #${doc.id}`);
                        }
                    } catch (e) { /* skip */ }
                }
                console.log('✅ Thumbnail generation complete');
            } catch (e) { console.error('Thumbnail generation error:', e.message); }
        })();

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
