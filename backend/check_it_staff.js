/**
 * Check IT Staff with Telegram Chat ID
 */
const { User } = require('./src/models');
const { Op } = require('sequelize');

async function checkITStaff() {
    const users = await User.findAll({
        where: {
            role: { [Op.in]: ['admin', 'it_ops'] },
            is_active: true
        },
        attributes: ['id', 'display_name', 'role', 'telegram_chat_id']
    });

    console.log('IT Staff:');
    users.forEach(u => {
        console.log(`- ${u.display_name} (${u.role}): Chat ID = ${u.telegram_chat_id || 'NOT SET'}`);
    });

    const withChatId = users.filter(u => u.telegram_chat_id);
    console.log(`\nTotal: ${users.length} IT staff, ${withChatId.length} have Chat ID configured`);
}

checkITStaff().catch(console.error).finally(() => process.exit(0));
