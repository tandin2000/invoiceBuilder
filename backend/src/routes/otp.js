const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const winston = require('winston');

// Configure logger for OTP module
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'otp-email.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

const OTP_STORE = {};
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const DEVICE_COOKIE = 'device_verified';
const EMAIL = 'info@kpmservicegroup.ca';

// Log environment variables (without exposing sensitive data)
logger.info('OTP Module - Environment Check', {
  smtpUser: process.env.SMTP_USER ? 'SET' : 'NOT_SET',
  smtpPass: process.env.SMTP_PASS ? 'SET' : 'NOT_SET',
  nodeEnv: process.env.NODE_ENV || 'NOT_SET'
});

// Configure your SMTP transport here
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Test transporter configuration
transporter.verify((error, success) => {
  if (error) {
    logger.error('SMTP Transporter Verification Failed', {
      error: error.message,
      code: error.code,
      command: error.command,
      response: error.response
    });
  } else {
    logger.info('SMTP Transporter Verified Successfully', {
      success: true,
      service: 'gmail'
    });
  }
});

function generateOtp() {
  return ('' + Math.floor(100000 + Math.random() * 900000));
}

// POST /api/otp/send-otp
router.post('/send-otp', async (req, res) => {
  logger.info('OTP Send Request Received', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Check if device already verified
  if (req.cookies && req.cookies[DEVICE_COOKIE]) {
    logger.info('Device already verified, skipping OTP generation');
    return res.status(200).json({ message: 'Device already verified' });
  }

  const otp = generateOtp();
  OTP_STORE[EMAIL] = { otp, expires: Date.now() + OTP_EXPIRY_MS };

  logger.info('OTP Generated', {
    otp: otp,
    email: EMAIL,
    expires: new Date(Date.now() + OTP_EXPIRY_MS).toISOString()
  });

  try {
    logger.info('Attempting to send OTP email', {
      from: process.env.SMTP_USER,
      to: EMAIL,
      subject: 'Your OTP for Device Verification'
    });

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: EMAIL,
      subject: 'Your OTP for Device Verification',
      text: `Your OTP is: ${otp}`,
    };

    const result = await transporter.sendMail(mailOptions);
    
    logger.info('OTP Email Sent Successfully', {
      messageId: result.messageId,
      response: result.response,
      accepted: result.accepted,
      rejected: result.rejected
    });

    res.json({ message: 'OTP sent' });
  } catch (err) {
    logger.error('Failed to send OTP email', {
      error: err.message,
      code: err.code,
      command: err.command,
      response: err.response,
      responseCode: err.responseCode,
      stack: err.stack
    });

    res.status(500).json({ 
      message: 'Failed to send OTP', 
      error: err.message,
      code: err.code || 'UNKNOWN_ERROR'
    });
  }
});

// POST /api/otp/verify-otp
router.post('/verify-otp', (req, res) => {
  logger.info('OTP Verification Request Received', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  const { otp } = req.body;
  const record = OTP_STORE[EMAIL];
  
  logger.info('OTP Verification Attempt', {
    providedOtp: otp,
    storedOtp: record ? record.otp : 'NOT_FOUND',
    expires: record ? new Date(record.expires).toISOString() : 'NOT_FOUND',
    currentTime: new Date().toISOString(),
    isExpired: record ? Date.now() > record.expires : true
  });

  if (!record || record.otp !== otp || Date.now() > record.expires) {
    logger.warn('OTP Verification Failed', {
      reason: !record ? 'NO_RECORD' : record.otp !== otp ? 'INVALID_OTP' : 'EXPIRED_OTP'
    });
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  logger.info('OTP Verification Successful', {
    email: EMAIL,
    deviceVerified: true
  });

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