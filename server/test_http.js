const http = require('http');

async function testHttpEndpoints() {
  console.log('=== TESTING HTTP REST API ENDPOINTS ===\n');

  // Start the server in background
  const server = require('./server');

  // Give server 1 second to bind
  await new Promise(r => setTimeout(r, 1000));

  const BASE = 'http://127.0.0.1:5000/api';
  let passed = 0;
  let failed = 0;

  async function check(name, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (e) {
      console.error(`❌ FAIL: ${name} ->`, e.message);
      failed++;
    }
  }

  // 1. Health check
  await check('GET /api/health', async () => {
    const res = await fetch(`${BASE}/health`);
    const data = await res.json();
    if (data.status !== 'ok') throw new Error('Health check status not ok');
  });

  // 2. Wilayas endpoint
  await check('GET /api/wilayas', async () => {
    const res = await fetch(`${BASE}/wilayas`);
    const data = await res.json();
    if (!data.success || data.count !== 69) throw new Error(`Wilayas count expected 69, got ${data.count}`);
  });

  // 3. Communes for Wilaya 16 (Alger)
  await check('GET /api/wilayas/16/communes', async () => {
    const res = await fetch(`${BASE}/wilayas/16/communes`);
    const data = await res.json();
    if (!data.success || data.count === 0) throw new Error('Communes for Alger not returned');
  });

  // 4. Products endpoint
  let sampleProduct = null;
  await check('GET /api/products', async () => {
    const res = await fetch(`${BASE}/products`);
    const data = await res.json();
    if (!data.success || data.count === 0) throw new Error('Products empty');
    sampleProduct = data.data.find(p => p.stock_quantity > 0);
  });

  // 5. Customer Login
  let customerToken = null;
  await check('POST /api/auth/login (Customer)', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@soukdz.com', password: 'user123456' })
    });
    const data = await res.json();
    if (!data.success || !data.token) throw new Error(data.message || 'Login failed');
    customerToken = data.token;
  });

  // 6. Admin Login
  let adminToken = null;
  await check('POST /api/auth/login (Admin)', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@soukdz.com', password: 'admin123456' })
    });
    const data = await res.json();
    if (!data.success || !data.token || data.user.role !== 'admin') throw new Error('Admin login failed');
    adminToken = data.token;
  });

  // 7. Place Order (Cash on Delivery, 10-digit Algerian phone, Wilaya & Commune)
  let createdOrder = null;
  await check('POST /api/orders (Cash on Delivery with Algerian phone)', async () => {
    const res = await fetch(`${BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        customer_name: 'Djamel Belmadi',
        customer_phone: '0555123456',
        wilaya_code: 16,
        wilaya_name: 'Alger',
        commune_name: 'Kouba',
        delivery_address: 'Cite Garidi 1, Batiment 14',
        order_notes: 'Appeler 15 min avant',
        items: [
          {
            id: sampleProduct.id,
            quantity: 1
          }
        ]
      })
    });
    const data = await res.json();
    if (!data.success || !data.order) throw new Error(data.message || 'Order creation failed');
    if (!data.order.order_number.startsWith('DZ-')) throw new Error('Order number format invalid');
    createdOrder = data.order;
  });

  // 8. Order Tracking by Order Number
  await check('GET /api/orders/track/:orderNumber', async () => {
    const res = await fetch(`${BASE}/orders/track/${createdOrder.order_number}`);
    const data = await res.json();
    if (!data.success || data.order.order_number !== createdOrder.order_number) throw new Error('Tracking failed');
  });

  // 9. Admin Stats Endpoint (Protected)
  await check('GET /api/admin/stats (Protected with Admin Token)', async () => {
    const res = await fetch(`${BASE}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const data = await res.json();
    if (!data.success || data.stats.total_orders === undefined) throw new Error('Admin stats failed');
  });

  // 10. Admin Update Order Status
  await check('PATCH /api/orders/:id/status (Confirmed -> Shipped)', async () => {
    const res = await fetch(`${BASE}/orders/${createdOrder.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'Shipped' })
    });
    const data = await res.json();
    if (!data.success || data.status !== 'Shipped') throw new Error('Status update failed');
  });

  // 11. Role-based Access Control: Regular user cannot access Admin
  await check('Role Protection: Customer cannot access Admin stats (403)', async () => {
    const res = await fetch(`${BASE}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    if (res.status !== 403) throw new Error(`Expected 403 Forbidden, got ${res.status}`);
  });

  // 12. Frontend SPA index.html served
  await check('GET / (Serves Client React App)', async () => {
    const res = await fetch('http://127.0.0.1:5000/');
    const text = await res.text();
    if (!text.includes('SoukDz') && !text.includes('root')) throw new Error('Client HTML not served');
  });

  console.log(`\n========================================`);
  console.log(`HTTP TESTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================`);

  process.exit(failed > 0 ? 1 : 0);
}

testHttpEndpoints();
