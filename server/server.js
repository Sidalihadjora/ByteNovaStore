const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const db = require('./db');
const app = express();
const DEFAULT_PORT = 5000;
const PORT = process.env.PORT === undefined ? DEFAULT_PORT : Number(process.env.PORT);

if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535) {
  throw new Error(`Invalid PORT value "${process.env.PORT}". Expected an integer between 0 and 65535.`);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads folder
const uploadsDirectory = process.env.PRODUCT_IMAGE_LOCAL_DIRECTORY
  ? path.resolve(process.env.PRODUCT_IMAGE_LOCAL_DIRECTORY)
  : path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDirectory));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/wilayas', require('./routes/wilayas'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/settings', require('./routes/settings'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    store: db.prepare("SELECT value FROM settings WHERE key = 'store_name'").get()?.value || 'ByteNova Store',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend build in production
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

// Fallback for SPA routing (compatible with Express 5 / path-to-regexp v8)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.url.startsWith('/api') && !req.url.startsWith('/uploads')) {
    const indexPath = path.join(clientDist, 'index.html');
    return res.sendFile(indexPath, (err) => {
      if (err) next(err);
    });
  }
  next();
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

const http = require('node:http');
const server = http.createServer(app);

function listen(port) {
  const onError = (err) => {
    server.removeListener('listening', onListening);

    if (err.code === 'EADDRINUSE' && port > 0 && port < 65535) {
      const nextPort = port + 1;
      console.warn(`⚠️ Port ${port} is busy. Trying port ${nextPort}...`);
      listen(nextPort);
      return;
    }

    console.error(`Failed to start SoukDz server on port ${port}:`, err);
    process.exitCode = 1;
  };

  const onListening = () => {
    server.removeListener('error', onError);
    const address = server.address();
    const actualPort = typeof address === 'object' && address ? address.port : port;
    console.log(`🚀 SoukDz Algerian E-Commerce Server running on http://localhost:${actualPort}`);
    console.log(`📡 Local access: http://127.0.0.1:${actualPort}`);
  };

  server.once('error', onError);
  server.once('listening', onListening);
  server.listen(port, '0.0.0.0');
}

listen(PORT);
