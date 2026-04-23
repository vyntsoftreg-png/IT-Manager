/**
 * Database migrations for SQLite.
 * Adds missing columns to existing tables without losing data.
 * Safe to run multiple times (idempotent).
 */
const runMigrations = async (sequelize) => {
    console.log('🔄 Running database migrations...');

    // --- Documents table ---
    try {
        const [cols] = await sequelize.query("PRAGMA table_info('documents')");
        if (cols.length > 0) {
            if (!cols.find(c => c.name === 'is_public')) {
                await sequelize.query("ALTER TABLE documents ADD COLUMN is_public TINYINT(1) DEFAULT 1");
                await sequelize.query("UPDATE documents SET is_public = 1 WHERE is_public IS NULL");
                console.log('  ✅ Added is_public column to documents');
            }
            if (!cols.find(c => c.name === 'thumbnail')) {
                await sequelize.query("ALTER TABLE documents ADD COLUMN thumbnail BLOB");
                console.log('  ✅ Added thumbnail column to documents');
            }
        }
    } catch (e) { /* table may not exist yet */ }

    // --- Personal Tasks table ---
    try {
        const [ptCols] = await sequelize.query("PRAGMA table_info('personal_tasks')");
        if (ptCols.length > 0 && !ptCols.find(c => c.name === 'task_number')) {
            await sequelize.query("ALTER TABLE personal_tasks ADD COLUMN task_number VARCHAR(30)");
            console.log('  ✅ Added task_number column to personal_tasks');
        }
    } catch (e) { /* table may not exist yet */ }

    // --- Tasks table (rating) ---
    try {
        const [taskCols] = await sequelize.query("PRAGMA table_info('tasks')");
        if (taskCols.length > 0) {
            for (const col of [
                { name: 'rating', type: 'INTEGER' },
                { name: 'rating_comment', type: 'TEXT' },
                { name: 'rated_at', type: 'DATETIME' },
            ]) {
                if (!taskCols.find(c => c.name === col.name)) {
                    await sequelize.query(`ALTER TABLE tasks ADD COLUMN ${col.name} ${col.type}`);
                    console.log(`  ✅ Added ${col.name} column to tasks`);
                }
            }
        }
    } catch (e) { /* table may not exist yet */ }

    console.log('✅ Migrations complete');
};

/**
 * Assign task_numbers to personal tasks that don't have one.
 */
const seedPersonalTaskNumbers = async () => {
    try {
        const { PersonalTask } = require('../models');
        const tasksWithoutNumber = await PersonalTask.findAll({
            where: { task_number: null, parent_id: null },
            order: [['created_at', 'ASC']],
        });
        if (tasksWithoutNumber.length > 0) {
            console.log(`🔄 Assigning task_numbers to ${tasksWithoutNumber.length} personal tasks...`);
            for (let i = 0; i < tasksWithoutNumber.length; i++) {
                const task = tasksWithoutNumber[i];
                const year = new Date(task.created_at).getFullYear();
                const task_number = `${year}-MyTask-${String(i + 1).padStart(4, '0')}`;
                await task.update({ task_number });
            }
            console.log('  ✅ Personal task numbers assigned');
        }
    } catch (e) {
        console.error('Migration error (personal task numbers):', e.message);
    }
};

/**
 * Background job: generate thumbnails for documents missing them.
 */
const generateMissingThumbnails = async () => {
    try {
        const { Document } = require('../models');
        const docs = await Document.findAll({
            where: { thumbnail: null, file_extension: ['docx', 'xlsx', 'pptx'] },
            attributes: ['id', 'file_data', 'file_extension'],
        });
        if (docs.length === 0) return;

        console.log(`🔄 Generating thumbnails for ${docs.length} documents...`);
        const { generateThumbnailForExisting } = require('../controllers/documentController');
        for (const doc of docs) {
            try {
                const thumb = await generateThumbnailForExisting(doc.file_data, doc.file_extension);
                if (thumb) {
                    await doc.update({ thumbnail: thumb });
                }
            } catch (e) { /* skip individual failures */ }
        }
        console.log('  ✅ Thumbnail generation complete');
    } catch (e) {
        console.error('Thumbnail generation error:', e.message);
    }
};

module.exports = { runMigrations, seedPersonalTaskNumbers, generateMissingThumbnails };
