/**
 * Test Reminder Script
 * Manually test 1-day and 3-day reminder notifications
 * 
 * Usage: node test_reminders.js
 */

const { PersonalTask, User } = require('./src/models');
const telegramService = require('./src/services/telegramService');
const { Op } = require('sequelize');

async function testReminders() {
    console.log('=== Test Reminder Notifications ===\n');
    console.log('Current time:', new Date().toISOString());
    console.log('');

    // 1. Find a user with Chat ID
    console.log('1. Finding users with Chat ID...');
    const users = await User.findAll({
        where: {
            telegram_chat_id: { [Op.ne]: null }
        },
        attributes: ['id', 'display_name', 'telegram_chat_id']
    });

    if (users.length === 0) {
        console.log('❌ No users have configured Chat ID!');
        console.log('   → Please configure Chat ID in Settings > Personal Settings first.');
        return;
    }

    const testUser = users[0];
    console.log(`✅ Using user: ${testUser.display_name} (ID: ${testUser.id})`);
    console.log(`   Chat ID: ${testUser.telegram_chat_id}`);

    // 2. Find tasks for this user
    console.log('\n2. Finding tasks for this user...');
    const tasks = await PersonalTask.findAll({
        where: {
            user_id: testUser.id,
            status: { [Op.ne]: 'completed' },
            parent_id: null
        },
        limit: 3
    });

    if (tasks.length === 0) {
        console.log('❌ No active tasks found for this user!');
        console.log('   → Please create a task first.');
        return;
    }

    console.log(`✅ Found ${tasks.length} active task(s):\n`);

    // 3. Send test reminders
    for (const task of tasks) {
        console.log(`📋 Task: "${task.title}"`);
        console.log(`   Due date: ${task.due_date || 'No deadline'}`);

        // Test 3-day reminder
        console.log('\n   Sending 3-day reminder...');
        const result3d = await telegramService.sendTaskReminder(
            testUser.telegram_chat_id,
            task,
            '3d'
        );
        console.log(result3d.success ? '   ✅ 3-day reminder sent!' : `   ❌ Failed: ${result3d.error}`);

        // Wait 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test 1-day reminder
        console.log('\n   Sending 1-day reminder...');
        const result1d = await telegramService.sendTaskReminder(
            testUser.telegram_chat_id,
            task,
            '1d'
        );
        console.log(result1d.success ? '   ✅ 1-day reminder sent!' : `   ❌ Failed: ${result1d.error}`);

        console.log('\n' + '─'.repeat(50));
    }

    console.log('\n=== Test Complete ===');
    console.log('Check your Telegram for the test messages!');
}

testReminders()
    .catch(console.error)
    .finally(() => process.exit(0));
