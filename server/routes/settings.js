const express = require('express');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const publicKeys = [
  'store_name',
  'store_name_ar',
  'website_title',
  'store_description',
  'store_description_ar',
  'store_slogan',
  'store_slogan_ar',
  'store_logo',
  'store_favicon',
  'hero_image',
  'hero_image_badge',
  'hero_image_badge_ar',
  'hero_image_title',
  'hero_image_title_ar',
  'hero_image_discount',
  'hero_image_discount_ar',
  'primary_color',
  'secondary_color',
  'store_email',
  'store_phone',
  'store_secondary_phone',
  'store_address',
  'store_city',
  'store_country',
  'social_facebook',
  'social_instagram',
  'social_whatsapp',
  'free_delivery_threshold'
];

const editableKeys = new Set(publicKeys);

const maximumLengths = {
  store_name: 100,
  store_name_ar: 100,
  website_title: 160,
  store_description: 2000,
  store_description_ar: 2000,
  store_slogan: 300,
  store_slogan_ar: 300,
  store_logo: 2048,
  store_favicon: 2048,
  hero_image: 2048,
  hero_image_badge: 100,
  hero_image_badge_ar: 100,
  hero_image_title: 160,
  hero_image_title_ar: 160,
  hero_image_discount: 160,
  hero_image_discount_ar: 160,
  store_email: 254,
  store_phone: 40,
  store_secondary_phone: 40,
  store_address: 300,
  store_city: 100,
  store_country: 100,
  social_facebook: 2048,
  social_instagram: 2048,
  social_whatsapp: 2048
};

function readSettings(keys = null) {
  const rows = keys
    ? db.prepare(`SELECT key, value FROM settings WHERE key IN (${keys.map(() => '?').join(',')})`).all(...keys)
    : db.prepare('SELECT key, value FROM settings').all();
  return Object.fromEntries(rows.map(({ key, value }) => [key, value]));
}

function validateSetting(key, value) {
  if (typeof value !== 'string') {
    throw new TypeError(`${key} must be a string.`);
  }
  const cleanValue = value.trim();
  if (cleanValue.length > (maximumLengths[key] ?? 100)) {
    throw new TypeError(`${key} exceeds its maximum length.`);
  }
  if (key === 'free_delivery_threshold' && (!/^\d+(?:\.\d{1,2})?$/.test(cleanValue) || Number(cleanValue) > 100000000)) {
    throw new TypeError('Free delivery threshold must be a non-negative amount.');
  }
  if (['primary_color', 'secondary_color'].includes(key) && !/^#[0-9a-f]{6}$/i.test(cleanValue)) {
    throw new TypeError(`${key} must be a six-digit hexadecimal color.`);
  }
  if (key === 'store_email' && cleanValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanValue)) {
    throw new TypeError('Store email is invalid.');
  }
  if (['store_logo', 'store_favicon', 'hero_image'].includes(key) && cleanValue) {
    validatePublicUrl(cleanValue, key, true);
  }
  if (key.startsWith('social_') && cleanValue) {
    validatePublicUrl(cleanValue, key);
  }
  return cleanValue;
}

function validatePublicUrl(value, field, allowUploads = false) {
  if (value.startsWith('/uploads/') && allowUploads) {
    const segments = value.slice('/uploads/'.length).split('/');
    if (segments.length > 0 && segments.every(segment =>
      segment && segment !== '.' && segment !== '..' && /^[a-zA-Z0-9._-]+$/.test(segment)
    )) {
      return;
    }
    throw new TypeError(`${field} must be a valid HTTPS URL or an /uploads/ URL.`);
  }

  let url;
  try {
    url = new URL(value);
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    throw new TypeError(`${field} must be a valid HTTPS URL or an /uploads/ URL.`);
  }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
    throw new TypeError(`${field} must be a valid HTTPS URL${allowUploads ? ' or an /uploads/ URL' : ''}.`);
  }
}

router.get('/public', (req, res) => {
  try {
    res.json({ success: true, settings: readSettings(publicKeys) });
  } catch (error) {
    console.error('Error fetching public store settings:', error);
    res.status(500).json({ success: false, message: 'Server error fetching public store settings.' });
  }
});

router.get('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    res.json({ success: true, settings: readSettings([...editableKeys]) });
  } catch (error) {
    console.error('Error fetching admin store settings:', error);
    res.status(500).json({ success: false, message: 'Server error fetching store settings.' });
  }
});

router.put('/', authenticateToken, requireAdmin, (req, res) => {
  const settings = req.body;
  if (!settings || Array.isArray(settings) || typeof settings !== 'object') {
    return res.status(400).json({ success: false, message: 'Settings must be sent as a JSON object.' });
  }

  try {
    const entries = Object.entries(settings);
    if (entries.length === 0) {
      return res.status(400).json({ success: false, message: 'Provide at least one setting to update.' });
    }

    const validated = entries.map(([key, value]) => {
      if (!editableKeys.has(key)) {
        throw new TypeError(`Setting "${key}" is not editable.`);
      }
      return [key, validateSetting(key, value)];
    });

    db.exec('BEGIN');
    try {
      const upsert = db.prepare(`
        INSERT INTO settings (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `);
      for (const [key, value] of validated) upsert.run(key, value);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }

    const updatedSettings = readSettings([...editableKeys]);
    res.json({
      success: true,
      message: 'Settings updated successfully.',
      settings: updatedSettings
    });
  } catch (error) {
    if (error instanceof TypeError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Error updating store settings:', error);
    res.status(500).json({ success: false, message: 'Server error updating store settings.' });
  }
});

module.exports = router;
