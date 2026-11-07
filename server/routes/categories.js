const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/categories
router.get('/', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT c.*, COUNT(p.id) as products_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.name ASC
    `).all();

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/categories (Admin)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, name_ar, name_fr, slug, icon, image, description, sort_order } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ success: false, message: 'Category name and slug are required' });
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const existing = db.prepare('SELECT id FROM categories WHERE slug = ?').get(cleanSlug);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Category slug already exists' });
    }

    const result = db.prepare(`
      INSERT INTO categories (name, name_ar, name_fr, slug, icon, image, description, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name,
      name_ar || name,
      name_fr || name,
      cleanSlug,
      icon || 'Tag',
      image || null,
      description || null,
      sort_order || 0
    );

    const newCat = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, message: 'Category created', data: newCat });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, message: 'Server error creating category' });
  }
});

// PUT /api/categories/:id (Admin)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, name_ar, name_fr, slug, icon, image, description, sort_order } = req.body;
    const catId = req.params.id;

    db.prepare(`
      UPDATE categories
      SET name = COALESCE(?, name),
          name_ar = COALESCE(?, name_ar),
          name_fr = COALESCE(?, name_fr),
          slug = COALESCE(?, slug),
          icon = COALESCE(?, icon),
          image = COALESCE(?, image),
          description = COALESCE(?, description),
          sort_order = COALESCE(?, sort_order)
      WHERE id = ?
    `).run(name, name_ar, name_fr, slug, icon, image, description, sort_order, catId);

    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(catId);
    res.json({ success: true, message: 'Category updated', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating category' });
  }
});

// DELETE /api/categories/:id (Admin)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const catId = req.params.id;
    db.prepare('DELETE FROM categories WHERE id = ?').run(catId);
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error deleting category' });
  }
});

module.exports = router;
