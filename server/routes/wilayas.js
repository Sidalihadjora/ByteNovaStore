const express = require('express');
const router = express.Router();
const db = require('../db');
const path = require('path');
const fs = require('fs');

const dataPath = path.resolve(__dirname, '..', '..', 'data.json');

function readWilayaData() {
  const parsed = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  if (!Array.isArray(parsed)) {
    throw new TypeError('data.json must contain a Wilaya array.');
  }

  const seenCodes = new Set();
  for (const wilaya of parsed) {
    if (
      !wilaya ||
      !Number.isInteger(wilaya.code) ||
      typeof wilaya.ascii !== 'string' ||
      typeof wilaya.arabic !== 'string' ||
      !Array.isArray(wilaya.communes)
    ) {
      throw new TypeError('data.json contains a Wilaya with an invalid code, name, or commune list.');
    }
    if (seenCodes.has(wilaya.code)) {
      throw new TypeError(`data.json contains duplicate Wilaya code ${wilaya.code}.`);
    }
    seenCodes.add(wilaya.code);
    if (wilaya.communes.some(commune => !commune || typeof commune.ascii !== 'string' || typeof commune.arabic !== 'string')) {
      throw new TypeError(`data.json contains an invalid commune for Wilaya ${wilaya.code}.`);
    }
  }
  return parsed;
}

// GET /api/wilayas - List all Algerian Wilayas
router.get('/', (req, res) => {
  try {
    const deliveryFees = new Map(
      db.prepare('SELECT code, delivery_fee FROM wilayas').all().map(row => [row.code, row.delivery_fee])
    );
    const wilayas = readWilayaData()
      .map(wilaya => ({
        id: wilaya.code,
        code: wilaya.code,
        name_ascii: wilaya.ascii,
        name_arabic: wilaya.arabic,
        delivery_fee: deliveryFees.get(wilaya.code) ?? 600
      }))
      .sort((a, b) => a.code - b.code);

    res.json({
      success: true,
      count: wilayas.length,
      data: wilayas
    });
  } catch (error) {
    console.error('Error fetching wilayas:', error);
    res.status(500).json({ success: false, message: 'Server error fetching wilayas' });
  }
});

router.get('/stats', (req, res) => {
  try {
    const wilayas = readWilayaData();
    res.json({
      success: true,
      stats: {
        wilaya_count: wilayas.length,
        commune_count: wilayas.reduce((total, wilaya) => total + wilaya.communes.length, 0)
      }
    });
  } catch (error) {
    console.error('Error calculating Wilaya statistics from data.json:', error);
    res.status(500).json({ success: false, message: 'Unable to read valid Wilaya data from data.json.' });
  }
});

// GET /api/wilayas/:code/communes - List all Communes for a specific Wilaya code
router.get('/:code/communes', (req, res) => {
  try {
    const wilayaCode = Number(req.params.code);
    if (!Number.isInteger(wilayaCode)) {
      return res.status(400).json({ success: false, message: 'Invalid wilaya code' });
    }

    const wilaya = readWilayaData().find(item => item.code === wilayaCode);
    if (!wilaya) {
      return res.status(404).json({ success: false, message: 'Wilaya not found.' });
    }
    const communes = wilaya.communes
      .map((commune, index) => ({
        id: `${wilaya.code}-${index}`,
        wilaya_code: wilaya.code,
        name_ascii: commune.ascii,
        name_arabic: commune.arabic
      }))
      .sort((a, b) => a.name_ascii.localeCompare(b.name_ascii));

    res.json({
      success: true,
      wilaya_code: wilayaCode,
      count: communes.length,
      data: communes
    });
  } catch (error) {
    console.error('Error fetching communes:', error);
    res.status(500).json({ success: false, message: 'Server error fetching communes' });
  }
});

// GET /api/wilayas/raw-json - Directly serve the raw data.json as requested
router.get('/raw-json', (req, res) => {
  try {
    if (fs.existsSync(dataPath)) {
      return res.json({ success: true, data: readWilayaData() });
    }
    res.status(404).json({ success: false, message: 'data.json file not found' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
