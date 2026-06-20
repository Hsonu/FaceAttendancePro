const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Department name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    dutyHours: {
      type: Number,
      default: 8.0,
      min: [0, 'Duty hours cannot be less than 0'],
      max: [24, 'Duty hours cannot exceed 24'],
    },
    shiftStartTime: {
      type: String,
      default: '09:00',
      match: [/^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, 'Shift start time must be in HH:MM format'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Department', DepartmentSchema);
