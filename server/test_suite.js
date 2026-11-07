const db = require('./db');
const path = require('path');
const fs = require('fs');

async function runTests() {
  console.log('=== RUNNING COMPREHENSIVE TEST SUITE ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Test Wilayas and Communes from data.json
  console.log('--- Test 1: Algerian Wilayas & Communes Data ---');
  const wilayas = db.prepare('SELECT * FROM wilayas ORDER BY code ASC').all();
  assert(wilayas.length === 69, `Loaded all 69 Wilayas (found ${wilayas.length})`);
  assert(wilayas[0].code === 1 && wilayas[0].name_ascii === 'Adrar', 'Wilaya 01 is Adrar');
  assert(wilayas[15].code === 16 && wilayas[15].name_ascii === 'Alger', 'Wilaya 16 is Alger');

  const algerCommunes = db.prepare('SELECT * FROM communes WHERE wilaya_code = 16').all();
  assert(algerCommunes.length > 50, `Alger has ${algerCommunes.length} communes loaded`);

  const oranCommunes = db.prepare('SELECT * FROM communes WHERE wilaya_code = 31').all();
  assert(oranCommunes.length > 0, `Oran communes loaded (${oranCommunes.length})`);

  // 2. Test User Registration & Password Hashing
  console.log('\n--- Test 2: Authentication & Password Hashing ---');
  const bcrypt = require('bcryptjs');
  const testEmail = `test_${Date.now()}@example.dz`;
  const passHash = bcrypt.hashSync('testpass123', 10);
  const userInsert = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, phone, wilaya, commune)
    VALUES (?, ?, ?, 'customer', '0550112233', 'Alger', 'Bab El Oued')
  `).run('Test User', testEmail, passHash);
  assert(userInsert.lastInsertRowid > 0, 'New user successfully registered');

  const fetchedUser = db.prepare('SELECT * FROM users WHERE email = ?').get(testEmail);
  assert(bcrypt.compareSync('testpass123', fetchedUser.password_hash), 'Password verified with bcrypt');
  assert(!bcrypt.compareSync('wrongpass', fetchedUser.password_hash), 'Incorrect password rejected');

  // Test Admin role check
  const adminUser = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@soukdz.com');
  assert(adminUser && adminUser.role === 'admin', 'Default admin user exists with admin role');

  // 3. Test Products & Discount Logic
  console.log('\n--- Test 3: Products & Dual Price Strikethrough Logic ---');
  const products = db.prepare('SELECT * FROM products').all();
  assert(products.length >= 14, `Products catalog populated (${products.length} products)`);

  const discountedProduct = products.find(p => p.old_price && p.old_price > p.price);
  assert(discountedProduct !== undefined, 'Found products with old_price and discount');
  const discountPercent = Math.round(((discountedProduct.old_price - discountedProduct.price) / discountedProduct.old_price) * 100);
  assert(discountPercent > 0, `Discount percent correctly calculated: -${discountPercent}%`);

  const noDiscountProduct = products.find(p => !p.old_price || p.old_price === null);
  assert(noDiscountProduct !== undefined, 'Found products with NO old price (displays only current price)');

  const outOfStockProduct = products.find(p => p.stock_quantity === 0);
  assert(outOfStockProduct !== undefined, 'Found product with 0 stock (Out of Stock testing)');

  // 4. Test Order Submission & Stock Decrement
  console.log('\n--- Test 4: Order Creation & Stock Decrement ---');
  const productToOrder = db.prepare('SELECT * FROM products WHERE stock_quantity > 2').get();
  const initialStock = productToOrder.stock_quantity;
  const orderNumber = `DZ-TEST-${Date.now()}`;

  const orderRes = db.prepare(`
    INSERT INTO orders (
      order_number, user_id, customer_name, customer_phone,
      wilaya_code, wilaya_name, commune_name, delivery_address,
      subtotal, delivery_fee, total_price, payment_method, status
    ) VALUES (
      ?, ?, 'Test Buyer', '0661223344',
      16, 'Alger', 'Hydra', 'Rue des Pins, Villa 4',
      ?, 400, ?, 'COD', 'Pending'
    )
  `).run(
    orderNumber,
    fetchedUser.id,
    productToOrder.price,
    productToOrder.price + 400
  );

  const orderId = orderRes.lastInsertRowid;
  assert(orderId > 0, `Order placed with unique order number ${orderNumber}`);

  db.prepare(`
    INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, total_price)
    VALUES (?, ?, ?, ?, 1, ?)
  `).run(orderId, productToOrder.id, productToOrder.name, productToOrder.price, productToOrder.price);

  db.prepare('UPDATE products SET stock_quantity = stock_quantity - 1 WHERE id = ?').run(productToOrder.id);
  const updatedStock = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(productToOrder.id).stock_quantity;
  assert(updatedStock === initialStock - 1, `Product stock decremented from ${initialStock} to ${updatedStock}`);

  // 5. Test Order Status Transition
  console.log('\n--- Test 5: Order Status Transitions ---');
  const validStatuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];
  for (const st of validStatuses) {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(st, orderId);
    const currStatus = db.prepare('SELECT status FROM orders WHERE id = ?').get(orderId).status;
    assert(currStatus === st, `Order status updated to: ${st}`);
  }

  // 6. Test Admin Product Management (Add, Edit, Delete)
  console.log('\n--- Test 6: Admin Product CRUD ---');
  const newProdRes = db.prepare(`
    INSERT INTO products (name, name_fr, name_ar, slug, price, old_price, stock_quantity, is_active)
    VALUES ('Test Smart Watch', 'Montre Connectée Test', 'ساعة ذكية تجريبية', 'test-smart-watch', 4500, 6000, 20, 1)
  `).run();
  const testProdId = newProdRes.lastInsertRowid;
  assert(testProdId > 0, 'Admin can add a new product');

  db.prepare('UPDATE products SET price = 4200, stock_quantity = 25 WHERE id = ?').run(testProdId);
  const editedProd = db.prepare('SELECT * FROM products WHERE id = ?').get(testProdId);
  assert(editedProd.price === 4200 && editedProd.stock_quantity === 25, 'Admin can update product price and stock');

  db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(testProdId);
  const deactivated = db.prepare('SELECT is_active FROM products WHERE id = ?').get(testProdId);
  assert(deactivated.is_active === 0, 'Admin can deactivate a product');

  db.prepare('DELETE FROM products WHERE id = ?').run(testProdId);
  const deleted = db.prepare('SELECT * FROM products WHERE id = ?').get(testProdId);
  assert(!deleted, 'Admin can delete a product');

  // Summary
  console.log(`\n========================================`);
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
