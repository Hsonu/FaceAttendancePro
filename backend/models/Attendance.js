const mongoose = require('mongoose');
const Settings = require('./Settings');

const AttendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: String,
      required: true,
      // Format: YYYY-MM-DD
    },
    checkIn: {
      type: Date,
    },
    checkOut: {
      type: Date,
    },
    duration: {
      type: Number,
      default: 0, // in minutes
    },
    status: {
      type: String,
      enum: ['present', 'half-day', 'late', 'absent'],
      default: 'present',
    },
    checkInVerified: {
      type: Boolean,
      default: false,
    },
    checkOutVerified: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      default: '',
    },
    workHours: {
      type: Number,
      default: 0, // computed hours (duration / 60)
    },
    overtime: {
      type: Number,
      default: 0, // computed overtime hours (workHours - dutyHours)
    },
  },
  { timestamps: true }
);

// Unique per employee per day
AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

// Auto-calculate duration, workHours, and overtime when checkOut is set
AttendanceSchema.pre('save', async function (next) {
  if (this.checkIn && this.checkOut) {
    const diffMs = new Date(this.checkOut) - new Date(this.checkIn);
    this.duration = Math.round(diffMs / 60000); // in minutes
    this.workHours = parseFloat((this.duration / 60).toFixed(2));

    let dutyHours = 8.0;
    let shiftStartTime = '09:00';

    try {
      const User = require('./User');
      const Department = require('./Department');
      const user = await User.findById(this.employee);
      
      let dept = null;
      if (user && user.department) {
        dept = await Department.findOne({ name: user.department });
      }

      if (dept) {
        if (dept.dutyHours !== undefined) {
          dutyHours = parseFloat(dept.dutyHours);
        }
        if (dept.shiftStartTime) {
          shiftStartTime = dept.shiftStartTime;
        }
      } else {
        // Fallback to global settings
        const dutySetting = await Settings.findOne({ key: 'dutyHours' });
        if (dutySetting) {
          dutyHours = parseFloat(dutySetting.value);
        }
        const shiftSetting = await Settings.findOne({ key: 'shiftStartTime' });
        if (shiftSetting) {
          shiftStartTime = shiftSetting.value;
        }
      }
    } catch (err) {
      console.error('Error fetching duty parameters inside Attendance pre-save:', err);
    }

    // Calculate Overtime
    this.overtime = Math.max(0, parseFloat((this.workHours - dutyHours).toFixed(2)));

    // Determine status based on check-in time compared to shiftStartTime
    if (this.duration < 240) {
      this.status = 'half-day';
    } else {
      const [shiftHour, shiftMin] = shiftStartTime.split(':').map(Number);
      const checkInHour = new Date(this.checkIn).getHours();
      const checkInMin = new Date(this.checkIn).getMinutes();

      const shiftMinutes = shiftHour * 60 + shiftMin;
      const checkInMinutes = checkInHour * 60 + checkInMin;

      this.status = checkInMinutes > shiftMinutes ? 'late' : 'present';
    }
  }
  next();
});

module.exports = mongoose.model('Attendance', AttendanceSchema);
