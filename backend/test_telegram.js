/**
 * Test script to debug Telegram notification
 * Run: node test_telegram.js
 */

const { SystemSetting, User } = require('./src/models');

async function testTelegram() {
    console.log('=== Telegram Debug Test ===\n');

    // 1. Check Bot Token
    console.log('1. Checking Bot Token...');
    const botSetting = await SystemSetting.findOne({
        where: { category: 'telegram', key: 'bot_token' }
    });

    if (!botSetting) {
        console.log('❌ Bot Token NOT found in database!');
        console.log('   → Check if category & key are correct');

        // List all SystemSettings
        const allSettings = await SystemSetting.findAll();
        console.log('\n   All SystemSettings:');
        allSettings.forEach(s => {
            console.log(`   - category: "${s.category}", key: "${s.key}", label: "${s.label?.substring(0, 20)}..."`);
        });
        return;
    }

    const botToken = botSetting.label;
    console.log(`✅ Bot Token found: ${botToken?.substring(0, 10)}...${botToken?.slice(-5)}`);

    // 2. Test Bot connection
    console.log('\n2. Testing Bot connection...');
    const TELEGRAM_API = `https://api.telegram.org/bot${botToken}`;

    try {
        const getMeResponse = await fetch(`${TELEGRAM_API}/getMe`);
        const getMeData = await getMeResponse.json();

        if (getMeData.ok) {
            console.log(`✅ Bot connected! Bot name: @${getMeData.result.username}`);
        } else {
            console.log('❌ Bot connection failed:', getMeData.description);
            return;
        }
    } catch (error) {
        console.log('❌ Network error:', error.message);
        return;
    }

    // 3. Find a user with Chat ID
    console.log('\n3. Finding users with Chat ID...');
    const users = await User.findAll({
        where: {
            telegram_chat_id: {
                [require('sequelize').Op.ne]: null
            }
        },
        attributes: ['id', 'display_name', 'telegram_chat_id']
    });

    if (users.length === 0) {
        console.log('❌ No users have configured Chat ID!');
        return;
    }

    console.log(`✅ Found ${users.length} user(s) with Chat ID:`);
    users.forEach(u => {
        console.log(`   - ${u.display_name}: Chat ID = ${u.telegram_chat_id}`);
    });

    // 4. Send test message
    const testUser = users[0];
    console.log(`\n4. Sending test message to ${testUser.display_name}...`);

    try {
        const sendResponse = await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: testUser.telegram_chat_id,
                text: '🧪 <b>Debug Test</b>\n\nThis is a direct test from the debug script!',
                parse_mode: 'HTML'
            })
        });

        const sendData = await sendResponse.json();

        if (sendData.ok) {
            console.log('✅ Message sent successfully!');
            console.log(`   Message ID: ${sendData.result.message_id}`);
        } else {
            console.log('❌ Send failed:', sendData.description);
            console.log('   Full error:', JSON.stringify(sendData, null, 2));
        }
    } catch (error) {
        console.log('❌ Error sending message:', error.message);
    }

    console.log('\n=== Test Complete ===');
}

testTelegram()
    .catch(console.error)
    .finally(() => process.exit(0));
