const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const winston = require('winston');
const cookieParser = require('cookie-parser');

// Initialize express app
const app = express();

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'https://invoicebuilder.onrender.com'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static files from the React frontend build
app.use(express.static(path.join(__dirname, '../../frontend/build')));

// Environment variable validation
logger.info('Environment Variables Check', {
  nodeEnv: process.env.NODE_ENV || 'NOT_SET',
  port: process.env.PORT || 'NOT_SET',
  mongodbUri: process.env.MONGODB_URI ? 'SET' : 'NOT_SET',
  smtpUser: process.env.SMTP_USER ? 'SET' : 'NOT_SET',
  smtpPass: process.env.SMTP_PASS ? 'SET' : 'NOT_SET',
  smtpFrom: process.env.SMTP_FROM ? 'SET' : 'NOT_SET'
});

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  logger.error('Missing required environment variables', {
    missing: missingEnvVars
  });
  process.exit(1);
}

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => logger.info('Connected to MongoDB'))
  .catch((err) => logger.error('MongoDB connection error:', err));

// Routes
app.use('/api/clients', require('./routes/clients'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/otp', require('./routes/otp'));

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Catch-all handler to serve React's index.html for any other GET requests
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/build', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
}); 