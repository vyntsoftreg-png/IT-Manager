const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { createAuditLog } = require('../middleware/audit');

// Login
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required',
            });
        }

        // Find user by username or email
        const user = await User.findOne({
            where: {
                username: username,
                is_active: true,
            },
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
        }

        const isValidPassword = await user.validatePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
        }

        // Generate JWT token
        const secret = process.env.JWT_SECRET || 'default-secret';
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            secret,
            { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
        );

        await createAuditLog(user.id, 'login', 'users', user.id, null, null, req);

        res.json({
            success: true,
            data: {
                token,
                user: user.toJSON(),
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};

// Get current user
const me = async (req, res) => {
    res.json({
        success: true,
        data: req.user.toJSON(),
    });
};

// Logout (client-side token removal, but we log it)
const logout = async (req, res) => {
    await createAuditLog(req.user.id, 'logout', 'users', req.user.id, null, null, req);
    res.json({
        success: true,
        message: 'Logged out successfully',
    });
};

// Change password
const changePassword = async (req, res) => {
    try {
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu hiện tại và mật khẩu mới là bắt buộc',
            });
        }

        if (new_password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu mới phải có ít nhất 6 ký tự',
            });
        }

        const isValidPassword = await req.user.validatePassword(current_password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Mật khẩu hiện tại không chính xác',
            });
        }

        req.user.password_hash = new_password;
        await req.user.save();

        await createAuditLog(req.user.id, 'update', 'users', req.user.id,
            { field: 'password' }, { field: 'password_changed' }, req);

        res.json({
            success: true,
            message: 'Đổi mật khẩu thành công!',
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra',
        });
    }
};

// Update profile
const updateProfile = async (req, res) => {
    try {
        const { display_name, email } = req.body;

        const oldValues = {
            display_name: req.user.display_name,
            email: req.user.email,
        };

        if (display_name) req.user.display_name = display_name;
        if (email !== undefined) req.user.email = email;

        await req.user.save();

        await createAuditLog(req.user.id, 'update', 'users', req.user.id,
            oldValues, { display_name: req.user.display_name, email: req.user.email }, req);

        res.json({
            success: true,
            data: req.user.toJSON(),
            message: 'Cập nhật thông tin thành công!',
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Có lỗi xảy ra',
        });
    }
};

module.exports = {
    login,
    me,
    logout,
    changePassword,
    updateProfile,
};
