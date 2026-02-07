const { PersonalTaskCategory } = require('../models');

// Get all categories for current user
const getAll = async (req, res) => {
    try {
        const categories = await PersonalTaskCategory.findAll({
            where: { user_id: req.user.id },
            order: [['name', 'ASC']]
        });

        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách category' });
    }
};

// Create category
const create = async (req, res) => {
    try {
        const { name, color, icon } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Tên category là bắt buộc' });
        }

        const category = await PersonalTaskCategory.create({
            name,
            color: color || '#1677ff',
            icon,
            user_id: req.user.id
        });

        res.status(201).json({ success: true, data: category });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi tạo category' });
    }
};

// Update category
const update = async (req, res) => {
    try {
        const category = await PersonalTaskCategory.findOne({
            where: { id: req.params.id, user_id: req.user.id }
        });

        if (!category) {
            return res.status(404).json({ success: false, message: 'Category không tồn tại' });
        }

        const { name, color, icon } = req.body;
        await category.update({
            name: name ?? category.name,
            color: color ?? category.color,
            icon: icon ?? category.icon
        });

        res.json({ success: true, data: category });
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật category' });
    }
};

// Delete category
const deleteCategory = async (req, res) => {
    try {
        const category = await PersonalTaskCategory.findOne({
            where: { id: req.params.id, user_id: req.user.id }
        });

        if (!category) {
            return res.status(404).json({ success: false, message: 'Category không tồn tại' });
        }

        await category.destroy();
        res.json({ success: true, message: 'Đã xóa category thành công' });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi xóa category' });
    }
};

module.exports = {
    getAll,
    create,
    update,
    delete: deleteCategory
};
