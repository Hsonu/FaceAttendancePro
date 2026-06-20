const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['employee', 'admin'],
      default: 'employee',
    },
    department: {
      type: String,
      default: 'General',
      trim: true,
    },
    position: {
      type: String,
      default: 'Staff',
      trim: true,
    },
    employeeId: {
      type: String,
      unique: true,
      sparse: true,
    },
    phone: {
      type: String,
      default: '',
    },
    // Face recognition data — 128-dimensional descriptor array
    faceDescriptor: {
      type: [Number],
      default: [],
      select: false, // never return in regular queries
    },
    faceRegistered: {
      type: Boolean,
      default: false,
    },
    avatar: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  { timestamps: true }
);

// ─── Pre-save hooks ────────────────────────────────────────────────────────────

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Auto-generate employeeId before first save
UserSchema.pre('save', async function (next) {
  if (this.employeeId) return next();
  const count = await mongoose.model('User').countDocuments();
  this.employeeId = `EMP${String(count + 1).padStart(4, '0')}`;
  next();
});

// ─── Instance methods ──────────────────────────────────────────────────────────

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Virtual ───────────────────────────────────────────────────────────────────

UserSchema.virtual('fullProfile').get(function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    department: this.department,
    position: this.position,
    employeeId: this.employeeId,
    faceRegistered: this.faceRegistered,
    isActive: this.isActive,
  };
});

module.exports = mongoose.model('User', UserSchema);
