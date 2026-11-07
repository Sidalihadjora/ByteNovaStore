const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = process.env.WEBSTORE_DB_PATH
  ? path.resolve(process.env.WEBSTORE_DB_PATH)
  : path.join(__dirname, 'data', 'webstore.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);

// Enable foreign keys and WAL mode for performance
db.exec('PRAGMA foreign_keys = ON;');

function initDatabase() {
  console.log('Initializing SQLite Database schema...');

  // 1. Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      google_id TEXT UNIQUE,
      avatar TEXT,
      phone TEXT,
      address TEXT,
      wilaya TEXT,
      commune TEXT,
      role TEXT NOT NULL DEFAULT 'customer',
      reset_token TEXT,
      reset_token_expires INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      name_fr TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      icon TEXT,
      image TEXT,
      description TEXT,
      sort_order INTEGER DEFAULT 0
    );
  `);

  // 3. Products table
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      name_ar TEXT,
      name_fr TEXT,
      slug TEXT UNIQUE,
      short_description TEXT,
      short_description_ar TEXT,
      short_description_fr TEXT,
      description TEXT,
      description_ar TEXT,
      description_fr TEXT,
      price REAL NOT NULL,
      old_price REAL,
      stock_quantity INTEGER NOT NULL DEFAULT 10,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_featured INTEGER DEFAULT 0,
      sku TEXT,
      main_image TEXT,
      rating REAL DEFAULT 0,
      reviews_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. Product Images table (multi-image support)
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      is_primary INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    );
  `);

  // 5. Wilayas table
  db.exec(`
    CREATE TABLE IF NOT EXISTS wilayas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code INTEGER UNIQUE NOT NULL,
      name_ascii TEXT NOT NULL,
      name_arabic TEXT NOT NULL,
      delivery_fee REAL DEFAULT 600
    );
  `);

  // 6. Communes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS communes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wilaya_id INTEGER NOT NULL REFERENCES wilayas(id) ON DELETE CASCADE,
      wilaya_code INTEGER NOT NULL,
      name_ascii TEXT NOT NULL,
      name_arabic TEXT NOT NULL
    );
  `);

  // 7. Orders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      wilaya_code INTEGER NOT NULL,
      wilaya_name TEXT NOT NULL,
      commune_name TEXT NOT NULL,
      delivery_address TEXT NOT NULL,
      order_notes TEXT,
      subtotal REAL NOT NULL,
      delivery_fee REAL NOT NULL DEFAULT 0,
      total_price REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'COD',
      status TEXT NOT NULL DEFAULT 'Pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 8. Order Items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      product_image TEXT,
      unit_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      total_price REAL NOT NULL
    );
  `);

  // 9. Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  seedDataFromJson();
  seedSystemSettings();
  seedConfiguredAdmin();
}

// Seed Wilayas and Communes directly from data.json
function seedDataFromJson() {
  const wilayaCount = db.prepare('SELECT COUNT(*) as count FROM wilayas').get().count;
  if (wilayaCount > 0) {
    return;
  }

  console.log('Seeding Algerian Wilayas and Communes from data.json...');
  const jsonPath = path.resolve(__dirname, '..', 'data.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`data.json not found at ${jsonPath}`);
    return;
  }

  const rawData = fs.readFileSync(jsonPath, 'utf8');
  const wilayasData = JSON.parse(rawData);

  const insertWilaya = db.prepare(`
    INSERT INTO wilayas (code, name_ascii, name_arabic, delivery_fee)
    VALUES (?, ?, ?, ?)
  `);

  const insertCommune = db.prepare(`
    INSERT INTO communes (wilaya_id, wilaya_code, name_ascii, name_arabic)
    VALUES (?, ?, ?, ?)
  `);

  // Delivery fee logic for Algerian wilayas:
  // Alger: 400 DA, Nearby central (Blida, Boumerdes, Tipaza): 500 DA,
  // North & High Plateaus: 600 - 700 DA,
  // South & Far South: 800 - 1000 DA
  for (const w of wilayasData) {
    let fee = 600;
    if (w.code === 16) fee = 400; // Alger
    else if ([9, 35, 42].includes(w.code)) fee = 500; // Blida, Boumerdes, Tipaza
    else if ([1, 11, 30, 33, 47, 53, 54, 55, 56, 57, 58].includes(w.code) || w.code > 48) fee = 900; // Sahara / Grand Sud

    const wilayaResult = insertWilaya.run(w.code, w.ascii, w.arabic, fee);
    const wilayaId = wilayaResult.lastInsertRowid;

    if (Array.isArray(w.communes)) {
      for (const c of w.communes) {
        insertCommune.run(wilayaId, w.code, c.ascii, c.arabic);
      }
    }
  }

  console.log(`Seeded ${wilayasData.length} Wilayas and their Communes successfully.`);
}

function seedSystemSettings() {
  const defaults = [
    ['store_name', 'ByteNova Store'],
    ['store_name_ar', 'ByteNova Store'],
    ['website_title', 'ByteNova Store'],
    ['store_description', ''],
    ['store_description_ar', ''],
    ['store_slogan', ''],
    ['store_slogan_ar', ''],
    ['store_logo', ''],
    ['store_favicon', ''],
    ['hero_image', ''],
    ['hero_image_badge', ''],
    ['hero_image_badge_ar', ''],
    ['hero_image_title', ''],
    ['hero_image_title_ar', ''],
    ['hero_image_discount', ''],
    ['hero_image_discount_ar', ''],
    ['primary_color', '#2563eb'],
    ['secondary_color', '#4f46e5'],
    ['store_phone', ''],
    ['store_secondary_phone', ''],
    ['store_email', ''],
    ['store_address', ''],
    ['store_city', ''],
    ['store_country', ''],
    ['social_facebook', ''],
    ['social_instagram', ''],
    ['social_whatsapp', ''],
    ['free_delivery_threshold', '15000'],
    ['currency_symbol_fr', 'DA'],
    ['currency_symbol_ar', 'د.ج']
  ];
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of defaults) {
    insertSetting.run(key, value);
  }

  const legacyDefaults = [
    ['store_name', 'SoukDz', 'ByteNova Store'],
    ['store_name_ar', 'سوق ديزاد', 'ByteNova Store'],
    ['announcement_en', '🚚 Fast Delivery to all 58 Wilayas | 💵 Cash on Delivery (الدفع عند الاستلام)', ''],
    ['announcement_fr', '🚚 Livraison rapide dans 58 wilayas | 💵 Paiement à la livraison', ''],
    ['announcement_ar', '🚚 توصيل سريع لجميع الـ 58 ولاية | 💵 الدفع عند الاستلام بعد معاينة المنتج', '']
  ];
  const migrateLegacyValue = db.prepare('UPDATE settings SET value = ? WHERE key = ? AND value = ?');
  for (const [key, oldValue, newValue] of legacyDefaults) {
    migrateLegacyValue.run(newValue, key, oldValue);
  }
}

function seedConfiguredAdmin() {
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!email && !password) return;
  if (!email || !password || password.length < 12) {
    throw new Error('Set both INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD (at least 12 characters) to provision the first administrator.');
  }
  if (db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get()) return;
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
    throw new Error('INITIAL_ADMIN_EMAIL already belongs to a non-administrator account.');
  }

  const passwordHash = bcrypt.hashSync(password, 12);
  db.prepare(`
    INSERT INTO users (name, email, password_hash, role)
    VALUES (?, ?, ?, 'admin')
  `).run(email, email, passwordHash);
  console.log('Provisioned the first administrator from environment configuration.');
}


initDatabase();

module.exports = db;
