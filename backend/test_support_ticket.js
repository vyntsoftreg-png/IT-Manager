/**
 * Test Support Ticket Telegram Notification
 */
const { User } = require('./src/models');
const { Op } = require('sequelize');
const telegramService = require('./src/services/telegramService');

async function testSupportTicketNotification() {
    console.log('=== Test Support Ticket Notification ===\n');

    // Find IT staff with Chat ID
    const itStaff = await User.findAll({
        where: {
            role: { [Op.in]: ['admin', 'it_ops'] },
            telegram_chat_id: { [Op.ne]: null },
            is_active: true
        }
    });

    console.log(`Found ${itStaff.length} IT staff with Chat ID:\n`);
    itStaff.forEach(u => console.log(`- ${u.display_name}: ${u.telegram_chat_id}`));

    if (itStaff.length === 0) {
        console.log('\n❌ No IT staff have Chat ID configured!');
        return;
    }

    // Create mock ticket
    const mockTicket = {
        task_number: 'TEST-0001',
        title: 'Test Support Ticket from Debug Script',
        category: 'software',
        priority: 'urgent',
        requester_name: 'Test User',
        requester_department: 'IT Department',
        requester_location: 'Test Location',
        description: 'This is a test support ticket to verify Telegram notifications are working correctly.'
    };

    console.log('\n📤 Sending test notification...\n');

    // Send to all IT staff
    const results = await telegramService.notifyITStaff(itStaff, mockTicket, 'created');

    console.log('Results:');
    results.forEach((r, i) => {
        console.log(`- ${itStaff[i].display_name}: ${r.success ? '✅ Sent' : '❌ Failed'}`);
    });

    console.log('\n=== Test Complete ===');
}

testSupportTicketNotification()
    .catch(console.error)
    .finally(() => process.exit(0));
