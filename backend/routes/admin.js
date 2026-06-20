const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const { protect, adminOnly } = require('../middleware/auth');
const { generateExcel, generatePDF } = require('../utils/report');
const Settings = require('../models/Settings');
const Department = require('../models/Department');

// All admin routes require auth + admin role
router.use(protect, adminOnly);

// ─── @route  GET /api/admin/dashboard ─────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const thisMonth = today.substring(0, 7); // YYYY-MM

    // Fetch active employee IDs to ensure statistics are clean
    const activeEmployeesList = await User.find({ role: 'employee', isActive: true }).select('_id');
    const activeUserIds = activeEmployeesList.map(u => u._id);

    const [
      totalEmployees,
      activeEmployees,
      todayPresent,
      todayRecords,
      monthlyAttendance,
      recentAttendance,
      departmentStats,
      todayOTResult,
    ] = await Promise.all([
      User.countDocuments({ role: 'employee' }),
      User.countDocuments({ role: 'employee', isActive: true }),
      Attendance.countDocuments({ date: today, employee: { $in: activeUserIds }, checkIn: { $exists: true } }),
      Attendance.find({ date: today, employee: { $in: activeUserIds } })
        .populate('employee', 'name department employeeId avatar')
        .sort({ checkIn: -1 }),
      Attendance.aggregate([
        { $match: { date: { $regex: `^${thisMonth}` }, employee: { $in: activeUserIds } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalHours: { $sum: '$workHours' },
          },
        },
      ]),
      Attendance.find({ employee: { $in: activeUserIds } })
        .populate('employee', 'name department employeeId')
        .sort({ createdAt: -1 })
        .limit(10),
      User.aggregate([
        { $match: { role: 'employee', isActive: true } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Attendance.aggregate([
        { $match: { date: today, employee: { $in: activeUserIds } } },
        { $group: { _id: null, totalOT: { $sum: '$overtime' } } },
      ]),
    ]);

    const todayOvertime = todayOTResult[0]?.totalOT || 0;

    // Last 7 days trend
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const count = await Attendance.countDocuments({
        date: dateStr,
        checkIn: { $exists: true },
      });
      last7Days.push({
        date: dateStr,
        present: count,
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      });
    }

    res.json({
      success: true,
      stats: {
        totalEmployees,
        activeEmployees,
        todayPresent,
        todayAbsent: activeEmployees - todayPresent,
        attendanceRate: activeEmployees > 0
          ? Math.round((todayPresent / activeEmployees) * 100)
          : 0,
        todayOvertime: parseFloat(todayOvertime.toFixed(2)),
      },
      todayRecords,
      monthlyAttendance,
      recentAttendance,
      departmentStats,
      last7Days,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── @route  GET /api/admin/employees ─────────────────────────────────────────
router.get('/employees', async (req, res) => {
  try {
    const { search, department, page = 1, limit = 20 } = req.query;

    const filter = { role: 'employee' };
    if (department) filter.department = department;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [employees, total] = await Promise.all([
      User.find(filter)
        .select('-password -faceDescriptor')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      employees,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── @route  PUT /api/admin/employees/:id ─────────────────────────────────────
router.put('/employees/:id', async (req, res) => {
  try {
    const { name, department, position, phone, isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, department, position, phone, isActive },
      { new: true, runValidators: true }
    ).select('-password -faceDescriptor');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    res.json({ success: true, message: 'Employee updated.', user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── @route  DELETE /api/admin/employees/:id ──────────────────────────────────
router.delete('/employees/:id', async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "You can't delete yourself." });
    }

    await User.findByIdAndDelete(req.params.id);
    // Optionally delete attendance records
    await Attendance.deleteMany({ employee: req.params.id });

    res.json({ success: true, message: 'Employee deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.get('/attendance', async (req, res) => {
  try {
    const { startDate, endDate, employee, department, status, search, page = 1, limit = 30 } = req.query;

    let employeeFilter = { role: 'employee' };
    let hasEmployeeFilter = false;

    if (employee) {
      employeeFilter._id = employee;
      hasEmployeeFilter = true;
    }
    if (department) {
      employeeFilter.department = department;
      hasEmployeeFilter = true;
    }
    if (search) {
      employeeFilter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
      hasEmployeeFilter = true;
    }

    const matchingUsers = await User.find(employeeFilter).select('name department employeeId email avatar');
    const userIds = matchingUsers.map(u => u._id);

    // Fetch existing attendance records
    const filter = { employee: { $in: userIds } };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }

    const existingRecords = await Attendance.find(filter)
      .populate('employee', 'name department employeeId email avatar')
      .sort({ date: -1, checkIn: -1 });

    // Determine target dates
    let targetDates = [];
    const getDates = (s, e) => {
      const dates = [];
      let curr = new Date(s);
      const end = new Date(e);
      while (curr <= end) {
        dates.push(curr.toISOString().split('T')[0]);
        curr.setDate(curr.getDate() + 1);
      }
      return dates;
    };

    if (startDate && endDate) {
      targetDates = getDates(startDate, endDate);
    } else {
      // Default to last 7 days to show recent absences and check-ins
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 6); // last 7 days

      const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
      const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
      targetDates = getDates(startStr, endStr);
    }

    // Generate full list including virtual absent records
    let finalRecords = [];
    for (const d of targetDates) {
      for (const u of matchingUsers) {
        const record = existingRecords.find(
          r => r.employee && r.employee._id.toString() === u._id.toString() && r.date === d
        );
        if (record) {
          finalRecords.push(record);
        } else {
          finalRecords.push({
            employee: u,
            date: d,
            status: 'absent',
            workHours: 0,
            overtime: 0,
            duration: 0,
            checkIn: null,
            checkOut: null,
            checkInVerified: false,
            checkOutVerified: false,
          });
        }
      }
    }

    // Filter by status if specified
    if (status) {
      finalRecords = finalRecords.filter(r => r.status === status);
    }

    // Sort descending by date
    finalRecords.sort((a, b) => b.date.localeCompare(a.date));

    // Paginate final list
    const total = finalRecords.length;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedRecords = finalRecords.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      records: paginatedRecords,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error('Admin attendance error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── @route  GET /api/admin/report/excel ──────────────────────────────────────
router.get('/report/excel', async (req, res) => {
  try {
    const { startDate, endDate, name, employeeId, department } = req.query;

    const employeeFilter = { role: 'employee' };
    if (name) employeeFilter.name = { $regex: name, $options: 'i' };
    if (employeeId) employeeFilter.employeeId = { $regex: employeeId, $options: 'i' };
    if (department) employeeFilter.department = department;

    const matchingUsers = await User.find(employeeFilter).select('name department employeeId email position');
    const userIds = matchingUsers.map(u => u._id);

    const filter = { employee: { $in: userIds } };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }

    const existingRecords = await Attendance.find(filter)
      .populate('employee', 'name department employeeId email position')
      .sort({ date: -1 });

    let finalRecords = [];
    if (startDate && endDate) {
      const getDates = (s, e) => {
        const dates = [];
        let curr = new Date(s);
        const end = new Date(e);
        while (curr <= end) {
          dates.push(curr.toISOString().split('T')[0]);
          curr.setDate(curr.getDate() + 1);
        }
        return dates;
      };
      const dateList = getDates(startDate, endDate);

      for (const d of dateList) {
        for (const u of matchingUsers) {
          const record = existingRecords.find(
            r => r.employee && r.employee._id.toString() === u._id.toString() && r.date === d
          );
          if (record) {
            finalRecords.push(record);
          } else {
            finalRecords.push({
              employee: u,
              date: d,
              status: 'absent',
              workHours: 0,
              overtime: 0,
              duration: 0,
              checkIn: null,
              checkOut: null,
              checkInVerified: false,
              checkOutVerified: false,
            });
          }
        }
      }
      finalRecords.sort((a, b) => b.date.localeCompare(a.date));
    } else {
      finalRecords = existingRecords;
    }

    const buffer = await generateExcel(finalRecords, { startDate, endDate });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=attendance_report_${startDate || 'all'}_${endDate || 'all'}.xlsx`
    );
    res.send(buffer);
  } catch (error) {
    console.error('Excel report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate Excel report.' });
  }
});

// ─── @route  GET /api/admin/report/pdf ────────────────────────────────────────
router.get('/report/pdf', async (req, res) => {
  try {
    const { startDate, endDate, name, employeeId, department, summaryOnly } = req.query;

    const employeeFilter = { role: 'employee' };
    if (name) employeeFilter.name = { $regex: name, $options: 'i' };
    if (employeeId) employeeFilter.employeeId = { $regex: employeeId, $options: 'i' };
    if (department) employeeFilter.department = department;

    const matchingUsers = await User.find(employeeFilter).select('name department employeeId email position');
    const userIds = matchingUsers.map(u => u._id);

    const filter = { employee: { $in: userIds } };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }

    const existingRecords = await Attendance.find(filter)
      .populate('employee', 'name department employeeId email position')
      .sort({ date: -1 });

    let finalRecords = [];
    if (startDate && endDate) {
      const getDates = (s, e) => {
        const dates = [];
        let curr = new Date(s);
        const end = new Date(e);
        while (curr <= end) {
          dates.push(curr.toISOString().split('T')[0]);
          curr.setDate(curr.getDate() + 1);
        }
        return dates;
      };
      const dateList = getDates(startDate, endDate);

      for (const d of dateList) {
        for (const u of matchingUsers) {
          const record = existingRecords.find(
            r => r.employee && r.employee._id.toString() === u._id.toString() && r.date === d
          );
          if (record) {
            finalRecords.push(record);
          } else {
            finalRecords.push({
              employee: u,
              date: d,
              status: 'absent',
              workHours: 0,
              overtime: 0,
              duration: 0,
              checkIn: null,
              checkOut: null,
              checkInVerified: false,
              checkOutVerified: false,
            });
          }
        }
      }
      finalRecords.sort((a, b) => b.date.localeCompare(a.date));
    } else {
      finalRecords = existingRecords;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename=attendance_report_${startDate || 'all'}_${endDate || 'all'}.pdf`
    );

    generatePDF(finalRecords, res, { startDate, endDate, summaryOnly: summaryOnly === 'true' });
  } catch (error) {
    console.error('PDF report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF report.' });
  }
});

// ─── @route  GET /api/admin/report/summary ──────────────────────────────────────
router.get('/report/summary', async (req, res) => {
  try {
    const { startDate, endDate, name, employeeId, department } = req.query;

    const employeeFilter = { role: 'employee' };
    if (name) employeeFilter.name = { $regex: name, $options: 'i' };
    if (employeeId) employeeFilter.employeeId = { $regex: employeeId, $options: 'i' };
    if (department) employeeFilter.department = department;

    const matchingUsers = await User.find(employeeFilter).select('name department employeeId email position');
    const userIds = matchingUsers.map(u => u._id);

    const filter = { employee: { $in: userIds } };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }

    const existingRecords = await Attendance.find(filter)
      .populate('employee', 'name department employeeId email position')
      .sort({ date: -1 });

    let finalRecords = [];
    if (startDate && endDate) {
      const getDates = (s, e) => {
        const dates = [];
        let curr = new Date(s);
        const end = new Date(e);
        while (curr <= end) {
          dates.push(curr.toISOString().split('T')[0]);
          curr.setDate(curr.getDate() + 1);
        }
        return dates;
      };
      const dateList = getDates(startDate, endDate);

      for (const d of dateList) {
        for (const u of matchingUsers) {
          const record = existingRecords.find(
            r => r.employee && r.employee._id.toString() === u._id.toString() && r.date === d
          );
          if (record) {
            finalRecords.push(record);
          } else {
            finalRecords.push({
              employee: u,
              date: d,
              status: 'absent',
              workHours: 0,
              overtime: 0,
              duration: 0,
            });
          }
        }
      }
    } else {
      finalRecords = existingRecords;
    }

    // Compute stats
    const totalRecords = finalRecords.length;
    const totalPresent = finalRecords.filter(r => ['present', 'late', 'half-day'].includes(r.status)).length;
    const totalAbsent = finalRecords.filter(r => r.status === 'absent').length;
    const totalWorkHours = finalRecords.reduce((acc, r) => acc + (r.workHours || 0), 0);
    const totalOvertime = finalRecords.reduce((acc, r) => acc + (r.overtime || 0), 0);

    // Compute per-employee summary
    const empSummaryMap = {};
    matchingUsers.forEach(u => {
      empSummaryMap[u._id.toString()] = {
        name: u.name,
        employeeId: u.employeeId,
        department: u.department,
        present: 0,
        absent: 0,
        workHours: 0,
        overtime: 0,
      };
    });

    finalRecords.forEach(r => {
      if (r.employee) {
        const empIdStr = r.employee._id ? r.employee._id.toString() : r.employee.toString();
        const summary = empSummaryMap[empIdStr];
        if (summary) {
          if (['present', 'late', 'half-day'].includes(r.status)) {
            summary.present += 1;
          } else if (r.status === 'absent') {
            summary.absent += 1;
          }
          summary.workHours += r.workHours || 0;
          summary.overtime += r.overtime || 0;
        }
      }
    });

    const employeeSummary = Object.values(empSummaryMap);

    res.json({
      success: true,
      stats: {
        totalRecords,
        totalPresent,
        totalAbsent,
        totalWorkHours: parseFloat(totalWorkHours.toFixed(2)),
        totalOvertime: parseFloat(totalOvertime.toFixed(2)),
      },
      employeeSummary,
    });
  } catch (error) {
    console.error('Report summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate report summary.' });
  }
});

// ─── @route  GET /api/admin/settings ───────────────────────────────────────────
router.get('/settings', async (req, res) => {
  try {
    let dutyHoursSetting = await Settings.findOne({ key: 'dutyHours' });
    let shiftStartTimeSetting = await Settings.findOne({ key: 'shiftStartTime' });

    // Fallback defaults if they don't exist
    if (!dutyHoursSetting) {
      dutyHoursSetting = await Settings.create({ key: 'dutyHours', value: 8 });
    }
    if (!shiftStartTimeSetting) {
      shiftStartTimeSetting = await Settings.create({ key: 'shiftStartTime', value: '09:00' });
    }

    res.json({
      success: true,
      settings: {
        dutyHours: parseFloat(dutyHoursSetting.value),
        shiftStartTime: shiftStartTimeSetting.value,
      },
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, message: 'Server error fetching settings.' });
  }
});

// ─── @route  PUT /api/admin/settings ───────────────────────────────────────────
router.put('/settings', async (req, res) => {
  try {
    const { dutyHours, shiftStartTime } = req.body;

    if (dutyHours !== undefined) {
      const parsedHours = parseFloat(dutyHours);
      if (isNaN(parsedHours) || parsedHours <= 0 || parsedHours > 24) {
        return res.status(400).json({ success: false, message: 'Duty hours must be a number between 0 and 24.' });
      }
      await Settings.findOneAndUpdate(
        { key: 'dutyHours' },
        { value: parsedHours },
        { upsert: true, new: true }
      );
    }

    if (shiftStartTime !== undefined) {
      const timeRegex = /^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(shiftStartTime)) {
        return res.status(400).json({ success: false, message: 'Shift start time must be in HH:MM format.' });
      }
      await Settings.findOneAndUpdate(
        { key: 'shiftStartTime' },
        { value: shiftStartTime },
        { upsert: true, new: true }
      );
    }

    res.json({
      success: true,
      message: 'Settings updated successfully.',
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, message: 'Server error updating settings.' });
  }
});

// ─── Department Management ────────────────────────────────────────────────────

// @route  GET /api/admin/departments — list all departments
router.get('/departments', async (req, res) => {
  try {
    const departments = await Department.find({}).sort({ name: 1 });
    res.json({ success: true, departments });
  } catch (error) {
    console.error('Department list error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route  POST /api/admin/departments — create a new department
router.post('/departments', async (req, res) => {
  try {
    const { name, description, dutyHours, shiftStartTime } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Department name is required.' });
    }

    const existing = await Department.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Department already exists.' });
    }

    const department = await Department.create({
      name: name.trim(),
      description: description || '',
      dutyHours: dutyHours !== undefined ? parseFloat(dutyHours) : 8.0,
      shiftStartTime: shiftStartTime || '09:00',
    });

    res.status(201).json({ success: true, message: 'Department created.', department });
  } catch (error) {
    console.error('Department create error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route  PUT /api/admin/departments/:id — update department
router.put('/departments/:id', async (req, res) => {
  try {
    const { name, description, isActive, dutyHours, shiftStartTime } = req.body;

    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { name, description, isActive, dutyHours, shiftStartTime },
      { new: true, runValidators: true }
    );

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    res.json({ success: true, message: 'Department updated.', department });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Department name already exists.' });
    }
    console.error('Department update error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// @route  DELETE /api/admin/departments/:id — delete department
router.delete('/departments/:id', async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }
    res.json({ success: true, message: 'Department deleted successfully.' });
  } catch (error) {
    console.error('Department delete error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;

