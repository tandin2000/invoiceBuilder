const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const OTP_STORE = {};
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const DEVICE_COOKIE = 'device_verified';
const EMAIL = 'info@kpmservicegroup.ca';

// Configure your SMTP transport here
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function generateOtp() {
  return ('' + Math.floor(100000 + Math.random() * 900000));
}

// POST /api/otp/send-otp
router.post('/send-otp', async (req, res) => {
  // Check if device already verified
  if (req.cookies && req.cookies[DEVICE_COOKIE]) {
    return res.status(200).json({ message: 'Device already verified' });
  }

  const otp = generateOtp();
  OTP_STORE[EMAIL] = { otp, expires: Date.now() + OTP_EXPIRY_MS };

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: EMAIL,
      subject: 'Your OTP for Device Verification',
      text: `Your OTP is: ${otp}`,
    });
    res.json({ message: 'OTP sent' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send OTP', error: err.message });
  }
});

// POST /api/otp/verify-otp
router.post('/verify-otp', (req, res) => {
  const { otp } = req.body;
  const record = OTP_STORE[EMAIL];
  if (!record || record.otp !== otp || Date.now() > record.expires) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }
  res.cookie(DEVICE_COOKIE, '1', {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    path: '/',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  delete OTP_STORE[EMAIL];
  res.json({ message: 'Device verified' });
});

module.exports = router; 