/**
 * Test Update Task API
 */
const { Task } = require('./src/models');

async function testUpdateTask() {
    console.log('=== Test Update Task ===\n');

    // Find a task
    const task = await Task.findOne({ order: [['created_at', 'DESC']] });

    if (!task) {
        console.log('No tasks found');
        return;
    }

    console.log('Found task:', task.id);
    console.log('Current status:', task.status);

    // Try to update
    const oldStatus = task.status;
    const newStatus = task.status === 'open' ? 'in_progress' : 'open';

    console.log(`\nUpdating status: ${oldStatus} -> ${newStatus}`);

    await task.update({ status: newStatus });
    await task.reload();

    console.log('Updated status:', task.status);
    console.log('\n✅ Update works locally!');

    // Revert
    await task.update({ status: oldStatus });
    console.log('Reverted status back to:', oldStatus);
}

testUpdateTask().catch(console.error).finally(() => process.exit(0));
