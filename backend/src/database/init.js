const { sequelize, User } = require('../models');

const initDatabase = async () => {
    try {
        console.log('🔄 Initializing database...');

        // Sync all models
        await sequelize.sync({ force: true });
        console.log('✅ Database tables created');

        // Create default admin user
        const adminUser = await User.create({
            username: 'admin',
            email: 'admin@itmanager.local',
            password_hash: 'admin123',  // Will be hashed by model hook
            display_name: 'Administrator',
            role: 'admin',
            is_active: true,
        });
        console.log('✅ Default admin user created');
        console.log('   Username: admin');
        console.log('   Password: admin123');

        // Create IT Ops user
        await User.create({
            username: 'itops',
            email: 'itops@itmanager.local',
            password_hash: 'itops123',
            display_name: 'IT Operations',
            role: 'it_ops',
            is_active: true,
        });
        console.log('✅ IT Ops user created');
        console.log('   Username: itops');
        console.log('   Password: itops123');

        // Create Viewer user
        await User.create({
            username: 'viewer',
            email: 'viewer@itmanager.local',
            password_hash: 'viewer123',
            display_name: 'Viewer',
            role: 'viewer',
            is_active: true,
        });
        console.log('✅ Viewer user created');
        console.log('   Username: viewer');
        console.log('   Password: viewer123');

        console.log('\n🎉 Database initialization complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
};

initDatabase();
