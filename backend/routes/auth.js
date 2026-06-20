const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken, protect, adminOnly } = require('../middleware/auth');

// ─── @route  POST /api/auth/login ─────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { email, password } = req.body;

      // Explicitly select password field (hidden by default)
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      if (!user.isActive) {
        return res.status(403).json({ success: false, message: 'Account deactivated. Contact admin.' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });

      const token = generateToken(user._id);

      res.json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          position: user.position,
          employeeId: user.employeeId,
          faceRegistered: user.faceRegistered,
          avatar: user.avatar,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ─── @route  POST /api/auth/register (Admin only) ─────────────────────────────
router.post(
  '/register',
  protect,
  adminOnly,
  [
    body('name').trim().notEmpty().withMessage('Name required'),
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['employee', 'admin']).withMessage('Invalid role'),
    body('department').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { name, email, password, role, department, position, phone } = req.body;

      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }

      const user = await User.create({
        name,
        email,
        password,
        role: role || 'employee',
        department: department || 'General',
        position: position || 'Staff',
        phone: phone || '',
      });

      res.status(201).json({
        success: true,
        message: 'Employee created successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          employeeId: user.employeeId,
        },
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ─── @route  GET /api/auth/me ──────────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── @route  PUT /api/auth/change-password ────────────────────────────────────
router.put(
  '/change-password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user._id).select('+password');
      const isMatch = await user.comparePassword(req.body.currentPassword);

      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password incorrect' });
      }

      user.password = req.body.newPassword;
      await user.save();

      res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

module.exports = router;
