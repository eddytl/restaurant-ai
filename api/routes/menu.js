const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');

// GET /api/menu - List all menu items with optional filters
router.get('/', async (req, res, next) => {
  try {
    const query = {};

    if (req.query.category) {
      query.category = req.query.category.toUpperCase();
    }

    if (req.query.available !== undefined) {
      query.available = req.query.available === 'true';
    }

    const items = await MenuItem.find(query).sort({ category: 1, name: 1 });

    res.json({
      success: true,
      data: items,
      message: `Found ${items.length} menu item(s)`
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/menu/:id - Get a single menu item
router.get('/:id', async (req, res, next) => {
  try {
    const item = await MenuItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Menu item with id ${req.params.id} not found`
      });
    }

    res.json({ success: true, data: item });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid menu item ID format' });
    }
    next(err);
  }
});

// POST /api/menu - Create a new menu item
router.post('/', async (req, res, next) => {
  try {
    const item = new MenuItem(req.body);
    await item.save();

    res.status(201).json({
      success: true,
      data: item,
      message: 'Menu item created successfully'
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    next(err);
  }
});

// PUT /api/menu/:id - Update a menu item
router.put('/:id', async (req, res, next) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Menu item with id ${req.params.id} not found`
      });
    }

    res.json({
      success: true,
      data: item,
      message: 'Menu item updated successfully'
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid menu item ID format' });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    next(err);
  }
});

// DELETE /api/menu/:id - Delete a menu item
router.delete('/:id', async (req, res, next) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Menu item with id ${req.params.id} not found`
      });
    }

    res.json({
      success: true,
      data: item,
      message: 'Menu item deleted successfully'
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid menu item ID format' });
    }
    next(err);
  }
});

module.exports = router;
