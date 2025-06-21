const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  companyName: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  termsAndConditions: {
    type: String,
    trim: true
  },
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema); 