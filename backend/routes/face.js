const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

// ─── @route  POST /api/face/register/:employeeId (Admin only) ─────────────────
// Only Admin can register a face — picks an employee by ID and saves their descriptor
router.post('/register/:employeeId', protect, adminOnly, async (req, res) => {
  try {
    const { descriptor } = req.body;

    if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
      return res.status(400).json({
        success: false,
        message: 'Invalid face descriptor. Expected 128-element float array.',
      });
    }

    if (!descriptor.every((v) => typeof v === 'number' && isFinite(v))) {
      return res.status(400).json({
        success: false,
        message: 'Descriptor contains invalid values.',
      });
    }

    const employee = await User.findById(req.params.employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    await User.findByIdAndUpdate(req.params.employeeId, {
      faceDescriptor: descriptor,
      faceRegistered: true,
    });

    res.json({
      success: true,
      message: `Face registered successfully for ${employee.name}.`,
    });
  } catch (error) {
    console.error('Face register error:', error);
    res.status(500).json({ success: false, message: 'Server error during face registration.' });
  }
});

// ─── @route  POST /api/face/verify (Employee) ─────────────────────────────────
// Employee verifies live face against their stored descriptor (for attendance marking)
router.post('/verify', protect, async (req, res) => {
  try {
    const { descriptor } = req.body;

    if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
      return res.status(400).json({
        success: false,
        message: 'Invalid face descriptor.',
      });
    }

    const user = await User.findById(req.user._id).select('+faceDescriptor');

    if (!user.faceRegistered || !user.faceDescriptor || user.faceDescriptor.length !== 128) {
      return res.status(400).json({
        success: false,
        message: 'No face registered. Please ask your admin to register your face first.',
      });
    }

    // Euclidean distance between stored and live descriptors
    const storedDescriptor = user.faceDescriptor;
    let sum = 0;
    for (let i = 0; i < 128; i++) {
      const diff = storedDescriptor[i] - descriptor[i];
      sum += diff * diff;
    }
    const distance = Math.sqrt(sum);

    const THRESHOLD = 0.55;
    const verified = distance <= THRESHOLD;
    const confidence = Math.max(0, Math.round((1 - distance / THRESHOLD) * 100));

    res.json({
      success: true,
      verified,
      distance: parseFloat(distance.toFixed(4)),
      confidence: Math.min(confidence, 100),
      message: verified
        ? `Face verified successfully (${Math.min(confidence, 100)}% confidence)`
        : 'Face verification failed. Please try again with better lighting.',
    });
  } catch (error) {
    console.error('Face verify error:', error);
    res.status(500).json({ success: false, message: 'Server error during face verification.' });
  }
});

// ─── @route  DELETE /api/face/reset/:employeeId (Admin only) ──────────────────
// Admin resets a specific employee's face so it can be re-registered
router.delete('/reset/:employeeId', protect, adminOnly, async (req, res) => {
  try {
    const employee = await User.findById(req.params.employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    await User.findByIdAndUpdate(req.params.employeeId, {
      faceDescriptor: [],
      faceRegistered: false,
    });

    res.json({
      success: true,
      message: `Face data cleared for ${employee.name}. A new face can now be registered.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
