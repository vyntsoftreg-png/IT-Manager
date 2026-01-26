const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token is required',
            });
        }

        const secret = process.env.JWT_SECRET || 'default-secret';
        if (process.env.NODE_ENV === 'production' && secret === 'default-secret') {
            console.warn('⚠️  WARNING: Using default JWT secret in production!');
        }
        const decoded = jwt.verify(token, secret);

        const user = await User.findByPk(decoded.userId);
        if (!user || !user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'User not found or inactive',
            });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired',
            });
        }
        return res.status(403).json({
            success: false,
            message: 'Invalid token',
        });
    }
};

const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions',
            });
        }

        next();
    };
};

const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
            const user = await User.findByPk(decoded.userId);
            if (user && user.is_active) {
                req.user = user;
            }
        }
    } catch (error) {
        // Ignore token errors for optional auth
    }
    next();
};

module.exports = {
    authenticateToken,
    requireRole,
    optionalAuth,
};
