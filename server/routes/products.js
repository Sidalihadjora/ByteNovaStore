const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { storeProductImage, InvalidProductImageError } = require('../services/productImageStorage');

class ProductInputError extends Error {}

function optionalText(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new ProductInputError('Optional text fields must be strings.');
  }
  return value.trim() || null;
}

function parseBoolean(value, fallback) {
  if (value === undefined) return fallback;
  if (value === true || value === 1 || value === '1' || value === 'true') return 1;
  if (value === false || value === 0 || value === '0' || value === 'false') return 0;
  throw new ProductInputError('Boolean fields must be true, false, 1, or 0.');
}

function parseOptionalCategory(value, fallback) {
  if (value === undefined) return fallback;
  if (value === null || value === '') return null;
  const categoryId = Number(value);
  if (!Number.isInteger(categoryId) || categoryId < 1) {
    throw new ProductInputError('Category must be a valid category ID.');
  }
  return categoryId;
}

function parseOptionalImage(value, fallback) {
  if (value === undefined) return fallback;
  if (value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new ProductInputError('Product image must be a URL string or empty.');
  }

  const imageUrl = value.trim();
  try {
    const parsedUrl = new URL(imageUrl);
    if (
      ['http:', 'https:'].includes(parsedUrl.protocol) &&
      parsedUrl.hostname &&
      !parsedUrl.username &&
      !parsedUrl.password
    ) {
      return imageUrl;
    }
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
  }

  if (
    imageUrl.startsWith('/uploads/') &&
    imageUrl.split('/').slice(1).every(segment => segment && segment !== '.' && segment !== '..') &&
    /^[a-zA-Z0-9._/-]+$/.test(imageUrl.slice(1))
  ) {
    return imageUrl;
  }
  throw new ProductInputError('Product image must be an HTTP(S) URL or a /uploads/ URL.');
}

function parsePrice(value, field, fallback, allowEmpty = false) {
  if (value === undefined) return fallback;
  if (allowEmpty && (value === null || value === '')) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new ProductInputError(`${field} must be a valid non-negative number.`);
  }
  return number;
}

function parseStock(value, fallback) {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new ProductInputError('Stock quantity must be a non-negative integer.');
  }
  return number;
}

function normalizeImageList(images) {
  if (!Array.isArray(images)) {
    throw new ProductInputError('Product images must be provided as a list.');
  }
  return images.map(image => parseOptionalImage(image, null)).filter(Boolean);
}

function handleProductError(res, error, action) {
  if (error instanceof ProductInputError) {
    return res.status(400).json({ success: false, message: error.message });
  }
  console.error(`Error ${action} product:`, error);
  return res.status(500).json({ success: false, message: `Server error ${action} product: ${error.message}` });
}

// Helper to calculate discount percentage
function enrichProduct(p) {
  let discount_percentage = 0;
  if (p.old_price && p.old_price > p.price) {
    discount_percentage = Math.round(((p.old_price - p.price) / p.old_price) * 100);
  }
  return {
    ...p,
    discount_percentage,
    is_in_stock: p.stock_quantity > 0
  };
}

// GET /api/products - List products with filter, search, sort
router.get('/', optionalAuth, (req, res) => {
  try {
    const {
      search,
      category,
      featured,
      in_stock,
      sort,
      min_price,
      max_price,
      limit,
      page,
      admin_all
    } = req.query;

    let query = `
      SELECT p.*, c.name as category_name, c.name_ar as category_name_ar, c.name_fr as category_name_fr, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    // Filter only active products unless admin specifically requests all
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin || admin_all !== 'true') {
      query += ` AND p.is_active = 1`;
    }

    if (search) {
      query += ` AND (p.name LIKE ? OR p.name_ar LIKE ? OR p.name_fr LIKE ? OR p.short_description LIKE ? OR p.sku LIKE ?)`;
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s, s);
    }

    if (category) {
      query += ` AND (c.slug = ? OR p.category_id = ?)`;
      params.push(category, category);
    }

    if (featured === 'true' || featured === '1') {
      query += ` AND p.is_featured = 1`;
    }

    if (in_stock === 'true' || in_stock === '1') {
      query += ` AND p.stock_quantity > 0`;
    }

    if (min_price) {
      query += ` AND p.price >= ?`;
      params.push(parseFloat(min_price));
    }

    if (max_price) {
      query += ` AND p.price <= ?`;
      params.push(parseFloat(max_price));
    }

    // Sorting
    switch (sort) {
      case 'price_asc':
        query += ` ORDER BY p.price ASC`;
        break;
      case 'price_desc':
        query += ` ORDER BY p.price DESC`;
        break;
      case 'rating':
        query += ` ORDER BY p.rating DESC, p.reviews_count DESC`;
        break;
      case 'discount':
        query += ` ORDER BY (CASE WHEN p.old_price > p.price THEN ((p.old_price - p.price) / p.old_price) ELSE 0 END) DESC`;
        break;
      case 'newest':
      default:
        query += ` ORDER BY p.created_at DESC`;
        break;
    }

    // Limit / Pagination
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const offset = (pageNum - 1) * limitNum;

    query += ` LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    const products = db.prepare(query).all(...params);

    // Attach images
    const getImages = db.prepare(`
      SELECT image_url, is_primary FROM product_images
      WHERE product_id = ?
      ORDER BY sort_order ASC
    `);

    const enriched = products.map(p => {
      const images = getImages.all(p.id).map(img => img.image_url);
      return {
        ...enrichProduct(p),
        images: images.length > 0 ? images : (p.main_image ? [p.main_image] : [])
      };
    });

    res.json({
      success: true,
      count: enriched.length,
      page: pageNum,
      data: enriched
    });
  } catch (error) {
    console.error('Error listing products:', error);
    res.status(500).json({ success: false, message: 'Server error listing products' });
  }
});

// POST /api/products/upload-image (Admin)
router.post('/upload-image', authenticateToken, requireAdmin, (req, res, next) => {
  upload.single('image')(req, res, error => {
    if (error) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({
        success: false,
        message: status === 413 ? 'Image exceeds the 5 MB upload limit.' : error.message
      });
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Select a PNG, JPEG, or WEBP image to upload.' });
  }

  try {
    const imageUrl = await storeProductImage(req.file);
    res.json({
      success: true,
      message: 'Image uploaded successfully',
      imageUrl
    });
  } catch (error) {
    if (error instanceof InvalidProductImageError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Error storing product image:', error);
    res.status(500).json({ success: false, message: error.message || 'Image upload failed.' });
  }
});

// GET /api/products/:id - Single product with gallery
router.get('/:id', (req, res) => {
  try {
    const idOrSlug = req.params.id;
    let product;

    if (!isNaN(idOrSlug)) {
      product = db.prepare(`
        SELECT p.*, c.name as category_name, c.name_ar as category_name_ar, c.name_fr as category_name_fr, c.slug as category_slug
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ?
      `).get(parseInt(idOrSlug, 10));
    } else {
      product = db.prepare(`
        SELECT p.*, c.name as category_name, c.name_ar as category_name_ar, c.name_fr as category_name_fr, c.slug as category_slug
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.slug = ?
      `).get(idOrSlug);
    }

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const images = db.prepare(`
      SELECT image_url, is_primary FROM product_images
      WHERE product_id = ?
      ORDER BY sort_order ASC
    `).all(product.id).map(img => img.image_url);

    res.json({
      success: true,
      data: {
        ...enrichProduct(product),
        images: images.length > 0 ? images : (product.main_image ? [product.main_image] : [])
      }
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/products (Admin) - Create product
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  let transactionStarted = false;
  try {
    const {
      name, name_ar, name_fr, category_id,
      short_description, short_description_ar, short_description_fr,
      description, description_ar, description_fr,
      price, old_price, stock_quantity, is_active, is_featured,
      sku, main_image, images
    } = req.body;

    if (typeof name !== 'string' || !name.trim() || price === undefined || price === null || price === '') {
      return res.status(400).json({ success: false, message: 'Product name and price are required' });
    }

    const numPrice = parsePrice(price, 'Price', null);
    const numOldPrice = parsePrice(old_price, 'Old price', null, true);
    const numStock = parseStock(stock_quantity, 0);
    const active = parseBoolean(is_active, 1);
    const featured = parseBoolean(is_featured, 0);
    const categoryId = parseOptionalCategory(category_id, null);
    const imageUrl = parseOptionalImage(main_image, null);
    const imageList = images === undefined
      ? (imageUrl ? [imageUrl] : [])
      : normalizeImageList(images);
    const normalizedName = name.trim();

    const baseSlug = normalizedName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const slug = baseSlug + '-' + Date.now().toString().slice(-4);

    db.exec('BEGIN');
    transactionStarted = true;
    const result = db.prepare(`
      INSERT INTO products (
        name, name_ar, name_fr, slug, category_id,
        short_description, short_description_ar, short_description_fr,
        description, description_ar, description_fr,
        price, old_price, stock_quantity, is_active, is_featured,
        sku, main_image, rating, reviews_count
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, 0, 0
      )
    `).run(
      normalizedName,
      optionalText(name_ar) || normalizedName,
      optionalText(name_fr) || normalizedName,
      slug,
      categoryId,
      optionalText(short_description),
      optionalText(short_description_ar) || optionalText(short_description),
      optionalText(short_description_fr) || optionalText(short_description),
      optionalText(description),
      optionalText(description_ar) || optionalText(description),
      optionalText(description_fr) || optionalText(description),
      numPrice,
      numOldPrice,
      numStock,
      active,
      featured,
      optionalText(sku),
      imageUrl
    );

    const productId = result.lastInsertRowid;

    if (imageList.length > 0) {
      const insertImg = db.prepare(`
        INSERT INTO product_images (product_id, image_url, is_primary, sort_order)
        VALUES (?, ?, ?, ?)
      `);
      imageList.forEach((imgUrl, idx) => {
        insertImg.run(productId, imgUrl, idx === 0 ? 1 : 0, idx);
      });
    }

    db.exec('COMMIT');
    transactionStarted = false;
    const created = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: enrichProduct(created)
    });
  } catch (error) {
    if (transactionStarted) {
      try {
        db.exec('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error rolling back product creation:', rollbackError);
      }
    }
    handleProductError(res, error, 'creating');
  }
});

// PUT /api/products/:id (Admin) - Update product
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  let transactionStarted = false;
  try {
    const productId = parseInt(req.params.id, 10);
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const {
      name, name_ar, name_fr, category_id,
      short_description, short_description_ar, short_description_fr,
      description, description_ar, description_fr,
      price, old_price, stock_quantity, is_active, is_featured,
      sku, main_image, images
    } = req.body;

    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ success: false, message: 'Product name cannot be empty.' });
    }

    const values = {
      name: name === undefined ? existing.name : name.trim(),
      nameAr: name_ar === undefined ? existing.name_ar : optionalText(name_ar),
      nameFr: name_fr === undefined ? existing.name_fr : optionalText(name_fr),
      categoryId: parseOptionalCategory(category_id, existing.category_id),
      shortDescription: short_description === undefined ? existing.short_description : optionalText(short_description),
      shortDescriptionAr: short_description_ar === undefined ? existing.short_description_ar : optionalText(short_description_ar),
      shortDescriptionFr: short_description_fr === undefined ? existing.short_description_fr : optionalText(short_description_fr),
      description: description === undefined ? existing.description : optionalText(description),
      descriptionAr: description_ar === undefined ? existing.description_ar : optionalText(description_ar),
      descriptionFr: description_fr === undefined ? existing.description_fr : optionalText(description_fr),
      price: parsePrice(price, 'Price', existing.price),
      oldPrice: parsePrice(old_price, 'Old price', existing.old_price, true),
      stock: parseStock(stock_quantity, existing.stock_quantity),
      active: parseBoolean(is_active, existing.is_active),
      featured: parseBoolean(is_featured, existing.is_featured),
      sku: sku === undefined ? existing.sku : optionalText(sku),
      mainImage: parseOptionalImage(main_image, existing.main_image)
    };

    const imageList = images === undefined
      ? (main_image === undefined
          ? null
          : (values.mainImage ? [values.mainImage] : []))
      : normalizeImageList(images);

    db.exec('BEGIN');
    transactionStarted = true;
    db.prepare(`
      UPDATE products
      SET name = ?,
          name_ar = ?,
          name_fr = ?,
          category_id = ?,
          short_description = ?,
          short_description_ar = ?,
          short_description_fr = ?,
          description = ?,
          description_ar = ?,
          description_fr = ?,
          price = ?,
          old_price = ?,
          stock_quantity = ?,
          is_active = ?,
          is_featured = ?,
          sku = ?,
          main_image = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      values.name, values.nameAr, values.nameFr, values.categoryId,
      values.shortDescription, values.shortDescriptionAr, values.shortDescriptionFr,
      values.description, values.descriptionAr, values.descriptionFr,
      values.price, values.oldPrice, values.stock, values.active, values.featured,
      values.sku, values.mainImage, productId
    );

    if (imageList !== null) {
      db.prepare('DELETE FROM product_images WHERE product_id = ?').run(productId);
      const insertImg = db.prepare(`
        INSERT INTO product_images (product_id, image_url, is_primary, sort_order)
        VALUES (?, ?, ?, ?)
      `);
      imageList.forEach((imgUrl, idx) => {
        insertImg.run(productId, imgUrl, idx === 0 ? 1 : 0, idx);
      });
    }

    db.exec('COMMIT');
    transactionStarted = false;
    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    res.json({
      success: true,
      message: 'Product updated successfully',
      data: enrichProduct(updated)
    });
  } catch (error) {
    if (transactionStarted) {
      try {
        db.exec('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error rolling back product update:', rollbackError);
      }
    }
    handleProductError(res, error, 'updating');
  }
});

// PATCH /api/products/:id/toggle-active (Admin)
router.patch('/:id/toggle-active', authenticateToken, requireAdmin, (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const product = db.prepare('SELECT is_active FROM products WHERE id = ?').get(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const newStatus = product.is_active === 1 ? 0 : 1;
    db.prepare('UPDATE products SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, productId);

    res.json({
      success: true,
      message: `Product ${newStatus === 1 ? 'activated' : 'deactivated'}`,
      is_active: newStatus
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/products/:id (Admin)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    db.prepare('DELETE FROM products WHERE id = ?').run(productId);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error deleting product' });
  }
});

module.exports = router;
