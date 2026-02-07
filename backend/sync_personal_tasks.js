const { sequelize, PersonalTask, PersonalTaskCategory } = require('./src/models');

async function syncTables() {
    try {
        console.log('Syncing PersonalTaskCategory table...');
        await PersonalTaskCategory.sync({ alter: true });
        console.log('✓ PersonalTaskCategory table synced');

        console.log('Syncing PersonalTask table...');
        await PersonalTask.sync({ alter: true });
        console.log('✓ PersonalTask table synced');

        console.log('\n✅ All personal task tables synced successfully!');
    } catch (error) {
        console.error('❌ Error syncing tables:', error.message);
        console.error(error);
    } finally {
        process.exit(0);
    }
}

syncTables();
