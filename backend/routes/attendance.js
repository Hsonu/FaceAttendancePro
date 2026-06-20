const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const { protect } = require('../middleware/auth');

// Helper: get today's date string YYYY-MM-DD in local time
const getTodayString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ─── @route  POST /api/attendance/in ──────────────────────────────────────────
// Mark check-in for today
router.post('/in', protect, async (req, res) => {
  try {
    const today = getTodayString();

    // Check if already checked in today
    const existing = await Attendance.findOne({
      employee: req.user._id,
      date: today,
    });

    if (existing && existing.checkIn) {
      return res.status(400).json({
        success: false,
        message: 'You have already checked in today.',
        attendance: existing,
      });
    }

    // Fetch shiftStartTime for the employee's department
    let shiftStartTime = '09:00';
    try {
      const User = require('../models/User');
      const Department = require('../models/Department');
      const Settings = require('../models/Settings');
      
      const user = await User.findById(req.user._id);
      let dept = null;
      if (user && user.department) {
        dept = await Department.findOne({ name: user.department });
      }

      if (dept && dept.shiftStartTime) {
        shiftStartTime = dept.shiftStartTime;
      } else {
        const setting = await Settings.findOne({ key: 'shiftStartTime' });
        if (setting) {
          shiftStartTime = setting.value;
        }
      }
    } catch (err) {
      console.error('Error fetching shiftStartTime in check-in route:', err);
    }

    const checkInDate = new Date();
    const [shiftHour, shiftMin] = shiftStartTime.split(':').map(Number);
    const checkInHour = checkInDate.getHours();
    const checkInMin = checkInDate.getMinutes();
    const shiftMinutes = shiftHour * 60 + shiftMin;
    const checkInMinutes = checkInHour * 60 + checkInMin;
    const checkInStatus = checkInMinutes > shiftMinutes ? 'late' : 'present';

    const attendance = await Attendance.findOneAndUpdate(
      { employee: req.user._id, date: today },
      {
        $set: {
          checkIn: checkInDate,
          checkInVerified: true,
          status: checkInStatus,
        },
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: `Check-in recorded at ${checkInDate.toLocaleTimeString()}`,
      attendance,
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ success: false, message: 'Server error during check-in.' });
  }
});

// ─── @route  POST /api/attendance/out ─────────────────────────────────────────
// Mark check-out for today
router.post('/out', protect, async (req, res) => {
  try {
    const today = getTodayString();

    const attendance = await Attendance.findOne({
      employee: req.user._id,
      date: today,
    });

    if (!attendance || !attendance.checkIn) {
      return res.status(400).json({
        success: false,
        message: "You haven't checked in today. Please check in first.",
      });
    }

    if (attendance.checkOut) {
      return res.status(400).json({
        success: false,
        message: 'You have already checked out today.',
        attendance,
      });
    }

    attendance.checkOut = new Date();
    attendance.checkOutVerified = true;
    await attendance.save(); // triggers pre-save duration calculation

    res.json({
      success: true,
      message: `Check-out recorded at ${new Date().toLocaleTimeString()}. Work hours: ${attendance.workHours}h`,
      attendance,
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ success: false, message: 'Server error during check-out.' });
  }
});

// ─── @route  GET /api/attendance/today ────────────────────────────────────────
// Get today's attendance for the logged-in user
router.get('/today', protect, async (req, res) => {
  try {
    const today = getTodayString();
    const attendance = await Attendance.findOne({
      employee: req.user._id,
      date: today,
    });

    res.json({ success: true, attendance: attendance || null });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── @route  GET /api/attendance/mine ─────────────────────────────────────────
// Get the logged-in employee's attendance history with optional date range
router.get('/mine', protect, async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 20 } = req.query;

    const filter = { employee: req.user._id };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [records, total] = await Promise.all([
      Attendance.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Attendance.countDocuments(filter),
    ]);

    // Summary stats
    const stats = await Attendance.aggregate([
      { $match: { employee: req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalHours: { $sum: '$workHours' },
          totalOvertime: { $sum: '$overtime' },
        },
      },
    ]);

    res.json({
      success: true,
      records,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      stats,
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
