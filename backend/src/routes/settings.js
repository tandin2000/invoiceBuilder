const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');

// GET settings
router.get('/', async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      // If no settings, create default ones
      settings = new Setting();
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE settings
router.put('/', async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting();
    }

    const { companyName, address, termsAndConditions, signature } = req.body;
    settings.companyName = companyName;
    settings.address = address;
    settings.termsAndConditions = termsAndConditions;
    if (typeof signature !== 'undefined') {
      settings.signature = signature;
    }

    const updatedSettings = await settings.save();
    res.json(updatedSettings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 