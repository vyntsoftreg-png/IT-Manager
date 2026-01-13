/**
 * Migration script to add new columns to ping_history table
 * Run this once to update the database schema
 */

const sequelize = require('./src/database/connection');

const migrate = async () => {
    try {
        console.log('Starting migration...');

        // Check if columns exist first
        const [results] = await sequelize.query("PRAGMA table_info('ping_history')");
        const columns = results.map(r => r.name);

        console.log('Existing columns:', columns);

        // Add mac_address column if not exists
        if (!columns.includes('mac_address')) {
            console.log('Adding mac_address column...');
            await sequelize.query("ALTER TABLE ping_history ADD COLUMN mac_address VARCHAR(17)");
        }

        // Add previous_mac column if not exists
        if (!columns.includes('previous_mac')) {
            console.log('Adding previous_mac column...');
            await sequelize.query("ALTER TABLE ping_history ADD COLUMN previous_mac VARCHAR(17)");
        }

        // Add has_conflict column if not exists
        if (!columns.includes('has_conflict')) {
            console.log('Adding has_conflict column...');
            await sequelize.query("ALTER TABLE ping_history ADD COLUMN has_conflict INTEGER DEFAULT 0");
        }

        // Create indexes if needed (SQLite allows IF NOT EXISTS for indexes)
        try {
            await sequelize.query("CREATE INDEX IF NOT EXISTS ping_history_mac_address ON ping_history(mac_address)");
            await sequelize.query("CREATE INDEX IF NOT EXISTS ping_history_has_conflict ON ping_history(has_conflict)");
            console.log('Indexes created/verified');
        } catch (indexErr) {
            console.log('Index creation skipped (may already exist)');
        }

        console.log('✅ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
};

migrate();
