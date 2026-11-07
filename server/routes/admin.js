const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All admin routes require admin authentication
router.use(authenticateToken, requireAdmin);

// GET /api/admin/stats - Statistics & KPI metrics for Dashboard
router.get('/stats', (req, res) => {
  try {
    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
    const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'Pending'").get().count;
    const confirmedOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'Confirmed'").get().count;
    const deliveredOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'Delivered'").get().count;
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    const totalCustomers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'customer'").get().count;

    const totalSalesRow = db.prepare(`
      SELECT COALESCE(SUM(total_price), 0) as total
      FROM orders
      WHERE status != 'Cancelled'
    `).get();
    const totalSales = totalSalesRow.total;

    // Recent orders
    const recentOrders = db.prepare(`
      SELECT * FROM orders
      ORDER BY created_at DESC
      LIMIT 6
    `).all();

    // Sales by day (last 7 days or all orders grouped by date)
    const salesByDay = db.prepare(`
      SELECT strftime('%Y-%m-%d', created_at) as date,
             COUNT(*) as orders_count,
             COALESCE(SUM(total_price), 0) as daily_revenue
      FROM orders
      WHERE status != 'Cancelled'
      GROUP BY strftime('%Y-%m-%d', created_at)
      ORDER BY date ASC
      LIMIT 14
    `).all();

    // Top Wilayas
    const topWilayas = db.prepare(`
      SELECT wilaya_name, COUNT(*) as count, SUM(total_price) as revenue
      FROM orders
      WHERE status != 'Cancelled'
      GROUP BY wilaya_name
      ORDER BY count DESC
      LIMIT 8
    `).all();

    // Low stock alerts (stock <= 5)
    const lowStockCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE stock_quantity <= 5').get().count;
    const outOfStockCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE stock_quantity = 0').get().count;

    res.json({
      success: true,
      stats: {
        total_orders: totalOrders,
        pending_orders: pendingOrders,
        confirmed_orders: confirmedOrders,
        delivered_orders: deliveredOrders,
        total_products: totalProducts,
        total_customers: totalCustomers,
        total_sales: totalSales,
        low_stock_count: lowStockCount,
        out_of_stock_count: outOfStockCount,
        recent_orders: recentOrders,
        sales_by_day: salesByDay,
        top_wilayas: topWilayas
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/customers - Customer management
router.get('/customers', (req, res) => {
  try {
    const customers = db.prepare(`
      SELECT u.id, u.name, u.email, u.phone, u.wilaya, u.commune, u.address, u.avatar, u.created_at,
             COUNT(o.id) as orders_count,
             COALESCE(SUM(o.total_price), 0) as total_spent
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id AND o.status != 'Cancelled'
      WHERE u.role = 'customer'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `).all();

    res.json({
      success: true,
      count: customers.length,
      customers
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/admin/customers/:id - Delete a customer account while preserving orders
router.delete('/customers/:id', (req, res) => {
  const customerId = Number(req.params.id);
  if (!Number.isSafeInteger(customerId) || customerId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid customer ID' });
  }

  try {
    const result = db.prepare("DELETE FROM users WHERE id = ? AND role = 'customer'").run(customerId);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({
      success: true,
      message: 'Customer deleted. Existing orders have been preserved.'
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ success: false, message: 'Server error deleting customer' });
  }
});

// GET /api/admin/inventory - Inventory overview
router.get('/inventory', (req, res) => {
  try {
    const inventory = db.prepare(`
      SELECT p.id, p.name, p.name_ar, p.name_fr, p.sku, p.price, p.stock_quantity,
             p.is_active, p.main_image, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.stock_quantity ASC
    `).all();

    res.json({
      success: true,
      count: inventory.length,
      inventory
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/admin/inventory/:id - Update stock
router.patch('/inventory/:id', (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const { stock_quantity } = req.body;

    if (stock_quantity === undefined || isNaN(stock_quantity)) {
      return res.status(400).json({ success: false, message: 'Stock quantity is required' });
    }

    const qty = Math.max(0, parseInt(stock_quantity, 10));
    db.prepare('UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(qty, productId);

    res.json({
      success: true,
      message: 'Stock updated successfully',
      product_id: productId,
      stock_quantity: qty
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
