const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth');

// Validate Algerian phone numbers (05, 06, 07, 02X, or with +213 / 00213)
function isValidAlgerianPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-\.]/g, '');
  // Matches: 05XXXXXXXX, 06XXXXXXXX, 07XXXXXXXX, 02XXXXXXX, +2135XXXXXXXX, +2136XXXXXXXX, etc.
  const regex = /^((\+213|00213|0)(5|6|7)[0-9]{8})$|^((\+213|00213|0)(2|3|4)[0-9]{7,8})$/;
  return regex.test(cleaned);
}

// Format phone for standard storage
function formatAlgerianPhone(phone) {
  let cleaned = phone.replace(/[\s\-\.]/g, '');
  if (cleaned.startsWith('+213')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('00213')) {
    cleaned = '0' + cleaned.slice(5);
  }
  return cleaned;
}

// POST /api/orders - Create a new order (Cash on Delivery)
router.post('/', optionalAuth, (req, res) => {
  try {
    const {
      customer_name,
      customer_phone,
      wilaya_code,
      wilaya_name,
      commune_name,
      delivery_address,
      order_notes,
      items
    } = req.body;

    // Validation
    if (!customer_name || customer_name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Please enter your full name.' });
    }

    if (!isValidAlgerianPhone(customer_phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Algerian phone number. Please use a valid 10-digit number (e.g. 0550 12 34 56 or 0661 23 45 67).'
      });
    }

    if (!wilaya_name || !commune_name) {
      return res.status(400).json({ success: false, message: 'Wilaya and Commune are required.' });
    }

    if (!delivery_address || delivery_address.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'Please enter a detailed delivery address.' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Shopping cart is empty.' });
    }

    const cleanPhone = formatAlgerianPhone(customer_phone);

    // Calculate subtotal and verify products
    let subtotal = 0;
    const validatedItems = [];

    const getProduct = db.prepare('SELECT id, name, price, stock_quantity, main_image FROM products WHERE id = ?');

    for (const item of items) {
      const prod = getProduct.get(item.id || item.product_id);
      if (!prod) {
        return res.status(400).json({
          success: false,
          message: `Product with ID ${item.id} is no longer available.`
        });
      }

      const qty = parseInt(item.quantity, 10) || 1;
      if (prod.stock_quantity < qty) {
        return res.status(400).json({
          success: false,
          message: `Not enough stock for "${prod.name}". Available: ${prod.stock_quantity}`
        });
      }

      const itemTotal = prod.price * qty;
      subtotal += itemTotal;

      validatedItems.push({
        product_id: prod.id,
        product_name: prod.name,
        product_image: prod.main_image || (item.image || null),
        unit_price: prod.price,
        quantity: qty,
        total_price: itemTotal
      });
    }

    // Determine delivery fee based on wilaya
    let delivery_fee = 600;
    if (wilaya_code) {
      const wilayaRecord = db.prepare('SELECT delivery_fee FROM wilayas WHERE code = ?').get(parseInt(wilaya_code, 10));
      if (wilayaRecord) {
        delivery_fee = wilayaRecord.delivery_fee;
      }
    }

    // Check free delivery threshold from settings
    const freeThresholdSetting = db.prepare("SELECT value FROM settings WHERE key = 'free_delivery_threshold'").get();
    const freeThreshold = freeThresholdSetting ? parseFloat(freeThresholdSetting.value) : 15000;
    if (subtotal >= freeThreshold) {
      delivery_fee = 0; // Free delivery!
    }

    const total_price = subtotal + delivery_fee;

    // Prevent duplicate orders submitted within last 45 seconds with same phone & total
    const recentDuplicate = db.prepare(`
      SELECT order_number FROM orders
      WHERE customer_phone = ? AND total_price = ? AND datetime(created_at) >= datetime('now', '-45 seconds')
    `).get(cleanPhone, total_price);

    if (recentDuplicate) {
      return res.status(409).json({
        success: false,
        message: 'A duplicate order was recently placed. Please wait a moment or check your order confirmation.',
        order_number: recentDuplicate.order_number
      });
    }

    // Generate unique Algerian Order Number
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `DZ-2026-${randomDigits}`;

    const userId = req.user ? req.user.id : null;

    // Insert Order
    const insertOrderStmt = db.prepare(`
      INSERT INTO orders (
        order_number, user_id, customer_name, customer_phone,
        wilaya_code, wilaya_name, commune_name, delivery_address,
        order_notes, subtotal, delivery_fee, total_price, payment_method, status
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, 'COD', 'Pending'
      )
    `);

    const orderRes = insertOrderStmt.run(
      orderNumber,
      userId,
      customer_name.trim(),
      cleanPhone,
      parseInt(wilaya_code, 10) || 16,
      wilaya_name.trim(),
      commune_name.trim(),
      delivery_address.trim(),
      order_notes ? order_notes.trim() : null,
      subtotal,
      delivery_fee,
      total_price
    );

    const orderId = orderRes.lastInsertRowid;

    // Insert Order Items and decrement product stock
    const insertItemStmt = db.prepare(`
      INSERT INTO order_items (
        order_id, product_id, product_name, product_image, unit_price, quantity, total_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStockStmt = db.prepare(`
      UPDATE products
      SET stock_quantity = MAX(0, stock_quantity - ?),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    for (const item of validatedItems) {
      insertItemStmt.run(
        orderId,
        item.product_id,
        item.product_name,
        item.product_image,
        item.unit_price,
        item.quantity,
        item.total_price
      );
      updateStockStmt.run(item.quantity, item.product_id);
    }

    const createdOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully! شكراً لطلبكم، سيتم الاتصال بكم لتأكيد الطلب.',
      order: {
        ...createdOrder,
        items: validatedItems
      }
    });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ success: false, message: 'Server error processing order: ' + error.message });
  }
});

// GET /api/orders/track/:orderNumber - Customer tracking
router.get('/track/:orderNumber', (req, res) => {
  try {
    const orderNumber = req.params.orderNumber.trim();
    const order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(orderNumber);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);

    res.json({
      success: true,
      order: {
        ...order,
        items
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error tracking order' });
  }
});

// GET /api/orders/my-orders - Customer order history
router.get('/my-orders', authenticateToken, (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT * FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(req.user.id);

    const getItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
    const enriched = orders.map(o => ({
      ...o,
      items: getItems.all(o.id)
    }));

    res.json({
      success: true,
      count: enriched.length,
      orders: enriched
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/orders - Admin listing with search, filtering, pagination
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { search, status, wilaya, start_date, end_date, page, limit } = req.query;

    let query = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (search) {
      query += ` AND (order_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ? OR delivery_address LIKE ?)`;
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    if (status && status !== 'all') {
      query += ` AND status = ?`;
      params.push(status);
    }

    if (wilaya && wilaya !== 'all') {
      query += ` AND (wilaya_name = ? OR wilaya_code = ?)`;
      params.push(wilaya, parseInt(wilaya, 10) || 0);
    }

    if (start_date) {
      query += ` AND date(created_at) >= date(?)`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND date(created_at) <= date(?)`;
      params.push(end_date);
    }

    query += ' ORDER BY created_at DESC';

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const offset = (pageNum - 1) * limitNum;

    query += ' LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const orders = db.prepare(query).all(...params);

    const getItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
    const enriched = orders.map(o => ({
      ...o,
      items: getItems.all(o.id)
    }));

    const totalOrdersCount = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;

    res.json({
      success: true,
      count: enriched.length,
      total: totalOrdersCount,
      page: pageNum,
      orders: enriched
    });
  } catch (error) {
    console.error('Error fetching admin orders:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/orders/:id - Single order details
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Only admin or the customer who placed the order can view
    const isAdmin = req.user && req.user.role === 'admin';
    const isOwner = req.user && req.user.id === order.user_id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);

    res.json({
      success: true,
      order: {
        ...order,
        items
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/orders/:id/status (Admin) - Update order status
router.patch('/:id/status', authenticateToken, requireAdmin, (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const { status } = req.body;

    const allowedStatuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`
      });
    }

    const order = db.prepare('SELECT id, status FROM orders WHERE id = ?').get(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    db.prepare(`
      UPDATE orders
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, orderId);

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      status
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/orders/:id (Admin) - Delete an order and its line items
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId < 1) {
    return res.status(400).json({ success: false, message: 'Invalid order ID.' });
  }

  try {
    const order = db.prepare('SELECT id, order_number FROM orders WHERE id = ?').get(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    db.exec('BEGIN');
    try {
      db.prepare('DELETE FROM orders WHERE id = ?').run(orderId);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }

    res.json({
      success: true,
      message: `Order ${order.order_number} deleted successfully.`,
      orderId
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ success: false, message: 'Server error deleting order.' });
  }
});

// GET /api/orders/export/csv (Admin) - Export orders as CSV
router.get('/export/csv', authenticateToken, requireAdmin, (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT o.order_number, o.created_at, o.customer_name, o.customer_phone,
             o.wilaya_name, o.commune_name, o.delivery_address,
             o.subtotal, o.delivery_fee, o.total_price, o.status,
             o.payment_method
      FROM orders o
      ORDER BY o.created_at DESC
    `).all();

    // Generate CSV string
    const headers = [
      'Order Number', 'Date', 'Customer Name', 'Phone',
      'Wilaya', 'Commune', 'Address',
      'Subtotal (DA)', 'Delivery Fee (DA)', 'Total Price (DA)', 'Status', 'Payment Method'
    ];

    const rows = orders.map(o => [
      `"${o.order_number}"`,
      `"${o.created_at}"`,
      `"${(o.customer_name || '').replace(/"/g, '""')}"`,
      `"${o.customer_phone}"`,
      `"${o.wilaya_name}"`,
      `"${o.commune_name}"`,
      `"${(o.delivery_address || '').replace(/"/g, '""')}"`,
      o.subtotal,
      o.delivery_fee,
      o.total_price,
      `"${o.status}"`,
      `"${o.payment_method}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');

    const storedName = db.prepare("SELECT value FROM settings WHERE key = 'store_name'").get()?.value || 'ByteNovaStore';
    const filePrefix = storedName.replace(/[^a-zA-Z0-9_-]+/g, '_') || 'store';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filePrefix}_orders_${Date.now()}.csv"`);
    // Prepend UTF-8 BOM so Excel opens Arabic and French characters correctly!
    res.send('\uFEFF' + csvContent);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ success: false, message: 'Server error exporting orders' });
  }
});

module.exports = router;
